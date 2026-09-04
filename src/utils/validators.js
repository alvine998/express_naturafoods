const slugRegex = /^[a-z0-9-]+$/;
const usernameRegex = /^[a-zA-Z0-9._-]+$/;

function validateSlug(slug) {
  if (!slug || typeof slug !== "string") return "slug is required";
  if (slug.length < 3 || slug.length > 64) return "slug must be 3-64 chars";
  if (!slugRegex.test(slug)) return "slug must match ^[a-z0-9-]+$";
  return null;
}
function validateUsername(username) {
  if (!username || typeof username !== "string") return "username is required";
  if (username.length < 3 || username.length > 32) return "username must be 3-32 chars";
  if (!usernameRegex.test(username)) return "username must match ^[a-zA-Z0-9._-]+$";
  return null;
}
function validateRequired(value, field) {
  if (value === undefined || value === null || String(value).trim() === "") return `${field} is required`;
  return null;
}

module.exports = { validateSlug, validateUsername, validateRequired, slugRegex, usernameRegex };
