-- Remove the legacy single-language descriptions after adding translated fields.
-- Apply with: mysql --force -u <user> -p <database> < migrations/2026-10-06-drop-legacy-desc-from-home-brands-and-products.sql

ALTER TABLE `home_brands`
  DROP COLUMN `desc`;

ALTER TABLE `products`
  DROP COLUMN `desc`;
