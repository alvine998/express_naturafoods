-- Add Indonesian, English, and Chinese descriptions to home brands and products.
-- Apply with: mysql --force -u <user> -p <database> < migrations/2026-10-06-add-translated-descriptions-to-home-brands-and-products.sql

ALTER TABLE `home_brands`
  ADD COLUMN `desc_id` mediumtext NULL,
  ADD COLUMN `desc_en` mediumtext NULL,
  ADD COLUMN `desc_zn` mediumtext NULL;

ALTER TABLE `products`
  ADD COLUMN `desc_id` mediumtext NULL,
  ADD COLUMN `desc_en` mediumtext NULL,
  ADD COLUMN `desc_zn` mediumtext NULL;
