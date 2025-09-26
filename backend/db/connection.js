import bcrypt from 'bcryptjs';
import { MongoClient, ServerApiVersion, ObjectId} from "mongodb";
import dotenv from 'dotenv';
dotenv.config();

console.log("Using ATLAS_URI =", process.env.ATLAS_URI);

const uri = process.env.ATLAS_URI || "";
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: false,
    deprecationErrors: true,
  },
});

try {
  // Connect the client to the server
  await client.connect();
  // Send a ping to confirm a successful connection
  await client.db(process.env.DATABASE_NAME).command({ ping: 1 });
  console.log(
   "Pinged your deployment. You successfully connected to MongoDB!"
  );

  // hardcode admin user into database

  const usersCol = client.db(process.env.DATABASE_NAME).collection('users');
  const adminEmail = process.env.ADMIN_EMAIL;  
  const existing   = await usersCol.findOne({ email: adminEmail });

  if (!existing) {
    // Hash the password
    const plainPw = process.env.ADMIN_PASSWORD;
    const salt = await bcrypt.genSalt(10);
    const hash    = await bcrypt.hash(plainPw, salt);
    const now  = new Date(); 
    // Build the document
    const adminDoc = {
      // _id: new ObjectId(process.env.ADMIN_ID),
      firstname: process.env.ADMIN_FIRSTNAME,
      lastname:  process.env.ADMIN_LASTNAME,
      email:     adminEmail,
      password:  hash,
      verified: true,
      cart: [],
      registrationDate: now,
      lastLogin:        now,
      wishlist: [],
      role:      "admin"
    };

    await usersCol.insertOne(adminDoc);
    console.log('Seeded admin user:', adminEmail);
  } else {
    console.log(' Admin user already exists, skipping seed.');
  }
  
} catch(err) {
  console.error(err);
}

let db = client.db(`${process.env.DATABASE_NAME}`);

export {db, client};