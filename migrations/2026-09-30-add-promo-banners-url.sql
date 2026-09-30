-- Manual migration: add promo_banners.url (click target)
-- Apply: mysql --force -u <user> -p <database> < migrations/2026-09-30-add-promo-banners-url.sql
--
-- Rollback (run manually)
-- ALTER TABLE `promo_banners` DROP COLUMN `url`;

ALTER TABLE `promo_banners`
  ADD COLUMN `url` varchar(500) DEFAULT NULL AFTER `image`;
