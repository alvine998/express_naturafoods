-- Add localized product titles while preserving existing titles as English.
-- Apply with: mysql --force -u <user> -p <database> < migrations/2026-10-09-add-translated-titles-to-products.sql

ALTER TABLE `products`
  ADD COLUMN `title_id` varchar(120) NULL,
  ADD COLUMN `title_en` varchar(120) NULL,
  ADD COLUMN `title_zn` varchar(120) NULL;

UPDATE `products`
SET `title_en` = `title`
WHERE `title_en` IS NULL AND `title` IS NOT NULL;

ALTER TABLE `products`
  MODIFY COLUMN `title` varchar(120) NULL;
