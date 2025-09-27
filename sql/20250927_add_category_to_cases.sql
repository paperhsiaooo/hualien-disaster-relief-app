-- Add category column to cases table if it does not exist
-- Run this on your MySQL instance connected to the app

ALTER TABLE `cases`
  ADD COLUMN `category` VARCHAR(50) NULL AFTER `reporter_name`;

-- If you need a default value for existing rows, you can optionally run:
-- UPDATE `cases` SET `category` = '其他災情' WHERE `category` IS NULL;

