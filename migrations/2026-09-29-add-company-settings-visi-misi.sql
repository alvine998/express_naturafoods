-- Manual migration: visi/misi background + person card for company_settings
-- Idempotent companion: sequelize.sync({ alter: true }) on boot (skipped when DB_SYNC_ALTER=false).
-- Apply: mysql --force -u <user> -p <database> < migrations/2026-09-29-add-company-settings-visi-misi.sql
--
-- Notes
--   * MySQL has no "ADD COLUMN IF NOT EXISTS". Run with --force (or statement by
--     statement in a GUI) so "Duplicate column name" errors are skipped.
--   * Keep in sync with src/models/CompanySetting.js (visiBackground, visiPersonPhoto,
--     visiPersonName, visiPersonPosition, misiBackground, misiPersonPhoto,
--     misiPersonName, misiPersonPosition).

ALTER TABLE `company_settings`
  ADD COLUMN `visi_background` varchar(500) NULL DEFAULT NULL,
  ADD COLUMN `visi_person_photo` varchar(500) NULL DEFAULT NULL,
  ADD COLUMN `visi_person_name` varchar(200) NULL DEFAULT NULL,
  ADD COLUMN `visi_person_position` varchar(200) NULL DEFAULT NULL,
  ADD COLUMN `misi_background` varchar(500) NULL DEFAULT NULL,
  ADD COLUMN `misi_person_photo` varchar(500) NULL DEFAULT NULL,
  ADD COLUMN `misi_person_name` varchar(200) NULL DEFAULT NULL,
  ADD COLUMN `misi_person_position` varchar(200) NULL DEFAULT NULL;

-- Rollback (run manually)
-- ALTER TABLE `company_settings`
--   DROP COLUMN `misi_person_position`,
--   DROP COLUMN `misi_person_name`,
--   DROP COLUMN `misi_person_photo`,
--   DROP COLUMN `misi_background`,
--   DROP COLUMN `visi_person_position`,
--   DROP COLUMN `visi_person_name`,
--   DROP COLUMN `visi_person_photo`,
--   DROP COLUMN `visi_background`;
