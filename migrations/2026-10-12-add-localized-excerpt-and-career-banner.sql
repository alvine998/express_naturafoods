-- Add Indonesian, English, and Chinese excerpts for articles and localized
-- career banners for company_settings while preserving legacy values.
-- Apply with: mysql --force -u <user> -p <database> < migrations/2026-10-12-add-localized-excerpt-and-career-banner.sql

ALTER TABLE `articles`
  ADD COLUMN `excerpt_id` mediumtext NULL,
  ADD COLUMN `excerpt_en` mediumtext NULL,
  ADD COLUMN `excerpt_zn` mediumtext NULL;

UPDATE `articles` SET `excerpt_en` = `excerpt` WHERE `excerpt_en` IS NULL AND `excerpt` IS NOT NULL;

ALTER TABLE `company_settings`
  ADD COLUMN `career_banner_id` varchar(500) NULL DEFAULT NULL,
  ADD COLUMN `career_banner_en` varchar(500) NULL DEFAULT NULL,
  ADD COLUMN `career_banner_zn` varchar(500) NULL DEFAULT NULL;

UPDATE `company_settings` SET `career_banner_en` = `career_banner` WHERE `career_banner_en` IS NULL AND `career_banner` IS NOT NULL;

-- Rollback (run manually)
-- ALTER TABLE `articles`
--   DROP COLUMN `excerpt_zn`,
--   DROP COLUMN `excerpt_en`,
--   DROP COLUMN `excerpt_id`;
-- ALTER TABLE `company_settings`
--   DROP COLUMN `career_banner_zn`,
--   DROP COLUMN `career_banner_en`,
--   DROP COLUMN `career_banner_id`;
