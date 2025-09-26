# a2_old_phone_deals
Assignment 2 - eCommerce Web Application

# Folder Structure
## Backend
```
.
├── db
│   └── connection.js
├── package.json
├── package-lock.json
├── routes
│   ├── phones.js
│   └── users.js
├── server.js
├── swagger.cjs
└── swagger-output.json
```
- The `db` folder contains files relating to database connection.
- The `routes` folder contains files describing API routes.
- `server.js` is used to start the server.
- `swagger.cjs` is used to generate API Documentation using the Swagger Autogen Library.

# Installation and Setup
## Backend 
The backend uses the express.js library. The Swagger Autogen Library is used to generate the backend api documentation.

You'll need to create a `config.env` file in the root directory.
The file should contain the following contents:
```
ATLAS_URI=[INSERT MONGODB CONNECTION STRING HERE]
JWT_SECRET=[INSERT SECRET HERE] // Used for JWT token hashing
GOOGLE_APP_PASSWORD=[INSERT APP PASS HERE] // Used for [signing into Gmail](https://nodemailer.com/usage/using-gmail#apppassword-requires-2step-verification)
PORT=5050
```

In order to run the backend, simply do the following:
1. Run `npm install` to install all the packages
2. Run `npm start` to start the express.js server.
    - Use `npm run dev` for developing

To access the api docs, use the following URL: localhost:5050/docs

# References
- Express.JS backend code adapted from [MongoDB Mern Stack Tutorial ](https://www.mongodb.com/resources/languages/mern-stack-tutorial)
- JWT Authentication middlware code in `account.js` adapted from [Authentication and Authorization with JWTs in Express.js](https://stackabuse.com/authentication-and-authorization-with-jwts-in-express-js/) by Janith Kasun
- Frontend authentication code: `src/provider/authProvider.js` taken and adapted from [JWT Authentication in React with React Router](https://dev.to/sanjayttg/jwt-authentication-in-react-with-react-router-1d03) by Sanjay Arya.