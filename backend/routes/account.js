import express from "express";
import { body, query, validationResult } from 'express-validator';
import bcrypt from "bcryptjs";
import jwt from 'jsonwebtoken';
import nodemailer from "nodemailer";

// This will help us connect to the database
import { db, client } from "../db/connection.js";
import authenticateJWT from "../middleware/authentication.js"

// This help convert the id from string to ObjectId for the _id.
import { ObjectId } from "mongodb";

// router is an instance of the express router.
// We use it to define our routes.
// The router will be added as a middleware and will take control of requests starting with path /record.
const router = express.Router();

// Returns the latest user profile from the database
router.get('/profile', authenticateJWT, async (req, res) => {
  try {
    const userID = req.user.userID;  // Extract userID from the decoded JWT

    // Query the database for the latest user document using their _id
    // Exclude sensitive fields like password from the result
    const user = await db.collection("users").findOne(
      { _id: new ObjectId(userID) },
      { projection: { password: 0 } }  // Exclude password from the response
    );

    // Handle case where user ID is not found (shouldn't usually happen)
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    // Return only non-sensitive user profile data
    return res.status(200).json({
      firstname: user.firstname,
      lastname: user.lastname,
      email: user.email,
      userID: user._id,
      registrationDate: user.registrationDate,
      lastLogin: user.lastLogin
    });

  } catch (err) {
    console.error("Error fetching live profile:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});


// This section will help you get a list of all the records.
const loginValidation = [
    body('email')
        .trim()
        .notEmpty().withMessage('Email address required')
        .isEmail().withMessage('Invalid email address'),
    body('password')
        .notEmpty().withMessage('Password is required'),
];

// TODO: Check if account is verified.
router.post("/login", loginValidation, async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    const { email, password } = req.body;
    let collection = await db.collection("users");
    let account = await collection.findOne({ email: email });
    if (!account) {
        return res.status(404).json({ error: "User with email address not found" });
    }
    if (!account.verified) {
        return res.status(401).json({ error: "Verify account before logging on" })
    }

    if (account.disabled) {
     return res
       .status(403)
       .json({ error: "Your account has been disabled." });
   }

    // Once we get the account, we want to check the password!
    console.log(account)
    let hashCompare = await bcrypt.compare(password, account.password);
    if (!hashCompare) {
        return res.status(401).json({ error: "Incorrect password, unauthorised access" });
    }

    // If hashes are correct, we want to generate a JWT token,
    // and send it back to the user.
    // TODO: Add a role for admin.
    // OR have the following roles:
    /*
      - user: For user logins
      - admin: For the administrator who gets special permissions
      - verify: Used for verifying an account
    */

    // UPDATE lastLogin 
    const now = new Date();
    await collection.updateOne(
        { _id: account._id },
        { $set: { lastLogin: now } }
    );

    // Check if the user is admin or not, and return a JWT token with the role "admin"
    let role = (email === process.env.ADMIN_EMAIL) ? "admin" : "login";

    let payload = {
        "userID": account._id,
        "firstname": account.firstname,
        "lastname": account.lastname,
        "email": account.email,
        "role": role // Token used for logging in 
    }

    // TODO: SET TOKEN EXPIRY TO 1 HOUR!
    let signOptions = {};
    let cookieOpts = { httpOnly: true };
    if (role === "admin") {
    // expire after 30 seconds of inactivity for testing
    //signOptions.expiresIn = "30s";
    //cookieOpts.maxAge = 30 * 1000;
    signOptions.expiresIn = "30m";
    cookieOpts.maxAge = 30 * 60 * 1000;
    } else {
    // regular users: 1 hour
    signOptions.expiresIn = "1h";
    cookieOpts.maxAge = 60 * 60 * 1000;
    }
    const token = jwt.sign(payload, process.env.JWT_SECRET, signOptions);
    res.cookie("token", token, cookieOpts);

    return res.status(200).json({ token });
});

const adminLoginValidation = [
    body("email").trim().isEmail().withMessage("Valid email required"),
    body("password").notEmpty().withMessage("Password required"),
];

router.post("/admin/login", adminLoginValidation, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
        return res.status(400).json({ errors: errors.array() });

    const { email, password } = req.body;
    // uses new route
    const adminDb = client.db("admin");
    const admins = await adminDb.collection("users");
    const account = await admins.findOne({ email });
    if (!account)
        return res.status(404).json({ error: "Admin not found" });

    // compare the stored hash
    const match = await bcrypt.compare(password, account.password);
    if (!match)
        return res.status(401).json({ error: "Incorrect password" });

    // update lastLogin 
    await admins.updateOne(
        { _id: account._id },
        { $set: { lastLogin: new Date() } }
    );

    // build a token with role="admin"
    const payload = {
        userID: account._id,
        firstname: account.firstname,
        lastname: account.lastname,
        email: account.email,
        role: "admin"
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET);
    // set it as a cookie 
    res.cookie("token", token, { httpOnly: true });

    return res.status(200).json({ token });
}
);

// Check's if JWT token is valid 
router.get("/validate", authenticateJWT, async (req, res) => {
    res.status(200).send("Valid token")
});

// TODO: Signup endpoint with email verification
/*
1. First need to check if an account is created with all the valid inputs
2. You then need to check if the account already exists if with said email
3. If all the initial checks are passed, you need to create a JWT verification token
    containing the email as payload.
4. Then, create another endpoint called GET '/verify' that takes the token as input
  - URL Should look like this: http://localhost:5050/verify?token=[INSERT TOKEN HERE]
5. Verify that the token is valid in the endpoint
6. If the token is valid, send a 200 response, probably send a HTML page indicating succesful verification.
*/
const signupValidation = [
    body('email')
        .trim()
        .notEmpty().withMessage('Email address required')
        .isEmail().withMessage('Invalid email address'),
    body('password')
        .notEmpty().withMessage("Password required")
        .isLength({ min: 8 }).withMessage("Password must be at least 8 characters long")
        .matches(/[a-z]/).withMessage("Password must contain at least one lowercase letter")
        .matches(/[A-Z]/).withMessage("Password must contain at least one uppercase letter")
        .matches(/[0-9]/).withMessage("Password must contain at least one number")
        .matches(/[^A-Za-z0-9]/).withMessage("Password must contain at least one special character"),
    body('firstname')
        .notEmpty().withMessage("First Name required"),
    body('lastname')
        .notEmpty().withMessage("Last Name required")
]

// TODO: Add in flag that sends bypass email verification, sents verify link as response.
router.post("/signup", signupValidation, async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    const { email, password, firstname, lastname } = req.body;
    let collection = await db.collection("users");
    let existingAccount = await collection.findOne({ email: email });
    if (existingAccount) {
        return res.status(403).json({ error: "User with email address already exists" })
    }

    // Hash the password before sending it.
    let hashedPassword = await bcrypt.hash(password, 10);
    // gets the date to update last login
    const now = new Date();

    let newAccount = await collection.insertOne(
        {
            firstname: firstname,
            lastname: lastname,
            email: email,
            password: hashedPassword,
            verified: false,
            disabled: false,
            cart: [],
            registrationDate: now,
            lastLogin: now,
            wishlist: []
        }
    );

    if (!newAccount) {
        return res.status(500).json({ error: "Could not add new account to database." })
    }

    let payload = {
        "email": email,
        "role": "verify"
    }

    let token = jwt.sign(payload, process.env.JWT_SECRET);
    let verifyURL = `localhost:${process.env.BACKEND_PORT}/api/account/verify?token=${token}`

    console.log(verifyURL)

    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.GMAIL_ADDRESS,
            pass: process.env.GOOGLE_APP_PASSWORD,
        },
    });

    (async () => {
        try {
            const info = await transporter.sendMail({
                from: `"Old Phone Deals" <${process.env.GMAIL_ADDRESS}>`, // sender address
                to: `${email}`, // list of receivers
                subject: "Verify your account for Old Phone Deals", // Subject line
                text: `Please verify your account using the following link: ${verifyURL}`, // plain text body
                html: `<p>Please verify your account using the following link: <a href="${verifyURL}">${verifyURL}</a></p>`, // html body
            });

            console.log("Message sent: %s", info.messageId);
            console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
        } catch (err) {
            console.error("Error while sending mail", err);
            return res.status(403).json({ error: `Error sent while sending verification email: ${err}` })
        }
    })();

    return res.status(200).json({ verify: `Please verify your account. Verification link sent to ${email}` });
});

const verifyValidation = [
    query('token').notEmpty().withMessage("Token required")
]

router.get("/verify", verifyValidation, async (req, res) => {
    const errors = validationResult(req)

    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { token } = req.query;
    let decodedToken;

    try {
        decodedToken = jwt.verify(token, process.env.JWT_SECRET);
        console.log(decodedToken);
    } catch (e) {
        return res.status(401).json({ error: "Malformed or invalid JWT Token" });
    }

    if (decodedToken.role === "login") {
        return res.status(401).json({ error: `Invalid token, not used for email verification` })
    }

    // We now want to update the account so that verified is true rather than false.
    let collection = await db.collection("users");
    /* let existingAccount = await collection.findOne({email: decodedToken.email});
    if(!existingAccount) {
      return res.status(404).json({error: "User with email address not found"});
    }
      */
    const result = await collection.updateOne({ email: decodedToken.email }, { $set: { verified: true } });
    if (!result) {
        return res.status(500).json({ error: "Failed to update user, issue with the server" })
    }

    return res.status(200).json({ success: `${decodedToken.email} succesfully verified!` })
});

// Sends a verify email again, if the first one wasn't recieved correctly.
const reverifyValidation = [
    body('email')
        .trim()
        .notEmpty().withMessage('Email address required')
        .isEmail().withMessage('Invalid email address'),
]

router.post("/reverify", reverifyValidation, async (req, res) => {
    const errors = validationResult(req)

    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { email } = req.body;
    let collection = await db.collection("users");
    let existingAccount = await collection.findOne({ email: email });
    if (!existingAccount) {
        return res.status(404).json({ error: "User with email address does NOT exist" })
    }
    if (existingAccount.verified) {
        return res.status(403).json({ error: "Account already verified" })
    }

    let payload = {
        "email": email,
        "role": "verify"
    }

    let token = jwt.sign(payload, process.env.JWT_SECRET);
    let verifyURL = `localhost:${process.env.PORT}/verify?token=${token}`

    console.log(verifyURL)

    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.GMAIL_ADDRESS,
            pass: process.env.GOOGLE_APP_PASSWORD,
        },
    });

    (async () => {
        try {
            const info = await transporter.sendMail({
                from: `"Example Team" <${process.env.GMAIL_ADDRESS}>`, // sender address
                to: `${email}`, // list of receivers
                subject: "Verify your account for Old Phone Deals", // Subject line
                text: `Please verify your account using the following link: ${verifyURL}`, // plain text body
                html: `<p>Please verify your account using the following link: <a href="${verifyURL}">${verifyURL}</a></p>`, // html body
            });

            console.log("Message sent: %s", info.messageId);
            console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
        } catch (err) {
            console.error("Error while sending mail", err);
            return res.status(403).json({ error: `Error sent while sending verification email: ${err}` })
        }
    })();

    return res.status(200).json({ verify: `Please verify your account. Verification link sent to ${email}` });

})

// Check password match
async function validatePasswordMatch(inputPassword, hashedPassword) {
    const isMatch = await bcrypt.compare(inputPassword, hashedPassword);
    if (!isMatch) {
        throw new Error("Incorrect password.");
    }
}

// Check if email is taken
async function isEmailTaken(email, userID) {
    const users = db.collection("users");
    const existing = await users.findOne({ email });
    return existing && existing._id.toString() !== userID;
}

// Send a verification email after email change
async function sendVerificationEmail(email) {
    const token = jwt.sign({ email, role: "verify" }, process.env.JWT_SECRET);
    const verifyURL = `localhost:${process.env.BACKEND_PORT}/api/account/verify?token=${token}`;

    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.GMAIL_ADDRESS,
            pass: process.env.GOOGLE_APP_PASSWORD,
        },
    });

    await transporter.sendMail({
        from: `"Old Phone Deals" <${process.env.GMAIL_ADDRESS}>`,
        to: email,
        subject: "Verify your new email address",
        text: `Click the link to verify your updated email: ${verifyURL}`,
        html: `<p>Click to verify your updated email: <a href="${verifyURL}">${verifyURL}</a></p>`,
    });
}

// Update profile endpoint - first name, last name, email
router.put("/update", authenticateJWT, async (req, res) => {
    const { firstname, lastname, email, password } = req.body;
    const userID = req.user.userID;

    if (!firstname || !lastname || !email || !password) {
        return res.status(400).json({ error: "All fields are required." });
    }

    try {
        const users = db.collection("users");
        const user = await users.findOne({ _id: ObjectId.createFromHexString(userID) });
        if (!user) return res.status(404).json({ error: "User not found." });

        await validatePasswordMatch(password, user.password);
        const emailChanged = email.trim() !== user.email;

        if (emailChanged && (await isEmailTaken(email, userID))) {
            return res.status(409).json({ error: "Email is already in use." });
        }

        await users.updateOne(
            { _id: ObjectId.createFromHexString(userID) },
            {
                $set: {
                    firstname: firstname.trim(),
                    lastname: lastname.trim(),
                    email: email.trim(),
                    ...(emailChanged ? { verified: false } : {})
                }
            }
        );

        if (emailChanged) await sendVerificationEmail(email);

        return res.status(200).json({
            message: emailChanged
                ? "Profile updated. Please verify your new email."
                : "Profile updated successfully.",
        });
    } catch (err) {
        const msg = err.message === "Incorrect password." ? err.message : "Internal server error.";
        console.error("Update error:", err);
        return res.status(500).json({ error: msg });
    }
});


// Change password endpoint
router.put("/change-password", authenticateJWT, async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const userID = req.user.userID;

    // Basic input check
    if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: "Both current and new passwords are required." });
    }

    // Password strength validation (min 6 chars, includes letter & number)
    const passwordRegex = /^(?=.*[a-zA-Z])(?=.*\d).{6,}$/;
    if (!passwordRegex.test(newPassword)) {
        return res.status(400).json({
            error: "Password must be at least 6 characters and include both letters and numbers."
        });
    }

    try {
        const users = db.collection("users");

        // Find user by ID
        const user = await users.findOne({ _id: ObjectId.createFromHexString(userID) });
        if (!user) return res.status(404).json({ error: "User not found." });

        // Check current password
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: "Incorrect current password." });
        }

        // Check if new password is same as old
        const isSame = await bcrypt.compare(newPassword, user.password);
        if (isSame) {
            return res.status(400).json({ error: "New password must be different from the current password." });
        }

        // Hash new password and update
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await users.updateOne(
            { _id: ObjectId.createFromHexString(userID) },
            { $set: { password: hashedPassword } }
        );

        // Send email notification
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.GMAIL_ADDRESS,
                pass: process.env.GOOGLE_APP_PASSWORD,
            },
        });

        await transporter.sendMail({
            from: `"Old Phone Deals" <${process.env.GMAIL_ADDRESS}>`,
            to: user.email,
            subject: "Your password has been changed",
            text: `Hi ${user.firstname}, your password was successfully changed. If this wasn't you, please contact support immediately.`,
            html: `<p>Hi ${user.firstname},</p>
               <p>This is a confirmation that your password was successfully changed.</p>
               <p>If this wasn't you, please <strong>contact support immediately</strong>.</p>`,
        });

        return res.status(200).json({ message: "Password changed successfully." });
    } catch (err) {
        console.error("Error changing password", err);
        return res.status(500).json({ error: "Server error while changing password." });
    }
});

// TODO: Reset password endpoint for later

export default router;