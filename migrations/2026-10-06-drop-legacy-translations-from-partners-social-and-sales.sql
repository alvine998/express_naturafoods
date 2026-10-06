-- Remove single-language fields after translated fields have been added.
-- Apply with: mysql --force -u <user> -p <database> < migrations/2026-10-06-drop-legacy-translations-from-partners-social-and-sales.sql

ALTER TABLE `social_media`
  DROP COLUMN `description`;

ALTER TABLE `official_partners`
  DROP COLUMN `description`;

ALTER TABLE `sales`
  DROP COLUMN `position`;

ALTER TABLE `sales`
  DROP COLUMN `location`;
