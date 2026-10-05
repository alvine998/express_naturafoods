-- Add Indonesian, English, and Chinese Visi/Misi fields to company_settings.
-- Apply with: mysql --force -u <user> -p <database> < migrations/2026-10-05-add-company-settings-translations.sql
-- Existing visi/misi values are copied to the Indonesian fields.

ALTER TABLE `company_settings`
  ADD COLUMN `visi_id` mediumtext NULL,
  ADD COLUMN `visi_en` mediumtext NULL,
  ADD COLUMN `visi_zn` mediumtext NULL,
  ADD COLUMN `misi_id` mediumtext NULL,
  ADD COLUMN `misi_en` mediumtext NULL,
  ADD COLUMN `misi_zn` mediumtext NULL;

UPDATE `company_settings`
SET `visi_id` = `visi`
WHERE `visi_id` IS NULL AND `visi` IS NOT NULL;

UPDATE `company_settings`
SET `misi_id` = `misi`
WHERE `misi_id` IS NULL AND `misi` IS NOT NULL;
