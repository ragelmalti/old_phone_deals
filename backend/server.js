import express from "express";
import swaggerUi from 'swagger-ui-express';
import swaggerFile from './swagger-output.json' with { type: 'json' };
import cors from "cors";

// API Routes
import account from "./routes/account.js";
import phones from "./routes/phones.js";
import users from "./routes/users.js";
import cart from "./routes/cart.js";
import orders from "./routes/orders.js";
import wishlist from "./routes/wishlist.js";
import adminRouter from './routes/admin.js';


const PORT = process.env.BACKEND_PORT || 5050;
const app = express();

app.use(cors());
app.use(express.json());
app.use("/api/phones", phones);
app.use("/api/users", users);
app.use("/api/account", account)
app.use("/api/cart", cart);
app.use("/api/wishlist", wishlist);
app.use("/api/orders", orders);
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerFile));
app.use('/api/admin', adminRouter);

// start the Express server
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});