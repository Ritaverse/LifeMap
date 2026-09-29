ALTER TABLE `report_jobs` ADD `locale` text DEFAULT 'zh-CN' NOT NULL CHECK (`locale` IN ('zh-CN', 'en'));
