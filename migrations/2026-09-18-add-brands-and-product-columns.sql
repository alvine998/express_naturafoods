-- Manual migration: master "brands" + products.file / products.brand_id
-- Models:      src/models/Brand.js, src/models/Product.js
-- Idempotent companion: seed.js -> migrateProductColumns()
-- Apply: mysql --force -u <user> -p <database> < migrations/2026-09-18-add-brands-and-product-columns.sql
--
-- Notes
--   * MySQL has no "ADD COLUMN IF NOT EXISTS". Run with --force (or statement by
--     statement in a GUI) so "Duplicate column name" / "Duplicate key name" errors
--     are skipped instead of aborting the remaining statements.
--   * The MODIFY statements below are the important part for existing databases: if
--     `products.file` was created earlier as NOT NULL (e.g. by a manual ALTER), the
--     API gets "Column 'file' cannot be null" whenever a product has no file. MODIFY
--     makes it nullable without touching data.
--   * Keep this in sync with sequelize.sync({ alter: true }) output, which is skipped
--     when DB_SYNC_ALTER=false.

-- 1. Master brands table
CREATE TABLE IF NOT EXISTS `brands` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `slug` varchar(64) NOT NULL,
  `name` varchar(120) NOT NULL,
  `description` text,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `brands_slug` (`slug`),
  KEY `brands_is_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 1b. Brand logo (nullable; the API treats null/empty as "no logo")
ALTER TABLE `brands`
  ADD COLUMN `logo` varchar(500) DEFAULT NULL AFTER `description`;

ALTER TABLE `brands`
  MODIFY COLUMN `logo` varchar(500) NULL DEFAULT NULL;

-- 2. New product columns (existing rows keep NULL for both)
ALTER TABLE `products`
  ADD COLUMN `file` varchar(500) DEFAULT NULL AFTER `img`;

ALTER TABLE `products`
  ADD COLUMN `brand_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL AFTER `category_id`;

-- 3. Enforce nullability (no-op if the columns were just created by step 2).
--    Required for the API to accept create/update without a file, or to clear one.
ALTER TABLE `products`
  MODIFY COLUMN `file` varchar(500) NULL DEFAULT NULL;

ALTER TABLE `products`
  MODIFY COLUMN `brand_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL DEFAULT NULL;

ALTER TABLE `products`
  ADD KEY `products_brand_id` (`brand_id`);

-- 4. Optional: enforce integrity. ON DELETE SET NULL clears products.brand_id when a
--    brand is removed (the API also does this explicitly in DELETE /admin/brands/:slug).
--    Skip this block if you deliberately keep the schema FK-free (products.category_id
--    currently has no FK either).
ALTER TABLE `products`
  ADD CONSTRAINT `products_brand_id_foreign`
  FOREIGN KEY (`brand_id`) REFERENCES `brands` (`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

-- 5. Home brand -> brands as a JSON array of brand ids
ALTER TABLE `home_brands`
  ADD COLUMN `brand_ids` json DEFAULT NULL AFTER `desc`;

ALTER TABLE `home_brands`
  MODIFY COLUMN `brand_ids` json NULL DEFAULT NULL;

-- Only needed if an earlier revision of this file created the junction table
-- (the home brand links now live in home_brands.brand_ids):
-- UPDATE `home_brands` hb
--   SET hb.`brand_ids` = (SELECT JSON_ARRAYAGG(hbb.`brand_id`) FROM `home_brand_brands` hbb WHERE hbb.`home_brand_id` = hb.`id`)
--   WHERE EXISTS (SELECT 1 FROM `home_brand_brands` hbb WHERE hbb.`home_brand_id` = hb.`id`);
DROP TABLE IF EXISTS `home_brand_brands`;

-- Rollback (run manually, in this order)
-- ALTER TABLE `home_brands` DROP COLUMN `brand_ids`;
-- ALTER TABLE `products` DROP FOREIGN KEY `products_brand_id_foreign`;
-- ALTER TABLE `products` DROP KEY `products_brand_id`;
-- ALTER TABLE `products` DROP COLUMN `brand_id`;
-- ALTER TABLE `products` DROP COLUMN `file`;
-- DROP TABLE `brands`;
