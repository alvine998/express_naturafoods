-- Manual migration: careers page banner for company_settings
-- Idempotent companion: sequelize.sync({ alter: true }) on boot (skipped when DB_SYNC_ALTER=false).
-- Apply: mysql --force -u <user> -p <database> < migrations/2026-10-02-add-company-settings-career-banner.sql
--
-- Notes
--   * MySQL has no "ADD COLUMN IF NOT EXISTS". Run with --force (or statement by
--     statement in a GUI) so "Duplicate column name" errors are skipped.
--   * Keep in sync with src/models/CompanySetting.js (careerBanner).

ALTER TABLE `company_settings`
  ADD COLUMN `career_banner` varchar(500) NULL DEFAULT NULL;

-- Rollback (run manually)
-- ALTER TABLE `company_settings`
--   DROP COLUMN `career_banner`;
