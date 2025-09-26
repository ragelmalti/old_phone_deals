import express from "express";
import authenticateJWT from "../middleware/authentication.js";
import { db } from "../db/connection.js";
import { ObjectId } from "mongodb";

const router = express.Router();

// Fetches full phone info for all items in the user's wishlist
router.get("/", authenticateJWT, async (req, res) => {
  try {
    const userID = req.user.userID;

    // Get wishlist from user's document (ie. row in the users collection)
    // - userID is the ID of the user making the request
    // - ObjectId is the default unique identifier used for documents in a collection
    const user = await db.collection("users").findOne(
      { _id: new ObjectId(userID) },
      { projection: { wishlist: 1 } }
    );

    const wishlistIds = (user?.wishlist || []).map(id => new ObjectId(id));

    // Fetch phones in wishlist
    const phones = await db.collection("phones")
      .find({ _id: { $in: wishlistIds } })
      .project({ title: 1, price: 1, brand: 1, stock: 1, image: 1 })
      .toArray();

    res.status(200).json(phones);
  } catch (err) {
    console.error("Error fetching wishlist", err);
    res.status(500).json({ error: "Failed to fetch wishlist." });
  }
});


// Adds a phone to the user's wishlist by phone ID.
router.post("/:phoneId", authenticateJWT, async (req, res) => {
  try {
    const userID = req.user.userID;
    const phoneId = req.params.phoneId;

    // Adds phoneId to wishlist array
    // - uses $addToSet to prevent duplicate entries.
    await db.collection("users").updateOne(
      { _id: new ObjectId(userID) },
      { $addToSet: { wishlist: phoneId } } 
    );

    return res.status(200).json({ message: "Added to wishlist" });
  } catch (err) {
    console.error("Error adding to wishlist", err);
    return res.status(500).json({ error: "Failed to add to wishlist." });
  }
});

// Removes a phone from the user's wishlist by phone ID.
router.delete("/:phoneId", authenticateJWT, async (req, res) => {
  try {
    const userID = req.user.userID;
    const phoneId = req.params.phoneId;

    await db.collection("users").updateOne(
      { _id: new ObjectId(userID) },
      { $pull: { wishlist: phoneId } } // Removes the phoneId from wishlist array
    );

    return res.status(200).json({ message: "Removed from wishlist" });
  } catch (err) {
    console.error("Error removing from wishlist", err);
    return res.status(500).json({ error: "Failed to remove from wishlist." });
  }
});

export default router;
