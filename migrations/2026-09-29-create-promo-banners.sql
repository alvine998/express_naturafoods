-- Manual migration: create promo_banners
-- Idempotent companion: sequelize.sync({ alter: true }) on boot (skipped when DB_SYNC_ALTER=false).
-- Apply: mysql --force -u <user> -p <database> < migrations/2026-09-29-create-promo-banners.sql
--
-- Notes
--   * MySQL does not support CREATE TABLE IF NOT EXISTS with strict schema drift checking;
--     this statement is safe to rerun when the table already exists.
--   * Keep in sync with src/models/PromoBanner.js.

CREATE TABLE IF NOT EXISTS `promo_banners` (
  `id` char(36) NOT NULL,
  `name` varchar(150) NOT NULL,
  `description` mediumtext DEFAULT NULL,
  `status` enum('active', 'inactive') NOT NULL DEFAULT 'active',
  `image` varchar(500) NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `promo_banners_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Rollback (run manually)
-- DROP TABLE `promo_banners`;
