import express from "express";
import { body, query, validationResult } from 'express-validator';

import {db, client} from "../db/connection.js";
import authenticateJWT from "../middleware/authentication.js"

import { ObjectId } from "mongodb";

const router = express.Router();
router.get("/", authenticateJWT, async (req, res) => {
    const userID = req.user.userID;
    let transactionCollection = await db.collection("transactions"); 
    let orders = await transactionCollection.find({"buyerID": ObjectId.createFromHexString(userID)}).toArray();
    return res.status(200).json(orders);
});

export default router;