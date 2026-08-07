CREATE DATABASE IF NOT EXISTS `hb_kalite_kontrol`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `hb_kalite_kontrol`;

CREATE TABLE IF NOT EXISTS `test_records` (
  `id` VARCHAR(64) NOT NULL,
  `test_date` DATE NULL,
  `model` VARCHAR(500) NOT NULL DEFAULT '',
  `gb` VARCHAR(64) NOT NULL DEFAULT '',
  `order_code` VARCHAR(500) NOT NULL DEFAULT '',
  `note` LONGTEXT NULL,
  `final_status` ENUM('ok', 'red') NOT NULL,
  `ok_count` INT NOT NULL DEFAULT 0,
  `red_count` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_test_records_created_at` (`created_at`),
  KEY `idx_test_records_order_code` (`order_code`),
  KEY `idx_test_records_test_date` (`test_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `test_record_items` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `record_id` VARCHAR(64) NOT NULL,
  `item_order` INT NOT NULL,
  `name` VARCHAR(500) NOT NULL,
  `result` ENUM('ok', 'red') NOT NULL,
  `extra` VARCHAR(500) NOT NULL DEFAULT '',
  PRIMARY KEY (`id`),
  KEY `idx_test_record_items_record_id` (`record_id`),
  CONSTRAINT `fk_test_record_items_record`
    FOREIGN KEY (`record_id`)
    REFERENCES `test_records` (`id`)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `technician_test_records` (
  `id` VARCHAR(64) NOT NULL,
  `test_date` DATE NULL,
  `model` VARCHAR(500) NOT NULL DEFAULT '',
  `gb` VARCHAR(64) NOT NULL DEFAULT '',
  `order_code` VARCHAR(500) NOT NULL DEFAULT '',
  `note` LONGTEXT NULL,
  `final_status` ENUM('ok', 'red') NOT NULL,
  `ok_count` INT NOT NULL DEFAULT 0,
  `red_count` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_technician_test_records_created_at` (`created_at`),
  KEY `idx_technician_test_records_order_code` (`order_code`),
  KEY `idx_technician_test_records_test_date` (`test_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `technician_test_record_items` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `record_id` VARCHAR(64) NOT NULL,
  `item_order` INT NOT NULL,
  `name` VARCHAR(500) NOT NULL,
  `result` ENUM('ok', 'red') NOT NULL,
  `extra` VARCHAR(500) NOT NULL DEFAULT '',
  PRIMARY KEY (`id`),
  KEY `idx_technician_test_record_items_record_id` (`record_id`),
  CONSTRAINT `fk_technician_test_record_items_record`
    FOREIGN KEY (`record_id`)
    REFERENCES `technician_test_records` (`id`)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
