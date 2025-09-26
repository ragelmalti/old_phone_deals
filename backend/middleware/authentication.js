import express from "express"; // Might get rid of this function if redundant
import jwt from 'jsonwebtoken';

// Code adapted from https://stackabuse.com/authentication-and-authorization-with-jwts-in-express-js/
const authenticateJWT = (req, res, next) => {
    const authHeader = req.headers.authorization;
  
    if (authHeader) {
      const token = authHeader.split(' ')[1];
      let decodedToken;
      
      try {
        decodedToken = jwt.verify(token, process.env.JWT_SECRET)
      } catch(e) {
        return res.status(401).json({error: "Malformed or invalid JWT Token"});
      }
          
      if(decodedToken.role === "verify") {
        return res.status(401).json({error: `Invalid token, not used for login`})
      }

      req.user = decodedToken;
      next();
      
    } else {
      res.status(401).json({error: "JWT Bearer token required for authorisation"});
    }
  }

export default authenticateJWT;
