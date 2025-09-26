import express from "express";
import { body, query, validationResult } from 'express-validator';

import {db, client} from "../db/connection.js";
import authenticateJWT from "../middleware/authentication.js"

import { ObjectId } from "mongodb";

const router = express.Router();

// Return the details of a user's cart, from their user token
// TODO: Add an optional paramater to select userID if you're an admin instead
router.get("/", authenticateJWT, async (req, res) => {
    // Not sure if we need to do much error checking
    // We only need to do error checking for the admin
    // When he wants to get the cart contents of different users
    const userID = req.user.userID;
    let userCollection = await db.collection("users"); 
    let phoneCollection = await db.collection("phones"); 
    // ObjectID fix taken from stack overflow:
    // https://stackoverflow.com/questions/78254051/the-signature-inputid-number-objectid-of-objectid-is-deprecated-use-sta
    let cart = await userCollection.findOne({ _id: ObjectId.createFromHexString(userID) }, { projection: {cart: 1, _id: 0}});
    let total = 0.0
    for (let item of cart.cart) {
      console.log(item)
      let existingItem = await phoneCollection.findOne({ _id: item.itemID});
      if (!existingItem) {
        console.warn(`Cart skip: phone ${item.itemID} not found`);
        continue; 
      }
      let seller = await userCollection.findOne({_id: ObjectId.createFromHexString(existingItem.seller)})
      item.name = existingItem.title
      item.brand = existingItem.brand
      item.image = existingItem.image
      item.price = existingItem.price * item.quantity
      total += (existingItem.price * item.quantity)
      item.sellerID = seller._id
      item.sellerName = `${seller.firstname} ${seller.lastname}`
    }
    cart.total = total
    return res.status(200).send(cart)
})

router.get("/quantity", authenticateJWT, async (req, res) => {
  // Number of items in the cart
  const userID = req.user.userID;
  let userCollection = await db.collection("users"); 
  let phoneCollection = await db.collection("phones"); 
  // ObjectID fix taken from stack overflow:
  // https://stackoverflow.com/questions/78254051/the-signature-inputid-number-objectid-of-objectid-is-deprecated-use-sta
  let cart = await userCollection.findOne({ _id: ObjectId.createFromHexString(userID) }, { projection: {cart: 1, _id: 0}});
  let quantity = 0
  for (let item of cart.cart) {
    quantity += item.quantity
  }
  return res.status(200).send(quantity)
})

// For adding and updating the cart 
const cartValidation = [
  body('cart')
    .isArray({min: 1}).withMessage("Cart needs to be an array with at least one item")
    .bail(), // Stops other validations if cart array is not detected
  body('cart.*.itemID').isMongoId().withMessage("itemID needs to be a MongoDB Object ID"),
  body('cart.*.quantity')
    .isInt({gt: 0}).withMessage("Quantity needs to be an integer value greater than zero")
]

// TODO: Add an optional paramater to select userID if you're an admin instead
// Add will also be used for updating elements in the cart, to save on endpoints
// Maybe I should just make it a general update method that takes in a JSON with
// the desired cart contents.
// Is able to do adds, quantity changes, deletes.
router.post("/add", authenticateJWT, cartValidation, async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array()});
  }
  const userID = req.user.userID;
  let userCollection = await db.collection("users"); 
  let phoneCollection = await db.collection("phones"); 
  let userCart = await userCollection.findOne({ _id: ObjectId.createFromHexString(userID) }, { projection: {cart: 1, _id: 0}});
  console.log(userCart.cart)
  /* We want to do checks for a few things:
    1. If the cart is empty
    2. If the item exists AND the quantity exists
    3. If the item already exists in cart
  */
  let reqCart = req.body.cart;
  let newCart;
  // Hopefully adding async doesn't break the function!!!
  const promises = reqCart.map(async (item) => {
    let existingItem = await phoneCollection.findOne({ _id: ObjectId.createFromHexString(item.itemID) });
    //console.log(existingItem)
    if(!existingItem) {
      return {error: `Item with ID ${item.itemID} not found`}
    }
    // Want to check if item exists already in the cart.
    let newQuantity = item.quantity
    let userItem = userCart.cart.find(userItem => userItem.itemID.equals(item.itemID))
    if(userItem) {
      console.log(`${item.itemID} exists in the user's cart!`)
      newQuantity += userItem.quantity
    }
    if(newQuantity > existingItem.stock) {
      // Might change error message later, it's a bit crap
      return {error: `Not enough stock for ${item.itemID}: You're adding ${newQuantity} when there's ${existingItem.stock}`}
    }
    // If else statement that checks if the items already exists in the cart.
    // There's probably a better way to do this, but I have no idea.

    // Updates if item already exists in cart
    newCart = await userCollection.updateOne(
      {_id: ObjectId.createFromHexString(userID), 
        'cart.itemID': ObjectId.createFromHexString(item.itemID)},
      {$set: {'cart.$.quantity': newQuantity}}    
    );

    if(newCart.matchedCount === 0) {
      newCart = await userCollection.updateOne(
        {_id: ObjectId.createFromHexString(userID)},
        {$push: {cart: {
          itemID: ObjectId.createFromHexString(item.itemID),
          quantity: newQuantity
        }}}
      );
    }
    //console.log(newCart)
    return { success: `Item with ID ${item.itemID} found and added to cart` };
  })

  const results = await Promise.all(promises);
  const errorsArray = results.filter(result => result.error);
  if (errorsArray.length > 0) {
    return res.status(404).json({errors: errorsArray});
  }
  
  // Might want to change status to reflect new cart
  userCart = await userCollection.findOne({ _id: ObjectId.createFromHexString(userID) }, { projection: {cart: 1, _id: 0}})
  return res.status(200).send(userCart)
});

// This method is only use to change the quantity of existing items
// TODO: If quantity zero, remove item from cart
router.post("/update", authenticateJWT, cartValidation, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array()});
  }
  const userID = req.user.userID;
  let userCollection = await db.collection("users"); 
  let phoneCollection = await db.collection("phones"); 
  let userCart = await userCollection.findOne({ _id: ObjectId.createFromHexString(userID) }, { projection: {cart: 1, _id: 0}});

  /* We want to check a few things:
    1. If the item we are updating exists in the cart, if not throw an error
    2. If the item quantity is zero
    3. If the item quantity is greater than stock, chuck an error
  */
  let reqCart = req.body.cart;
  const promises = reqCart.map(async (item) => {
    let existingItem = await phoneCollection.findOne({ _id: ObjectId.createFromHexString(item.itemID) });
    //console.log(existingItem)
    if(!existingItem) {
      return {error: `Item with ID ${item.itemID} not found in database`}
    }
    // Item must already exist in the cart
    let userItem = userCart.cart.find(userItem => userItem.itemID.equals(item.itemID))
    if(!userItem) {
      return {error: `${item.itemID} doesn't exist in the user's cart!`}
    }
    // Check if new quantity is greater than stock
    let newQuantity = item.quantity
    if(item.quantity > existingItem.stock) {
      // Might change error message later, it's a bit crap
      return {error: `Not enough stock for ${item.itemID}: You're adding ${newQuantity} when there's ${existingItem.stock}`}
    }
    // If else statement that checks if the items already exists in the cart.
    // There's probably a better way to do this, but I have no idea.
    // Updates if item already exists in cart
    let newCart = await userCollection.updateOne(
      {_id: ObjectId.createFromHexString(userID), 
        'cart.itemID': ObjectId.createFromHexString(item.itemID)},
      {$set: {'cart.$.quantity': newQuantity}}    
    );

    return { success: `Item with ID ${item.itemID} found and added to cart` };
  })

  const results = await Promise.all(promises);
  const errorsArray = results.filter(result => result.error);
  if (errorsArray.length > 0) {
    return res.status(404).json({errors: errorsArray});
  }

  userCart = await userCollection.findOne({ _id: ObjectId.createFromHexString(userID) }, { projection: {cart: 1, _id: 0}})
  return res.status(200).send(userCart)
});

const cartDeleteValidation = [
  body('cart')
    .isArray({min: 1}).withMessage("Cart needs to be an array with at least one item")
    .bail(), // Stops other validations if cart array is not detected
  body('cart.*.itemID').isMongoId().withMessage("itemID needs to be a MongoDB Object ID"),
]
// TODO: Create cart deletion method
router.post("/delete", authenticateJWT, cartDeleteValidation, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array()});
  }

  const userID = req.user.userID;
  let userCollection = await db.collection("users"); 
  let phoneCollection = await db.collection("phones"); 
  let userCart = await userCollection.findOne({ _id: ObjectId.createFromHexString(userID) }, { projection: {cart: 1, _id: 0}});

  let reqCart = req.body.cart;
  const promises = reqCart.map(async (item) => {
    let existingItem = await phoneCollection.findOne({ _id: ObjectId.createFromHexString(item.itemID) });
    if(!existingItem) {
      return {error: `Item with ID ${item.itemID} not found in database`}
    }
    
    let userItem = userCart.cart.find(userItem => userItem.itemID.equals(item.itemID))
    if(!userItem) {
      return {error: `${item.itemID} doesn't exist in the user's cart!`}
    }
    let newCart = await userCollection.updateOne(
      {_id: ObjectId.createFromHexString(userID), 
        'cart.itemID': ObjectId.createFromHexString(item.itemID)},
      {$pull: {cart: {itemID: ObjectId.createFromHexString(item.itemID)}}}    
    );
  });
  
  userCart = await userCollection.findOne({ _id: ObjectId.createFromHexString(userID) }, { projection: {cart: 1, _id: 0}})
  return res.status(200).send(userCart)
});

// TODO: Checkout endpoint 
// TODO: Add itemID to error message
router.get("/checkout", authenticateJWT, async (req, res) => {
  // We first want to check if the items in the user's cart 
  // are in stock in the database.
  // Once that's done, then we want to process the checkout
  const userID = req.user.userID;
  const userName = `${req.user.firstname} ${req.user.lastname}`;
  let userCollection = await db.collection("users"); 
  let phoneCollection = await db.collection("phones");
  let transactionCollection = await db.collection("transactions");
  
  let userCart = await userCollection.findOne({ _id: ObjectId.createFromHexString(userID) }, { projection: {cart: 1, _id: 0}});
  if(!userCart) {
    return res.status(404).json({error: "Cart not found!"})
  }

  const lostInThePromises = userCart.cart.map(async (item) => {
    let existingItem = await phoneCollection.findOne({ _id: item.itemID });
    if(!existingItem) {
      return {error: `Item with ID: ${item.itemID} not found!`};
    }
    if(item.quantity > existingItem.stock) {
      return {error: `Not enough stock for ${item.itemID}: You're buying ${item.quantity} when there's ${existingItem.stock}`}
    }
    return { success: `Item with ID ${item.itemID} can be purchased` };
  });
  
  const stockCheckResults = await Promise.all(lostInThePromises);
  const errorsArray = stockCheckResults.filter(result => result.error);
  if (errorsArray.length > 0) {
    return res.status(400).json({errors: errorsArray});
  }

  // Delete all the stock
  // TODO: Add error checking
  const promises = userCart.cart.map(async (item) => {
    let result = await db.collection("phones").updateOne(
      { _id: item.itemID }, // Find the product by _id
      { $inc: { stock: -(item.quantity) } } // Decrease the stock by 1
    );
    return {success: `Stock removed for ${item.itemID}`}
  });
  const results = await Promise.all(promises);
  console.log("Stock updated successfully:", results);
  
  // Create and return order details!
  /*
    View a log of all confirmed transactions with:
        Timestamp
        Buyer name
        Items purchased and quantities
        Total amount
    View notifications or a log when an order is placed
    Export sales history (CSV or JSON format)
  */

  let order = await userCollection.findOne({ _id: ObjectId.createFromHexString(userID) }, { projection: {cart: 1, _id: 0}});
  let total = 0.0
  for (let item of order.cart) {
    console.log(item)
    let existingItem = await phoneCollection.findOne({ _id: item.itemID});
    let seller = await userCollection.findOne({_id: ObjectId.createFromHexString(existingItem.seller)});
    item.name = existingItem.title
    item.brand = existingItem.brand
    item.image = existingItem.image
    item.price = existingItem.price * item.quantity
    total += (existingItem.price * item.quantity)
    item.sellerID = seller._id
    item.sellerName = `${seller.firstname} ${seller.lastname}`
  }
  order.total = total
  order.buyerID = ObjectId.createFromHexString(userID)
  order.buyerName = userName
  order.timestamp = new Date()
  order.delivered = false

  // Clear the cart
  await userCollection.updateOne(
    { _id: ObjectId.createFromHexString(userID) },
    { $set: { cart: [] } }
  );

  const insertedOrder = await transactionCollection.insertOne(order);

  await db.collection("notifications").insertOne({
    type:          "order_placed",
    transactionId: order._id,
    buyerID:       order.buyerID,
    buyerName:     order.buyerName,
    items:         order.cart.map(i => ({ itemID: i.itemID, quantity: i.quantity })),
    total:         order.total,
    timestamp:     order.timestamp
  });

  return res.status(200).json({
    success: "Checkout succesful!",
    orderID: insertedOrder._id,
    order
  });
});

export default router;