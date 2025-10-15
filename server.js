const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Import auth routes
const authRoutes = require("./src/app/api/auth/signup/route");
const loginRoutes = require("./src/app/api/auth/login/route");
const meRoutes = require("./src/app/api/auth/me/route");
const logoutRoutes = require("./src/app/api/auth/logout/route");
const refreshRoutes = require("./src/app/api/auth/refresh/route");
const playerAnalyticsRoutes = require("./src/app/api/player-analytics/route");
const propsListRouter = require("./src/server/routes/props-list");

// Auth routes
app.post("/api/auth/signup", authRoutes.POST);
app.post("/api/auth/login", loginRoutes.POST);
app.get("/api/auth/me", meRoutes.GET);
app.post("/api/auth/logout", logoutRoutes.POST);
app.post("/api/auth/refresh", refreshRoutes.POST);

// Player analytics routes
app.get("/api/player-analytics", playerAnalyticsRoutes.GET);
app.post("/api/player-analytics", playerAnalyticsRoutes.POST);

// Props list route
app.use("/api/props-list", propsListRouter);

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Auth API server running on port ${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/health`);
  console.log(`🔐 Auth endpoints: http://localhost:${PORT}/api/auth/*`);
});

module.exports = app;
