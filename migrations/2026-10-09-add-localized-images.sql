-- Add Indonesian, English, and Chinese image URLs for education, innovation,
-- and promo banner entries while preserving legacy image values as English.
-- Apply with: mysql --force -u <user> -p <database> < migrations/2026-10-09-add-localized-images.sql

ALTER TABLE `educations`
  ADD COLUMN `img_id` varchar(500) NULL,
  ADD COLUMN `img_en` varchar(500) NULL,
  ADD COLUMN `img_zn` varchar(500) NULL,
  MODIFY COLUMN `img` varchar(500) NULL;

UPDATE `educations` SET `img_en` = `img` WHERE `img_en` IS NULL AND `img` IS NOT NULL;

ALTER TABLE `innovations`
  ADD COLUMN `img_id` varchar(500) NULL,
  ADD COLUMN `img_en` varchar(500) NULL,
  ADD COLUMN `img_zn` varchar(500) NULL,
  MODIFY COLUMN `img` varchar(500) NULL;

UPDATE `innovations` SET `img_en` = `img` WHERE `img_en` IS NULL AND `img` IS NOT NULL;

ALTER TABLE `promo_banners`
  ADD COLUMN `image_id` varchar(500) NULL,
  ADD COLUMN `image_en` varchar(500) NULL,
  ADD COLUMN `image_zn` varchar(500) NULL,
  MODIFY COLUMN `image` varchar(500) NULL;

UPDATE `promo_banners` SET `image_en` = `image` WHERE `image_en` IS NULL AND `image` IS NOT NULL;
