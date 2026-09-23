const { Op } = require("sequelize");

function parsePagination(query, opts = {}) {
  const defaultLimit = opts.defaultLimit || 10;
  const maxLimit = opts.maxLimit || 50;
  let page = parseInt(query.page, 10);
  let limit = parseInt(query.limit, 10);
  if (isNaN(page) || page < 1) page = 1;
  if (isNaN(limit) || limit < 1) limit = defaultLimit;
  if (limit > maxLimit) limit = maxLimit;
  const offset = (page - 1) * limit;

  // sort: "createdAt:desc" or "field:asc,other:desc" – we support single "field:dir"
  // `index` is an alias for `sortIndex` (admin-adjustable landing order).
  let sort = null;
  if (query.sort) {
    const parts = String(query.sort).split(":"); // e.g. "createdAt:desc"
    let field = parts[0];
    if (field === "index") field = "sortIndex";
    const dir = (parts[1] || "desc").toUpperCase();
    const allowedDirs = ["ASC", "DESC"];
    if (field) {
      sort = [[field, allowedDirs.includes(dir) ? dir : "DESC"]];
    }
  }
  if (!sort) sort = [["createdAt", "DESC"]];

  return { page, limit, offset, sort };
}

// Default list order: admin-adjustable sortIndex first, then recency.
// Pass sortCol="order" for models that keep the legacy `order` column.
function defaultOrder(req, sort, sortCol = "sortIndex", tiebreak = ["createdAt", "DESC"]) {
  if (req.query.sort) return sort;
  return [[sortCol, "ASC"], tiebreak];
}

function buildMeta(page, limit, total) {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit) || 1,
  };
}

// Build Sequelize where for ilike search across fields
function buildSearchWhere(q, fields) {
  if (!q) return {};
  const like = `%${q}%`;
  // Use Op.like for mysql; mysql doesn't have iLike but like is case-insensitive depending on collation
  return {
    [Op.or]: fields.map((f) => ({ [f]: { [Op.like]: like } })),
  };
}

module.exports = { parsePagination, buildMeta, buildSearchWhere, defaultOrder };
