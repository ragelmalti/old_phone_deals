import express from "express";

// This will help us connect to the database
import { db, client } from "../db/connection.js";

// This help convert the id from string to ObjectId for the _id.
import { ObjectId } from "mongodb";

// This will help validate input when adding a new phone
import { body, validationResult } from "express-validator";

// This will help us authenticate users
import authenticateJWT from "../middleware/authentication.js";

// router is an instance of the express router.
// We use it to define our routes.
// The router will be added as a middleware and will take control of requests starting with path /record.
const router = express.Router();

// Validation middleware for new phone fields
const validateNewListing = [
    body("title").trim().notEmpty().withMessage("Title is required"),
    body("brand").trim().notEmpty().withMessage("Brand is required"),
    body("price").isFloat({ gt: 0 }).withMessage("Price must be a positive number"),
    body("stock").isInt({ min: 0 }).withMessage("Stock must be a non-negative integer"),
    body("image").trim().notEmpty().withMessage("Image is required"),
    body("seller").trim().notEmpty().withMessage("Seller is required"),
];


// get phone list based on search and filter results
router.get("/", async (req, res) => {
    let { search, brand, maxPrice } = req.query;

    let query = { disabled: { $ne: true } };

    if (search) {
        query.$or = [
            { title: { $regex: search, $options: "i" } },
        ];
    }

    if (brand) {
        query.brand = brand;
    }

    if (maxPrice) {
        query.price = { $lte: Number(maxPrice) };
    }

    let phones = db.collection("phones");

    try {
        const results = await phones.aggregate([
            { $match: query },
            {
                $project: {
                    title: 1,
                    brand: 1,
                    image: 1,
                    stock: 1,
                    price: 1,
                    averageRating: {
                        $cond: [
                            { $gte: [{ $size: "$reviews" }, 2] },
                            { $avg: "$reviews.rating" },
                            null,
                        ],
                    },
                },
            }
        ]).toArray();

        res.status(200).send(results);

    } catch (err) {
        console.error("Failed to fetch phones with seller info", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

// get unique phone brand names and max price
router.get("/metadata", async (req, res) => {
    let collection = await db.collection("phones");

    const brandsPromise = collection.distinct("brand", { disabled: { $ne: true } });
    const maxPricePromise = collection
        .find({ disabled: { $ne: true } })
        .sort({ price: -1 })
        .limit(1)
        .toArray();

    const [brands, maxPriceResult] = await Promise.all([brandsPromise, maxPricePromise]);

    const maxPrice = maxPriceResult.length > 0 ? maxPriceResult[0].price : 0;

    res.status(200).json({ brands, maxPrice });
});

// get 5 phones with the least quantity (> 0 and not disabled)
router.get("/soldoutsoon", async (req, res) => {
    const collection = await db.collection("phones");
    const results = await collection
        .find({ stock: { $gt: 0 }, disabled: { $ne: true } })
        .sort({ stock: 1 })
        .limit(5)
        .toArray();

    res.status(200).json(results);
});

// get 5 phones with the highest average rating (min 2 ratings)
router.get("/bestsellers", async (req, res) => {
    const collection = await db.collection("phones");

    const results = await collection
        .aggregate([
            { $match: { disabled: { $ne: true } } },
            {
                $project: {
                    image: 1,
                    title: 1,
                    price: 1,
                    reviews: 1,
                    averageRating: {
                        $cond: [
                            { $gte: [{ $size: "$reviews" }, 2] },
                            { $avg: "$reviews.rating" },
                            null,
                        ],
                    },
                },
            },
            { $match: { averageRating: { $ne: null } } },
            { $sort: { averageRating: -1 } },
            { $limit: 5 },
        ])
        .toArray();

    res.status(200).json(results);
});

router.get("/:id/details", async (req, res) => {
    const phones = db.collection("phones");
    const users = db.collection("users");

  try {
    const phone = await phones.aggregate([
      { $match: { _id: new ObjectId(req.params.id) } },
      {
        $lookup: {
          from: "users",
          let: { sellerId: { $toObjectId: "$seller" } },
          pipeline: [
            { $match: { $expr: { $eq: ["$_id", "$$sellerId" ] } } },
            { $project: { firstname: 1, lastname: 1 } }
          ],
          as: "sellerInfo"
        }
      },
      { $unwind: {
        path: "$sellerInfo",
        preserveNullAndEmptyArrays: true 
        }
      },
      {
        $addFields: {
          reviews: {
            $map: {
              input: { $ifNull: ["$reviews", []] },
              as: "review",
              in: {
                rating: "$$review.rating",
                comment: "$$review.comment",
                hidden: { $ifNull: ["$$review.hidden", false] },
                reviewer: "$$review.reviewer"
              }
            }
          }
        }
      },
      {
        $project: {
          title: 1,
          brand: 1,
          image: 1,
          stock: 1,
          price: 1,
          sellerInfo: {
            firstname: "$sellerInfo.firstname",
            lastname: "$sellerInfo.lastname"
          },
          reviews: 1
        }
      }
    ]).toArray();

        if (!phone[0]) {
            return res.status(404).send("Not found");
        }

        const fullPhone = phone[0];

        const reviewerIds = fullPhone.reviews
            .map(r => r.reviewer)
            .filter(Boolean)
            .map(id => new ObjectId(id));

        const reviewers = await users
            .find({ _id: { $in: reviewerIds } })
            .project({ firstname: 1, lastname: 1 })
            .toArray();

        const reviewerMap = Object.fromEntries(
            reviewers.map(u => [u._id.toString(), `${u.firstname} ${u.lastname}`])
        );

        fullPhone.reviews = fullPhone.reviews.map(r => ({
            ...r,
            fullname: reviewerMap[r.reviewer?.toString()] || "Unknown"
        }));

        res.status(200).json(fullPhone);
    } catch (err) {
        console.error("Failed to fetch detailed phone info", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

// This section will help you get a single record by id
router.get("/:id", async (req, res) => {
    let collection = await db.collection("phones");
    let query = { _id: new ObjectId(req.params.id) };
    let result = await collection.findOne(query);

    if (!result) res.send("Not found").status(404);
    else res.send(result).status(200);
});


/* 
// This section will help you create a new record.
router.post("/", async (req, res) => {
  try {
    let newDocument = {
      name: req.body.name,
      position: req.body.position,
      level: req.body.level,
    };
    let collection = await db.collection("records");
    let result = await collection.insertOne(newDocument);
    res.send(result).status(204);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error adding record");
  }
});

// This section will help you update a record by id.
router.patch("/:id", async (req, res) => {
  try {
    const query = { _id: new ObjectId(req.params.id) };
    const updates = {
      $set: {
        name: req.body.name,
        position: req.body.position,
        level: req.body.level,
      },
    };

    let collection = await db.collection("records");
    let result = await collection.updateOne(query, updates);
    res.send(result).status(200);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error updating record");
  }
});

// This section will help you delete a record
router.delete("/:id", async (req, res) => {
  try {
    const query = { _id: new ObjectId(req.params.id) };

    const collection = db.collection("records");
    let result = await collection.deleteOne(query);

    res.send(result).status(200);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error deleting record");
  }
});
*/

// PATCH to toggle enable/disable a phone listing
router.patch("/:id", async (req, res) => {
    // Get the phone listing ID from the URL parameter
    const phoneId = req.params.id;
    // Extract the 'disabled' value from the request body
    const { disabled } = req.body;

    // Access the 'phones' collection in the database
    const phones = db.collection("phones");

    // Update the specified phone's 'disabled' status
    const result = await phones.updateOne(
        { _id: new ObjectId(phoneId) },     // Match document by ID
        { $set: { disabled } }              // Set the new 'disabled' value
    );

    // Respond with success or error message based on result
    if (result.modifiedCount === 1) {
        return res.status(200).json({ message: "Listing updated" });
    } else {
        return res.status(500).json({ error: "Failed to update" });
    }
});

// DELETE a phone listing by ID
router.delete("/:id", async (req, res) => {
    // Get the phone listing ID from the URL parameter
    const phoneId = req.params.id;

    // Access the 'phones' collection in the database
    const phones = db.collection("phones");

    // Attempt to delete the specified listing
    const result = await phones.deleteOne({ _id: new ObjectId(phoneId) });

    // Respond with success or error message based on result
    if (result.deletedCount === 1) {
        return res.status(200).json({ message: "Listing deleted" });
    } else {
        return res.status(500).json({ error: "Failed to delete" });
    }
});

// Create a new phone listing
router.post("/", validateNewListing, async (req, res) => {
    try {
        // Check for errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }


        // Destructure the expected fields from the request body
        const { title, brand, price, stock, image, seller, reviews } = req.body;

        // Basic validation to ensure all required fields are present
        if (!title || !brand || !price || !stock || !image || !seller) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        // Construct the new phone listing object
        const newListing = {
            title,
            brand,
            price: Number(price),           // Ensure price is stored as a number
            stock: Number(stock),           // Ensure stock is stored as a number
            image,                          // Path or URL to image
            seller,                         // ID of the user creating the listing
            reviews: reviews || [],         // Optional: initialize reviews if not provided
            disabled: false                 // Default to active (not disabled)
        };

        // Insert the new listing into the 'phones' collection
        const collection = await db.collection("phones");
        const result = await collection.insertOne(newListing);

        // Respond with the newly created listing (including the generated _id)
        res.status(201).json({ _id: result.insertedId, ...newListing });

    } catch (err) {
        // Catch and log any server-side errors
        console.error("Error inserting listing:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Toggle review visibility
router.patch("/:phoneId/reviews/:index", async (req, res) => {
    const { phoneId, index } = req.params;
    const { hidden } = req.body;

    // Basic type check
    if (typeof hidden !== "boolean") {
        return res.status(400).json({ error: "Hidden must be a boolean value." });
    }

    try {
        const phones = db.collection("phones");

        // Get the phone listing
        const phone = await phones.findOne({ _id: new ObjectId(phoneId) });
        if (!phone) {
            return res.status(404).json({ error: "Phone listing not found." });
        }

        const i = parseInt(index);
        if (!Array.isArray(phone.reviews) || i < 0 || i >= phone.reviews.length) {
            return res.status(400).json({ error: "Invalid review index." });
        }

        // Modify review in place
        phone.reviews[i].hidden = hidden;

        // Save updated reviews
        const result = await phones.updateOne(
            { _id: new ObjectId(phoneId) },
            { $set: { reviews: phone.reviews } }
        );

        if (result.modifiedCount === 1) {
            res.status(200).json({ message: "Review visibility updated." });
        } else {
            res.status(500).json({ error: "Failed to update review." });
        }
    } catch (err) {
        console.error("Error updating review visibility", err);
        res.status(500).json({ error: "Server error." });
    }
});


// Add a new phone review
// - requires authentication
router.post("/:id/reviews", authenticateJWT, async (req, res) => {
  const { id } = req.params;
  const { rating, comment } = req.body;

  if (!rating || !comment) {
    return res.status(400).json({ error: "Rating and comment required." });
  }

  const userID = req.user.userID;
  const users = db.collection("users");

  // Get the user's full name
  const user = await users.findOne(
    { _id: new ObjectId(userID) },
    { projection: { firstname: 1, lastname: 1 } }
  );

  if (!user) {
    return res.status(404).json({ error: "User not found." });
  }

  const review = {
    reviewer: userID,
    rating,
    comment
  };

  await db.collection("phones").updateOne(
    { _id: new ObjectId(id) },
    { $push: { reviews: review } }
  );

  // Return full name so frontend can immediately display it
  res.status(200).json({ 
    message: "Review added.", 
    review: {
      reviewer: userID,
      rating,
      comment,
      fullname: `${user.firstname} ${user.lastname}`
    }
  });
});


export default router;