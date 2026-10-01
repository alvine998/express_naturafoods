-- Manual migration: ensure `keywords` field exists on articles
-- Model: src/models/Article.js -> keywords VARCHAR(255) NULL
-- Routes: src/routes/articles.v1.js + src/routes/articles.js
--   - POST/PUT accept `keywords` as string ("a, b") or array (["a", "b"])
--   - GET /articles supports `?keywords=` filter and `?q=` searches keywords
--   - serialize() returns `keywords` in list + detail responses
-- Idempotent companion: seed.js -> migrateArticleKeywords()
-- Apply: mysql --force -u <user> -p <database> < migrations/2026-10-01-add-keywords-to-articles.sql
--
-- Notes
--   * MySQL has no "ADD COLUMN IF NOT EXISTS". Run with --force (or statement by
--     statement in a GUI) so "Duplicate column name" errors are skipped.
--   * Keep in sync with sequelize.sync({ alter: true }) output, which is skipped
--     when DB_SYNC_ALTER=false.

ALTER TABLE `articles`
  ADD COLUMN `keywords` varchar(255) DEFAULT NULL AFTER `excerpt`;

ALTER TABLE `articles`
  MODIFY COLUMN `keywords` varchar(255) NULL DEFAULT NULL;

-- Optional index for LIKE '%keyword%' filtering (remove if write-heavy):
-- ALTER TABLE `articles`
--   ADD KEY `articles_keywords` (`keywords`(191));

-- Rollback (run manually)
-- ALTER TABLE `articles` DROP COLUMN `keywords`;
