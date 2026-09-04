const crypto = require("crypto");

function sendSuccess(res, data, meta = null, status = 200) {
  return res.status(status).json({
    success: true,
    data,
    meta: meta || null,
    error: null,
  });
}

function sendError(res, { code = "INTERNAL_ERROR", message = "Internal error", status = 500, details = null, requestId = null } = {}) {
  const rid = requestId || `req_${crypto.randomBytes(6).toString("hex")}`;
  return res.status(status).json({
    success: false,
    data: null,
    error: {
      code,
      message,
      details,
      requestId: rid,
    },
  });
}

// For legacy compat: detect if client expects envelope? Always use envelope for new contract.
module.exports = { sendSuccess, sendError };
