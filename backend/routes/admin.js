// backend/routes/admin.js
import express from "express";
import { ObjectId } from "mongodb";
import { db } from "../db/connection.js";
import authenticateJWT from "../middleware/authentication.js";
import auditLogger from "../middleware/audit.js";
import notificationsRouter from "./notifications.js";

const router = express.Router();
router.use(authenticateJWT, auditLogger);
router.use("/notifications", notificationsRouter);

// function to build a case-insensitive regex filter
function makeRegexFilter(fields, search) {
  const re = new RegExp(search, "i");
  return {
    $or: fields.map(f => ({ [f]: re }))
  };
}


// users

// GET /api/admin/users?search=foo
// Returns all users without password, including registrationDate and lastLogin
router.get("/users", authenticateJWT, async (req, res) => {
  const { search } = req.query;
  const filter = search
    ? makeRegexFilter(["firstname","lastname","email"], search)
    : {};
  const users = await db
    .collection("users")
    .find(filter, {
      projection: {
        password: 0    
      }
    })
    .toArray();
  res.json(users);
});

// PUT /api/admin/users/:id
// Edit any user fields (firstname, lastname, email, role, disabled)
router.put("/users/:id", authenticateJWT, async (req, res) => {
  const { id } = req.params;
  // Only pick allowed fields from the body
  const up = {};
  ["firstname","lastname","email","role","disabled"].forEach(k => {
    if (req.body[k] !== undefined) up[k] = req.body[k];
  });
  await db
    .collection("users")
    .updateOne({ _id: new ObjectId(id) }, { $set: up });
  // Return the updated document without password
  const updated = await db
    .collection("users")
    .findOne(
      { _id: new ObjectId(id) },
      { projection: { password: 0 } }
    );
  res.json(updated);
});

router.put("/users/:id/disable", authenticateJWT, async (req, res) => {
   // Expect body: { disabled: boolean }
   const { disabled } = req.body;
   if (typeof disabled !== "boolean") {
     return res.status(400).json({ error: "Must send { disabled: true|false }" });
   }

   const result = await db
     .collection("users")
     .updateOne(
       { _id: new ObjectId(req.params.id) },
       { $set: { disabled } }
     );

   if (result.matchedCount === 0) {
    return res.status(404).json({ error: "User not found" });
  }
   res.json({ success: true, disabled });
 });

// DELETE /api/admin/users/:id
router.delete("/users/:id", authenticateJWT, async (req, res) => {
  await db
    .collection("users")
    .deleteOne({ _id: new ObjectId(req.params.id) });
  res.json({ success: true });
});


// listings

// GET /api/admin/listings?search=bar
router.get("/listings", authenticateJWT, async (req, res) => {
  const { search } = req.query;

  // build filter
  const pipeline = [];
  if (search) {
    const filter = makeRegexFilter(["title","brand"], search);
    pipeline.push({ $match: filter });
  }

  // cast seller to object id
  pipeline.push({
    $addFields: {
      sellerObjId: { $toObjectId: "$seller" }
    }
  });

  // join in user document
  pipeline.push({
    $lookup: {
      from: "users",
      localField: "sellerObjId",
      foreignField: "_id",
      as: "sellerInfo"
    }
  });

  // flatten array
  pipeline.push({ $unwind: "$sellerInfo" });

  // project only needed
  pipeline.push({
    $project: {
      title: 1,
      brand: 1,
      image: 1,
      price: 1,
      stock: 1,
      disabled: 1,
      // original seller id
      seller: 1,
      // the two new fields
      sellerFirstname: "$sellerInfo.firstname",
      sellerLastname:  "$sellerInfo.lastname"
    }
  });

  // run aggregation
  const listings = await db
    .collection("phones")
    .aggregate(pipeline)
    .toArray();

  res.json(listings);
});

// PUT /api/admin/listings/:id
// Edit fields (title, brand, price, stock, disabled)
router.put("/listings/:id", authenticateJWT, async (req, res) => {
  const { id } = req.params;
  const up = {};
  ["title","brand","price","stock","disabled"].forEach(k => {
    if (req.body[k] !== undefined) up[k] = req.body[k];
  });
  await db
    .collection("phones")
    .updateOne({ _id: new ObjectId(id) }, { $set: up });
  const updated = await db
    .collection("phones")
    .findOne({ _id: new ObjectId(id) });
  res.json(updated);
});

// PUT /api/admin/listings/:id/disable
router.put("/listings/:id/disable", authenticateJWT, async (req, res) => {
  await db
    .collection("phones")
    .updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { disabled: true } }
    );
  res.json({ success: true });
});

// DELETE /api/admin/listings/:id
router.delete("/listings/:id", authenticateJWT, async (req, res) => {
  await db
    .collection("phones")
    .deleteOne({ _id: new ObjectId(req.params.id) });
  res.json({ success: true });
});

// GET /api/admin/users/:id/listings
router.get("/users/:id/listings", async (req, res) => {
  const userId = new ObjectId(req.params.id);
  const listings = await db.collection("phones")
    .find({ seller: userId })
    .toArray();
  res.json(listings);
});

/**
 * GET /api/admin/users/:id/reviews
 * Return all reviews made by a given user, linking to listing titles.
 */
router.get('/users/:id/reviews', async (req, res) => {
  try {
    const userIdStr = req.params.id;
    const userId = new ObjectId(userIdStr);
    // Fetch user to confirm existence and get name
    const user = await db.collection('users').findOne(
      { _id: userId },
      { projection: { firstname: 1, lastname: 1 } }
    );
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Since reviews.reviewer stored as string in JSON import, match on string
    const phones = await db.collection('phones')
      .find({ 'reviews.reviewer': userIdStr })
      .project({ title: 1, reviews: 1 })
      .toArray();

    // Flatten and link
    const userReviews = phones.flatMap(phone =>
      phone.reviews
        .map((r, idx) => ({ ...r, idx }))
        .filter(r => r.reviewer === userIdStr)
        .map(r => ({
          listingId:    phone._id,
          listingTitle: phone.title,
          rating:       r.rating,
          comment:      r.comment,
          hidden:       !!r.hidden,
          reviewIndex:  r.idx
        }))
    );

    return res.json(userReviews);
  } catch (err) {
    console.error('Error fetching user reviews:', err);
    return res.status(500).json({ error: 'Failed to load reviews' });
  }
});

/**
 * GET /api/admin/reviews?search=<>&showHidden=<true|false>
 * Return all reviews across listings, with optional search and hidden filter.
 */
router.get('/reviews', async (req, res) => {
  try {
    const { search, showHidden } = req.query;
    const pipeline = [];

    // 1) unwind your reviews arrays
     pipeline.push({ $unwind: { path: '$reviews', includeArrayIndex: 'reviewIndex' } });

    // 2) cast the string reviewer ID to a real ObjectId
    pipeline.push({
      $addFields: {
        'reviews.reviewerObj': { $toObjectId: '$reviews.reviewer' }
      }
    });

    // 3) (optional) filter hidden
    if (showHidden !== 'true') {
      pipeline.push({ $match: { 'reviews.hidden': { $ne: true } } });
    }

    // lookup against users using the new ObjectId field
    pipeline.push({
      $lookup: {
        from:       'users',
        localField: 'reviews.reviewerObj',
        foreignField:'_id',
        as:         'rev'
      }
    });
    pipeline.push({ $unwind: '$rev' });

    // optional search on comment or listing title
    if (search) {
    pipeline.push({
      $match: {
        $or: [
          { title:       { $regex: search, $options: 'i' } },     // listing title
          { 'rev.firstname': { $regex: search, $options: 'i' } }, // reviewer first
          { 'rev.lastname':  { $regex: search, $options: 'i' } }  // reviewer last
        ]
      }
    });
  }

    // project exactly what is needed
    pipeline.push({
      $project: {
        listingId:    { $toString: '$_id' },
        listingTitle: '$title',
        rating:       '$reviews.rating',
        comment:      '$reviews.comment',
        hidden:       '$reviews.hidden',
        reviewIndex: '$reviewIndex',
        reviewerName: { $concat: ['$rev.firstname',' ','$rev.lastname'] }
      }
    });

    const all = await db.collection('phones').aggregate(pipeline).toArray();
    return res.json(all);
  } catch (err) {
    console.error('Error fetching reviews:', err);
    return res.status(500).json({ error: 'Failed to load reviews' });
  }
});


/**
 * PUT /api/admin/reviews/:listingId/:reviewIndex/visibility
 * Toggle the hidden flag on a specific review.
 */
router.put('/reviews/:listingId/:reviewIndex/visibility', async (req, res) => {
  try {
    const { listingId, reviewIndex } = req.params;
    const { hidden } = req.body;
    await db.collection('phones').updateOne(
      { _id: new ObjectId(listingId) },
      { $set: { [`reviews.${reviewIndex}.hidden`]: Boolean(hidden) } }
    );
    return res.json({ success: true });
  } catch (err) {
    console.error('Error toggling review visibility:', err);
    return res.status(500).json({ error: 'Failed to update review visibility' });
  }
});

// GET /api/admin/transactions
router.get("/transactions", async (req, res) => {
  const { from, to } = req.query;
  const filter = {};

  if (from || to) {
    filter.timestamp = {};
    if (from) filter.timestamp.$gte = new Date(from);
    if (to)   filter.timestamp.$lte = new Date(to);
  }

  const txs = await db.collection("transactions").aggregate([
    { $match: filter },
    {
      $lookup: {
        from: "users",
        localField: "buyerID",      // field in transactions
        foreignField: "_id",        // field in users
        as: "buyerInfo"
      }
    },
    {
      $unwind: {
        path: "$buyerInfo",
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $addFields: {
        buyerName: {
          $cond: [
            { $ifNull: ["$buyerInfo", false] },
            { $concat: ["$buyerInfo.firstname", " ", "$buyerInfo.lastname"] },
            null
          ]
        }
      }
    },
    {
      $project: {
        buyerInfo: 0  // remove the joined user object
      }
    }
  ]).toArray();

  res.json(txs);
});

// GET /api/admin/transactions/export?format=csv
router.get("/transactions/export", async (req, res) => {
  const format = req.query.format || "json";
  const txs = await db.collection("transactions").find({}).toArray();
  if (format === "csv") {
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=sales.csv");
    // export csv
    const header = Object.keys(txs[0]).join(",") + "\n";
    const lines = txs.map(t =>
      [
        t.timestamp.toISOString(),
        t.buyerName,
        JSON.stringify(t.cart.map(i => `${i.name}(${i.quantity})`)),
        t.total
      ].join(",")
    ).join("\n");
    return res.send(header + lines);
  } else {
    return res.json(txs);
  }
});



export default router;
