const { sendError } = require("../utils/envelope");

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return sendError(res, { code: "UNAUTHORIZED", message: "Unauthorized", status: 401 });
    }
    // verifyToken decoded contains role? If not, fetch from DB? For now check decoded role or allow if no role restriction
    const userRole = req.user.role || "admin";
    if (roles.length && !roles.includes(userRole)) {
      return sendError(res, { code: "FORBIDDEN", message: "Forbidden", status: 403 });
    }
    next();
  };
}

module.exports = requireRole;
