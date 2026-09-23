-- Manual migration: admin-adjustable sort index for landing-page ordering
-- Adds `sort_index INT NOT NULL DEFAULT 0` to every sortable content table.
-- OfficialPartner keeps its existing `order` column (exposed as sortIndex/index alias).
-- Idempotent companion: sequelize.sync({ alter: true }) on boot (skipped when DB_SYNC_ALTER=false).
-- Apply: mysql --force -u <user> -p <database> < migrations/2026-09-23-add-sort-index.sql
--
-- Notes
--   * MySQL has no "ADD COLUMN IF NOT EXISTS". Run with --force (or statement by
--     statement in a GUI) so "Duplicate column name" errors are skipped.
--   * Reads: public lists default to `sort_index ASC, created_at DESC`
--     (explicit ?sort=... still wins). Admin POST/PUT accept `sortIndex`/`index`.

ALTER TABLE `products`
  ADD COLUMN `sort_index` int NOT NULL DEFAULT 0 AFTER `is_published`;
ALTER TABLE `products`
  ADD KEY `products_sort_index` (`sort_index`);

ALTER TABLE `categories`
  ADD COLUMN `sort_index` int NOT NULL DEFAULT 0 AFTER `is_highlight`;
ALTER TABLE `categories`
  ADD KEY `categories_sort_index` (`sort_index`);

ALTER TABLE `brands`
  ADD COLUMN `sort_index` int NOT NULL DEFAULT 0 AFTER `is_active`;
ALTER TABLE `brands`
  ADD KEY `brands_sort_index` (`sort_index`);

ALTER TABLE `articles`
  ADD COLUMN `sort_index` int NOT NULL DEFAULT 0;
ALTER TABLE `articles`
  ADD KEY `articles_sort_index` (`sort_index`);

ALTER TABLE `educations`
  ADD COLUMN `sort_index` int NOT NULL DEFAULT 0 AFTER `is_published`;
ALTER TABLE `educations`
  ADD KEY `educations_sort_index` (`sort_index`);

ALTER TABLE `innovations`
  ADD COLUMN `sort_index` int NOT NULL DEFAULT 0 AFTER `is_published`;
ALTER TABLE `innovations`
  ADD KEY `innovations_sort_index` (`sort_index`);

ALTER TABLE `jobs`
  ADD COLUMN `sort_index` int NOT NULL DEFAULT 0 AFTER `is_published`;
ALTER TABLE `jobs`
  ADD KEY `jobs_sort_index` (`sort_index`);

ALTER TABLE `sales`
  ADD COLUMN `sort_index` int NOT NULL DEFAULT 0 AFTER `is_published`;
ALTER TABLE `sales`
  ADD KEY `sales_sort_index` (`sort_index`);

ALTER TABLE `social_media`
  ADD COLUMN `sort_index` int NOT NULL DEFAULT 0;
ALTER TABLE `social_media`
  ADD KEY `social_media_sort_index` (`sort_index`);

ALTER TABLE `home_brands`
  ADD COLUMN `sort_index` int NOT NULL DEFAULT 0 AFTER `brand_ids`;
ALTER TABLE `home_brands`
  ADD KEY `home_brands_sort_index` (`sort_index`);

-- Rollback (run manually, in this order)
-- ALTER TABLE `home_brands` DROP KEY `home_brands_sort_index`;
-- ALTER TABLE `home_brands` DROP COLUMN `sort_index`;
-- ALTER TABLE `social_media` DROP KEY `social_media_sort_index`;
-- ALTER TABLE `social_media` DROP COLUMN `sort_index`;
-- ALTER TABLE `sales` DROP KEY `sales_sort_index`;
-- ALTER TABLE `sales` DROP COLUMN `sort_index`;
-- ALTER TABLE `jobs` DROP KEY `jobs_sort_index`;
-- ALTER TABLE `jobs` DROP COLUMN `sort_index`;
-- ALTER TABLE `innovations` DROP KEY `innovations_sort_index`;
-- ALTER TABLE `innovations` DROP COLUMN `sort_index`;
-- ALTER TABLE `educations` DROP KEY `educations_sort_index`;
-- ALTER TABLE `educations` DROP COLUMN `sort_index`;
-- ALTER TABLE `articles` DROP KEY `articles_sort_index`;
-- ALTER TABLE `articles` DROP COLUMN `sort_index`;
-- ALTER TABLE `brands` DROP KEY `brands_sort_index`;
-- ALTER TABLE `brands` DROP COLUMN `sort_index`;
-- ALTER TABLE `categories` DROP KEY `categories_sort_index`;
-- ALTER TABLE `categories` DROP COLUMN `sort_index`;
-- ALTER TABLE `products` DROP KEY `products_sort_index`;
-- ALTER TABLE `products` DROP COLUMN `sort_index`;
