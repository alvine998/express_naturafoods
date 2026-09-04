const { verifyToken } = require("../utils/token");

async function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  const isContract = (req.baseUrl && req.baseUrl.includes("/v1")) || (req.originalUrl && req.originalUrl.includes("/v1")) || (req.originalUrl && req.originalUrl.includes("/admin"));
  const sendUnauthorized = (msg) => {
    if (isContract) {
      const { sendError } = require("../utils/envelope");
      return sendError(res, { code: "UNAUTHORIZED", message: msg, status: 401 });
    }
    return res.status(401).json({ message: msg });
  };
  if (!header || !header.startsWith("Bearer ")) {
    return sendUnauthorized("No token provided");
  }
  try {
    const decoded = await verifyToken(header.slice(7));
    req.user = decoded;
    next();
  } catch (err) {
    return sendUnauthorized("Invalid or expired token");
  }
}

module.exports = authMiddleware;
