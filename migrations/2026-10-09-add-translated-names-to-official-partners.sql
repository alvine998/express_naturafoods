-- Add localized partner names while preserving existing names as English.
-- Apply with: mysql --force -u <user> -p <database> < migrations/2026-10-09-add-translated-names-to-official-partners.sql

ALTER TABLE `official_partners`
  ADD COLUMN `name_id` varchar(120) NULL,
  ADD COLUMN `name_en` varchar(120) NULL,
  ADD COLUMN `name_zn` varchar(120) NULL;

UPDATE `official_partners`
SET `name_en` = `name`
WHERE `name_en` IS NULL AND `name` IS NOT NULL;

ALTER TABLE `official_partners`
  MODIFY COLUMN `name` varchar(120) NULL;
