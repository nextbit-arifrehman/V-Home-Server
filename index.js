const dotenv = require("dotenv");
dotenv.config();

const express = require("express");
const cors = require("cors");
const { MongoClient } = require("mongodb");

// Import route files
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const propertyRoutes = require("./routes/propertyRoutes");
const offerRoutes = require("./routes/offerRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const wishlistRoutes = require("./routes/wishlistRoutes");
const paymentRoutes = require("./routes/paymentRoutes");

// Create Express app
const app = express();
const port = process.env.PORT || 5000;

// Middlewares
app.use(
  cors({
    origin: [
      process.env.FRONTEND_URL || "http://localhost:3001",
      "http://localhost:3000",
      "http://localhost:3001", 
      
    ],
    credentials: true,
  })
);
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// MongoDB Client
const client = new MongoClient(process.env.MONGODB_URI);

async function startServer() {
  try {
    // await client.connect(); // Commented for Vercel deployment
    console.log("Connected to MongoDB");
    const db = client.db("real-estate-db");
    // await client.db("admin").command({ ping: 1 }); // Commented for Vercel deployment

    // Attach database to request
    app.use((req, res, next) => {
      req.db = db;
      next();
    });

    // Route registrations
    app.use("/api/auth", authRoutes);
    app.use("/api/users", userRoutes);
    app.use("/api/properties", propertyRoutes);
    app.use("/api/offers", offerRoutes);
    app.use("/api/reviews", (req, res, next) => {
      console.log(`🔍 Reviews route hit: ${req.method} ${req.path}`);
      next();
    }, reviewRoutes);
    app.use("/api/wishlist", wishlistRoutes);
    app.use("/api/payment", paymentRoutes);

    // Root endpoint
    app.get("/", (req, res) => {
      res.send("Real Estate Platform Backend is Running 🚀");
    });

    // 404 handler
    app.use((req, res) => {
      console.log(`❌ 404 Route not found: ${req.method} ${req.path}`);
      res.status(404).send({ message: "Route not found" });
    });

    // Start server
    app.listen(port, "0.0.0.0", () => {
      console.log(`🚀 Server running at http://0.0.0.0:${port}`);
    });
  } catch (error) {
    console.error("Failed to connect to the database", error);
    // Don't exit in development, retry connection after 5 seconds
    console.log("Retrying database connection in 5 seconds...");
    setTimeout(startServer, 5000);
  }
}

// Handle process errors to prevent crashes
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

startServer();
