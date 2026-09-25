CREATE TABLE IF NOT EXISTS `company_settings` (
  `id` varchar(50) NOT NULL,
  `name` varchar(200) NOT NULL,
  `logo` varchar(500) DEFAULT NULL,
  `description` mediumtext,
  `visi` mediumtext,
  `misi` mediumtext,
  `tagline` varchar(300) DEFAULT NULL,
  `email` varchar(150) DEFAULT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `whatsapp` varchar(50) DEFAULT NULL,
  `address` mediumtext,
  `website` varchar(500) DEFAULT NULL,
  `instagram` varchar(500) DEFAULT NULL,
  `facebook` varchar(500) DEFAULT NULL,
  `tiktok` varchar(500) DEFAULT NULL,
  `youtube` varchar(500) DEFAULT NULL,
  `maps_url` varchar(500) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT IGNORE INTO `company_settings` (`id`, `name`, `created_at`, `updated_at`)
VALUES ('default', 'PT Natura Inti Sukses', NOW(), NOW());
