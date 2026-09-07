const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const path = require("path");
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./swagger");
const sequelize = require("./src/config/database");
const usersRouter = require("./src/routes/users");
const rolesRouter = require("./src/routes/roles");
const userRolesRouter = require("./src/routes/user_roles");
const articlesRouter = require("./src/routes/articles");
const authRouter = require("./src/routes/auth");
const dotenv = require("dotenv");

// Ensure all models are registered before sync
require("./src/models");

// v1 routers (contract)
const { publicRouter: productsPublicRouter, adminRouter: productsAdminRouter } = require("./src/routes/products");
const { publicRouter: partnersPublicRouter, adminRouter: partnersAdminRouter } = require("./src/routes/officialPartners");
const { publicRouter: educationPublicRouter, adminRouter: educationAdminRouter } = require("./src/routes/education");
const { publicRouter: innovationsPublicRouter, adminRouter: innovationsAdminRouter } = require("./src/routes/innovations");
const { publicRouter: jobsPublicRouter, adminRouter: jobsAdminRouter } = require("./src/routes/jobs");
const { publicRouter: inquiriesPublicRouter, adminRouter: inquiriesAdminRouter } = require("./src/routes/inquiries");
const { publicRouter: siteContentPublicRouter, adminRouter: siteContentAdminRouter } = require("./src/routes/siteContent");
const { publicRouter: assistantPublicRouter, adminRouter: assistantAdminRouter } = require("./src/routes/assistant");
const { publicRouter: articlesPublicRouter, adminRouter: articlesAdminRouter } = require("./src/routes/articles.v1");
const usersAdminRouter = require("./src/routes/usersAdmin");
const uploadsRouter = require("./src/routes/uploads");
const statsRouter = require("./src/routes/stats");

dotenv.config();


const app = express();
const PORT = process.env.PORT || 5000;

// CORS per contract: allow specific origins + localhost
const allowedOrigins = [
  "https://naturafoods.co.id",
  "https://www.naturafoods.co.id",
  "http://localhost:3000",
  process.env.FRONTEND_URL,
].filter(Boolean);
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      // allow any localhost port during dev
      if (origin && origin.startsWith("http://localhost:")) return callback(null, true);
      return callback(null, true); // fallback allow for now; change to error in prod if strict
    },
    credentials: true,
  })
);
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Global API rate limit: 30 requests per minute per IP
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { success: false, data: null, error: { code: "TOO_MANY_REQUESTS", message: "Too many requests, please try again later", details: null, requestId: "rate_limit" } },
});
app.use("/api", apiLimiter);

// Legacy routes (pre-contract) keep for backward compat
app.use("/api/users", usersRouter);
app.use("/api/roles", rolesRouter);
app.use("/api/user-roles", userRolesRouter);
app.use("/api/articles", articlesRouter);
app.use("/api/auth", authRouter);

// ---- API v1 (contract) ----
// Auth (contract) – also supports legacy OTP paths under v1 via same router
app.use("/api/v1/auth", authRouter);

// Public resources
app.use("/api/v1/products", productsPublicRouter);
app.use("/api/v1/official-partners", partnersPublicRouter);
app.use("/api/v1/education", educationPublicRouter);
app.use("/api/v1/innovations", innovationsPublicRouter);
app.use("/api/v1/jobs", jobsPublicRouter);
app.use("/api/v1/inquiries", inquiriesPublicRouter);
app.use("/api/v1/site-content", siteContentPublicRouter);
app.use("/api/v1/assistant", assistantPublicRouter);
app.use("/api/v1/articles", articlesPublicRouter);

// Admin resources (protected)
app.use("/api/v1/admin/products", productsAdminRouter);
app.use("/api/v1/admin/official-partners", partnersAdminRouter);
app.use("/api/v1/admin/education", educationAdminRouter);
app.use("/api/v1/admin/innovations", innovationsAdminRouter);
app.use("/api/v1/admin/jobs", jobsAdminRouter);
app.use("/api/v1/admin/inquiries", inquiriesAdminRouter);
app.use("/api/v1/admin/site-content", siteContentAdminRouter);
app.use("/api/v1/admin/assistant", assistantAdminRouter);
app.use("/api/v1/admin/articles", articlesAdminRouter);
app.use("/api/v1/admin/users", usersAdminRouter);
app.use("/api/v1/admin/uploads", uploadsRouter);
app.use("/api/v1/admin/stats", statsRouter);

// Alias for GET /admin/me (frontend expects GET /admin/me from token)
const authMiddleware = require("./src/middleware/auth");
app.get("/api/v1/admin/me", authMiddleware, async (req, res) => {
  const User = require("./src/models/User");
  const { sendSuccess, sendError } = require("./src/utils/envelope");
  try {
    const user = await User.findByPk(req.user.id, { attributes: { exclude: ["password"] } });
    if (!user) return sendError(res, { code: "NOT_FOUND", message: "User not found", status: 404 });
    const j = user.toJSON();
    return sendSuccess(res, { id: j.id, username: j.username, email: j.email, name: j.name, role: j.role, createdAt: j.createdAt || j.created_at, updatedAt: j.updatedAt || j.updated_at });
  } catch (err) {
    return sendError(res, { code: "INTERNAL_ERROR", message: err.message, status: 500 });
  }
});

app.get("/", (req, res) => {
  const { sendSuccess } = require("./src/utils/envelope");
  // support both legacy and contract envelope on root? Keep simple
  if (req.originalUrl.includes("/api/v1")) return sendSuccess(res, { message: "NaturaFoods API v1" });
  res.json({ message: "NaturaFoods API" });
});

// Health + openapi hint
app.get("/api/v1", (req, res) => {
  const { sendSuccess } = require("./src/utils/envelope");
  return sendSuccess(res, { version: "1.0.0", baseUrl: "/api/v1", docs: "/api/docs" });
});

// Swagger API docs
app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: ".swagger-ui .topbar { display: none }",
  customSiteTitle: "NaturaFoods API Docs",
}));
app.get("/api/docs.json", (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.send(swaggerSpec);
});

// 404 for unknown api routes with envelope for v1
app.use("/api/v1", (req, res) => {
  const { sendError } = require("./src/utils/envelope");
  return sendError(res, { code: "NOT_FOUND", message: `Route ${req.method} ${req.originalUrl} not found`, status: 404 });
});

// Global error handler (envelope for v1, legacy for /api)
app.use((err, req, res, next) => {
  console.error(err);
  if (req.originalUrl && req.originalUrl.includes("/api/v1")) {
    const { sendError } = require("./src/utils/envelope");
    const status = err.status || 500;
    const code = err.code || (status === 413 ? "PAYLOAD_TOO_LARGE" : "INTERNAL_ERROR");
    return sendError(res, { code, message: err.message || "Internal error", status, details: err.details || null });
  }
  res.status(err.status || 500).json({ message: err.message || "Internal error" });
});

const SYNC_OPTS = process.env.DB_SYNC_ALTER === "false" ? {} : { alter: true };
// Use alter:true by default to auto-migrate contract fields (username, role, new tables)
sequelize
  .sync(SYNC_OPTS)
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT} (base: /api and /api/v1)`);
    });
  })
  .catch((err) => {
    console.error("Database connection failed:", err.message);
  });
