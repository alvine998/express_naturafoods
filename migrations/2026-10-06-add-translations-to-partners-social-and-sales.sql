-- Add translated descriptions to official partners and social media, and
-- translated position/location fields to sales. Restrict sales gender to m/f.
-- Apply with: mysql --force -u <user> -p <database> < migrations/2026-10-06-add-translations-to-partners-social-and-sales.sql

ALTER TABLE `official_partners`
  ADD COLUMN `description_id` mediumtext NULL,
  ADD COLUMN `description_en` mediumtext NULL,
  ADD COLUMN `description_zn` mediumtext NULL;

ALTER TABLE `social_media`
  ADD COLUMN `description_id` text NULL,
  ADD COLUMN `description_en` text NULL,
  ADD COLUMN `description_zn` text NULL;

ALTER TABLE `sales`
  ADD COLUMN `position_id` varchar(100) NULL,
  ADD COLUMN `position_en` varchar(100) NULL,
  ADD COLUMN `position_zn` varchar(100) NULL,
  ADD COLUMN `location_id` varchar(100) NULL,
  ADD COLUMN `location_en` varchar(100) NULL,
  ADD COLUMN `location_zn` varchar(100) NULL;

UPDATE `sales`
SET `gender` = CASE
  WHEN LOWER(`gender`) IN ('f', 'female') THEN 'f'
  ELSE 'm'
END;

ALTER TABLE `sales`
  MODIFY COLUMN `gender` ENUM('m', 'f') NOT NULL DEFAULT 'm';
