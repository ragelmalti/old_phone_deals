// users.js
import express from "express";
import authenticateJWT from "../middleware/authentication.js";

// This will help us connect to the database
import {db, client} from "../db/connection.js";

// This help convert the id from string to ObjectId for the _id.
import { ObjectId } from "mongodb";

// router is an instance of the express router.
// We use it to define our routes.
// The router will be added as a middleware and will take control of requests starting with path /record.
const router = express.Router();

// This section will help you get a list of all the records.
router.get("/", async (req, res) => {
  let collection = await db.collection("users");
  let results = await collection.find({}).toArray();
  res.send(results).status(200);
});

// This section will help you get a single record by id
router.get("/:id", async (req, res) => {
  let collection = await db.collection("users");
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

// GET user listings
router.get("/:id/listings", async (req, res) => {
    const userId = req.params.id;
    const phones = db.collection("phones");
  
    try {
      const results = await phones
        .find({ seller: userId }) // seller is a string ID in dataset
        .toArray();
      res.status(200).json(results);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to retrieve listings" });
    }
  });

// GET all comments (including hidden) for each phone listing owned by the user
router.get("/:id/comments", authenticateJWT, async (req, res) => {
    const userId = req.params.id;

    try {
        const phones = db.collection("phones");
        const users = db.collection("users");

        // Only return the necessary fields: title, image, and reviews
        // - .project() is used to select specific fields from each document.
        // - 1 to include a field, 0 to exclude a field (not used here)
        const listings = await phones
            .find({ seller: userId })
            .project({ title: 1, image: 1, reviews: 1 }) 
            .toArray();

        // for each listing, attach reviewer names to each comment
        // - Promise.all() is used to handle asynchronous operations
        const comments = await Promise.all(
            listings.map(async (listing) => {
                // map over all reviews on a listing
                const reviewsWithNames = await Promise.all(
                    (listing.reviews || []).map(async (review) => {
                        let reviewer = "unknown";

                        try {
                            // Look up the user who wrote the review
                            const user = await users.findOne(
                                { _id: new ObjectId(review.reviewer) },
                                { projection: { firstname: 1, lastname: 1 } }
                            );

                            // If found, attach their name
                            if (user) {
                                reviewer = `${user.firstname} ${user.lastname}`.trim();
                            }
                        } catch (err) {
                            console.warn("Could not fetch reviewer name:", review.reviewer);
                        }

                        // Return the review enriched with the reviewer's name
                        return {
                            ...review,
                            reviewer,
                        };
                    })
                );

                // Return this phone listing with its enriched reviews
                return {
                    phoneId: listing._id,
                    title: listing.title,
                    image: listing.image,
                    reviews: reviewsWithNames,
                };
            })
        );


        // Return the formatted list of comments to the client
        res.status(200).json(comments);
    } catch (err) {
        console.error("Failed to fetch user comments", err);
        // Send a 500 error if anything goes wrong
        res.status(500).json({ error: "Error retrieving comments." });
    }
});



export default router;