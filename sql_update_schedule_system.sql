-- SQL Script to Update Schedule System (MySQL 8.x safe)

SET @old_fk_checks = @@FOREIGN_KEY_CHECKS;
SET FOREIGN_KEY_CHECKS = 0;

-- 1) schedules (Main schedule template)
CREATE TABLE IF NOT EXISTS `schedules` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `course_id` int UNSIGNED NOT NULL,
  `teacher_id` int UNSIGNED NULL,
  `room_id` int UNSIGNED NULL,
  `schedule_name` varchar(200) NOT NULL COMMENT 'ชื่อตารางเรียน เช่น "Adults Conversation B1 - Monday/Wednesday"',
  `schedule_type` enum('fixed','flexible','one_time') DEFAULT 'fixed' COMMENT 'fixed=ตารางเรียนประจำ, flexible=ยืดหยุ่น, one_time=เรียนครั้งเดียว',
  `recurring_pattern` enum('weekly','bi_weekly','monthly','custom') DEFAULT 'weekly',
  `total_hours` decimal(5,1) NOT NULL COMMENT 'จำนวนชั่วโมงรวมทั้งหมด เช่น 60.0',
  `hours_per_session` decimal(3,1) NOT NULL DEFAULT '3.0' COMMENT 'ชั่วโมงต่อครั้ง เช่น 3.0',
  `sessions_per_week` int UNSIGNED NOT NULL DEFAULT 1 COMMENT 'จำนวนครั้งต่อสัปดาห์',
  `max_students` int UNSIGNED NOT NULL DEFAULT 6,
  `current_students` int UNSIGNED DEFAULT 0,
  `start_date` date NOT NULL COMMENT 'วันเริ่มต้นของคอร์ส',
  `estimated_end_date` date NULL COMMENT 'วันสิ้นสุดประมาณ (คำนวณจาก total_hours)',
  `actual_end_date` date NULL COMMENT 'วันสิ้นสุดจริง',
  `status` enum('draft','active','paused','completed','cancelled') DEFAULT 'draft',
  `auto_reschedule_holidays` boolean DEFAULT true COMMENT 'เลื่อนวันหยุดอัตโนมัติ',
  `notes` text COMMENT 'หมายเหตุ',
  `admin_assigned` int UNSIGNED NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `schedules_course_id_foreign` (`course_id`),
  KEY `schedules_teacher_id_foreign` (`teacher_id`),
  KEY `schedules_room_id_foreign` (`room_id`),
  KEY `schedules_admin_assigned_foreign` (`admin_assigned`),
  KEY `idx_schedule_status` (`status`),
  CONSTRAINT `schedules_course_id_foreign` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`) ON DELETE CASCADE,
  CONSTRAINT `schedules_teacher_id_foreign` FOREIGN KEY (`teacher_id`) REFERENCES `teachers` (`id`) ON DELETE SET NULL,
  CONSTRAINT `schedules_room_id_foreign` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON DELETE SET NULL,
  CONSTRAINT `schedules_admin_assigned_foreign` FOREIGN KEY (`admin_assigned`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='ตารางเรียนหลัก - Template สำหรับการสร้างคลาสแต่ละครั้ง';

-- 2) schedule_time_slots (Weekly time schedule)
CREATE TABLE IF NOT EXISTS `schedule_time_slots` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `schedule_id` int UNSIGNED NOT NULL,
  `day_of_week` enum('monday','tuesday','wednesday','thursday','friday','saturday','sunday') NOT NULL,
  `start_time` time NOT NULL,
  `end_time` time NOT NULL,
  `slot_order` tinyint UNSIGNED NOT NULL DEFAULT 1 COMMENT 'ลำดับในสัปดาห์ เช่น 1=พุธ, 2=พฤหัส',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `schedule_time_slots_schedule_id_foreign` (`schedule_id`),
  KEY `idx_time_slot` (`day_of_week`, `start_time`, `end_time`),
  CONSTRAINT `schedule_time_slots_schedule_id_foreign` FOREIGN KEY (`schedule_id`) REFERENCES `schedules` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='เวลาเรียนรายสัปดาห์';

-- 3) schedule_sessions (Individual class sessions)
CREATE TABLE IF NOT EXISTS `schedule_sessions` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `schedule_id` int UNSIGNED NOT NULL,
  `time_slot_id` int UNSIGNED NOT NULL,
  `session_date` date NOT NULL,
  `session_number` int UNSIGNED NOT NULL COMMENT 'ครั้งที่เท่าไหร่ของคอร์ส',
  `week_number` int UNSIGNED NOT NULL COMMENT 'สัปดาห์ที่เท่าไหร่',
  `start_time` time NOT NULL,
  `end_time` time NOT NULL,
  `teacher_id` int UNSIGNED NULL,
  `room_id` int UNSIGNED NULL,
  `status` enum('scheduled','confirmed','in_progress','completed','cancelled','rescheduled') DEFAULT 'scheduled',
  `cancellation_reason` varchar(500) NULL,
  `makeup_for_session_id` int UNSIGNED NULL COMMENT 'ชดเชยให้กับ session ไหน',
  `is_makeup_session` boolean DEFAULT false COMMENT 'เป็น makeup session หรือไม่',
  `notes` text,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_schedule_session` (`schedule_id`, `session_date`, `start_time`),
  KEY `schedule_sessions_schedule_id_foreign` (`schedule_id`),
  KEY `schedule_sessions_time_slot_id_foreign` (`time_slot_id`),
  KEY `schedule_sessions_teacher_id_foreign` (`teacher_id`),
  KEY `schedule_sessions_room_id_foreign` (`room_id`),
  KEY `schedule_sessions_makeup_for_foreign` (`makeup_for_session_id`),
  KEY `idx_session_date` (`session_date`),
  KEY `idx_session_status` (`status`),
  CONSTRAINT `schedule_sessions_schedule_id_foreign` FOREIGN KEY (`schedule_id`) REFERENCES `schedules` (`id`) ON DELETE CASCADE,
  CONSTRAINT `schedule_sessions_time_slot_id_foreign` FOREIGN KEY (`time_slot_id`) REFERENCES `schedule_time_slots` (`id`) ON DELETE CASCADE,
  CONSTRAINT `schedule_sessions_teacher_id_foreign` FOREIGN KEY (`teacher_id`) REFERENCES `teachers` (`id`) ON DELETE SET NULL,
  CONSTRAINT `schedule_sessions_room_id_foreign` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON DELETE SET NULL,
  CONSTRAINT `schedule_sessions_makeup_for_foreign` FOREIGN KEY (`makeup_for_session_id`) REFERENCES `schedule_sessions` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='คลาสแต่ละครั้ง - สร้างจาก schedule template';

-- 4) schedule_students
CREATE TABLE IF NOT EXISTS `schedule_students` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `schedule_id` int UNSIGNED NOT NULL,
  `student_id` int UNSIGNED NOT NULL,
  `enrollment_date` date NOT NULL,
  `status` enum('active','paused','completed','cancelled') DEFAULT 'active',
  `payment_status` enum('pending','partial','paid','overdue') DEFAULT 'pending',
  `total_amount` decimal(10,2) NOT NULL DEFAULT '0.00',
  `paid_amount` decimal(10,2) NOT NULL DEFAULT '0.00',
  `leave_credits` int UNSIGNED NOT NULL DEFAULT 0,
  `used_leaves` int UNSIGNED NOT NULL DEFAULT 0,
  `notes` text,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `schedule_students_schedule_student_unique` (`schedule_id`, `student_id`),
  KEY `schedule_students_student_id_foreign` (`student_id`),
  CONSTRAINT `schedule_students_schedule_id_foreign` FOREIGN KEY (`schedule_id`) REFERENCES `schedules` (`id`) ON DELETE CASCADE,
  CONSTRAINT `schedule_students_student_id_foreign` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='นักเรียนที่ลงทะเบียนในตารางเรียนแต่ละตาราง';

-- 3) schedule_exceptions
CREATE TABLE IF NOT EXISTS `schedule_exceptions` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `schedule_id` int UNSIGNED NOT NULL,
  `exception_date` date NOT NULL,
  `exception_type` enum('cancel','reschedule','substitute_teacher','room_change') NOT NULL,
  `new_date` date NULL COMMENT 'วันใหม่ในกรณี reschedule',
  `new_start_time` time NULL,
  `new_end_time` time NULL,
  `new_teacher_id` int UNSIGNED NULL,
  `new_room_id` int UNSIGNED NULL,
  `reason` varchar(500) NOT NULL,
  `notes` text,
  `created_by` int UNSIGNED NOT NULL,
  `approved_by` int UNSIGNED NULL,
  `status` enum('pending','approved','rejected','completed') DEFAULT 'pending',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `schedule_exceptions_unique` (`schedule_id`, `exception_date`, `exception_type`),
  KEY `schedule_exceptions_new_teacher_id_foreign` (`new_teacher_id`),
  KEY `schedule_exceptions_new_room_id_foreign` (`new_room_id`),
  KEY `schedule_exceptions_created_by_foreign` (`created_by`),
  KEY `schedule_exceptions_approved_by_foreign` (`approved_by`),
  CONSTRAINT `schedule_exceptions_schedule_id_foreign` FOREIGN KEY (`schedule_id`) REFERENCES `schedules` (`id`) ON DELETE CASCADE,
  CONSTRAINT `schedule_exceptions_new_teacher_id_foreign` FOREIGN KEY (`new_teacher_id`) REFERENCES `teachers` (`id`) ON DELETE SET NULL,
  CONSTRAINT `schedule_exceptions_new_room_id_foreign` FOREIGN KEY (`new_room_id`) REFERENCES `rooms` (`id`) ON DELETE SET NULL,
  CONSTRAINT `schedule_exceptions_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `schedule_exceptions_approved_by_foreign` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='ข้อยกเว้นของตารางเรียน - ยกเลิก เลื่อน เปลี่ยนครู เปลี่ยนห้อง';

-- 4) classes alterations
ALTER TABLE `classes`
  ADD COLUMN IF NOT EXISTS `schedule_id` int UNSIGNED NULL AFTER `id`,
  ADD COLUMN IF NOT EXISTS `actual_date` date NULL COMMENT 'วันที่เรียนจริง (อาจต่างจาก schedule ถ้ามี exception)' AFTER `class_date`,
  ADD COLUMN IF NOT EXISTS `is_makeup_class` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'เป็นคลาสชดเชยหรือไม่',
  ADD COLUMN IF NOT EXISTS `original_class_id` int UNSIGNED NULL COMMENT 'อ้างอิงถึงคลาสต้นฉบับที่ต้องชดเชย' AFTER `is_makeup_class`,
  MODIFY COLUMN `course_group_id` int UNSIGNED NULL COMMENT 'เปลี่ยนเป็น optional เพราะใช้ schedule_id แทน';

-- add FKs (guard: drop if they exist first)
DO
BEGIN
  DECLARE CONTINUE HANDLER FOR 1091 BEGIN END; -- ignore "can't drop" errors
  ALTER TABLE `classes` DROP FOREIGN KEY `classes_schedule_id_foreign`;
  ALTER TABLE `classes` DROP FOREIGN KEY `classes_original_class_id_foreign`;
END;

ALTER TABLE `classes`
  ADD CONSTRAINT `classes_schedule_id_foreign` FOREIGN KEY (`schedule_id`) REFERENCES `schedules` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `classes_original_class_id_foreign` FOREIGN KEY (`original_class_id`) REFERENCES `classes` (`id`) ON DELETE SET NULL;

-- 5) class_attendances (recreate)
DROP TABLE IF EXISTS `class_attendances`;
CREATE TABLE `class_attendances` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `class_id` int UNSIGNED NOT NULL,
  `student_id` int UNSIGNED NOT NULL,
  `schedule_student_id` int UNSIGNED NULL COMMENT 'อ้างอิงถึงการลงทะเบียนในตาราง',
  `attendance_status` enum('present','absent','late','excused') DEFAULT 'present',
  `check_in_time` datetime NULL,
  `check_out_time` datetime NULL,
  `absence_reason` varchar(500) NULL,
  `is_makeup_eligible` tinyint(1) NOT NULL DEFAULT 1 COMMENT 'สิทธิ์ในการชดเชย',
  `makeup_class_id` int UNSIGNED NULL COMMENT 'คลาสชดเชยที่จัดให้',
  `notes` text,
  `marked_by` int UNSIGNED NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `class_attendances_class_student_unique` (`class_id`, `student_id`),
  KEY `class_attendances_student_id_foreign` (`student_id`),
  KEY `class_attendances_schedule_student_id_foreign` (`schedule_student_id`),
  KEY `class_attendances_makeup_class_id_foreign` (`makeup_class_id`),
  KEY `class_attendances_marked_by_foreign` (`marked_by`),
  CONSTRAINT `class_attendances_class_id_foreign` FOREIGN KEY (`class_id`) REFERENCES `classes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `class_attendances_student_id_foreign` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE,
  CONSTRAINT `class_attendances_schedule_student_id_foreign` FOREIGN KEY (`schedule_student_id`) REFERENCES `schedule_students` (`id`) ON DELETE SET NULL,
  CONSTRAINT `class_attendances_makeup_class_id_foreign` FOREIGN KEY (`makeup_class_id`) REFERENCES `classes` (`id`) ON DELETE SET NULL,
  CONSTRAINT `class_attendances_marked_by_foreign` FOREIGN KEY (`marked_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='การเข้าเรียนของนักเรียนในแต่ละคลาส';

-- 6) drop legacy tables (if present)
DROP TABLE IF EXISTS
  `course_groups`,
  `class_sessions`,
  `student_attendance`,
  `make_up_sessions`,
  `student_groups`,
  `group_formation_history`,
  `group_waiting_list`,
  `student_schedule_preferences`,
  `schedule_slots`;

-- 7) enrollments adjustments
-- drop old FK if it exists (safe block)
DO
BEGIN
  DECLARE CONTINUE HANDLER FOR 1091 BEGIN END;
  ALTER TABLE `enrollments` DROP FOREIGN KEY `enrollments_course_group_id_foreign`;
END;

ALTER TABLE `enrollments`
  ADD COLUMN IF NOT EXISTS `schedule_id` int UNSIGNED NULL AFTER `course_id`,
  MODIFY COLUMN `course_group_id` int UNSIGNED NULL COMMENT 'Keep for backward compatibility, will be deprecated';

-- drop/re-add schedule FK safely
DO
BEGIN
  DECLARE CONTINUE HANDLER FOR 1091 BEGIN END;
  ALTER TABLE `enrollments` DROP FOREIGN KEY `enrollments_schedule_id_foreign`;
END;

ALTER TABLE `enrollments`
  ADD CONSTRAINT `enrollments_schedule_id_foreign` FOREIGN KEY (`schedule_id`) REFERENCES `schedules` (`id`) ON DELETE SET NULL;

-- 8) indexes (create if missing)
-- Helper routine: create indexes only if they don't already exist
-- schedules
SET @idx := (SELECT COUNT(1) FROM information_schema.statistics
             WHERE table_schema = DATABASE() AND table_name='schedules' AND index_name='idx_schedules_course_teacher');
IF @idx = 0 THEN
  CREATE INDEX `idx_schedules_course_teacher` ON `schedules` (`course_id`, `teacher_id`);
END IF;

SET @idx := (SELECT COUNT(1) FROM information_schema.statistics
             WHERE table_schema = DATABASE() AND table_name='schedules' AND index_name='idx_schedules_room_time');
IF @idx = 0 THEN
  CREATE INDEX `idx_schedules_room_time` ON `schedules` (`room_id`, `day_of_week`, `start_time`);
END IF;

-- schedule_students
SET @idx := (SELECT COUNT(1) FROM information_schema.statistics
             WHERE table_schema = DATABASE() AND table_name='schedule_students' AND index_name='idx_schedule_students_status');
IF @idx = 0 THEN
  CREATE INDEX `idx_schedule_students_status` ON `schedule_students` (`status`);
END IF;

-- classes
SET @idx := (SELECT COUNT(1) FROM information_schema.statistics
             WHERE table_schema = DATABASE() AND table_name='classes' AND index_name='idx_classes_schedule_date');
IF @idx = 0 THEN
  CREATE INDEX `idx_classes_schedule_date` ON `classes` (`schedule_id`, `class_date`);
END IF;

-- class_attendances
SET @idx := (SELECT COUNT(1) FROM information_schema.statistics
             WHERE table_schema = DATABASE() AND table_name='class_attendances' AND index_name='idx_class_attendances_status');
IF @idx = 0 THEN
  CREATE INDEX `idx_class_attendances_status` ON `class_attendances` (`attendance_status`);
END IF;

-- 9) sample data
INSERT IGNORE INTO `schedules`
(`course_id`, `teacher_id`, `room_id`, `schedule_name`, `day_of_week`, `start_time`, `end_time`, `duration_hours`, `max_students`, `start_date`, `status`, `admin_assigned`) VALUES
(1, 2, 1, 'Kids Conversation A1 - Monday Morning',    'monday',    '09:00:00', '10:30:00', 1.5, 6, '2025-09-01', 'active', 1),
(1, 2, 1, 'Kids Conversation A1 - Wednesday Morning',  'wednesday', '09:00:00', '10:30:00', 1.5, 6, '2025-09-01', 'active', 1),
(6, 3, 2, 'Adults Conversation A1 - Monday Evening',   'monday',    '19:00:00', '20:30:00', 1.5, 6, '2025-09-01', 'active', 1),
(6, 3, 2, 'Adults Conversation A1 - Wednesday Evening','wednesday', '19:00:00', '20:30:00', 1.5, 6, '2025-09-01', 'active', 1);

SET FOREIGN_KEY_CHECKS = @old_fk_checks;
