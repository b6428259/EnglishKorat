-- phpMyAdmin SQL Dump
-- version 5.2.2
-- https://www.phpmyadmin.net/
--
-- Host: ekorat-db.c96wcau48ea0.ap-southeast-1.rds.amazonaws.com
-- Generation Time: Aug 31, 2025 at 07:24 AM
-- Server version: 8.0.42
-- PHP Version: 8.2.29

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `englishkorat`
--

DELIMITER $$
--
-- Procedures
--
CREATE DEFINER=`admin`@`%` PROCEDURE `create_index_if_not_exists` (IN `p_table` VARCHAR(64), IN `p_index` VARCHAR(64), IN `p_cols` TEXT)   BEGIN
  DECLARE idx_cnt INT DEFAULT 0;
  SELECT COUNT(*) INTO idx_cnt
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = p_table
    AND index_name = p_index;

  IF idx_cnt = 0 THEN
    SET @sql := CONCAT('CREATE INDEX `', p_index, '` ON `', p_table, '` (', p_cols, ')');
    PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
  END IF;
END$$

CREATE DEFINER=`admin`@`%` PROCEDURE `drop_fk_if_exists` (IN `p_table` VARCHAR(64), IN `p_fk_name` VARCHAR(64))   BEGIN
  DECLARE fk_cnt INT DEFAULT 0;
  SELECT COUNT(*) INTO fk_cnt
  FROM information_schema.referential_constraints
  WHERE constraint_schema = DATABASE()
    AND table_name = p_table
    AND constraint_name = p_fk_name;

  IF fk_cnt > 0 THEN
    SET @sql := CONCAT('ALTER TABLE `', p_table, '` DROP FOREIGN KEY `', p_fk_name, '`');
    PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
  END IF;
END$$

DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `bills`
--

CREATE TABLE `bills` (
  `id` int UNSIGNED NOT NULL,
  `student_id` int UNSIGNED NOT NULL,
  `enrollment_id` int UNSIGNED NOT NULL,
  `bill_number` varchar(50) NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `discount` decimal(10,2) DEFAULT '0.00',
  `total_amount` decimal(10,2) NOT NULL,
  `bill_type` enum('full_payment','installment','deposit') NOT NULL,
  `due_date` date DEFAULT NULL,
  `status` enum('pending','paid','overdue','cancelled') DEFAULT 'pending',
  `notes` text,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `book_borrowings`
--

CREATE TABLE `book_borrowings` (
  `id` int UNSIGNED NOT NULL,
  `student_id` int UNSIGNED NOT NULL,
  `ebook_id` int UNSIGNED NOT NULL,
  `borrow_date` date NOT NULL,
  `due_date` date NOT NULL,
  `return_date` date DEFAULT NULL,
  `status` enum('borrowed','returned','overdue','lost') DEFAULT 'borrowed',
  `late_fee` decimal(8,2) DEFAULT '0.00',
  `issued_by` int UNSIGNED DEFAULT NULL,
  `returned_to` int UNSIGNED DEFAULT NULL,
  `notes` text,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `branches`
--

CREATE TABLE `branches` (
  `id` int UNSIGNED NOT NULL,
  `name_en` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `name_th` varchar(100) NOT NULL,
  `code` varchar(10) NOT NULL,
  `address` text,
  `phone` varchar(20) DEFAULT NULL,
  `type` varchar(20) NOT NULL DEFAULT 'offline',
  `active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `branches`
--

INSERT INTO `branches` (`id`, `name_en`, `name_th`, `code`, `address`, `phone`, `type`, `active`, `created_at`, `updated_at`) VALUES
(1, 'Branch 1 The Mall Branch', 'สาขา 1 เดอะมอลล์โคราช', 'MALL', 'The Mall Korat, Nakhon Ratchasima', '044-123456', 'offline', 1, '2025-08-15 02:28:56', '2025-08-15 02:28:56'),
(2, 'Branch 2 Technology Branch', 'สาขา 2 มหาวิทยาลัยเทคโนโลยีราชมงคลอีสาน', 'RMUTI', 'RMUTI, Nakhon Ratchasima', '044-123457', 'offline', 1, '2025-08-15 02:28:56', '2025-08-15 02:28:56'),
(3, 'Online Branch', 'แบบออนไลน์', 'ONLINE', 'Virtual Campus', '044-123458', 'online', 1, '2025-08-15 02:28:56', '2025-08-15 02:28:56');

-- --------------------------------------------------------

--
-- Table structure for table `classes`
--

CREATE TABLE `classes` (
  `id` int UNSIGNED NOT NULL,
  `course_group_id` int UNSIGNED NOT NULL,
  `teacher_id` int UNSIGNED NOT NULL,
  `room_id` int UNSIGNED NOT NULL,
  `class_date` date NOT NULL,
  `start_time` time NOT NULL,
  `end_time` time NOT NULL,
  `hours` decimal(3,1) NOT NULL,
  `status` enum('scheduled','confirmed','in_progress','completed','cancelled') DEFAULT 'scheduled',
  `notes` text,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `qr_code` varchar(100) DEFAULT NULL,
  `qr_generated_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `class_attendances`
--

CREATE TABLE `class_attendances` (
  `id` int UNSIGNED NOT NULL,
  `class_id` int UNSIGNED NOT NULL,
  `student_id` int UNSIGNED NOT NULL,
  `status` enum('present','absent','excused','late') DEFAULT 'present',
  `notes` text,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `class_sessions`
--

CREATE TABLE `class_sessions` (
  `id` int UNSIGNED NOT NULL,
  `class_id` int UNSIGNED NOT NULL,
  `actual_start` datetime DEFAULT NULL,
  `actual_end` datetime DEFAULT NULL,
  `session_status` enum('scheduled','confirmed','in_progress','completed','cancelled') DEFAULT 'scheduled',
  `qr_code` varchar(100) DEFAULT NULL,
  `attendance_confirmed` tinyint(1) DEFAULT '0',
  `qr_generated_at` datetime DEFAULT NULL,
  `qr_generated_by` int UNSIGNED DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `courses`
--

CREATE TABLE `courses` (
  `id` int UNSIGNED NOT NULL,
  `name` varchar(200) NOT NULL,
  `code` varchar(50) NOT NULL,
  `course_type` enum('conversation_kids','conversation_adults','english_4skills','ielts_prep','toeic_prep','toefl_prep','chinese_conversation','chinese_4skills') NOT NULL,
  `branch_id` int UNSIGNED NOT NULL,
  `description` text,
  `status` enum('active','inactive') DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `category_id` int UNSIGNED DEFAULT NULL,
  `duration_id` int UNSIGNED DEFAULT NULL,
  `level` varchar(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `courses`
--

INSERT INTO `courses` (`id`, `name`, `code`, `course_type`, `branch_id`, `description`, `status`, `created_at`, `updated_at`, `category_id`, `duration_id`, `level`) VALUES
(1, 'Kids Conversation A1', 'MALL-CONV-K-A1', 'conversation_kids', 1, 'Beginner level conversation for kids aged 6-10', 'active', '2025-08-15 02:28:58', '2025-08-15 02:28:58', 1, NULL, 'A1'),
(2, 'Kids Conversation A2', 'MALL-CONV-K-A2', 'conversation_kids', 1, 'Elementary level conversation for kids aged 8-12', 'active', '2025-08-15 02:28:58', '2025-08-15 02:28:58', 1, NULL, 'A2'),
(3, 'Kids Conversation B1', 'MALL-CONV-K-B1', 'conversation_kids', 1, 'Intermediate level conversation for kids aged 10-14', 'active', '2025-08-15 02:28:58', '2025-08-15 02:28:58', 1, NULL, 'B1'),
(4, 'Kids Conversation B2', 'MALL-CONV-K-B2', 'conversation_kids', 1, 'Upper-intermediate conversation for kids aged 12-16', 'active', '2025-08-15 02:28:58', '2025-08-15 02:28:58', 1, NULL, 'B2'),
(5, 'Kids Advanced Conversation', 'MALL-CONV-K-ADV', 'conversation_kids', 1, 'Advanced conversation for teenagers', 'active', '2025-08-15 02:28:58', '2025-08-15 02:28:58', 1, NULL, 'Advanced'),
(6, 'Adults Conversation A1', 'MALL-CONV-A-A1', 'conversation_adults', 1, 'Basic conversation for adults', 'active', '2025-08-15 02:28:58', '2025-08-15 02:28:58', 2, NULL, 'A1'),
(7, 'Adults Conversation A2', 'MALL-CONV-A-A2', 'conversation_adults', 1, 'Elementary conversation for adults', 'active', '2025-08-15 02:28:58', '2025-08-15 02:28:58', 2, NULL, 'A2'),
(8, 'Adults Conversation B1', 'MALL-CONV-A-B1', 'conversation_adults', 1, 'Intermediate conversation for adults', 'active', '2025-08-15 02:28:58', '2025-08-15 02:28:58', 2, NULL, 'B1'),
(9, 'Adults Conversation B2', 'MALL-CONV-A-B2', 'conversation_adults', 1, 'Upper-intermediate conversation', 'active', '2025-08-15 02:28:58', '2025-08-15 02:28:58', 2, NULL, 'B2'),
(10, 'Business Conversation', 'MALL-CONV-BIZ', 'conversation_adults', 1, 'Business English conversation', 'active', '2025-08-15 02:28:58', '2025-08-15 02:28:58', 2, NULL, 'Business'),
(11, 'Travel Conversation', 'MALL-CONV-TRAVEL', 'conversation_adults', 1, 'English for travelers', 'active', '2025-08-15 02:28:58', '2025-08-15 02:28:58', 2, NULL, 'Travel'),
(12, 'English 4 Skills Foundation', 'MALL-4SKILL-FOUND', 'english_4skills', 1, 'Foundation level 4 skills', 'active', '2025-08-15 02:28:58', '2025-08-15 02:28:58', 3, NULL, 'Foundation'),
(13, 'English 4 Skills Elementary', 'MALL-4SKILL-ELEM', 'english_4skills', 1, 'Elementary level 4 skills', 'active', '2025-08-15 02:28:58', '2025-08-15 02:28:58', 3, NULL, 'Elementary'),
(14, 'English 4 Skills Intermediate', 'MALL-4SKILL-INT', 'english_4skills', 1, 'Intermediate level 4 skills', 'active', '2025-08-15 02:28:58', '2025-08-15 02:28:58', 3, NULL, 'Intermediate'),
(15, 'English 4 Skills Upper-Int', 'MALL-4SKILL-UPPER', 'english_4skills', 1, 'Upper-intermediate 4 skills', 'active', '2025-08-15 02:28:58', '2025-08-15 02:28:58', 3, NULL, 'Upper-Intermediate'),
(16, 'English 4 Skills Advanced', 'MALL-4SKILL-ADV', 'english_4skills', 1, 'Advanced level 4 skills', 'active', '2025-08-15 02:28:58', '2025-08-15 02:28:58', 3, NULL, 'Advanced'),
(17, 'IELTS Academic Foundation', 'MALL-IELTS-ACAD-FOUND', 'ielts_prep', 1, 'IELTS Academic preparation', 'active', '2025-08-15 02:28:58', '2025-08-15 02:28:58', 4, NULL, 'Foundation'),
(18, 'IELTS Academic Intensive', 'MALL-IELTS-ACAD-INT', 'ielts_prep', 1, 'Intensive IELTS Academic', 'active', '2025-08-15 02:28:58', '2025-08-15 02:28:58', 4, NULL, 'Intensive'),
(19, 'IELTS General Training', 'MALL-IELTS-GT', 'ielts_prep', 1, 'IELTS General Training', 'active', '2025-08-15 02:28:58', '2025-08-15 02:28:58', 4, NULL, 'General Training'),
(20, 'TOEIC Foundation', 'MALL-TOEIC-FOUND', 'toeic_prep', 1, 'TOEIC preparation foundation', 'active', '2025-08-15 02:28:58', '2025-08-15 02:28:58', 5, NULL, 'Foundation'),
(21, 'TOEIC Intensive', 'MALL-TOEIC-INT', 'toeic_prep', 1, 'Intensive TOEIC preparation', 'active', '2025-08-15 02:28:58', '2025-08-15 02:28:58', 5, NULL, 'Intensive'),
(22, 'TOEFL iBT Foundation', 'MALL-TOEFL-FOUND', 'toefl_prep', 1, 'TOEFL iBT preparation', 'active', '2025-08-15 02:28:58', '2025-08-15 02:28:58', 6, NULL, 'Foundation'),
(23, 'TOEFL iBT Intensive', 'MALL-TOEFL-INT', 'toefl_prep', 1, 'Intensive TOEFL iBT', 'active', '2025-08-15 02:28:58', '2025-08-15 02:28:58', 6, NULL, 'Intensive'),
(24, 'University Prep', 'MALL-UNI-PREP', 'toefl_prep', 1, 'University entrance preparation', 'active', '2025-08-15 02:28:58', '2025-08-15 02:28:58', 6, NULL, 'Preparation'),
(25, 'Scholarship Prep', 'MALL-SCHOLAR-PREP', 'ielts_prep', 1, 'Scholarship application preparation', 'active', '2025-08-15 02:28:58', '2025-08-15 02:28:58', 4, NULL, 'Preparation'),
(26, 'Chinese Conversation Beginner', 'MALL-CHIN-CONV-BEG', 'chinese_conversation', 1, 'Basic Chinese conversation', 'active', '2025-08-15 02:28:58', '2025-08-15 02:28:58', 7, NULL, 'Beginner'),
(27, 'Chinese Conversation Intermediate', 'MALL-CHIN-CONV-INT', 'chinese_conversation', 1, 'Intermediate Chinese conversation', 'active', '2025-08-15 02:28:58', '2025-08-15 02:28:58', 7, NULL, 'Intermediate'),
(28, 'Chinese 4 Skills Foundation', 'MALL-CHIN-4SKILL-FOUND', 'chinese_4skills', 1, 'Chinese 4 skills foundation', 'active', '2025-08-15 02:28:58', '2025-08-15 02:28:58', 8, NULL, 'Foundation'),
(29, 'Chinese 4 Skills Advanced', 'MALL-CHIN-4SKILL-ADV', 'chinese_4skills', 1, 'Advanced Chinese 4 skills', 'active', '2025-08-15 02:28:58', '2025-08-15 02:28:58', 8, NULL, 'Advanced'),
(30, 'Private Tutoring', 'MALL-PRIVATE', 'conversation_adults', 1, 'One-on-one private lessons (per hour)', 'active', '2025-08-15 02:28:58', '2025-08-15 02:28:58', 2, NULL, 'Private'),
(31, 'Corporate Training', 'MALL-CORPORATE', 'conversation_adults', 1, 'Corporate English training', 'active', '2025-08-15 02:28:58', '2025-08-15 02:28:58', 2, NULL, 'Corporate'),
(32, 'Kids Conversation A1', 'TECH-CONV-K-A1', 'conversation_kids', 2, 'Beginner level conversation for kids', 'active', '2025-08-15 02:28:58', '2025-08-15 02:28:58', 1, NULL, 'A1'),
(33, 'Kids Conversation A2', 'TECH-CONV-K-A2', 'conversation_kids', 2, 'Elementary level conversation for kids', 'active', '2025-08-15 02:28:58', '2025-08-15 02:28:58', 1, NULL, 'A2'),
(34, 'Kids Conversation B1', 'TECH-CONV-K-B1', 'conversation_kids', 2, 'Intermediate level conversation for kids', 'active', '2025-08-15 02:28:58', '2025-08-15 02:28:58', 1, NULL, 'B1'),
(35, 'Teen Advanced Conversation', 'TECH-CONV-TEEN-ADV', 'conversation_kids', 2, 'Advanced conversation for teenagers', 'active', '2025-08-15 02:28:58', '2025-08-15 02:28:58', 1, NULL, 'Advanced'),
(36, 'Adults Conversation A1', 'TECH-CONV-A-A1', 'conversation_adults', 2, 'Basic conversation for adults', 'active', '2025-08-15 02:28:58', '2025-08-15 02:28:58', 2, NULL, 'A1'),
(37, 'Adults Conversation A2', 'TECH-CONV-A-A2', 'conversation_adults', 2, 'Elementary conversation for adults', 'active', '2025-08-15 02:28:58', '2025-08-15 02:28:58', 2, NULL, 'A2'),
(38, 'Adults Conversation B1', 'TECH-CONV-A-B1', 'conversation_adults', 2, 'Intermediate conversation for adults', 'active', '2025-08-15 02:28:58', '2025-08-15 02:28:58', 2, NULL, 'B1'),
(39, 'Adults Conversation B2', 'TECH-CONV-A-B2', 'conversation_adults', 2, 'Upper-intermediate conversation', 'active', '2025-08-15 02:28:58', '2025-08-15 02:28:58', 2, NULL, 'B2'),
(40, 'Professional English', 'TECH-CONV-PROF', 'conversation_adults', 2, 'Professional English conversation', 'active', '2025-08-15 02:28:58', '2025-08-15 02:28:58', 2, NULL, 'Professional'),
(41, 'English 4 Skills Foundation', 'TECH-4SKILL-FOUND', 'english_4skills', 2, 'Foundation level 4 skills', 'active', '2025-08-15 02:28:58', '2025-08-15 02:28:58', 3, NULL, 'Foundation'),
(42, 'English 4 Skills Elementary', 'TECH-4SKILL-ELEM', 'english_4skills', 2, 'Elementary level 4 skills', 'active', '2025-08-15 02:28:58', '2025-08-15 02:28:58', 3, NULL, 'Elementary'),
(43, 'English 4 Skills Intermediate', 'TECH-4SKILL-INT', 'english_4skills', 2, 'Intermediate level 4 skills', 'active', '2025-08-15 02:28:58', '2025-08-15 02:28:58', 3, NULL, 'Intermediate'),
(44, 'English 4 Skills Advanced', 'TECH-4SKILL-ADV', 'english_4skills', 2, 'Advanced level 4 skills', 'active', '2025-08-15 02:28:58', '2025-08-15 02:28:58', 3, NULL, 'Advanced'),
(45, 'IELTS Academic Prep', 'TECH-IELTS-ACAD', 'ielts_prep', 2, 'IELTS Academic preparation', 'active', '2025-08-15 02:28:58', '2025-08-15 02:28:58', 4, NULL, 'Academic'),
(46, 'IELTS General Training', 'TECH-IELTS-GT', 'ielts_prep', 2, 'IELTS General Training', 'active', '2025-08-15 02:28:58', '2025-08-15 02:28:58', 4, NULL, 'General Training'),
(47, 'TOEIC Foundation', 'TECH-TOEIC-FOUND', 'toeic_prep', 2, 'TOEIC preparation foundation', 'active', '2025-08-15 02:28:58', '2025-08-15 02:28:58', 5, NULL, 'Foundation'),
(48, 'TOEIC Intensive', 'TECH-TOEIC-INT', 'toeic_prep', 2, 'Intensive TOEIC preparation', 'active', '2025-08-15 02:28:58', '2025-08-15 02:28:58', 5, NULL, 'Intensive'),
(49, 'TOEFL iBT Prep', 'TECH-TOEFL', 'toefl_prep', 2, 'TOEFL iBT preparation', 'active', '2025-08-15 02:28:58', '2025-08-15 02:28:58', 6, NULL, 'TOEFL'),
(50, 'University Entrance', 'TECH-UNI-ENT', 'toefl_prep', 2, 'University entrance preparation', 'active', '2025-08-15 02:28:58', '2025-08-15 02:28:58', 6, NULL, 'University Entrance'),
(51, 'Academic English', 'TECH-ACADEMIC', 'english_4skills', 2, 'Academic English skills', 'active', '2025-08-15 02:28:58', '2025-08-15 02:28:58', 3, NULL, 'Academic'),
(52, 'Chinese Conversation Basic', 'TECH-CHIN-CONV-BASIC', 'chinese_conversation', 2, 'Basic Chinese conversation', 'active', '2025-08-15 02:28:58', '2025-08-15 02:28:58', 7, NULL, 'Basic'),
(53, 'Chinese Conversation Intermediate', 'TECH-CHIN-CONV-INT', 'chinese_conversation', 2, 'Intermediate Chinese conversation', 'active', '2025-08-15 02:28:58', '2025-08-15 02:28:58', 7, NULL, 'Intermediate'),
(54, 'Chinese 4 Skills', 'TECH-CHIN-4SKILL', 'chinese_4skills', 2, 'Chinese 4 skills course', 'active', '2025-08-15 02:28:58', '2025-08-15 02:28:58', 8, NULL, 'Unspecified'),
(55, 'Private Tutoring', 'TECH-PRIVATE', 'conversation_adults', 2, 'One-on-one private lessons (per hour)', 'active', '2025-08-15 02:28:58', '2025-08-15 02:28:58', 2, NULL, 'Private'),
(56, 'Evening Classes', 'TECH-EVENING', 'conversation_adults', 2, 'Evening English classes for working professionals', 'active', '2025-08-15 02:28:58', '2025-08-15 02:28:58', 2, NULL, 'Evening'),
(57, 'Online Kids Conversation', 'ONLINE-CONV-KIDS', 'conversation_kids', 3, 'Online conversation for kids', 'active', '2025-08-15 02:28:58', '2025-08-15 02:28:58', 1, NULL, 'Kids'),
(58, 'Online Adults Conversation A1-A2', 'ONLINE-CONV-A-BASIC', 'conversation_adults', 3, 'Basic online conversation for adults', 'active', '2025-08-15 02:28:58', '2025-08-15 02:28:58', 2, NULL, 'A1'),
(59, 'Online Adults Conversation B1-B2', 'ONLINE-CONV-A-INT', 'conversation_adults', 3, 'Intermediate online conversation', 'active', '2025-08-15 02:28:58', '2025-08-15 02:28:58', 2, NULL, 'B1'),
(60, 'Online Business English', 'ONLINE-CONV-BIZ', 'conversation_adults', 3, 'Online business English', 'active', '2025-08-15 02:28:58', '2025-08-15 02:28:58', 2, NULL, 'Business'),
(61, 'Online English 4 Skills Basic', 'ONLINE-4SKILL-BASIC', 'english_4skills', 3, 'Basic online 4 skills', 'active', '2025-08-15 02:28:58', '2025-08-15 02:28:58', 3, NULL, 'Basic'),
(62, 'Online English 4 Skills Intermediate', 'ONLINE-4SKILL-INT', 'english_4skills', 3, 'Intermediate online 4 skills', 'active', '2025-08-15 02:28:58', '2025-08-15 02:28:58', 3, NULL, 'Intermediate'),
(63, 'Online English 4 Skills Advanced', 'ONLINE-4SKILL-ADV', 'english_4skills', 3, 'Advanced online 4 skills', 'active', '2025-08-15 02:28:58', '2025-08-15 02:28:58', 3, NULL, 'Advanced'),
(64, 'Online IELTS Academic', 'ONLINE-IELTS-ACAD', 'ielts_prep', 3, 'Online IELTS Academic preparation', 'active', '2025-08-15 02:28:58', '2025-08-15 02:28:58', 4, NULL, 'Academic'),
(65, 'Online IELTS General', 'ONLINE-IELTS-GT', 'ielts_prep', 3, 'Online IELTS General Training', 'active', '2025-08-15 02:28:58', '2025-08-15 02:28:58', 4, NULL, 'General Training'),
(66, 'Online TOEIC Prep', 'ONLINE-TOEIC', 'toeic_prep', 3, 'Online TOEIC preparation', 'active', '2025-08-15 02:28:58', '2025-08-15 02:28:58', 5, NULL, 'TOEIC'),
(67, 'Online TOEFL iBT', 'ONLINE-TOEFL', 'toefl_prep', 3, 'Online TOEFL iBT preparation', 'active', '2025-08-15 02:28:58', '2025-08-15 02:28:58', 6, NULL, 'TOEFL'),
(68, 'Online University Prep', 'ONLINE-UNI-PREP', 'toefl_prep', 3, 'Online university preparation', 'active', '2025-08-15 02:28:58', '2025-08-15 02:28:58', 6, NULL, 'Preparation'),
(69, 'Online Chinese Conversation', 'ONLINE-CHIN-CONV', 'chinese_conversation', 3, 'Online Chinese conversation', 'active', '2025-08-15 02:28:58', '2025-08-15 02:28:58', 7, NULL, 'Unspecified'),
(70, 'Online Chinese 4 Skills', 'ONLINE-CHIN-4SKILL', 'chinese_4skills', 3, 'Online Chinese 4 skills', 'active', '2025-08-15 02:28:58', '2025-08-15 02:28:58', 8, NULL, 'Unspecified'),
(71, 'Online Private Tutoring', 'ONLINE-PRIVATE', 'conversation_adults', 3, 'Online one-on-one private lessons (per hour)', 'active', '2025-08-15 02:28:58', '2025-08-15 02:28:58', 2, NULL, 'Private'),
(99999, 'Contact Admin - เพื่อหาคอร์สที่เหมาะสม', 'CONTACT', '', 3, NULL, 'active', '2025-08-19 13:49:32', '2025-08-19 13:49:32', 8, NULL, 'AM');

-- --------------------------------------------------------

--
-- Table structure for table `course_categories`
--

CREATE TABLE `course_categories` (
  `id` int UNSIGNED NOT NULL,
  `name` varchar(100) NOT NULL,
  `name_en` varchar(100) NOT NULL,
  `description` text,
  `description_en` text,
  `type` enum('conversation','skills','test_prep','language') NOT NULL,
  `sort_order` int DEFAULT '0',
  `active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `code` varchar(50) DEFAULT NULL,
  `includes_book_fee` tinyint(1) DEFAULT '1',
  `default_book_fee` decimal(8,2) DEFAULT '900.00'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `course_categories`
--

INSERT INTO `course_categories` (`id`, `name`, `name_en`, `description`, `description_en`, `type`, `sort_order`, `active`, `created_at`, `updated_at`, `code`, `includes_book_fee`, `default_book_fee`) VALUES
(1, 'คอร์สสนทนาเด็ก', 'Kids Conversation', 'คอร์สสนทนาภาษาอังกฤษสำหรับเด็ก', 'English conversation courses for children', 'conversation', 1, 1, '2025-08-15 02:28:58', '2025-08-15 02:28:58', NULL, 1, 900.00),
(2, 'คอร์สสนทนาผู้ใหญ่', 'Adults Conversation', 'คอร์สสนทนาภาษาอังกฤษสำหรับผู้ใหญ่', 'English conversation courses for adults', 'conversation', 2, 1, '2025-08-15 02:28:58', '2025-08-15 02:28:58', NULL, 1, 900.00),
(3, 'คอร์ส 4 ทักษะ', 'English 4 Skills', 'คอร์สเรียนภาษาอังกฤษครบ 4 ทักษะ', 'Comprehensive English 4 skills course', 'skills', 3, 1, '2025-08-15 02:28:58', '2025-08-15 02:28:58', NULL, 1, 900.00),
(4, 'คอร์สเตรียมสอบ IELTS', 'IELTS Preparation', 'คอร์สเตรียมสอบ IELTS', 'IELTS test preparation course', 'test_prep', 4, 1, '2025-08-15 02:28:58', '2025-08-15 02:28:58', NULL, 1, 900.00),
(5, 'คอร์สเตรียมสอบ TOEIC', 'TOEIC Preparation', 'คอร์สเตรียมสอบ TOEIC', 'TOEIC test preparation course', 'test_prep', 5, 1, '2025-08-15 02:28:58', '2025-08-15 02:28:58', NULL, 1, 900.00),
(6, 'คอร์สเตรียมสอบ TOEFL', 'TOEFL Preparation', 'คอร์สเตรียมสอบ TOEFL', 'TOEFL test preparation course', 'test_prep', 6, 1, '2025-08-15 02:28:58', '2025-08-15 02:28:58', NULL, 1, 900.00),
(7, 'คอร์สภาษาจีนสนทนา', 'Chinese Conversation', 'คอร์สสนทนาภาษาจีน', 'Chinese conversation course', 'language', 7, 1, '2025-08-15 02:28:58', '2025-08-15 02:28:58', NULL, 1, 900.00),
(8, 'คอร์สภาษาจีน 4 ทักษะ', 'Chinese 4 Skills', 'คอร์สภาษาจีนครบ 4 ทักษะ', 'Comprehensive Chinese 4 skills course', 'language', 8, 1, '2025-08-15 02:28:58', '2025-08-15 02:28:58', NULL, 1, 900.00);

-- --------------------------------------------------------

--
-- Table structure for table `course_drops`
--

CREATE TABLE `course_drops` (
  `id` int NOT NULL,
  `schedule_id` int NOT NULL,
  `student_id` int NOT NULL,
  `drop_type` enum('temporary','permanent') NOT NULL,
  `drop_date` date NOT NULL,
  `expected_return_date` date DEFAULT NULL,
  `reason` text NOT NULL,
  `preserve_schedule` tinyint(1) DEFAULT '1',
  `notes` text,
  `created_by` int DEFAULT NULL,
  `status` enum('active','returned','expired') DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `course_durations`
--

CREATE TABLE `course_durations` (
  `id` int UNSIGNED NOT NULL,
  `hours` int NOT NULL,
  `name` varchar(50) NOT NULL,
  `is_premium` tinyint(1) DEFAULT '0',
  `description` text,
  `active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `course_durations`
--

INSERT INTO `course_durations` (`id`, `hours`, `name`, `is_premium`, `description`, `active`, `created_at`, `updated_at`) VALUES
(1, 40, '40 Hours', 0, 'Standard 40-hour course duration', 1, '2025-08-15 02:28:56', '2025-08-15 02:28:56'),
(2, 50, '50 Hours', 0, 'Extended 50-hour course duration', 1, '2025-08-15 02:28:56', '2025-08-15 02:28:56'),
(3, 60, '60 Hours Premium', 1, 'Premium 60-hour course duration with enhanced features', 1, '2025-08-15 02:28:56', '2025-08-15 02:28:56');

-- --------------------------------------------------------

--
-- Table structure for table `course_groups`
--

CREATE TABLE `course_groups` (
  `id` int UNSIGNED NOT NULL,
  `course_id` int UNSIGNED NOT NULL,
  `group_name` varchar(100) DEFAULT NULL,
  `required_cefr_level` varchar(10) DEFAULT NULL,
  `required_age_group` enum('kids','students','adults') DEFAULT NULL,
  `schedule_requirements` text,
  `auto_formed` tinyint(1) DEFAULT '0',
  `group_leader_id` int UNSIGNED DEFAULT NULL,
  `formation_type` enum('individual','self_formed','institute_arranged') DEFAULT 'institute_arranged',
  `formation_deadline` datetime DEFAULT NULL,
  `teacher_id` int UNSIGNED DEFAULT NULL,
  `room_id` int UNSIGNED DEFAULT NULL,
  `current_students` int UNSIGNED DEFAULT '0',
  `target_students` int UNSIGNED DEFAULT '6',
  `min_students` int UNSIGNED DEFAULT '2',
  `status` enum('waiting_for_group','ready_to_active','in_progress','completed','cancelled') DEFAULT 'waiting_for_group',
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `admin_assigned` int UNSIGNED DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `course_pricing`
--

CREATE TABLE `course_pricing` (
  `id` int UNSIGNED NOT NULL,
  `category_id` int UNSIGNED NOT NULL,
  `duration_id` int UNSIGNED NOT NULL,
  `pricing_tier_id` int UNSIGNED NOT NULL,
  `base_price` decimal(10,2) NOT NULL,
  `book_fee` decimal(8,2) DEFAULT '0.00',
  `total_price` decimal(10,2) NOT NULL,
  `price_per_hour_per_person` decimal(8,2) NOT NULL,
  `notes` text,
  `active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `ebooks`
--

CREATE TABLE `ebooks` (
  `id` int UNSIGNED NOT NULL,
  `title` varchar(255) NOT NULL,
  `author` varchar(255) DEFAULT NULL,
  `isbn` varchar(50) DEFAULT NULL,
  `category` enum('conversation','grammar','vocabulary','test_prep','children','business','academic','general') NOT NULL,
  `level` varchar(20) DEFAULT NULL,
  `stock_quantity` int UNSIGNED DEFAULT '0',
  `borrowed_count` int UNSIGNED DEFAULT '0',
  `price` decimal(8,2) DEFAULT NULL,
  `file_path` varchar(500) DEFAULT NULL,
  `cover_image` varchar(500) DEFAULT NULL,
  `description` text,
  `available` tinyint(1) DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `ebooks`
--

INSERT INTO `ebooks` (`id`, `title`, `author`, `isbn`, `category`, `level`, `stock_quantity`, `borrowed_count`, `price`, `file_path`, `cover_image`, `description`, `available`, `created_at`, `updated_at`) VALUES
(1, 'English Conversation for Beginners', 'Sarah Johnson', '978-0123456789', 'conversation', 'A1', 25, 0, 350.00, NULL, NULL, 'Basic conversation patterns and everyday expressions', 1, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(2, 'Intermediate English Conversations', 'Michael Brown', '978-0987654321', 'conversation', 'B1', 20, 0, 450.00, NULL, NULL, 'Real-life conversations for intermediate learners', 1, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(3, 'Business English Conversations', 'Jennifer Davis', '978-0456789123', 'business', 'B2', 15, 0, 650.00, NULL, NULL, 'Professional English for workplace communication', 1, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(4, 'Essential English Grammar', 'David Wilson', '978-0789123456', 'grammar', 'A2', 30, 0, 420.00, NULL, NULL, 'Comprehensive grammar guide with exercises', 1, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(5, 'Advanced Grammar in Use', 'Cambridge University Press', '978-0321654987', 'grammar', 'C1', 12, 0, 750.00, NULL, NULL, 'Advanced grammar for upper-intermediate learners', 1, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(6, '4000 Essential English Words', 'Paul Nation', '978-0159753486', 'vocabulary', 'B1', 25, 0, 580.00, NULL, NULL, 'High-frequency vocabulary for intermediate learners', 1, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(7, 'Academic Vocabulary in Use', 'Cambridge Academic', '978-0741852963', 'academic', 'B2', 18, 0, 680.00, NULL, NULL, 'Essential vocabulary for academic contexts', 1, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(8, 'IELTS Academic Practice Tests', 'IELTS Experts', '978-0852741963', 'test_prep', 'B2', 20, 0, 850.00, NULL, NULL, 'Complete practice tests for IELTS Academic', 1, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(9, 'TOEIC Official Test Collection', 'ETS', '978-0963852741', 'test_prep', 'B1', 15, 0, 920.00, NULL, NULL, 'Official TOEIC practice tests and strategies', 1, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(10, 'TOEFL iBT Complete Guide', 'Princeton Review', '978-0741963852', 'test_prep', 'B2', 12, 0, 1150.00, NULL, NULL, 'Comprehensive TOEFL iBT preparation guide', 1, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(11, 'Fun English for Kids Level 1', 'Kids Learning Team', '978-0159357486', 'children', 'A1', 35, 0, 280.00, NULL, NULL, 'Engaging English activities for young learners', 1, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(12, 'English Stories for Children', 'Story Writers', '978-0486159753', 'children', 'A2', 40, 0, 320.00, NULL, NULL, 'Illustrated stories to improve reading skills', 1, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(13, 'New English File Elementary', 'Oxford University Press', '978-0194518789', 'general', 'A2', 22, 0, 650.00, NULL, NULL, 'Complete course for elementary English learners', 1, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(14, 'English in Mind Intermediate', 'Cambridge University Press', '978-0521750196', 'general', 'B1', 18, 0, 720.00, NULL, NULL, 'Comprehensive intermediate English course', 1, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(15, 'American English Culture Guide', 'Cultural Learning Institute', '978-0987456123', 'general', 'B2', 10, 0, 580.00, NULL, NULL, 'Understanding American culture through English', 1, '2025-08-15 02:28:58', '2025-08-15 02:28:58');

-- --------------------------------------------------------

--
-- Table structure for table `enrollments`
--

CREATE TABLE `enrollments` (
  `id` int UNSIGNED NOT NULL,
  `student_id` int UNSIGNED NOT NULL,
  `course_id` int UNSIGNED NOT NULL,
  `course_group_id` int UNSIGNED DEFAULT NULL,
  `enrollment_date` date NOT NULL,
  `payment_status` enum('pending','partial','completed','overdue') DEFAULT 'pending',
  `total_amount` decimal(10,2) NOT NULL,
  `paid_amount` decimal(10,2) DEFAULT '0.00',
  `leave_credits` int DEFAULT '0',
  `used_leaves` int DEFAULT '0',
  `status` enum('active','completed','cancelled','suspended') DEFAULT 'active',
  `notes` text,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `leave_policy_rule_id` int UNSIGNED DEFAULT NULL,
  `promotion_id` int UNSIGNED DEFAULT NULL,
  `referral_source` text
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `enrollment_pricing`
--

CREATE TABLE `enrollment_pricing` (
  `id` int UNSIGNED NOT NULL,
  `enrollment_id` int UNSIGNED NOT NULL,
  `course_pricing_id` int UNSIGNED DEFAULT NULL,
  `group_size_at_enrollment` int UNSIGNED NOT NULL,
  `calculated_base_price` decimal(10,2) NOT NULL,
  `book_fee_applied` decimal(8,2) DEFAULT '0.00',
  `total_price_calculated` decimal(10,2) NOT NULL,
  `book_fee_waived` tinyint(1) DEFAULT '0',
  `pricing_calculation_details` text,
  `notes` text,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `group_formation_history`
--

CREATE TABLE `group_formation_history` (
  `id` int UNSIGNED NOT NULL,
  `group_id` int UNSIGNED NOT NULL,
  `student_id` int UNSIGNED NOT NULL,
  `action` enum('added','removed','status_changed') NOT NULL,
  `previous_status` varchar(50) DEFAULT NULL,
  `new_status` varchar(50) DEFAULT NULL,
  `reason` text,
  `performed_by` int UNSIGNED DEFAULT NULL,
  `auto_generated` tinyint(1) DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `group_waiting_list`
--

CREATE TABLE `group_waiting_list` (
  `id` int UNSIGNED NOT NULL,
  `student_id` int UNSIGNED NOT NULL,
  `required_cefr_level` varchar(10) NOT NULL,
  `required_age_group` enum('kids','students','adults') NOT NULL,
  `available_schedule` text NOT NULL,
  `preferred_group_size` int UNSIGNED DEFAULT '4',
  `priority` enum('normal','high','urgent') DEFAULT 'normal',
  `waiting_since` datetime NOT NULL,
  `days_waiting` int UNSIGNED DEFAULT '0',
  `active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `group_waiting_list`
--

INSERT INTO `group_waiting_list` (`id`, `student_id`, `required_cefr_level`, `required_age_group`, `available_schedule`, `preferred_group_size`, `priority`, `waiting_since`, `days_waiting`, `active`, `created_at`, `updated_at`) VALUES
(1, 4, 'B2', 'adults', '{\"monday\":[{\"start_time\":\"17:00:00\",\"end_time\":\"19:00:00\"}],\"wednesday\":[{\"start_time\":\"17:00:00\",\"end_time\":\"19:00:00\"}],\"friday\":[{\"start_time\":\"19:00:00\",\"end_time\":\"21:00:00\"}]}', 4, 'normal', '2025-07-23 11:30:31', 4, 1, '2025-08-15 09:29:00', '2025-08-15 09:29:00');

-- --------------------------------------------------------

--
-- Table structure for table `knex_migrations`
--

CREATE TABLE `knex_migrations` (
  `id` int UNSIGNED NOT NULL,
  `name` varchar(255) DEFAULT NULL,
  `batch` int DEFAULT NULL,
  `migration_time` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `knex_migrations`
--

INSERT INTO `knex_migrations` (`id`, `name`, `batch`, `migration_time`) VALUES
(1, '000_init_schema.js', 1, '2025-08-15 09:28:14'),
(2, '001_create_users_tables.js', 1, '2025-08-15 09:28:15'),
(3, '002_create_courses_rooms.js', 1, '2025-08-15 09:28:16'),
(4, '003_create_enrollments_classes.js', 1, '2025-08-15 09:28:18'),
(5, '004_create_reports_billing.js', 1, '2025-08-15 09:28:20'),
(6, '005_create_leave_policy_system.js', 1, '2025-08-15 09:28:23'),
(7, '006_create_comprehensive_system.js', 1, '2025-08-15 09:28:30'),
(8, '007_update_existing_tables.js', 1, '2025-08-15 09:28:31'),
(9, '008_enhance_student_registration_system.js', 1, '2025-08-15 09:28:33'),
(10, '009_create_comprehensive_pricing_system.js', 1, '2025-08-15 09:28:35');

-- --------------------------------------------------------

--
-- Table structure for table `knex_migrations_lock`
--

CREATE TABLE `knex_migrations_lock` (
  `index` int UNSIGNED NOT NULL,
  `is_locked` int DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `knex_migrations_lock`
--

INSERT INTO `knex_migrations_lock` (`index`, `is_locked`) VALUES
(1, 0);

-- --------------------------------------------------------

--
-- Table structure for table `leave_policy_changes`
--

CREATE TABLE `leave_policy_changes` (
  `id` int UNSIGNED NOT NULL,
  `policy_rule_id` int UNSIGNED NOT NULL,
  `change_type` enum('create','update','delete','revert') NOT NULL,
  `changed_by` int UNSIGNED NOT NULL,
  `change_reason` text NOT NULL,
  `old_values` json DEFAULT NULL,
  `new_values` json DEFAULT NULL,
  `field_changes` text,
  `reverted_from_change_id` int UNSIGNED DEFAULT NULL,
  `status` enum('pending_approval','approved','rejected','applied') DEFAULT 'applied',
  `approved_by` int UNSIGNED DEFAULT NULL,
  `approved_at` timestamp NULL DEFAULT NULL,
  `applied_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `leave_policy_changes`
--

INSERT INTO `leave_policy_changes` (`id`, `policy_rule_id`, `change_type`, `changed_by`, `change_reason`, `old_values`, `new_values`, `field_changes`, `reverted_from_change_id`, `status`, `approved_by`, `approved_at`, `applied_at`, `created_at`, `updated_at`) VALUES
(1, 1, 'create', 2, 'Initial creation of leave policy rule based on institute requirements', NULL, '{\"rule_name\": \"ระเบียบการลาคอร์สเรียนเดี่ยว 60 ชั่วโมง\", \"conditions\": \"{\\\"advance_notice_hours\\\":24,\\\"deadline_time\\\":\\\"18:00\\\",\\\"makeup_classes_allowed\\\":true,\\\"notes\\\":\\\"แจ้งลาล่วงหน้าอย่างน้อย 1 วัน ไม่เกิน 18:00 น.\\\"}\", \"course_type\": \"private\", \"course_hours\": 60, \"max_students\": 1, \"leave_credits\": 6}', 'Created leave policy rule: ระเบียบการลาคอร์สเรียนเดี่ยว 60 ชั่วโมง', NULL, 'applied', NULL, NULL, '2025-08-15 09:28:58', '2025-08-15 02:28:57', '2025-08-15 02:28:57'),
(2, 2, 'create', 2, 'Initial creation of leave policy rule based on institute requirements', NULL, '{\"rule_name\": \"ระเบียบการลาคอร์สเรียนเดี่ยว 50 ชั่วโมง\", \"conditions\": \"{\\\"advance_notice_hours\\\":24,\\\"deadline_time\\\":\\\"18:00\\\",\\\"makeup_classes_allowed\\\":true}\", \"course_type\": \"private\", \"course_hours\": 50, \"max_students\": 1, \"leave_credits\": 4}', 'Created leave policy rule: ระเบียบการลาคอร์สเรียนเดี่ยว 50 ชั่วโมง', NULL, 'applied', NULL, NULL, '2025-08-15 09:28:58', '2025-08-15 02:28:57', '2025-08-15 02:28:57'),
(3, 3, 'create', 2, 'Initial creation of leave policy rule based on institute requirements', NULL, '{\"rule_name\": \"ระเบียบการลาคอร์สเรียนเดี่ยว 40 ชั่วโมง\", \"conditions\": \"{\\\"advance_notice_hours\\\":24,\\\"deadline_time\\\":\\\"18:00\\\",\\\"makeup_classes_allowed\\\":true}\", \"course_type\": \"private\", \"course_hours\": 40, \"max_students\": 1, \"leave_credits\": 3}', 'Created leave policy rule: ระเบียบการลาคอร์สเรียนเดี่ยว 40 ชั่วโมง', NULL, 'applied', NULL, NULL, '2025-08-15 09:28:58', '2025-08-15 02:28:57', '2025-08-15 02:28:57'),
(4, 4, 'create', 2, 'Initial creation of leave policy rule based on institute requirements', NULL, '{\"rule_name\": \"ระเบียบการลาคอร์สเรียนคู่ 60 ชั่วโมง\", \"conditions\": \"{\\\"advance_notice_hours\\\":24,\\\"deadline_time\\\":\\\"20:00\\\",\\\"makeup_classes_allowed\\\":true,\\\"institute_scheduled_only\\\":true,\\\"notes\\\":\\\"ชดเชยตามวันที่สถาบันกำหนด หากมาไม่ได้ถือว่าใช้สิทธิ์แล้ว\\\"}\", \"course_type\": \"pair\", \"course_hours\": 60, \"max_students\": 2, \"leave_credits\": 2}', 'Created leave policy rule: ระเบียบการลาคอร์สเรียนคู่ 60 ชั่วโมง', NULL, 'applied', NULL, NULL, '2025-08-15 09:28:58', '2025-08-15 02:28:57', '2025-08-15 02:28:57'),
(5, 5, 'create', 2, 'Initial creation of leave policy rule based on institute requirements', NULL, '{\"rule_name\": \"ระเบียบการลาคอร์สเรียนคู่ 50 ชั่วโมง\", \"conditions\": \"{\\\"advance_notice_hours\\\":24,\\\"deadline_time\\\":\\\"20:00\\\",\\\"makeup_classes_allowed\\\":true,\\\"institute_scheduled_only\\\":true}\", \"course_type\": \"pair\", \"course_hours\": 50, \"max_students\": 2, \"leave_credits\": 2}', 'Created leave policy rule: ระเบียบการลาคอร์สเรียนคู่ 50 ชั่วโมง', NULL, 'applied', NULL, NULL, '2025-08-15 09:28:58', '2025-08-15 02:28:57', '2025-08-15 02:28:57'),
(6, 6, 'create', 2, 'Initial creation of leave policy rule based on institute requirements', NULL, '{\"rule_name\": \"ระเบียบการลาคอร์สเรียนคู่ 40 ชั่วโมง\", \"conditions\": \"{\\\"advance_notice_hours\\\":24,\\\"deadline_time\\\":\\\"20:00\\\",\\\"makeup_classes_allowed\\\":true,\\\"institute_scheduled_only\\\":true}\", \"course_type\": \"pair\", \"course_hours\": 40, \"max_students\": 2, \"leave_credits\": 1}', 'Created leave policy rule: ระเบียบการลาคอร์สเรียนคู่ 40 ชั่วโมง', NULL, 'applied', NULL, NULL, '2025-08-15 09:28:58', '2025-08-15 02:28:57', '2025-08-15 02:28:57'),
(7, 7, 'create', 2, 'Initial creation of leave policy rule based on institute requirements', NULL, '{\"rule_name\": \"ระเบียบการลาคอร์สกลุ่มเล็ก 60 ชั่วโมง\", \"conditions\": \"{\\\"advance_notice_hours\\\":24,\\\"deadline_time\\\":\\\"20:00\\\",\\\"makeup_classes_allowed\\\":true,\\\"institute_scheduled_only\\\":true,\\\"notes\\\":\\\"คลาสกลุ่ม 3-5 ท่าน\\\"}\", \"course_type\": \"group_small\", \"course_hours\": 60, \"max_students\": 5, \"leave_credits\": 2}', 'Created leave policy rule: ระเบียบการลาคอร์สกลุ่มเล็ก 60 ชั่วโมง', NULL, 'applied', NULL, NULL, '2025-08-15 09:28:58', '2025-08-15 02:28:57', '2025-08-15 02:28:57'),
(8, 8, 'create', 2, 'Initial creation of leave policy rule based on institute requirements', NULL, '{\"rule_name\": \"ระเบียบการลาคอร์สกลุ่มเล็ก 50 ชั่วโมง\", \"conditions\": \"{\\\"advance_notice_hours\\\":24,\\\"deadline_time\\\":\\\"20:00\\\",\\\"makeup_classes_allowed\\\":true,\\\"institute_scheduled_only\\\":true}\", \"course_type\": \"group_small\", \"course_hours\": 50, \"max_students\": 5, \"leave_credits\": 1}', 'Created leave policy rule: ระเบียบการลาคอร์สกลุ่มเล็ก 50 ชั่วโมง', NULL, 'applied', NULL, NULL, '2025-08-15 09:28:58', '2025-08-15 02:28:57', '2025-08-15 02:28:57'),
(9, 9, 'create', 2, 'Initial creation of leave policy rule based on institute requirements', NULL, '{\"rule_name\": \"ระเบียบการลาคอร์สกลุ่มเล็ก 40 ชั่วโมง\", \"conditions\": \"{\\\"advance_notice_hours\\\":24,\\\"deadline_time\\\":\\\"20:00\\\",\\\"makeup_classes_allowed\\\":true,\\\"institute_scheduled_only\\\":true}\", \"course_type\": \"group_small\", \"course_hours\": 40, \"max_students\": 5, \"leave_credits\": 1}', 'Created leave policy rule: ระเบียบการลาคอร์สกลุ่มเล็ก 40 ชั่วโมง', NULL, 'applied', NULL, NULL, '2025-08-15 09:28:58', '2025-08-15 02:28:57', '2025-08-15 02:28:57');

-- --------------------------------------------------------

--
-- Table structure for table `leave_policy_notifications`
--

CREATE TABLE `leave_policy_notifications` (
  `id` int UNSIGNED NOT NULL,
  `change_id` int UNSIGNED NOT NULL,
  `recipient_id` int UNSIGNED NOT NULL,
  `notification_type` varchar(50) NOT NULL,
  `title` varchar(200) NOT NULL,
  `message` text NOT NULL,
  `metadata` json DEFAULT NULL,
  `is_read` tinyint(1) DEFAULT '0',
  `read_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `leave_policy_permissions`
--

CREATE TABLE `leave_policy_permissions` (
  `id` int UNSIGNED NOT NULL,
  `policy_rule_id` int UNSIGNED NOT NULL,
  `user_id` int UNSIGNED NOT NULL,
  `permission_type` enum('edit','approve','view') NOT NULL,
  `granted_by` int UNSIGNED NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `leave_policy_permissions`
--

INSERT INTO `leave_policy_permissions` (`id`, `policy_rule_id`, `user_id`, `permission_type`, `granted_by`, `created_at`, `updated_at`) VALUES
(1, 1, 2, 'edit', 2, '2025-08-15 02:28:57', '2025-08-15 02:28:57'),
(2, 2, 2, 'edit', 2, '2025-08-15 02:28:57', '2025-08-15 02:28:57'),
(3, 3, 2, 'edit', 2, '2025-08-15 02:28:57', '2025-08-15 02:28:57'),
(4, 4, 2, 'edit', 2, '2025-08-15 02:28:57', '2025-08-15 02:28:57'),
(5, 5, 2, 'edit', 2, '2025-08-15 02:28:57', '2025-08-15 02:28:57'),
(6, 6, 2, 'edit', 2, '2025-08-15 02:28:57', '2025-08-15 02:28:57'),
(7, 7, 2, 'edit', 2, '2025-08-15 02:28:57', '2025-08-15 02:28:57'),
(8, 8, 2, 'edit', 2, '2025-08-15 02:28:57', '2025-08-15 02:28:57'),
(9, 9, 2, 'edit', 2, '2025-08-15 02:28:57', '2025-08-15 02:28:57');

-- --------------------------------------------------------

--
-- Table structure for table `leave_policy_rules`
--

CREATE TABLE `leave_policy_rules` (
  `id` int UNSIGNED NOT NULL,
  `branch_id` int UNSIGNED NOT NULL,
  `rule_name` varchar(200) NOT NULL,
  `course_type` enum('private','pair','group_small','group_large','conversation_kids','conversation_adults','english_4skills','ielts_prep','toeic_prep','toefl_prep','chinese_conversation','chinese_4skills') NOT NULL,
  `course_hours` int UNSIGNED NOT NULL,
  `max_students` int UNSIGNED DEFAULT '1',
  `leave_credits` int UNSIGNED NOT NULL,
  `price_per_hour` decimal(10,2) DEFAULT NULL,
  `conditions` text,
  `effective_date` date NOT NULL,
  `expiry_date` date DEFAULT NULL,
  `status` enum('draft','active','inactive','archived') DEFAULT 'draft',
  `created_by` int UNSIGNED NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `leave_policy_rules`
--

INSERT INTO `leave_policy_rules` (`id`, `branch_id`, `rule_name`, `course_type`, `course_hours`, `max_students`, `leave_credits`, `price_per_hour`, `conditions`, `effective_date`, `expiry_date`, `status`, `created_by`, `created_at`, `updated_at`) VALUES
(1, 1, 'ระเบียบการลาคอร์สเรียนเดี่ยว 60 ชั่วโมง', 'private', 60, 1, 6, NULL, '{\"advance_notice_hours\":24,\"deadline_time\":\"18:00\",\"makeup_classes_allowed\":true,\"notes\":\"แจ้งลาล่วงหน้าอย่างน้อย 1 วัน ไม่เกิน 18:00 น.\"}', '2024-01-01', NULL, 'active', 2, '2025-08-15 02:28:57', '2025-08-15 02:28:57'),
(2, 1, 'ระเบียบการลาคอร์สเรียนเดี่ยว 50 ชั่วโมง', 'private', 50, 1, 4, NULL, '{\"advance_notice_hours\":24,\"deadline_time\":\"18:00\",\"makeup_classes_allowed\":true}', '2024-01-01', NULL, 'active', 2, '2025-08-15 02:28:57', '2025-08-15 02:28:57'),
(3, 1, 'ระเบียบการลาคอร์สเรียนเดี่ยว 40 ชั่วโมง', 'private', 40, 1, 3, NULL, '{\"advance_notice_hours\":24,\"deadline_time\":\"18:00\",\"makeup_classes_allowed\":true}', '2024-01-01', NULL, 'active', 2, '2025-08-15 02:28:57', '2025-08-15 02:28:57'),
(4, 1, 'ระเบียบการลาคอร์สเรียนคู่ 60 ชั่วโมง', 'pair', 60, 2, 2, NULL, '{\"advance_notice_hours\":24,\"deadline_time\":\"20:00\",\"makeup_classes_allowed\":true,\"institute_scheduled_only\":true,\"notes\":\"ชดเชยตามวันที่สถาบันกำหนด หากมาไม่ได้ถือว่าใช้สิทธิ์แล้ว\"}', '2024-01-01', NULL, 'active', 2, '2025-08-15 02:28:57', '2025-08-15 02:28:57'),
(5, 1, 'ระเบียบการลาคอร์สเรียนคู่ 50 ชั่วโมง', 'pair', 50, 2, 2, NULL, '{\"advance_notice_hours\":24,\"deadline_time\":\"20:00\",\"makeup_classes_allowed\":true,\"institute_scheduled_only\":true}', '2024-01-01', NULL, 'active', 2, '2025-08-15 02:28:57', '2025-08-15 02:28:57'),
(6, 1, 'ระเบียบการลาคอร์สเรียนคู่ 40 ชั่วโมง', 'pair', 40, 2, 1, NULL, '{\"advance_notice_hours\":24,\"deadline_time\":\"20:00\",\"makeup_classes_allowed\":true,\"institute_scheduled_only\":true}', '2024-01-01', NULL, 'active', 2, '2025-08-15 02:28:57', '2025-08-15 02:28:57'),
(7, 1, 'ระเบียบการลาคอร์สกลุ่มเล็ก 60 ชั่วโมง', 'group_small', 60, 5, 2, NULL, '{\"advance_notice_hours\":24,\"deadline_time\":\"20:00\",\"makeup_classes_allowed\":true,\"institute_scheduled_only\":true,\"notes\":\"คลาสกลุ่ม 3-5 ท่าน\"}', '2024-01-01', NULL, 'active', 2, '2025-08-15 02:28:57', '2025-08-15 02:28:57'),
(8, 1, 'ระเบียบการลาคอร์สกลุ่มเล็ก 50 ชั่วโมง', 'group_small', 50, 5, 1, NULL, '{\"advance_notice_hours\":24,\"deadline_time\":\"20:00\",\"makeup_classes_allowed\":true,\"institute_scheduled_only\":true}', '2024-01-01', NULL, 'active', 2, '2025-08-15 02:28:57', '2025-08-15 02:28:57'),
(9, 1, 'ระเบียบการลาคอร์สกลุ่มเล็ก 40 ชั่วโมง', 'group_small', 40, 5, 1, NULL, '{\"advance_notice_hours\":24,\"deadline_time\":\"20:00\",\"makeup_classes_allowed\":true,\"institute_scheduled_only\":true}', '2024-01-01', NULL, 'active', 2, '2025-08-15 02:28:57', '2025-08-15 02:28:57');

-- --------------------------------------------------------

--
-- Table structure for table `line_groups`
--

CREATE TABLE `line_groups` (
  `id` int UNSIGNED NOT NULL,
  `group_id` int UNSIGNED DEFAULT NULL,
  `branch_id` int UNSIGNED NOT NULL,
  `line_group_id` varchar(100) NOT NULL,
  `webhook_url` varchar(500) DEFAULT NULL,
  `active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `line_groups2`
--

CREATE TABLE `line_groups2` (
  `id` int NOT NULL,
  `group_name` varchar(255) NOT NULL,
  `line_group_id` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `makeup_eligibilities`
--

CREATE TABLE `makeup_eligibilities` (
  `id` int NOT NULL,
  `student_id` int NOT NULL,
  `original_session_id` int NOT NULL,
  `schedule_id` int NOT NULL,
  `reason` text,
  `status` enum('pending','used','expired') DEFAULT 'pending',
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `make_up_sessions`
--

CREATE TABLE `make_up_sessions` (
  `id` int UNSIGNED NOT NULL,
  `original_session_id` int UNSIGNED NOT NULL,
  `new_session_id` int UNSIGNED DEFAULT NULL,
  `student_id` int UNSIGNED NOT NULL,
  `status` enum('scheduled','completed','cancelled') DEFAULT 'scheduled',
  `scheduled_date` datetime DEFAULT NULL,
  `arranged_by` int UNSIGNED DEFAULT NULL,
  `notes` text,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `notifications`
--

CREATE TABLE `notifications` (
  `id` int UNSIGNED NOT NULL,
  `user_id` int UNSIGNED NOT NULL,
  `type` enum('class_confirmation','leave_approval','class_cancellation','schedule_change','payment_reminder','report_deadline','room_conflict','general') NOT NULL,
  `title` varchar(200) NOT NULL,
  `message` text NOT NULL,
  `metadata` json DEFAULT NULL,
  `line_sent` tinyint(1) DEFAULT '0',
  `web_read` tinyint(1) DEFAULT '0',
  `line_sent_at` datetime DEFAULT NULL,
  `web_read_at` datetime DEFAULT NULL,
  `scheduled_for` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `notification_schedules`
--

CREATE TABLE `notification_schedules` (
  `id` int UNSIGNED NOT NULL,
  `user_id` int UNSIGNED NOT NULL,
  `notification_type` enum('daily_group_update','status_change','payment_reminder','schedule_confirmation','waiting_discount_offer') NOT NULL,
  `frequency` enum('daily','every_3_days','weekly','one_time') NOT NULL,
  `preferred_time` time DEFAULT '09:00:00',
  `next_send_at` datetime NOT NULL,
  `last_sent_at` datetime DEFAULT NULL,
  `active` tinyint(1) DEFAULT '1',
  `notification_data` json DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `notification_schedules`
--

INSERT INTO `notification_schedules` (`id`, `user_id`, `notification_type`, `frequency`, `preferred_time`, `next_send_at`, `last_sent_at`, `active`, `notification_data`, `created_at`, `updated_at`) VALUES
(1, 3, 'daily_group_update', 'every_3_days', '09:00:00', '2025-08-15 16:12:12', NULL, 1, '{}', '2025-08-15 09:29:00', '2025-08-15 09:29:00'),
(2, 4, 'daily_group_update', 'every_3_days', '09:00:00', '2025-08-17 10:34:03', NULL, 1, '{}', '2025-08-15 09:29:00', '2025-08-15 09:29:00'),
(3, 5, 'daily_group_update', 'every_3_days', '09:00:00', '2025-08-16 08:33:39', NULL, 1, '{}', '2025-08-15 09:29:00', '2025-08-15 09:29:00'),
(4, 6, 'daily_group_update', 'every_3_days', '09:00:00', '2025-08-18 03:10:07', NULL, 1, '{}', '2025-08-15 09:29:00', '2025-08-15 09:29:00'),
(5, 7, 'daily_group_update', 'every_3_days', '09:00:00', '2025-08-16 07:42:50', NULL, 1, '{}', '2025-08-15 09:29:00', '2025-08-15 09:29:00');

-- --------------------------------------------------------

--
-- Table structure for table `notification_templates`
--

CREATE TABLE `notification_templates` (
  `id` int UNSIGNED NOT NULL,
  `type` enum('class_confirmation','leave_approval','class_cancellation','schedule_change','payment_reminder','report_deadline') NOT NULL,
  `title_th` varchar(200) NOT NULL,
  `title_en` varchar(200) NOT NULL,
  `message_th` text NOT NULL,
  `message_en` text NOT NULL,
  `variables` json DEFAULT NULL,
  `active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `notification_templates`
--

INSERT INTO `notification_templates` (`id`, `type`, `title_th`, `title_en`, `message_th`, `message_en`, `variables`, `active`, `created_at`, `updated_at`) VALUES
(1, 'class_confirmation', 'ยืนยันการเข้าเรียน', 'Class Confirmation', 'กรุณายืนยันการเข้าเรียนคลาส {{course_name}} วันที่ {{date}} เวลา {{time}} ห้อง {{room}}', 'Please confirm your attendance for {{course_name}} class on {{date}} at {{time}} in room {{room}}', '[\"course_name\", \"date\", \"time\", \"room\", \"teacher_name\"]', 1, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(2, 'leave_approval', 'การอนุมัติการลา', 'Leave Request Approval', 'คำขอลาของคุณสำหรับคลาส {{course_name}} วันที่ {{date}} {{status}}', 'Your leave request for {{course_name}} class on {{date}} has been {{status}}', '[\"course_name\", \"date\", \"status\", \"reason\", \"admin_name\"]', 1, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(3, 'class_cancellation', 'ยกเลิกคลาสเรียน', 'Class Cancellation', 'คลาส {{course_name}} วันที่ {{date}} เวลา {{time}} ถูกยกเลิก เหตุผล: {{reason}}', 'Class {{course_name}} on {{date}} at {{time}} has been cancelled. Reason: {{reason}}', '[\"course_name\", \"date\", \"time\", \"reason\", \"makeup_info\"]', 1, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(4, 'schedule_change', 'เปลี่ยนแปลงตารางเรียน', 'Schedule Change', 'ตารางเรียน {{course_name}} มีการเปลี่ยนแปลง: {{changes}}', 'Schedule change for {{course_name}}: {{changes}}', '[\"course_name\", \"changes\", \"old_schedule\", \"new_schedule\"]', 1, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(5, 'payment_reminder', 'แจ้งเตือนการชำระเงิน', 'Payment Reminder', 'กรุณาชำระค่าเรียน {{amount}} บาท ภายในวันที่ {{due_date}}', 'Please pay {{amount}} THB by {{due_date}}', '[\"amount\", \"due_date\", \"course_name\", \"bill_number\"]', 1, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(6, 'report_deadline', 'แจ้งเตือนส่งรายงาน', 'Report Submission Deadline', 'กรุณาส่งรายงานการสอนสำหรับคลาส {{course_name}} ภายในวันที่ {{deadline}}', 'Please submit teaching report for {{course_name}} by {{deadline}}', '[\"course_name\", \"deadline\", \"class_date\"]', 1, '2025-08-15 02:28:58', '2025-08-15 02:28:58');

-- --------------------------------------------------------

--
-- Table structure for table `payments`
--

CREATE TABLE `payments` (
  `id` int UNSIGNED NOT NULL,
  `bill_id` int UNSIGNED NOT NULL,
  `student_id` int UNSIGNED NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `payment_method` enum('cash','credit_card','bank_transfer','line_pay') NOT NULL,
  `processing_fee` decimal(8,2) DEFAULT '0.00',
  `transaction_id` varchar(100) DEFAULT NULL,
  `slip_image` varchar(255) DEFAULT NULL,
  `payment_date` datetime NOT NULL,
  `verification_status` enum('pending','verified','rejected') DEFAULT 'pending',
  `verified_by` int UNSIGNED DEFAULT NULL,
  `verified_at` datetime DEFAULT NULL,
  `verification_notes` text,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `thunder_verification_id` varchar(100) DEFAULT NULL,
  `thunder_response` json DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `permissions`
--

CREATE TABLE `permissions` (
  `id` int UNSIGNED NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `module` varchar(50) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `permissions`
--

INSERT INTO `permissions` (`id`, `name`, `description`, `module`, `created_at`, `updated_at`) VALUES
(1, 'users.view', 'View user profiles', 'users', '2025-08-15 02:28:57', '2025-08-15 02:28:57'),
(2, 'users.create', 'Create new users', 'users', '2025-08-15 02:28:57', '2025-08-15 02:28:57'),
(3, 'users.edit', 'Edit user profiles', 'users', '2025-08-15 02:28:57', '2025-08-15 02:28:57'),
(4, 'users.delete', 'Delete users', 'users', '2025-08-15 02:28:57', '2025-08-15 02:28:57'),
(5, 'users.manage_roles', 'Assign user roles', 'users', '2025-08-15 02:28:57', '2025-08-15 02:28:57'),
(6, 'courses.view', 'View courses', 'courses', '2025-08-15 02:28:57', '2025-08-15 02:28:57'),
(7, 'courses.create', 'Create new courses', 'courses', '2025-08-15 02:28:57', '2025-08-15 02:28:57'),
(8, 'courses.edit', 'Edit courses', 'courses', '2025-08-15 02:28:57', '2025-08-15 02:28:57'),
(9, 'courses.delete', 'Delete courses', 'courses', '2025-08-15 02:28:57', '2025-08-15 02:28:57'),
(10, 'courses.manage_groups', 'Manage course groups', 'courses', '2025-08-15 02:28:57', '2025-08-15 02:28:57'),
(11, 'classes.view', 'View class schedules', 'classes', '2025-08-15 02:28:57', '2025-08-15 02:28:57'),
(12, 'classes.create', 'Create class schedules', 'classes', '2025-08-15 02:28:57', '2025-08-15 02:28:57'),
(13, 'classes.edit', 'Edit class schedules', 'classes', '2025-08-15 02:28:57', '2025-08-15 02:28:57'),
(14, 'classes.delete', 'Delete class schedules', 'classes', '2025-08-15 02:28:57', '2025-08-15 02:28:57'),
(15, 'classes.mark_attendance', 'Mark student attendance', 'classes', '2025-08-15 02:28:57', '2025-08-15 02:28:57'),
(16, 'classes.generate_qr', 'Generate QR codes for classes', 'classes', '2025-08-15 02:28:57', '2025-08-15 02:28:57'),
(17, 'students.view', 'View student profiles', 'students', '2025-08-15 02:28:57', '2025-08-15 02:28:57'),
(18, 'students.register', 'Register new students', 'students', '2025-08-15 02:28:57', '2025-08-15 02:28:57'),
(19, 'students.edit', 'Edit student profiles', 'students', '2025-08-15 02:28:57', '2025-08-15 02:28:57'),
(20, 'students.view_progress', 'View student progress', 'students', '2025-08-15 02:28:57', '2025-08-15 02:28:57'),
(21, 'students.manage_documents', 'Manage student documents', 'students', '2025-08-15 02:28:57', '2025-08-15 02:28:57'),
(22, 'leaves.view', 'View leave requests', 'leaves', '2025-08-15 02:28:57', '2025-08-15 02:28:57'),
(23, 'leaves.approve', 'Approve leave requests', 'leaves', '2025-08-15 02:28:57', '2025-08-15 02:28:57'),
(24, 'leaves.manage_policies', 'Manage leave policies', 'leaves', '2025-08-15 02:28:57', '2025-08-15 02:28:57'),
(25, 'leaves.schedule_makeup', 'Schedule makeup classes', 'leaves', '2025-08-15 02:28:57', '2025-08-15 02:28:57'),
(26, 'billing.view', 'View bills and payments', 'billing', '2025-08-15 02:28:57', '2025-08-15 02:28:57'),
(27, 'billing.create', 'Create bills', 'billing', '2025-08-15 02:28:57', '2025-08-15 02:28:57'),
(28, 'billing.edit', 'Edit bills', 'billing', '2025-08-15 02:28:57', '2025-08-15 02:28:57'),
(29, 'billing.verify_payments', 'Verify payment slips', 'billing', '2025-08-15 02:28:57', '2025-08-15 02:28:57'),
(30, 'billing.manage_salaries', 'Manage teacher salaries', 'billing', '2025-08-15 02:28:57', '2025-08-15 02:28:57'),
(31, 'reports.view', 'View teaching reports', 'reports', '2025-08-15 02:28:57', '2025-08-15 02:28:57'),
(32, 'reports.create', 'Create teaching reports', 'reports', '2025-08-15 02:28:57', '2025-08-15 02:28:57'),
(33, 'reports.edit', 'Edit teaching reports', 'reports', '2025-08-15 02:28:57', '2025-08-15 02:28:57'),
(34, 'reports.analytics', 'View analytics and statistics', 'reports', '2025-08-15 02:28:57', '2025-08-15 02:28:57'),
(35, 'rooms.view', 'View room availability', 'rooms', '2025-08-15 02:28:57', '2025-08-15 02:28:57'),
(36, 'rooms.manage', 'Manage room bookings', 'rooms', '2025-08-15 02:28:57', '2025-08-15 02:28:57'),
(37, 'rooms.conflicts', 'Resolve room conflicts', 'rooms', '2025-08-15 02:28:57', '2025-08-15 02:28:57'),
(38, 'notifications.view', 'View notifications', 'notifications', '2025-08-15 02:28:57', '2025-08-15 02:28:57'),
(39, 'notifications.send', 'Send notifications', 'notifications', '2025-08-15 02:28:57', '2025-08-15 02:28:57'),
(40, 'notifications.manage_templates', 'Manage notification templates', 'notifications', '2025-08-15 02:28:57', '2025-08-15 02:28:57'),
(41, 'ebooks.view', 'View e-book catalog', 'ebooks', '2025-08-15 02:28:57', '2025-08-15 02:28:57'),
(42, 'ebooks.manage', 'Manage e-book inventory', 'ebooks', '2025-08-15 02:28:57', '2025-08-15 02:28:57'),
(43, 'ebooks.lending', 'Manage book lending', 'ebooks', '2025-08-15 02:28:57', '2025-08-15 02:28:57'),
(44, 'system.backup', 'Perform system backups', 'system', '2025-08-15 02:28:57', '2025-08-15 02:28:57'),
(45, 'system.maintenance', 'System maintenance tasks', 'system', '2025-08-15 02:28:57', '2025-08-15 02:28:57'),
(46, 'system.audit_logs', 'View audit logs', 'system', '2025-08-15 02:28:57', '2025-08-15 02:28:57'),
(47, 'system.manage_branches', 'Manage branch settings', 'system', '2025-08-15 02:28:57', '2025-08-15 02:28:57'),
(48, 'owner.full_access', 'Full system access', 'owner', '2025-08-15 02:28:57', '2025-08-15 02:28:57'),
(49, 'owner.policy_changes', 'Approve policy changes', 'owner', '2025-08-15 02:28:57', '2025-08-15 02:28:57'),
(50, 'owner.financial_reports', 'View comprehensive financial reports', 'owner', '2025-08-15 02:28:57', '2025-08-15 02:28:57');

-- --------------------------------------------------------

--
-- Table structure for table `pricing_change_history`
--

CREATE TABLE `pricing_change_history` (
  `id` int UNSIGNED NOT NULL,
  `enrollment_id` int UNSIGNED NOT NULL,
  `course_group_id` int UNSIGNED DEFAULT NULL,
  `previous_group_size` int UNSIGNED DEFAULT NULL,
  `new_group_size` int UNSIGNED NOT NULL,
  `previous_price` decimal(10,2) DEFAULT NULL,
  `new_price` decimal(10,2) NOT NULL,
  `change_reason` enum('student_joined','student_left','group_disbanded','manual_adjustment') NOT NULL,
  `change_details` text,
  `processed_by` int UNSIGNED DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `pricing_tiers`
--

CREATE TABLE `pricing_tiers` (
  `id` int UNSIGNED NOT NULL,
  `tier_type` varchar(50) NOT NULL,
  `display_name` varchar(100) NOT NULL,
  `min_students` int NOT NULL,
  `max_students` int NOT NULL,
  `sort_order` int DEFAULT '0',
  `active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `pricing_tiers`
--

INSERT INTO `pricing_tiers` (`id`, `tier_type`, `display_name`, `min_students`, `max_students`, `sort_order`, `active`, `created_at`, `updated_at`) VALUES
(1, 'individual', 'Individual', 1, 1, 1, 1, '2025-08-15 02:28:56', '2025-08-15 02:28:56'),
(2, 'pair', 'Pair', 2, 2, 2, 1, '2025-08-15 02:28:56', '2025-08-15 02:28:56'),
(3, 'group', 'Group (3-4 people)', 3, 4, 3, 1, '2025-08-15 02:28:56', '2025-08-15 02:28:56');

-- --------------------------------------------------------

--
-- Table structure for table `rooms`
--

CREATE TABLE `rooms` (
  `id` int UNSIGNED NOT NULL,
  `branch_id` int UNSIGNED NOT NULL,
  `room_name` varchar(50) NOT NULL,
  `capacity` int UNSIGNED NOT NULL,
  `equipment` text,
  `status` enum('available','maintenance','unavailable') DEFAULT 'available',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `rooms`
--

INSERT INTO `rooms` (`id`, `branch_id`, `room_name`, `capacity`, `equipment`, `status`, `created_at`, `updated_at`) VALUES
(1, 1, 'Room A1', 8, '[\"whiteboard\",\"projector\",\"air_conditioning\"]', 'available', '2025-08-15 02:28:57', '2025-08-15 02:28:57'),
(2, 1, 'Room A2', 6, '[\"whiteboard\",\"speakers\",\"air_conditioning\"]', 'available', '2025-08-15 02:28:57', '2025-08-15 02:28:57'),
(3, 1, 'Room A3', 10, '[\"whiteboard\",\"projector\",\"speakers\",\"air_conditioning\"]', 'available', '2025-08-15 02:28:57', '2025-08-15 02:28:57'),
(4, 2, 'Tech B1', 12, '[\"smart_board\",\"projector\",\"computers\",\"air_conditioning\"]', 'available', '2025-08-15 02:28:57', '2025-08-15 02:28:57'),
(5, 2, 'Tech B2', 8, '[\"whiteboard\",\"projector\",\"air_conditioning\"]', 'available', '2025-08-15 02:28:57', '2025-08-15 02:28:57'),
(6, 3, 'Virtual Room 1', 20, '[\"zoom_pro\",\"breakout_rooms\",\"recording\"]', 'available', '2025-08-15 02:28:57', '2025-08-15 02:28:57'),
(7, 3, 'Virtual Room 2', 15, '[\"zoom_pro\",\"breakout_rooms\",\"recording\"]', 'available', '2025-08-15 02:28:57', '2025-08-15 02:28:57');

-- --------------------------------------------------------

--
-- Table structure for table `room_notifications`
--

CREATE TABLE `room_notifications` (
  `id` int UNSIGNED NOT NULL,
  `branch_id` int UNSIGNED NOT NULL,
  `room_id` int UNSIGNED DEFAULT NULL,
  `teacher_id` int UNSIGNED DEFAULT NULL,
  `notification_type` enum('room_available','room_conflict','room_change','general') NOT NULL,
  `title` varchar(200) NOT NULL,
  `message` text NOT NULL,
  `schedule_time` datetime DEFAULT NULL,
  `metadata` json DEFAULT NULL,
  `is_popup_shown` tinyint(1) DEFAULT '0',
  `is_read` tinyint(1) DEFAULT '0',
  `read_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `schedules`
--

CREATE TABLE `schedules` (
  `id` int UNSIGNED NOT NULL,
  `course_id` int UNSIGNED NOT NULL,
  `teacher_id` int UNSIGNED DEFAULT NULL,
  `room_id` int UNSIGNED DEFAULT NULL,
  `schedule_name` varchar(200) NOT NULL COMMENT 'ชื่อตารางเรียน เช่น "Adults Conversation B1 - Monday/Wednesday"',
  `schedule_type` enum('fixed','flexible','one_time') DEFAULT 'fixed' COMMENT 'fixed=ตารางเรียนประจำ, flexible=ยืดหยุ่น, one_time=เรียนครั้งเดียว',
  `recurring_pattern` enum('weekly','bi_weekly','monthly','custom') DEFAULT 'weekly',
  `total_hours` decimal(5,1) NOT NULL COMMENT 'จำนวนชั่วโมงรวมทั้งหมด เช่น 60.0',
  `hours_per_session` decimal(3,1) NOT NULL DEFAULT '3.0' COMMENT 'ชั่วโมงต่อครั้ง เช่น 3.0',
  `sessions_per_week` int UNSIGNED NOT NULL DEFAULT '1' COMMENT 'จำนวนครั้งต่อสัปดาห์',
  `max_students` int UNSIGNED NOT NULL DEFAULT '6',
  `current_students` int UNSIGNED DEFAULT '0',
  `start_date` date NOT NULL COMMENT 'วันเริ่มต้นของคอร์ส',
  `estimated_end_date` date DEFAULT NULL COMMENT 'วันสิ้นสุดประมาณ (คำนวณจาก total_hours)',
  `actual_end_date` date DEFAULT NULL COMMENT 'วันสิ้นสุดจริง',
  `status` enum('draft','active','paused','completed','cancelled') DEFAULT 'draft',
  `auto_reschedule_holidays` tinyint(1) DEFAULT '1' COMMENT 'เลื่อนวันหยุดอัตโนมัติ',
  `notes` text COMMENT 'หมายเหตุ',
  `admin_assigned` int UNSIGNED DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='ตารางเรียนหลัก - Template สำหรับการสร้างคลาสแต่ละครั้ง';

--
-- Dumping data for table `schedules`
--

INSERT INTO `schedules` (`id`, `course_id`, `teacher_id`, `room_id`, `schedule_name`, `schedule_type`, `recurring_pattern`, `total_hours`, `hours_per_session`, `sessions_per_week`, `max_students`, `current_students`, `start_date`, `estimated_end_date`, `actual_end_date`, `status`, `auto_reschedule_holidays`, `notes`, `admin_assigned`, `created_at`, `updated_at`) VALUES
(10, 5, 9, 3, 'Adults Conversation A2 - Wed/Thu Morning', 'fixed', 'weekly', 4.0, 2.0, 2, 2, 2, '2025-09-01', '2025-09-08', NULL, 'active', 1, 'Intensive conversation course', 1, '2025-08-28 04:13:19', '2025-08-28 06:34:46'),
(11, 5, 8, 3, 'Adults Conversation A2 - Wed/Thu Morning', 'fixed', 'weekly', 4.0, 2.0, 2, 2, 0, '2025-09-01', '2025-09-08', NULL, 'active', 1, 'Intensive conversation course', 1, '2025-08-28 04:22:35', '2025-08-28 06:03:36'),
(12, 5, 3, 3, 'Adults Conversation A2 - Wed/Thu Morning', 'fixed', 'weekly', 4.0, 2.0, 2, 2, 0, '2025-09-01', '2025-09-08', NULL, 'active', 1, 'Intensive conversation course', 1, '2025-08-28 04:32:43', '2025-08-28 04:32:43');

-- --------------------------------------------------------

--
-- Table structure for table `schedule_exceptions`
--

CREATE TABLE `schedule_exceptions` (
  `id` int UNSIGNED NOT NULL,
  `schedule_id` int UNSIGNED NOT NULL,
  `exception_date` date NOT NULL,
  `exception_type` enum('cancel','reschedule','substitute_teacher','room_change') NOT NULL,
  `new_date` date DEFAULT NULL COMMENT 'วันใหม่ในกรณี reschedule',
  `new_start_time` time DEFAULT NULL,
  `new_end_time` time DEFAULT NULL,
  `new_teacher_id` int UNSIGNED DEFAULT NULL,
  `new_room_id` int UNSIGNED DEFAULT NULL,
  `reason` varchar(500) NOT NULL,
  `notes` text,
  `created_by` int UNSIGNED NOT NULL,
  `approved_by` int UNSIGNED DEFAULT NULL,
  `status` enum('pending','approved','rejected','completed') DEFAULT 'pending',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='ข้อยกเว้นของตารางเรียน - ยกเลิก เลื่อน เปลี่ยนครู เปลี่ยนห้อง';

-- --------------------------------------------------------

--
-- Table structure for table `schedule_reservations`
--

CREATE TABLE `schedule_reservations` (
  `id` int NOT NULL,
  `schedule_id` int NOT NULL,
  `student_id` int NOT NULL,
  `reserved_from` date NOT NULL,
  `reserved_until` date NOT NULL,
  `status` enum('reserved','active','expired') DEFAULT 'reserved',
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `schedule_sessions`
--

CREATE TABLE `schedule_sessions` (
  `id` int UNSIGNED NOT NULL,
  `schedule_id` int UNSIGNED NOT NULL,
  `time_slot_id` int UNSIGNED NOT NULL,
  `session_date` date NOT NULL,
  `session_number` int UNSIGNED NOT NULL COMMENT 'ครั้งที่เท่าไหร่ของคอร์ส',
  `week_number` int UNSIGNED NOT NULL COMMENT 'สัปดาห์ที่เท่าไหร่',
  `start_time` time NOT NULL,
  `end_time` time NOT NULL,
  `teacher_id` int UNSIGNED DEFAULT NULL,
  `room_id` int UNSIGNED DEFAULT NULL,
  `status` enum('scheduled','confirmed','in_progress','completed','cancelled','rescheduled') DEFAULT 'scheduled',
  `cancellation_reason` varchar(500) DEFAULT NULL,
  `makeup_for_session_id` int UNSIGNED DEFAULT NULL COMMENT 'ชดเชยให้กับ session ไหน',
  `is_makeup_session` tinyint(1) DEFAULT '0' COMMENT 'เป็น makeup session หรือไม่',
  `notes` text,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='คลาสแต่ละครั้ง - สร้างจาก schedule template';

--
-- Dumping data for table `schedule_sessions`
--

INSERT INTO `schedule_sessions` (`id`, `schedule_id`, `time_slot_id`, `session_date`, `session_number`, `week_number`, `start_time`, `end_time`, `teacher_id`, `room_id`, `status`, `cancellation_reason`, `makeup_for_session_id`, `is_makeup_session`, `notes`, `created_at`, `updated_at`) VALUES
(28, 10, 19, '2025-08-28', 1, 1, '09:00:00', '12:00:00', 3, 3, 'scheduled', NULL, NULL, 0, NULL, '2025-08-28 04:13:20', '2025-08-28 06:01:52'),
(29, 10, 20, '2025-09-05', 2, 1, '09:00:00', '12:00:00', 3, 3, 'scheduled', NULL, NULL, 0, NULL, '2025-08-28 04:13:20', '2025-08-28 04:13:20'),
(30, 11, 21, '2025-09-02', 1, 1, '09:00:00', '12:00:00', 3, 3, 'scheduled', NULL, NULL, 0, NULL, '2025-08-28 04:22:35', '2025-08-28 04:22:35'),
(31, 11, 22, '2025-09-05', 2, 1, '09:00:00', '12:00:00', 3, 3, 'scheduled', NULL, NULL, 0, NULL, '2025-08-28 04:22:35', '2025-08-28 04:22:35'),
(32, 12, 23, '2025-08-28', 1, 1, '09:00:00', '12:00:00', 3, 3, 'scheduled', NULL, NULL, 0, NULL, '2025-08-28 04:32:43', '2025-08-28 06:01:04'),
(33, 12, 24, '2025-09-04', 2, 1, '09:00:00', '12:00:00', 3, 3, 'scheduled', NULL, NULL, 0, NULL, '2025-08-28 04:32:43', '2025-08-28 04:32:43');

-- --------------------------------------------------------

--
-- Table structure for table `schedule_slots`
--

CREATE TABLE `schedule_slots` (
  `id` int UNSIGNED NOT NULL,
  `day_of_week` enum('monday','tuesday','wednesday','thursday','friday','saturday','sunday') NOT NULL,
  `start_time` time NOT NULL,
  `end_time` time NOT NULL,
  `slot_code` varchar(20) NOT NULL,
  `popular_slot` tinyint(1) DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `schedule_students`
--

CREATE TABLE `schedule_students` (
  `id` int UNSIGNED NOT NULL,
  `schedule_id` int UNSIGNED NOT NULL,
  `student_id` int UNSIGNED NOT NULL,
  `enrollment_date` date NOT NULL,
  `status` enum('active','paused','completed','cancelled') DEFAULT 'active',
  `payment_status` enum('pending','partial','paid','overdue') DEFAULT 'pending',
  `total_amount` decimal(10,2) NOT NULL DEFAULT '0.00',
  `paid_amount` decimal(10,2) NOT NULL DEFAULT '0.00',
  `leave_credits` int UNSIGNED NOT NULL DEFAULT '0',
  `used_leaves` int UNSIGNED NOT NULL DEFAULT '0',
  `notes` text,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='นักเรียนที่ลงทะเบียนในตารางเรียนแต่ละตาราง';

--
-- Dumping data for table `schedule_students`
--

INSERT INTO `schedule_students` (`id`, `schedule_id`, `student_id`, `enrollment_date`, `status`, `payment_status`, `total_amount`, `paid_amount`, `leave_credits`, `used_leaves`, `notes`, `created_at`, `updated_at`) VALUES
(3, 10, 6, '2025-08-28', 'active', 'pending', 0.00, 0.00, 0, 0, NULL, '2025-08-28 06:34:43', '2025-08-28 06:34:43'),
(4, 10, 5, '2025-08-28', 'active', 'pending', 0.00, 0.00, 0, 0, NULL, '2025-08-28 06:34:46', '2025-08-28 06:34:46');

-- --------------------------------------------------------

--
-- Table structure for table `schedule_time_slots`
--

CREATE TABLE `schedule_time_slots` (
  `id` int UNSIGNED NOT NULL,
  `schedule_id` int UNSIGNED NOT NULL,
  `day_of_week` enum('monday','tuesday','wednesday','thursday','friday','saturday','sunday') NOT NULL,
  `start_time` time NOT NULL,
  `end_time` time NOT NULL,
  `slot_order` tinyint UNSIGNED NOT NULL DEFAULT '1' COMMENT 'ลำดับในสัปดาห์ เช่น 1=พุธ, 2=พฤหัส',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='เวลาเรียนรายสัปดาห์';

--
-- Dumping data for table `schedule_time_slots`
--

INSERT INTO `schedule_time_slots` (`id`, `schedule_id`, `day_of_week`, `start_time`, `end_time`, `slot_order`, `created_at`, `updated_at`) VALUES
(19, 10, 'monday', '09:00:00', '12:00:00', 1, '2025-08-28 04:13:19', '2025-08-28 04:13:19'),
(20, 10, 'thursday', '09:00:00', '12:00:00', 2, '2025-08-28 04:13:19', '2025-08-28 04:13:19'),
(21, 11, 'monday', '09:00:00', '12:00:00', 1, '2025-08-28 04:22:35', '2025-08-28 04:22:35'),
(22, 11, 'thursday', '09:00:00', '12:00:00', 2, '2025-08-28 04:22:35', '2025-08-28 04:22:35'),
(23, 12, 'monday', '09:00:00', '12:00:00', 1, '2025-08-28 04:32:43', '2025-08-28 04:32:43'),
(24, 12, 'thursday', '09:00:00', '12:00:00', 2, '2025-08-28 04:32:43', '2025-08-28 04:32:43');

-- --------------------------------------------------------

--
-- Table structure for table `session_comments`
--

CREATE TABLE `session_comments` (
  `id` int NOT NULL,
  `session_id` int UNSIGNED NOT NULL,
  `user_id` int UNSIGNED NOT NULL,
  `comment` text NOT NULL,
  `type` enum('note','comment','warning','important') DEFAULT 'note',
  `is_private` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `students`
--

CREATE TABLE `students` (
  `id` int UNSIGNED NOT NULL,
  `user_id` int UNSIGNED NOT NULL,
  `first_name` varchar(100) NOT NULL,
  `first_name_en` varchar(100) DEFAULT NULL,
  `last_name` varchar(100) NOT NULL,
  `last_name_en` varchar(100) DEFAULT NULL,
  `nickname` varchar(50) DEFAULT NULL,
  `date_of_birth` date DEFAULT NULL,
  `gender` enum('male','female','other') DEFAULT NULL,
  `address` text,
  `citizen_id` varchar(255) DEFAULT NULL,
  `age` int DEFAULT NULL,
  `age_group` enum('kids','students','adults') DEFAULT NULL,
  `grade_level` varchar(20) DEFAULT NULL,
  `current_education` varchar(50) DEFAULT NULL,
  `cefr_level` varchar(10) DEFAULT NULL,
  `preferred_language` varchar(20) DEFAULT NULL,
  `language_level` varchar(30) DEFAULT NULL,
  `recent_cefr` varchar(10) DEFAULT NULL,
  `learning_style` varchar(20) DEFAULT NULL,
  `learning_goals` text,
  `parent_name` varchar(100) DEFAULT NULL,
  `parent_phone` varchar(20) DEFAULT NULL,
  `emergency_contact` varchar(100) DEFAULT NULL,
  `emergency_phone` varchar(20) DEFAULT NULL,
  `preferred_time_slots` json DEFAULT NULL,
  `unavailable_time_slots` json DEFAULT NULL,
  `selected_courses` json DEFAULT NULL,
  `grammar_score` int UNSIGNED DEFAULT NULL,
  `speaking_score` int UNSIGNED DEFAULT NULL,
  `listening_score` int UNSIGNED DEFAULT NULL,
  `reading_score` int UNSIGNED DEFAULT NULL,
  `writing_score` int UNSIGNED DEFAULT NULL,
  `learning_preferences` text,
  `availability_schedule` text,
  `unavailable_times` text,
  `preferred_teacher_type` varchar(20) DEFAULT NULL,
  `contact_source` text,
  `registration_status` enum('pending_exam','finding_group','has_group_members','ready_to_open_class','arranging_schedule','schedule_confirmed','class_started','completed','cancelled') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT 'pending_exam',
  `deposit_amount` decimal(8,2) DEFAULT '0.00',
  `payment_status` enum('pending','partial','paid','refunded') DEFAULT 'pending',
  `last_status_update` datetime DEFAULT NULL,
  `days_waiting` int UNSIGNED DEFAULT '0',
  `admin_contact` varchar(100) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `students`
--

INSERT INTO `students` (`id`, `user_id`, `first_name`, `first_name_en`, `last_name`, `last_name_en`, `nickname`, `date_of_birth`, `gender`, `address`, `citizen_id`, `age`, `age_group`, `grade_level`, `current_education`, `cefr_level`, `preferred_language`, `language_level`, `recent_cefr`, `learning_style`, `learning_goals`, `parent_name`, `parent_phone`, `emergency_contact`, `emergency_phone`, `preferred_time_slots`, `unavailable_time_slots`, `selected_courses`, `grammar_score`, `speaking_score`, `listening_score`, `reading_score`, `writing_score`, `learning_preferences`, `availability_schedule`, `unavailable_times`, `preferred_teacher_type`, `contact_source`, `registration_status`, `deposit_amount`, `payment_status`, `last_status_update`, `days_waiting`, `admin_contact`, `created_at`, `updated_at`) VALUES
(1, 3, 'อลิซ', NULL, 'วิลสัน', NULL, 'Alice', NULL, NULL, NULL, NULL, 25, 'adults', NULL, NULL, 'B1', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 75, 70, 80, 77, 75, 'Works in hospitality industry, wants to improve English for career advancement', '{\"monday\":[{\"start_time\":\"17:00:00\",\"end_time\":\"19:00:00\"}],\"wednesday\":[{\"start_time\":\"17:00:00\",\"end_time\":\"19:00:00\"}],\"friday\":[{\"start_time\":\"19:00:00\",\"end_time\":\"21:00:00\"}]}', '[]', 'native', NULL, 'finding_group', 3000.00, 'partial', '2025-08-15 09:29:00', 28, NULL, '2025-08-15 02:28:57', '2025-08-15 09:29:00'),
(2, 4, 'ณัฐพล', NULL, 'สมประสงค์', NULL, 'Nut', NULL, NULL, NULL, NULL, 22, 'adults', NULL, NULL, 'A2', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 60, 55, 65, 67, 59, 'University student preparing for study abroad program', '{\"monday\":[{\"start_time\":\"17:00:00\",\"end_time\":\"19:00:00\"}],\"wednesday\":[{\"start_time\":\"17:00:00\",\"end_time\":\"19:00:00\"}],\"friday\":[{\"start_time\":\"19:00:00\",\"end_time\":\"21:00:00\"}]}', '[]', 'native', NULL, 'finding_group', 3000.00, 'partial', '2025-08-15 09:29:00', 40, NULL, '2025-08-15 02:28:57', '2025-08-15 09:29:00'),
(3, 5, 'ศิรประภา', NULL, 'จันทร์แสง', NULL, 'Fai', NULL, NULL, NULL, NULL, 28, 'adults', NULL, NULL, 'C1', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 90, 85, 88, 87, 92, 'Teacher looking to improve English for international school position', '{\"monday\":[{\"start_time\":\"17:00:00\",\"end_time\":\"19:00:00\"}],\"wednesday\":[{\"start_time\":\"17:00:00\",\"end_time\":\"19:00:00\"}],\"friday\":[{\"start_time\":\"19:00:00\",\"end_time\":\"21:00:00\"}]}', '[]', 'native', NULL, 'finding_group', 3000.00, 'partial', '2025-08-15 09:29:00', 29, NULL, '2025-08-15 02:28:57', '2025-08-15 09:29:00'),
(4, 6, 'กิตติพงษ์', NULL, 'รุ่งเรือง', NULL, 'Kit', NULL, NULL, NULL, NULL, 30, 'adults', NULL, NULL, 'B2', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 82, 78, 80, 76, 77, 'Business professional preparing for IELTS exam', '{\"monday\":[{\"start_time\":\"17:00:00\",\"end_time\":\"19:00:00\"}],\"wednesday\":[{\"start_time\":\"17:00:00\",\"end_time\":\"19:00:00\"}],\"friday\":[{\"start_time\":\"19:00:00\",\"end_time\":\"21:00:00\"}]}', '[]', 'native', NULL, 'finding_group', 3000.00, 'partial', '2025-08-15 09:29:00', 18, NULL, '2025-08-15 02:28:57', '2025-08-15 09:29:00'),
(5, 7, 'มนัสวี', NULL, 'ทองใส', NULL, 'Mint', NULL, NULL, NULL, NULL, 19, 'adults', NULL, NULL, 'A1', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 45, 40, 50, 46, 42, 'High school graduate starting English foundation course', '{\"monday\":[{\"start_time\":\"17:00:00\",\"end_time\":\"19:00:00\"}],\"wednesday\":[{\"start_time\":\"17:00:00\",\"end_time\":\"19:00:00\"}],\"friday\":[{\"start_time\":\"19:00:00\",\"end_time\":\"21:00:00\"}]}', '[]', 'thai', NULL, 'finding_group', 3000.00, 'partial', '2025-08-15 09:29:00', 27, NULL, '2025-08-15 02:28:57', '2025-08-15 09:29:00'),
(6, 30, 'รณสิทธิ์', 'Ronnasit', 'ทวยทน', 'Tuayton', 'ไออ้อน', '2002-09-04', 'male', '105/350 หมู่ 6', '6997e509f0addf0fa3d6b5acc79e6af1:f91491ced17ec6f7f400c7c935cbec36', 22, 'adults', NULL, 'uniandabove', NULL, 'english', 'intermediate', 'B1', 'private', 'อยากเก่งครับ', NULL, NULL, 'John Doe', '0874514788', '[{\"id\": \"1755790644994_tuesday\", \"day\": \"tuesday\", \"timeTo\": \"16:00\", \"timeFrom\": \"13:00\"}, {\"id\": \"1755790644994_thursday\", \"day\": \"thursday\", \"timeTo\": \"16:00\", \"timeFrom\": \"13:00\"}, {\"id\": \"1755790644994_saturday\", \"day\": \"saturday\", \"timeTo\": \"16:00\", \"timeFrom\": \"13:00\"}]', '[{\"id\": \"1755790651026_saturday\", \"day\": \"saturday\", \"timeTo\": \"23:30\", \"timeFrom\": \"00:00\"}, {\"id\": \"1755790651026_sunday\", \"day\": \"sunday\", \"timeTo\": \"23:30\", \"timeFrom\": \"00:00\"}]', '[99999, 30, 31]', NULL, NULL, NULL, NULL, NULL, '{\"preferredLanguage\":\"english\",\"languageLevel\":\"intermediate\",\"learningStyle\":\"private\",\"teacherType\":\"native\"}', NULL, NULL, 'native', NULL, '', 0.00, 'pending', NULL, 0, NULL, '2025-08-21 15:37:39', '2025-08-21 15:37:39');

-- --------------------------------------------------------

--
-- Table structure for table `student_attendance`
--

CREATE TABLE `student_attendance` (
  `id` int UNSIGNED NOT NULL,
  `session_id` int UNSIGNED NOT NULL,
  `student_id` int UNSIGNED NOT NULL,
  `status` enum('present','absent','excused','late') DEFAULT 'present',
  `check_in_time` datetime DEFAULT NULL,
  `qr_check_in` tinyint(1) DEFAULT '0',
  `absence_reason` varchar(255) DEFAULT NULL,
  `notes` text,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `student_attendances`
--

CREATE TABLE `student_attendances` (
  `id` int NOT NULL,
  `session_id` int NOT NULL,
  `student_id` int NOT NULL,
  `status` enum('present','absent','late','approved_leave','excused_absence','course_dropped') NOT NULL,
  `leave_type` varchar(50) DEFAULT NULL,
  `reason` text,
  `advance_notice_hours` int DEFAULT '0',
  `notes` text,
  `approved_by` int DEFAULT NULL,
  `approved_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `student_documents`
--

CREATE TABLE `student_documents` (
  `id` int UNSIGNED NOT NULL,
  `student_id` int UNSIGNED NOT NULL,
  `document_type` varchar(50) NOT NULL,
  `original_name` varchar(255) NOT NULL,
  `file_path` varchar(500) NOT NULL,
  `file_size` varchar(20) DEFAULT NULL,
  `mime_type` varchar(100) DEFAULT NULL,
  `uploaded_at` datetime NOT NULL,
  `uploaded_by` int UNSIGNED DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `student_groups`
--

CREATE TABLE `student_groups` (
  `id` int UNSIGNED NOT NULL,
  `group_id` int UNSIGNED NOT NULL,
  `student_id` int UNSIGNED NOT NULL,
  `enrollment_date` date NOT NULL,
  `status` enum('active','completed','withdrawn','transferred') DEFAULT 'active',
  `leave_credits_used` int DEFAULT '0',
  `leave_credits_total` int DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `student_leaves`
--

CREATE TABLE `student_leaves` (
  `id` int UNSIGNED NOT NULL,
  `student_id` int UNSIGNED NOT NULL,
  `class_id` int UNSIGNED NOT NULL,
  `reason` text NOT NULL,
  `requested_at` datetime NOT NULL,
  `status` enum('pending','approved','rejected') DEFAULT 'pending',
  `approved_by` int UNSIGNED DEFAULT NULL,
  `approved_at` datetime DEFAULT NULL,
  `admin_notes` text,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `student_progress`
--

CREATE TABLE `student_progress` (
  `id` int UNSIGNED NOT NULL,
  `student_id` int UNSIGNED NOT NULL,
  `session_id` int UNSIGNED NOT NULL,
  `performance_notes` text,
  `skill_improvement` json DEFAULT NULL,
  `attendance_rate` decimal(5,2) DEFAULT NULL,
  `current_cefr_level` varchar(10) DEFAULT NULL,
  `evaluated_by` int UNSIGNED DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `student_registrations`
--

CREATE TABLE `student_registrations` (
  `id` int UNSIGNED NOT NULL,
  `user_id` int UNSIGNED NOT NULL,
  `course_id` int UNSIGNED DEFAULT NULL,
  `group_preference_id` int UNSIGNED DEFAULT NULL,
  `grammar_score` int UNSIGNED DEFAULT NULL,
  `speaking_score` int UNSIGNED DEFAULT NULL,
  `listening_score` int UNSIGNED DEFAULT NULL,
  `cefr_level` varchar(10) DEFAULT NULL,
  `test_type` enum('paper_based','online_cefr') DEFAULT NULL,
  `test_evidence_files` text,
  `learning_goals` text,
  `learning_option` enum('individual','self_formed_group','institute_arranged') DEFAULT 'institute_arranged',
  `self_formed_group_members` text,
  `referral_source` varchar(100) DEFAULT NULL,
  `promotion_id` int UNSIGNED DEFAULT NULL,
  `offered_discount` decimal(8,2) DEFAULT '0.00',
  `discount_valid_until` datetime DEFAULT NULL,
  `admin_id` int UNSIGNED DEFAULT NULL,
  `status` enum('pending','approved','rejected','enrolled') DEFAULT 'pending',
  `test_date` datetime DEFAULT NULL,
  `approved_at` datetime DEFAULT NULL,
  `admin_notes` text,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `student_schedule_preferences`
--

CREATE TABLE `student_schedule_preferences` (
  `id` int UNSIGNED NOT NULL,
  `student_id` int UNSIGNED NOT NULL,
  `schedule_slot_id` int UNSIGNED NOT NULL,
  `preference_level` enum('preferred','acceptable','not_available') DEFAULT 'preferred',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `teachers`
--

CREATE TABLE `teachers` (
  `id` int UNSIGNED NOT NULL,
  `user_id` int UNSIGNED NOT NULL,
  `first_name` varchar(100) NOT NULL,
  `last_name` varchar(100) NOT NULL,
  `nickname` varchar(50) DEFAULT NULL,
  `nationality` varchar(50) DEFAULT NULL,
  `teacher_type` varchar(20) NOT NULL,
  `hourly_rate` decimal(8,2) DEFAULT NULL,
  `specializations` text,
  `certifications` text,
  `active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `teachers`
--

INSERT INTO `teachers` (`id`, `user_id`, `first_name`, `last_name`, `nickname`, `nationality`, `teacher_type`, `hourly_rate`, `specializations`, `certifications`, `active`, `created_at`, `updated_at`) VALUES
(1, 1, 'Admin', '', 'Admin', NULL, 'Both', NULL, 'Admin who can also teach', NULL, 1, '2025-08-20 06:15:59', '2025-08-20 06:15:59'),
(2, 10, 'Natcha', '', 'Wine', NULL, 'Both', NULL, 'Kid Conversation, Adult Conversation', 'BA in English-RMUTI, MA in TEFL-NRRU', 1, '2025-08-20 06:15:59', '2025-08-20 06:15:59'),
(3, 11, 'Saowaluck', 'Seksunsin', 'Pink', NULL, 'Both', NULL, 'Kid Jolly Phonics, Kid Conversation, Adult Conversation', 'B.Eng., Civil Engineering, SUT', 1, '2025-08-20 06:15:59', '2025-08-20 06:15:59'),
(4, 12, 'Jirarat', 'Butnean', 'NuNu', NULL, 'Adults', NULL, 'Adult Conversation, Adult Test preparation, IELTS', 'BBA - SolBridge International School of Business, South Korea', 1, '2025-08-20 06:15:59', '2025-08-20 06:15:59'),
(5, 13, 'Antarika', 'Ruamrak', 'Annie', NULL, 'Both', NULL, 'IELTS', 'Bachelor of Education (English), NRRU', 1, '2025-08-20 06:15:59', '2025-08-20 06:15:59'),
(6, 14, 'Sarawat', 'Ketthongma', 'Sa', NULL, 'Adults', NULL, 'Kid Jolly Phonics, Adult Conversation', 'Bachelor in Electrical Engineering - Suranaree University of Technology (Second Class Honours)', 1, '2025-08-20 06:15:59', '2025-08-20 06:15:59'),
(7, 15, 'Alastair', 'Murray Sanderson', 'Alec', NULL, 'Both', NULL, 'Kid Jolly Phonics, Kid Conversation, Adult Conversation, Adult Test preparation, IELTS', 'BA in biology and chemistry.', 1, '2025-08-20 06:15:59', '2025-08-20 06:15:59'),
(8, 16, 'Nareerat', 'Wuttichaijaroen', 'Aom', NULL, 'Both', NULL, 'Kid Jolly Phonics, Kid Conversation, Adult Conversation', 'BA in Business English, NRRU', 1, '2025-08-20 06:15:59', '2025-08-20 06:15:59'),
(9, 17, 'Worawi', 'Charumanee', 'Jean', NULL, 'Adults', NULL, 'Adult Conversation', 'High school: Saint John\'s International Matriculation; Cambridge PET (Pass); LCCI Eng Biz L2 (Pass) + Oral (Pass); Hotel Specialist Cert (Holiday Inn Munich); Euro-Business-College Munich (Foreign Language Assistant); Wall Street Institute Munich - Diploma Mastery', 1, '2025-08-20 06:15:59', '2025-08-20 06:15:59'),
(10, 18, 'Angela', 'Blinkhorn-Street', 'Angie', NULL, 'Kid', NULL, 'Kid Conversation', 'College certificates for Business Management N4, N5, first level N6 (not completed); 25 years teaching in Korat', 1, '2025-08-20 06:15:59', '2025-08-20 06:15:59'),
(11, 19, 'Rosarin', 'Weerakiattikun', 'Noon (Rosie)', NULL, 'Both', NULL, 'Admin', 'B.Ed. in English Education, NRRU; Currently pursuing M.A. in Human Potential Development', 1, '2025-08-20 06:15:59', '2025-08-20 06:15:59'),
(12, 20, 'Tanich', 'Rakkitkul', 'Film', NULL, 'Adults', NULL, 'Adult Conversation, Adult Test preparation, IELTS', 'BA in English — Sukhothai Thammathirat Open University', 1, '2025-08-20 06:15:59', '2025-08-20 06:15:59'),
(13, 21, 'Koadchamon', 'Sudsainet', 'Koad', NULL, 'Both', NULL, 'Kid Conversation, Adult Conversation, Adult Test preparation, IELTS', 'BA: International Relations and Global Affairs (MUIC); MA: International Relations with International Law, with Merit (University of Kent, UK)', 1, '2025-08-20 06:15:59', '2025-08-20 06:15:59'),
(14, 22, 'Phloinaphat', 'Phothiwansakun', 'Min', NULL, 'Admin Team', NULL, 'Admin', 'BA in Communication Arts, NRRU', 1, '2025-08-20 06:15:59', '2025-08-20 06:15:59'),
(16, 24, 'Dittaya', 'Jitarmart', 'ครูเอิง', NULL, 'Admin Team', NULL, 'Admin', 'HS: Shepton HS & Plano West Senior HS (Texas, USA); Bachelors: Tourism and Hotel Mgmt (MUIC); Masters: TEFL (NRRU) – research on Communication Strategies for Adult Learners', 1, '2025-08-20 06:15:59', '2025-08-20 06:15:59'),
(17, 25, 'Chaninya', 'Chanprakhon', 'Mint', NULL, 'Admin Team', NULL, 'Admin', 'BA in Business English, NRRU', 1, '2025-08-20 06:15:59', '2025-08-20 06:15:59'),
(18, 26, 'Chonthicha', 'Angsutti', 'Net', NULL, 'Kid', NULL, 'Kid Jolly Phonics, Kid Conversation', 'English for Communication, RMUTI (Isan - Nakhon Ratchasima)', 1, '2025-08-20 06:15:59', '2025-08-20 06:15:59'),
(19, 27, 'Heng', 'Wang', 'Mr.Heng Wang', NULL, 'Both', NULL, 'Chinese Class', 'B.A. Chinese Language & Literature (Teaching Chinese as a Foreign Language) – Yunnan Normal University; M.Ed. Curriculum & Instruction – Rajabhat Maha Sarakham University', 1, '2025-08-20 06:15:59', '2025-08-20 06:15:59'),
(20, 28, 'Anthony', 'Schwarzer', 'Tony', NULL, 'Both', NULL, 'Kid Conversation, Adult Conversation, Adult Test preparation, IELTS', 'BSc (Education) – University of Southampton; Masters – Education Management – King\'s College', 1, '2025-08-20 06:15:59', '2025-08-20 06:15:59');

-- --------------------------------------------------------

--
-- Table structure for table `teacher_salaries`
--

CREATE TABLE `teacher_salaries` (
  `id` int UNSIGNED NOT NULL,
  `teacher_id` int UNSIGNED NOT NULL,
  `month` int UNSIGNED NOT NULL,
  `year` int UNSIGNED NOT NULL,
  `base_rate` decimal(8,2) NOT NULL,
  `hours_taught` decimal(8,2) NOT NULL,
  `bonus_amount` decimal(8,2) DEFAULT '0.00',
  `deduction_amount` decimal(8,2) DEFAULT '0.00',
  `total_amount` decimal(10,2) NOT NULL,
  `report_submitted` tinyint(1) DEFAULT '0',
  `status` enum('draft','approved','paid') DEFAULT 'draft',
  `approved_at` datetime DEFAULT NULL,
  `approved_by` int UNSIGNED DEFAULT NULL,
  `notes` text,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `teaching_reports`
--

CREATE TABLE `teaching_reports` (
  `id` int UNSIGNED NOT NULL,
  `class_id` int UNSIGNED NOT NULL,
  `teacher_id` int UNSIGNED NOT NULL,
  `class_date` date NOT NULL,
  `hours` decimal(3,1) NOT NULL,
  `warm_up` text,
  `topic` text NOT NULL,
  `activities` text NOT NULL,
  `outcomes` text NOT NULL,
  `homework` text,
  `next_plan` text,
  `last_page` varchar(50) DEFAULT NULL,
  `cefr_level` varchar(10) DEFAULT NULL,
  `skill_scores` text,
  `images` text,
  `submitted_at` datetime NOT NULL,
  `payment_calculated` tinyint(1) DEFAULT '0',
  `teacher_payment` decimal(8,2) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `attachment_files` text
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `test_results`
--

CREATE TABLE `test_results` (
  `id` int UNSIGNED NOT NULL,
  `student_id` int UNSIGNED NOT NULL,
  `registration_id` int UNSIGNED DEFAULT NULL,
  `grammar_score` int UNSIGNED DEFAULT NULL,
  `speaking_score` int UNSIGNED DEFAULT NULL,
  `listening_score` int UNSIGNED DEFAULT NULL,
  `reading_score` int UNSIGNED DEFAULT NULL,
  `writing_score` int UNSIGNED DEFAULT NULL,
  `cefr_level` varchar(10) DEFAULT NULL,
  `test_date` datetime NOT NULL,
  `conducted_by` int UNSIGNED DEFAULT NULL,
  `notes` text,
  `recommendations` text,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int UNSIGNED NOT NULL,
  `username` varchar(50) NOT NULL,
  `password` varchar(255) NOT NULL,
  `email` varchar(100) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `line_id` varchar(50) DEFAULT NULL,
  `role` enum('student','teacher','admin','owner') NOT NULL,
  `branch_id` int UNSIGNED DEFAULT NULL,
  `status` enum('active','inactive','suspended') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `avatar` varchar(500) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `username`, `password`, `email`, `phone`, `line_id`, `role`, `branch_id`, `status`, `created_at`, `updated_at`, `avatar`) VALUES
(1, 'admin', '$2a$10$MdKOXZXGMwN8ybJuIrN.9eJ4qNoCE9m7oFvt7pmYxHYB6py7XELEO', 'admin@englishkorat.com', '0812345678', 'admin_ekls', 'admin', 1, 'active', '2025-08-15 02:28:56', '2025-08-15 02:28:56', 'avatars/1/2025/08/21/635e0f1149d42546.webp'),
(2, 'owner', '$2a$10$MdKOXZXGMwN8ybJuIrN.9eJ4qNoCE9m7oFvt7pmYxHYB6py7XELEO', 'owner@englishkorat.com', '0812345679', 'owner_ekls', 'owner', 1, 'active', '2025-08-15 02:28:56', '2025-08-15 02:28:56', 'avatars/2/2025/08/20/c424a3c7cc93c92b.webp'),
(3, 'alice_w', '$2a$10$MdKOXZXGMwN8ybJuIrN.9eJ4qNoCE9m7oFvt7pmYxHYB6py7XELEO', 'alice.wilson@gmail.com', '0891234567', 'alice_ekls', 'student', 1, 'active', '2025-08-15 02:28:56', '2025-08-15 02:28:56', NULL),
(4, 'nut_s', '$2a$10$MdKOXZXGMwN8ybJuIrN.9eJ4qNoCE9m7oFvt7pmYxHYB6py7XELEO', 'nuttapol.som@gmail.com', '0892345678', 'nut_ekls', 'student', 1, 'active', '2025-08-15 02:28:56', '2025-08-15 02:28:56', NULL),
(5, 'fai_c', '$2a$10$MdKOXZXGMwN8ybJuIrN.9eJ4qNoCE9m7oFvt7pmYxHYB6py7XELEO', 'siriprapha.jan@gmail.com', '0893456789', 'fai_ekls', 'student', 1, 'active', '2025-08-15 02:28:56', '2025-08-15 02:28:56', NULL),
(6, 'kit_r', '$2a$10$MdKOXZXGMwN8ybJuIrN.9eJ4qNoCE9m7oFvt7pmYxHYB6py7XELEO', 'kittipong.rung@gmail.com', '0894567890', 'kit_ekls', 'student', 1, 'active', '2025-08-15 02:28:56', '2025-08-15 02:28:56', NULL),
(7, 'mint_t', '$2a$10$MdKOXZXGMwN8ybJuIrN.9eJ4qNoCE9m7oFvt7pmYxHYB6py7XELEO', 'manaswee.tong@gmail.com', '0895678901', 'mint_ekls', 'student', 1, 'active', '2025-08-15 02:28:56', '2025-08-15 02:28:56', NULL),
(8, 'teacher_john', '$2a$10$MdKOXZXGMwN8ybJuIrN.9eJ4qNoCE9m7oFvt7pmYxHYB6py7XELEO', 'john.smith@englishkorat.com', '0896789012', 'john_teacher', 'teacher', 1, 'active', '2025-08-15 02:28:56', '2025-08-15 02:28:56', NULL),
(9, 'teacher_sarah', '$2a$10$MdKOXZXGMwN8ybJuIrN.9eJ4qNoCE9m7oFvt7pmYxHYB6py7XELEO', 'sarah.johnson@englishkorat.com', '0897890123', 'sarah_teacher', 'teacher', 1, 'active', '2025-08-15 02:28:56', '2025-08-15 02:28:56', NULL),
(10, 'teacher_wine', '$2a$10$MdKOXZXGMwN8ybJuIrN.9eJ4qNoCE9m7oFvt7pmYxHYB6py7XELEO', NULL, '0999999999', NULL, 'teacher', 1, 'active', '2025-08-20 06:15:59', '2025-08-20 06:15:59', 'avatars/10/2025/08/20/32f820effbd5c049.webp'),
(11, 'teacher_pink', '$2a$10$MdKOXZXGMwN8ybJuIrN.9eJ4qNoCE9m7oFvt7pmYxHYB6py7XELEO', NULL, NULL, NULL, 'teacher', 1, 'active', '2025-08-20 06:15:59', '2025-08-20 06:15:59', NULL),
(12, 'teacher_nunu', '$2a$10$MdKOXZXGMwN8ybJuIrN.9eJ4qNoCE9m7oFvt7pmYxHYB6py7XELEO', NULL, NULL, NULL, 'teacher', 1, 'active', '2025-08-20 06:15:59', '2025-08-20 06:15:59', NULL),
(13, 'teacher_annie', '$2a$10$MdKOXZXGMwN8ybJuIrN.9eJ4qNoCE9m7oFvt7pmYxHYB6py7XELEO', NULL, NULL, NULL, 'teacher', 1, 'active', '2025-08-20 06:15:59', '2025-08-20 06:15:59', 'https://drive.google.com/open?id=1KOJnxhzhcobUgzxNJwygn8zTZcZPtUbo'),
(14, 'teacher_sa', '$2a$10$MdKOXZXGMwN8ybJuIrN.9eJ4qNoCE9m7oFvt7pmYxHYB6py7XELEO', NULL, NULL, NULL, 'teacher', 1, 'active', '2025-08-20 06:15:59', '2025-08-20 06:15:59', NULL),
(15, 'teacher_alec', '$2a$10$MdKOXZXGMwN8ybJuIrN.9eJ4qNoCE9m7oFvt7pmYxHYB6py7XELEO', NULL, NULL, NULL, 'teacher', 1, 'active', '2025-08-20 06:15:59', '2025-08-20 06:15:59', 'https://drive.google.com/open?id=1nYxagGRtw22RsGGqhF3-7OGK7fkGSt95'),
(16, 'teacher_aom', '$2a$10$MdKOXZXGMwN8ybJuIrN.9eJ4qNoCE9m7oFvt7pmYxHYB6py7XELEO', NULL, NULL, NULL, 'teacher', 1, 'active', '2025-08-20 06:15:59', '2025-08-20 06:15:59', 'https://drive.google.com/open?id=1BA8mRZlDSfZSd8Og3RIVOIZdioZN0Zqy'),
(17, 'teacher_jean', '$2a$10$MdKOXZXGMwN8ybJuIrN.9eJ4qNoCE9m7oFvt7pmYxHYB6py7XELEO', NULL, NULL, NULL, 'teacher', 1, 'active', '2025-08-20 06:15:59', '2025-08-20 06:15:59', 'https://drive.google.com/open?id=1YFwzSnrEyXf0aLbv-etBRl7ehrEccBhS'),
(18, 'teacher_angie', '$2a$10$MdKOXZXGMwN8ybJuIrN.9eJ4qNoCE9m7oFvt7pmYxHYB6py7XELEO', NULL, NULL, NULL, 'teacher', 1, 'active', '2025-08-20 06:15:59', '2025-08-20 06:15:59', 'https://drive.google.com/open?id=12ZMfL-Qv5CTupQM_bLIzW93SzGV0v8I1'),
(19, 'teacher_noon', '$2a$10$MdKOXZXGMwN8ybJuIrN.9eJ4qNoCE9m7oFvt7pmYxHYB6py7XELEO', NULL, NULL, NULL, 'teacher', 1, 'active', '2025-08-20 06:15:59', '2025-08-20 06:15:59', NULL),
(20, 'teacher_film', '$2a$10$MdKOXZXGMwN8ybJuIrN.9eJ4qNoCE9m7oFvt7pmYxHYB6py7XELEO', NULL, NULL, NULL, 'teacher', 1, 'active', '2025-08-20 06:15:59', '2025-08-20 06:15:59', 'https://drive.google.com/open?id=1OMV-nt_8O0y73QFiFmCJ5YrBpuGqe37c'),
(21, 'teacher_koad', '$2a$10$MdKOXZXGMwN8ybJuIrN.9eJ4qNoCE9m7oFvt7pmYxHYB6py7XELEO', NULL, NULL, NULL, 'teacher', 1, 'active', '2025-08-20 06:15:59', '2025-08-20 06:15:59', NULL),
(22, 'teacher_min', '$2a$10$MdKOXZXGMwN8ybJuIrN.9eJ4qNoCE9m7oFvt7pmYxHYB6py7XELEO', NULL, NULL, NULL, 'teacher', 1, 'active', '2025-08-20 06:15:59', '2025-08-20 06:15:59', NULL),
(23, 'teacher_min_th', '$2a$10$MdKOXZXGMwN8ybJuIrN.9eJ4qNoCE9m7oFvt7pmYxHYB6py7XELEO', NULL, NULL, NULL, 'teacher', 1, 'active', '2025-08-20 06:15:59', '2025-08-20 06:15:59', 'https://drive.google.com/open?id=1XZb_F3vmzgX55o1T7hKkShIY8qchgUCk'),
(24, 'teacher_krueang', '$2a$10$MdKOXZXGMwN8ybJuIrN.9eJ4qNoCE9m7oFvt7pmYxHYB6py7XELEO', NULL, NULL, NULL, 'teacher', 1, 'active', '2025-08-20 06:15:59', '2025-08-20 06:15:59', 'https://drive.google.com/open?id=1VeTeiGjp-qRM0MHEJ2eLin4tBo8w_n-z'),
(25, 'teacher_mint_staff', '$2a$10$MdKOXZXGMwN8ybJuIrN.9eJ4qNoCE9m7oFvt7pmYxHYB6py7XELEO', NULL, NULL, NULL, 'teacher', 1, 'active', '2025-08-20 06:15:59', '2025-08-20 06:15:59', 'https://drive.google.com/open?id=1X322Yn2Yc52v7KO7ix8L7QM-5emRhjUD'),
(26, 'teacher_net', '1234', NULL, NULL, NULL, 'teacher', 1, 'active', '2025-08-20 06:15:59', '2025-08-20 06:15:59', NULL),
(27, 'teacher_hengwang', '1234', NULL, NULL, NULL, 'teacher', 1, 'active', '2025-08-20 06:15:59', '2025-08-20 06:15:59', NULL),
(28, 'teacher_tony', '1234', NULL, NULL, NULL, 'teacher', 1, 'active', '2025-08-20 06:15:59', '2025-08-20 06:15:59', NULL),
(30, '0923799239', '$2a$10$A3728slg97l9nwxPBcnfk.nSWSXQljqiYvqTI0HVtcTVPWttwGGdG', 'ronnasit.tuayton@gmail.com', '0923799239', '3304426850', 'student', 1, 'active', '2025-08-21 15:37:39', '2025-08-21 15:37:39', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `user_permissions`
--

CREATE TABLE `user_permissions` (
  `id` int UNSIGNED NOT NULL,
  `user_id` int UNSIGNED NOT NULL,
  `permission_id` int UNSIGNED NOT NULL,
  `granted_by` int UNSIGNED NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `user_permissions`
--

INSERT INTO `user_permissions` (`id`, `user_id`, `permission_id`, `granted_by`, `created_at`, `updated_at`) VALUES
(1, 2, 1, 2, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(2, 2, 2, 2, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(3, 2, 3, 2, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(4, 2, 4, 2, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(5, 2, 5, 2, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(6, 2, 6, 2, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(7, 2, 7, 2, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(8, 2, 8, 2, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(9, 2, 9, 2, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(10, 2, 10, 2, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(11, 2, 11, 2, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(12, 2, 12, 2, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(13, 2, 13, 2, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(14, 2, 14, 2, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(15, 2, 15, 2, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(16, 2, 16, 2, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(17, 2, 17, 2, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(18, 2, 18, 2, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(19, 2, 19, 2, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(20, 2, 20, 2, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(21, 2, 21, 2, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(22, 2, 22, 2, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(23, 2, 23, 2, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(24, 2, 24, 2, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(25, 2, 25, 2, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(26, 2, 26, 2, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(27, 2, 27, 2, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(28, 2, 28, 2, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(29, 2, 29, 2, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(30, 2, 30, 2, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(31, 2, 31, 2, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(32, 2, 32, 2, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(33, 2, 33, 2, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(34, 2, 34, 2, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(35, 2, 35, 2, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(36, 2, 36, 2, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(37, 2, 37, 2, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(38, 2, 38, 2, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(39, 2, 39, 2, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(40, 2, 40, 2, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(41, 2, 41, 2, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(42, 2, 42, 2, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(43, 2, 43, 2, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(44, 2, 44, 2, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(45, 2, 45, 2, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(46, 2, 46, 2, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(47, 2, 47, 2, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(48, 2, 48, 2, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(49, 2, 49, 2, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(50, 2, 50, 2, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(51, 1, 1, 2, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(52, 1, 2, 2, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(53, 1, 3, 2, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(54, 1, 5, 2, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(55, 1, 6, 2, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(56, 1, 7, 2, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(57, 1, 8, 2, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(58, 1, 9, 2, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(59, 1, 10, 2, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(60, 1, 11, 2, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(61, 1, 12, 2, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(62, 1, 13, 2, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(63, 1, 14, 2, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(64, 1, 15, 2, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(65, 1, 16, 2, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(66, 1, 17, 2, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(67, 1, 18, 2, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(68, 1, 19, 2, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(69, 1, 20, 2, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(70, 1, 21, 2, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(71, 1, 22, 2, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(72, 1, 23, 2, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(73, 1, 24, 2, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(74, 1, 25, 2, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(75, 1, 26, 2, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(76, 1, 27, 2, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(77, 1, 28, 2, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(78, 1, 29, 2, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(79, 1, 31, 2, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(80, 1, 32, 2, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(81, 1, 33, 2, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(82, 1, 34, 2, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(83, 1, 35, 2, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(84, 1, 36, 2, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(85, 1, 37, 2, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(86, 1, 38, 2, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(87, 1, 39, 2, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(88, 1, 40, 2, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(89, 1, 41, 2, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(90, 1, 42, 2, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(91, 1, 43, 2, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(92, 1, 45, 2, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(93, 1, 46, 2, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(94, 1, 47, 2, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(95, 8, 1, 2, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(96, 8, 6, 2, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(97, 8, 11, 2, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(98, 8, 15, 2, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(99, 8, 16, 2, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(100, 8, 17, 2, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(101, 8, 20, 2, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(102, 8, 22, 2, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(103, 8, 25, 2, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(104, 8, 31, 2, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(105, 8, 32, 2, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(106, 8, 33, 2, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(107, 8, 35, 2, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(108, 8, 38, 2, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(109, 8, 41, 2, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(110, 8, 43, 2, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(111, 9, 1, 2, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(112, 9, 6, 2, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(113, 9, 11, 2, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(114, 9, 15, 2, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(115, 9, 16, 2, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(116, 9, 17, 2, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(117, 9, 20, 2, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(118, 9, 22, 2, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(119, 9, 25, 2, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(120, 9, 31, 2, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(121, 9, 32, 2, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(122, 9, 33, 2, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(123, 9, 35, 2, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(124, 9, 38, 2, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(125, 9, 41, 2, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(126, 9, 43, 2, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(127, 3, 1, 2, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(128, 3, 6, 2, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(129, 3, 11, 2, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(130, 3, 17, 2, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(131, 3, 38, 2, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(132, 3, 41, 2, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(133, 4, 1, 2, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(134, 4, 6, 2, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(135, 4, 11, 2, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(136, 4, 17, 2, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(137, 4, 38, 2, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(138, 4, 41, 2, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(139, 5, 1, 2, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(140, 5, 6, 2, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(141, 5, 11, 2, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(142, 5, 17, 2, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(143, 5, 38, 2, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(144, 5, 41, 2, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(145, 6, 1, 2, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(146, 6, 6, 2, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(147, 6, 11, 2, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(148, 6, 17, 2, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(149, 6, 38, 2, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(150, 6, 41, 2, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(151, 7, 1, 2, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(152, 7, 6, 2, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(153, 7, 11, 2, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(154, 7, 17, 2, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(155, 7, 38, 2, '2025-08-15 02:28:58', '2025-08-15 02:28:58'),
(156, 7, 41, 2, '2025-08-15 02:28:58', '2025-08-15 02:28:58');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `bills`
--
ALTER TABLE `bills`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `bills_bill_number_unique` (`bill_number`),
  ADD KEY `bills_student_id_foreign` (`student_id`),
  ADD KEY `bills_enrollment_id_foreign` (`enrollment_id`);

--
-- Indexes for table `book_borrowings`
--
ALTER TABLE `book_borrowings`
  ADD PRIMARY KEY (`id`),
  ADD KEY `book_borrowings_student_id_foreign` (`student_id`),
  ADD KEY `book_borrowings_ebook_id_foreign` (`ebook_id`),
  ADD KEY `book_borrowings_issued_by_foreign` (`issued_by`),
  ADD KEY `book_borrowings_returned_to_foreign` (`returned_to`);

--
-- Indexes for table `branches`
--
ALTER TABLE `branches`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `branches_code_unique` (`code`);

--
-- Indexes for table `classes`
--
ALTER TABLE `classes`
  ADD PRIMARY KEY (`id`),
  ADD KEY `classes_course_group_id_foreign` (`course_group_id`),
  ADD KEY `classes_teacher_id_foreign` (`teacher_id`),
  ADD KEY `classes_room_id_foreign` (`room_id`);

--
-- Indexes for table `class_attendances`
--
ALTER TABLE `class_attendances`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `class_attendances_class_id_student_id_unique` (`class_id`,`student_id`),
  ADD KEY `class_attendances_student_id_foreign` (`student_id`);

--
-- Indexes for table `class_sessions`
--
ALTER TABLE `class_sessions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `class_sessions_qr_code_unique` (`qr_code`),
  ADD KEY `class_sessions_class_id_foreign` (`class_id`),
  ADD KEY `class_sessions_qr_generated_by_foreign` (`qr_generated_by`);

--
-- Indexes for table `courses`
--
ALTER TABLE `courses`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `courses_code_unique` (`code`),
  ADD KEY `courses_branch_id_foreign` (`branch_id`),
  ADD KEY `courses_category_id_foreign` (`category_id`),
  ADD KEY `courses_duration_id_foreign` (`duration_id`);

--
-- Indexes for table `course_categories`
--
ALTER TABLE `course_categories`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `course_drops`
--
ALTER TABLE `course_drops`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `course_durations`
--
ALTER TABLE `course_durations`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `course_durations_hours_unique` (`hours`);

--
-- Indexes for table `course_groups`
--
ALTER TABLE `course_groups`
  ADD PRIMARY KEY (`id`),
  ADD KEY `course_groups_course_id_foreign` (`course_id`),
  ADD KEY `course_groups_teacher_id_foreign` (`teacher_id`),
  ADD KEY `course_groups_room_id_foreign` (`room_id`),
  ADD KEY `course_groups_admin_assigned_foreign` (`admin_assigned`),
  ADD KEY `course_groups_group_leader_id_foreign` (`group_leader_id`);

--
-- Indexes for table `course_pricing`
--
ALTER TABLE `course_pricing`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `course_pricing_category_id_duration_id_pricing_tier_id_unique` (`category_id`,`duration_id`,`pricing_tier_id`),
  ADD KEY `course_pricing_duration_id_foreign` (`duration_id`),
  ADD KEY `course_pricing_pricing_tier_id_foreign` (`pricing_tier_id`);

--
-- Indexes for table `ebooks`
--
ALTER TABLE `ebooks`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `enrollments`
--
ALTER TABLE `enrollments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `enrollments_student_id_foreign` (`student_id`),
  ADD KEY `enrollments_course_id_foreign` (`course_id`),
  ADD KEY `enrollments_course_group_id_foreign` (`course_group_id`),
  ADD KEY `enrollments_leave_policy_rule_id_foreign` (`leave_policy_rule_id`);

--
-- Indexes for table `enrollment_pricing`
--
ALTER TABLE `enrollment_pricing`
  ADD PRIMARY KEY (`id`),
  ADD KEY `enrollment_pricing_enrollment_id_foreign` (`enrollment_id`),
  ADD KEY `enrollment_pricing_course_pricing_id_foreign` (`course_pricing_id`);

--
-- Indexes for table `group_formation_history`
--
ALTER TABLE `group_formation_history`
  ADD PRIMARY KEY (`id`),
  ADD KEY `group_formation_history_group_id_foreign` (`group_id`),
  ADD KEY `group_formation_history_student_id_foreign` (`student_id`),
  ADD KEY `group_formation_history_performed_by_foreign` (`performed_by`);

--
-- Indexes for table `group_waiting_list`
--
ALTER TABLE `group_waiting_list`
  ADD PRIMARY KEY (`id`),
  ADD KEY `group_waiting_list_student_id_foreign` (`student_id`);

--
-- Indexes for table `knex_migrations`
--
ALTER TABLE `knex_migrations`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `knex_migrations_lock`
--
ALTER TABLE `knex_migrations_lock`
  ADD PRIMARY KEY (`index`);

--
-- Indexes for table `leave_policy_changes`
--
ALTER TABLE `leave_policy_changes`
  ADD PRIMARY KEY (`id`),
  ADD KEY `leave_policy_changes_policy_rule_id_foreign` (`policy_rule_id`),
  ADD KEY `leave_policy_changes_changed_by_foreign` (`changed_by`),
  ADD KEY `leave_policy_changes_reverted_from_change_id_foreign` (`reverted_from_change_id`),
  ADD KEY `leave_policy_changes_approved_by_foreign` (`approved_by`);

--
-- Indexes for table `leave_policy_notifications`
--
ALTER TABLE `leave_policy_notifications`
  ADD PRIMARY KEY (`id`),
  ADD KEY `leave_policy_notifications_change_id_foreign` (`change_id`),
  ADD KEY `leave_policy_notifications_recipient_id_foreign` (`recipient_id`);

--
-- Indexes for table `leave_policy_permissions`
--
ALTER TABLE `leave_policy_permissions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uniq_leave_perms` (`policy_rule_id`,`user_id`,`permission_type`),
  ADD KEY `leave_policy_permissions_user_id_foreign` (`user_id`),
  ADD KEY `leave_policy_permissions_granted_by_foreign` (`granted_by`);

--
-- Indexes for table `leave_policy_rules`
--
ALTER TABLE `leave_policy_rules`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uniq_leave_rules` (`branch_id`,`course_type`,`course_hours`,`effective_date`),
  ADD KEY `leave_policy_rules_created_by_foreign` (`created_by`);

--
-- Indexes for table `line_groups`
--
ALTER TABLE `line_groups`
  ADD PRIMARY KEY (`id`),
  ADD KEY `line_groups_group_id_foreign` (`group_id`),
  ADD KEY `line_groups_branch_id_foreign` (`branch_id`);

--
-- Indexes for table `line_groups2`
--
ALTER TABLE `line_groups2`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `makeup_eligibilities`
--
ALTER TABLE `makeup_eligibilities`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `make_up_sessions`
--
ALTER TABLE `make_up_sessions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `make_up_sessions_original_session_id_foreign` (`original_session_id`),
  ADD KEY `make_up_sessions_new_session_id_foreign` (`new_session_id`),
  ADD KEY `make_up_sessions_student_id_foreign` (`student_id`),
  ADD KEY `make_up_sessions_arranged_by_foreign` (`arranged_by`);

--
-- Indexes for table `notifications`
--
ALTER TABLE `notifications`
  ADD PRIMARY KEY (`id`),
  ADD KEY `notifications_user_id_foreign` (`user_id`);

--
-- Indexes for table `notification_schedules`
--
ALTER TABLE `notification_schedules`
  ADD PRIMARY KEY (`id`),
  ADD KEY `notification_schedules_user_id_foreign` (`user_id`);

--
-- Indexes for table `notification_templates`
--
ALTER TABLE `notification_templates`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `notification_templates_type_unique` (`type`);

--
-- Indexes for table `payments`
--
ALTER TABLE `payments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `payments_bill_id_foreign` (`bill_id`),
  ADD KEY `payments_student_id_foreign` (`student_id`),
  ADD KEY `payments_verified_by_foreign` (`verified_by`);

--
-- Indexes for table `permissions`
--
ALTER TABLE `permissions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `permissions_name_unique` (`name`);

--
-- Indexes for table `pricing_change_history`
--
ALTER TABLE `pricing_change_history`
  ADD PRIMARY KEY (`id`),
  ADD KEY `pricing_change_history_enrollment_id_foreign` (`enrollment_id`),
  ADD KEY `pricing_change_history_course_group_id_foreign` (`course_group_id`),
  ADD KEY `pricing_change_history_processed_by_foreign` (`processed_by`);

--
-- Indexes for table `pricing_tiers`
--
ALTER TABLE `pricing_tiers`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `rooms`
--
ALTER TABLE `rooms`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `rooms_branch_id_room_name_unique` (`branch_id`,`room_name`);

--
-- Indexes for table `room_notifications`
--
ALTER TABLE `room_notifications`
  ADD PRIMARY KEY (`id`),
  ADD KEY `room_notifications_branch_id_foreign` (`branch_id`),
  ADD KEY `room_notifications_room_id_foreign` (`room_id`),
  ADD KEY `room_notifications_teacher_id_foreign` (`teacher_id`);

--
-- Indexes for table `schedules`
--
ALTER TABLE `schedules`
  ADD PRIMARY KEY (`id`),
  ADD KEY `schedules_course_id_foreign` (`course_id`),
  ADD KEY `schedules_teacher_id_foreign` (`teacher_id`),
  ADD KEY `schedules_room_id_foreign` (`room_id`),
  ADD KEY `schedules_admin_assigned_foreign` (`admin_assigned`),
  ADD KEY `idx_schedule_status` (`status`);

--
-- Indexes for table `schedule_exceptions`
--
ALTER TABLE `schedule_exceptions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `schedule_exceptions_unique` (`schedule_id`,`exception_date`,`exception_type`),
  ADD KEY `schedule_exceptions_new_teacher_id_foreign` (`new_teacher_id`),
  ADD KEY `schedule_exceptions_new_room_id_foreign` (`new_room_id`),
  ADD KEY `schedule_exceptions_created_by_foreign` (`created_by`),
  ADD KEY `schedule_exceptions_approved_by_foreign` (`approved_by`);

--
-- Indexes for table `schedule_reservations`
--
ALTER TABLE `schedule_reservations`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `schedule_sessions`
--
ALTER TABLE `schedule_sessions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_schedule_session` (`schedule_id`,`session_date`,`start_time`),
  ADD KEY `schedule_sessions_schedule_id_foreign` (`schedule_id`),
  ADD KEY `schedule_sessions_time_slot_id_foreign` (`time_slot_id`),
  ADD KEY `schedule_sessions_teacher_id_foreign` (`teacher_id`),
  ADD KEY `schedule_sessions_room_id_foreign` (`room_id`),
  ADD KEY `schedule_sessions_makeup_for_foreign` (`makeup_for_session_id`),
  ADD KEY `idx_session_date` (`session_date`),
  ADD KEY `idx_session_status` (`status`);

--
-- Indexes for table `schedule_slots`
--
ALTER TABLE `schedule_slots`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `schedule_slots_slot_code_unique` (`slot_code`);

--
-- Indexes for table `schedule_students`
--
ALTER TABLE `schedule_students`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `schedule_students_schedule_student_unique` (`schedule_id`,`student_id`),
  ADD KEY `schedule_students_student_id_foreign` (`student_id`);

--
-- Indexes for table `schedule_time_slots`
--
ALTER TABLE `schedule_time_slots`
  ADD PRIMARY KEY (`id`),
  ADD KEY `schedule_time_slots_schedule_id_foreign` (`schedule_id`),
  ADD KEY `idx_time_slot` (`day_of_week`,`start_time`,`end_time`);

--
-- Indexes for table `session_comments`
--
ALTER TABLE `session_comments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_session_comments_session` (`session_id`),
  ADD KEY `idx_session_comments_user` (`user_id`),
  ADD KEY `idx_session_comments_type` (`type`),
  ADD KEY `idx_session_comments_created` (`created_at`);

--
-- Indexes for table `students`
--
ALTER TABLE `students`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `students_user_id_unique` (`user_id`),
  ADD UNIQUE KEY `citizen_id` (`citizen_id`);

--
-- Indexes for table `student_attendance`
--
ALTER TABLE `student_attendance`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `student_attendance_session_id_student_id_unique` (`session_id`,`student_id`),
  ADD KEY `student_attendance_student_id_foreign` (`student_id`);

--
-- Indexes for table `student_attendances`
--
ALTER TABLE `student_attendances`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `student_documents`
--
ALTER TABLE `student_documents`
  ADD PRIMARY KEY (`id`),
  ADD KEY `student_documents_student_id_foreign` (`student_id`),
  ADD KEY `student_documents_uploaded_by_foreign` (`uploaded_by`);

--
-- Indexes for table `student_groups`
--
ALTER TABLE `student_groups`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `student_groups_group_id_student_id_unique` (`group_id`,`student_id`),
  ADD KEY `student_groups_student_id_foreign` (`student_id`);

--
-- Indexes for table `student_leaves`
--
ALTER TABLE `student_leaves`
  ADD PRIMARY KEY (`id`),
  ADD KEY `student_leaves_student_id_foreign` (`student_id`),
  ADD KEY `student_leaves_class_id_foreign` (`class_id`),
  ADD KEY `student_leaves_approved_by_foreign` (`approved_by`);

--
-- Indexes for table `student_progress`
--
ALTER TABLE `student_progress`
  ADD PRIMARY KEY (`id`),
  ADD KEY `student_progress_student_id_foreign` (`student_id`),
  ADD KEY `student_progress_session_id_foreign` (`session_id`),
  ADD KEY `student_progress_evaluated_by_foreign` (`evaluated_by`);

--
-- Indexes for table `student_registrations`
--
ALTER TABLE `student_registrations`
  ADD PRIMARY KEY (`id`),
  ADD KEY `student_registrations_user_id_foreign` (`user_id`),
  ADD KEY `student_registrations_course_id_foreign` (`course_id`),
  ADD KEY `student_registrations_admin_id_foreign` (`admin_id`),
  ADD KEY `student_registrations_group_preference_id_foreign` (`group_preference_id`);

--
-- Indexes for table `student_schedule_preferences`
--
ALTER TABLE `student_schedule_preferences`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `student_schedule_preferences_student_id_schedule_slot_id_unique` (`student_id`,`schedule_slot_id`),
  ADD KEY `student_schedule_preferences_schedule_slot_id_foreign` (`schedule_slot_id`);

--
-- Indexes for table `teachers`
--
ALTER TABLE `teachers`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `teachers_user_id_unique` (`user_id`);

--
-- Indexes for table `teacher_salaries`
--
ALTER TABLE `teacher_salaries`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `teacher_salaries_teacher_id_month_year_unique` (`teacher_id`,`month`,`year`),
  ADD KEY `teacher_salaries_approved_by_foreign` (`approved_by`);

--
-- Indexes for table `teaching_reports`
--
ALTER TABLE `teaching_reports`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `teaching_reports_class_id_unique` (`class_id`),
  ADD KEY `teaching_reports_teacher_id_foreign` (`teacher_id`);

--
-- Indexes for table `test_results`
--
ALTER TABLE `test_results`
  ADD PRIMARY KEY (`id`),
  ADD KEY `test_results_student_id_foreign` (`student_id`),
  ADD KEY `test_results_registration_id_foreign` (`registration_id`),
  ADD KEY `test_results_conducted_by_foreign` (`conducted_by`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `users_username_unique` (`username`),
  ADD UNIQUE KEY `users_email_unique` (`email`),
  ADD KEY `users_branch_id_foreign` (`branch_id`);

--
-- Indexes for table `user_permissions`
--
ALTER TABLE `user_permissions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `user_permissions_user_id_permission_id_unique` (`user_id`,`permission_id`),
  ADD KEY `user_permissions_permission_id_foreign` (`permission_id`),
  ADD KEY `user_permissions_granted_by_foreign` (`granted_by`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `bills`
--
ALTER TABLE `bills`
  MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `book_borrowings`
--
ALTER TABLE `book_borrowings`
  MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `branches`
--
ALTER TABLE `branches`
  MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `classes`
--
ALTER TABLE `classes`
  MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `class_attendances`
--
ALTER TABLE `class_attendances`
  MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `class_sessions`
--
ALTER TABLE `class_sessions`
  MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `courses`
--
ALTER TABLE `courses`
  MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=100000;

--
-- AUTO_INCREMENT for table `course_categories`
--
ALTER TABLE `course_categories`
  MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `course_drops`
--
ALTER TABLE `course_drops`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `course_durations`
--
ALTER TABLE `course_durations`
  MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `course_groups`
--
ALTER TABLE `course_groups`
  MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `course_pricing`
--
ALTER TABLE `course_pricing`
  MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=19;

--
-- AUTO_INCREMENT for table `ebooks`
--
ALTER TABLE `ebooks`
  MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=16;

--
-- AUTO_INCREMENT for table `enrollments`
--
ALTER TABLE `enrollments`
  MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `enrollment_pricing`
--
ALTER TABLE `enrollment_pricing`
  MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `group_formation_history`
--
ALTER TABLE `group_formation_history`
  MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `group_waiting_list`
--
ALTER TABLE `group_waiting_list`
  MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `knex_migrations`
--
ALTER TABLE `knex_migrations`
  MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `knex_migrations_lock`
--
ALTER TABLE `knex_migrations_lock`
  MODIFY `index` int UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `leave_policy_changes`
--
ALTER TABLE `leave_policy_changes`
  MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT for table `leave_policy_notifications`
--
ALTER TABLE `leave_policy_notifications`
  MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `leave_policy_permissions`
--
ALTER TABLE `leave_policy_permissions`
  MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT for table `leave_policy_rules`
--
ALTER TABLE `leave_policy_rules`
  MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT for table `line_groups`
--
ALTER TABLE `line_groups`
  MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `line_groups2`
--
ALTER TABLE `line_groups2`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `makeup_eligibilities`
--
ALTER TABLE `makeup_eligibilities`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `make_up_sessions`
--
ALTER TABLE `make_up_sessions`
  MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `notifications`
--
ALTER TABLE `notifications`
  MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `notification_schedules`
--
ALTER TABLE `notification_schedules`
  MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `notification_templates`
--
ALTER TABLE `notification_templates`
  MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `payments`
--
ALTER TABLE `payments`
  MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `permissions`
--
ALTER TABLE `permissions`
  MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=51;

--
-- AUTO_INCREMENT for table `pricing_change_history`
--
ALTER TABLE `pricing_change_history`
  MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `pricing_tiers`
--
ALTER TABLE `pricing_tiers`
  MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `rooms`
--
ALTER TABLE `rooms`
  MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `room_notifications`
--
ALTER TABLE `room_notifications`
  MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `schedules`
--
ALTER TABLE `schedules`
  MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- AUTO_INCREMENT for table `schedule_exceptions`
--
ALTER TABLE `schedule_exceptions`
  MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=16;

--
-- AUTO_INCREMENT for table `schedule_reservations`
--
ALTER TABLE `schedule_reservations`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `schedule_sessions`
--
ALTER TABLE `schedule_sessions`
  MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=34;

--
-- AUTO_INCREMENT for table `schedule_slots`
--
ALTER TABLE `schedule_slots`
  MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=43;

--
-- AUTO_INCREMENT for table `schedule_students`
--
ALTER TABLE `schedule_students`
  MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `schedule_time_slots`
--
ALTER TABLE `schedule_time_slots`
  MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=25;

--
-- AUTO_INCREMENT for table `session_comments`
--
ALTER TABLE `session_comments`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `students`
--
ALTER TABLE `students`
  MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `student_attendance`
--
ALTER TABLE `student_attendance`
  MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `student_attendances`
--
ALTER TABLE `student_attendances`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `student_documents`
--
ALTER TABLE `student_documents`
  MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `student_groups`
--
ALTER TABLE `student_groups`
  MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `student_leaves`
--
ALTER TABLE `student_leaves`
  MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `student_progress`
--
ALTER TABLE `student_progress`
  MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `student_registrations`
--
ALTER TABLE `student_registrations`
  MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `student_schedule_preferences`
--
ALTER TABLE `student_schedule_preferences`
  MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `teachers`
--
ALTER TABLE `teachers`
  MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=22;

--
-- AUTO_INCREMENT for table `teacher_salaries`
--
ALTER TABLE `teacher_salaries`
  MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `teaching_reports`
--
ALTER TABLE `teaching_reports`
  MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `test_results`
--
ALTER TABLE `test_results`
  MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=31;

--
-- AUTO_INCREMENT for table `user_permissions`
--
ALTER TABLE `user_permissions`
  MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=157;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `bills`
--
ALTER TABLE `bills`
  ADD CONSTRAINT `bills_enrollment_id_foreign` FOREIGN KEY (`enrollment_id`) REFERENCES `enrollments` (`id`),
  ADD CONSTRAINT `bills_student_id_foreign` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`);

--
-- Constraints for table `book_borrowings`
--
ALTER TABLE `book_borrowings`
  ADD CONSTRAINT `book_borrowings_ebook_id_foreign` FOREIGN KEY (`ebook_id`) REFERENCES `ebooks` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `book_borrowings_issued_by_foreign` FOREIGN KEY (`issued_by`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `book_borrowings_returned_to_foreign` FOREIGN KEY (`returned_to`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `book_borrowings_student_id_foreign` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `classes`
--
ALTER TABLE `classes`
  ADD CONSTRAINT `classes_course_group_id_foreign` FOREIGN KEY (`course_group_id`) REFERENCES `course_groups` (`id`),
  ADD CONSTRAINT `classes_room_id_foreign` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`),
  ADD CONSTRAINT `classes_teacher_id_foreign` FOREIGN KEY (`teacher_id`) REFERENCES `teachers` (`id`);

--
-- Constraints for table `class_attendances`
--
ALTER TABLE `class_attendances`
  ADD CONSTRAINT `class_attendances_class_id_foreign` FOREIGN KEY (`class_id`) REFERENCES `classes` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `class_attendances_student_id_foreign` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `class_sessions`
--
ALTER TABLE `class_sessions`
  ADD CONSTRAINT `class_sessions_class_id_foreign` FOREIGN KEY (`class_id`) REFERENCES `classes` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `class_sessions_qr_generated_by_foreign` FOREIGN KEY (`qr_generated_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `courses`
--
ALTER TABLE `courses`
  ADD CONSTRAINT `courses_branch_id_foreign` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`),
  ADD CONSTRAINT `courses_category_id_foreign` FOREIGN KEY (`category_id`) REFERENCES `course_categories` (`id`),
  ADD CONSTRAINT `courses_duration_id_foreign` FOREIGN KEY (`duration_id`) REFERENCES `course_durations` (`id`);

--
-- Constraints for table `course_groups`
--
ALTER TABLE `course_groups`
  ADD CONSTRAINT `course_groups_admin_assigned_foreign` FOREIGN KEY (`admin_assigned`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `course_groups_course_id_foreign` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`),
  ADD CONSTRAINT `course_groups_group_leader_id_foreign` FOREIGN KEY (`group_leader_id`) REFERENCES `students` (`id`),
  ADD CONSTRAINT `course_groups_room_id_foreign` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`),
  ADD CONSTRAINT `course_groups_teacher_id_foreign` FOREIGN KEY (`teacher_id`) REFERENCES `teachers` (`id`);

--
-- Constraints for table `course_pricing`
--
ALTER TABLE `course_pricing`
  ADD CONSTRAINT `course_pricing_category_id_foreign` FOREIGN KEY (`category_id`) REFERENCES `course_categories` (`id`),
  ADD CONSTRAINT `course_pricing_duration_id_foreign` FOREIGN KEY (`duration_id`) REFERENCES `course_durations` (`id`),
  ADD CONSTRAINT `course_pricing_pricing_tier_id_foreign` FOREIGN KEY (`pricing_tier_id`) REFERENCES `pricing_tiers` (`id`);

--
-- Constraints for table `enrollments`
--
ALTER TABLE `enrollments`
  ADD CONSTRAINT `enrollments_course_group_id_foreign` FOREIGN KEY (`course_group_id`) REFERENCES `course_groups` (`id`),
  ADD CONSTRAINT `enrollments_course_id_foreign` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`),
  ADD CONSTRAINT `enrollments_leave_policy_rule_id_foreign` FOREIGN KEY (`leave_policy_rule_id`) REFERENCES `leave_policy_rules` (`id`),
  ADD CONSTRAINT `enrollments_student_id_foreign` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `enrollment_pricing`
--
ALTER TABLE `enrollment_pricing`
  ADD CONSTRAINT `enrollment_pricing_course_pricing_id_foreign` FOREIGN KEY (`course_pricing_id`) REFERENCES `course_pricing` (`id`),
  ADD CONSTRAINT `enrollment_pricing_enrollment_id_foreign` FOREIGN KEY (`enrollment_id`) REFERENCES `enrollments` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `group_formation_history`
--
ALTER TABLE `group_formation_history`
  ADD CONSTRAINT `group_formation_history_group_id_foreign` FOREIGN KEY (`group_id`) REFERENCES `course_groups` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `group_formation_history_performed_by_foreign` FOREIGN KEY (`performed_by`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `group_formation_history_student_id_foreign` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `group_waiting_list`
--
ALTER TABLE `group_waiting_list`
  ADD CONSTRAINT `group_waiting_list_student_id_foreign` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `leave_policy_changes`
--
ALTER TABLE `leave_policy_changes`
  ADD CONSTRAINT `leave_policy_changes_approved_by_foreign` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `leave_policy_changes_changed_by_foreign` FOREIGN KEY (`changed_by`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `leave_policy_changes_policy_rule_id_foreign` FOREIGN KEY (`policy_rule_id`) REFERENCES `leave_policy_rules` (`id`),
  ADD CONSTRAINT `leave_policy_changes_reverted_from_change_id_foreign` FOREIGN KEY (`reverted_from_change_id`) REFERENCES `leave_policy_changes` (`id`);

--
-- Constraints for table `leave_policy_notifications`
--
ALTER TABLE `leave_policy_notifications`
  ADD CONSTRAINT `leave_policy_notifications_change_id_foreign` FOREIGN KEY (`change_id`) REFERENCES `leave_policy_changes` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `leave_policy_notifications_recipient_id_foreign` FOREIGN KEY (`recipient_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `leave_policy_permissions`
--
ALTER TABLE `leave_policy_permissions`
  ADD CONSTRAINT `leave_policy_permissions_granted_by_foreign` FOREIGN KEY (`granted_by`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `leave_policy_permissions_policy_rule_id_foreign` FOREIGN KEY (`policy_rule_id`) REFERENCES `leave_policy_rules` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `leave_policy_permissions_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `leave_policy_rules`
--
ALTER TABLE `leave_policy_rules`
  ADD CONSTRAINT `leave_policy_rules_branch_id_foreign` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`),
  ADD CONSTRAINT `leave_policy_rules_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `line_groups`
--
ALTER TABLE `line_groups`
  ADD CONSTRAINT `line_groups_branch_id_foreign` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`),
  ADD CONSTRAINT `line_groups_group_id_foreign` FOREIGN KEY (`group_id`) REFERENCES `course_groups` (`id`);

--
-- Constraints for table `make_up_sessions`
--
ALTER TABLE `make_up_sessions`
  ADD CONSTRAINT `make_up_sessions_arranged_by_foreign` FOREIGN KEY (`arranged_by`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `make_up_sessions_new_session_id_foreign` FOREIGN KEY (`new_session_id`) REFERENCES `class_sessions` (`id`),
  ADD CONSTRAINT `make_up_sessions_original_session_id_foreign` FOREIGN KEY (`original_session_id`) REFERENCES `class_sessions` (`id`),
  ADD CONSTRAINT `make_up_sessions_student_id_foreign` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`);

--
-- Constraints for table `notifications`
--
ALTER TABLE `notifications`
  ADD CONSTRAINT `notifications_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `notification_schedules`
--
ALTER TABLE `notification_schedules`
  ADD CONSTRAINT `notification_schedules_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `payments`
--
ALTER TABLE `payments`
  ADD CONSTRAINT `payments_bill_id_foreign` FOREIGN KEY (`bill_id`) REFERENCES `bills` (`id`),
  ADD CONSTRAINT `payments_student_id_foreign` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`),
  ADD CONSTRAINT `payments_verified_by_foreign` FOREIGN KEY (`verified_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `pricing_change_history`
--
ALTER TABLE `pricing_change_history`
  ADD CONSTRAINT `pricing_change_history_course_group_id_foreign` FOREIGN KEY (`course_group_id`) REFERENCES `course_groups` (`id`),
  ADD CONSTRAINT `pricing_change_history_enrollment_id_foreign` FOREIGN KEY (`enrollment_id`) REFERENCES `enrollments` (`id`),
  ADD CONSTRAINT `pricing_change_history_processed_by_foreign` FOREIGN KEY (`processed_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `rooms`
--
ALTER TABLE `rooms`
  ADD CONSTRAINT `rooms_branch_id_foreign` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`);

--
-- Constraints for table `room_notifications`
--
ALTER TABLE `room_notifications`
  ADD CONSTRAINT `room_notifications_branch_id_foreign` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`),
  ADD CONSTRAINT `room_notifications_room_id_foreign` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`),
  ADD CONSTRAINT `room_notifications_teacher_id_foreign` FOREIGN KEY (`teacher_id`) REFERENCES `teachers` (`id`);

--
-- Constraints for table `schedules`
--
ALTER TABLE `schedules`
  ADD CONSTRAINT `schedules_admin_assigned_foreign` FOREIGN KEY (`admin_assigned`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `schedules_course_id_foreign` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `schedules_room_id_foreign` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `schedules_teacher_id_foreign` FOREIGN KEY (`teacher_id`) REFERENCES `teachers` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `schedule_exceptions`
--
ALTER TABLE `schedule_exceptions`
  ADD CONSTRAINT `schedule_exceptions_approved_by_foreign` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `schedule_exceptions_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `schedule_exceptions_new_room_id_foreign` FOREIGN KEY (`new_room_id`) REFERENCES `rooms` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `schedule_exceptions_new_teacher_id_foreign` FOREIGN KEY (`new_teacher_id`) REFERENCES `teachers` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `schedule_exceptions_schedule_id_foreign` FOREIGN KEY (`schedule_id`) REFERENCES `schedules` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `schedule_sessions`
--
ALTER TABLE `schedule_sessions`
  ADD CONSTRAINT `schedule_sessions_makeup_for_foreign` FOREIGN KEY (`makeup_for_session_id`) REFERENCES `schedule_sessions` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `schedule_sessions_room_id_foreign` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `schedule_sessions_schedule_id_foreign` FOREIGN KEY (`schedule_id`) REFERENCES `schedules` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `schedule_sessions_teacher_id_foreign` FOREIGN KEY (`teacher_id`) REFERENCES `teachers` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `schedule_sessions_time_slot_id_foreign` FOREIGN KEY (`time_slot_id`) REFERENCES `schedule_time_slots` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `schedule_students`
--
ALTER TABLE `schedule_students`
  ADD CONSTRAINT `schedule_students_schedule_id_foreign` FOREIGN KEY (`schedule_id`) REFERENCES `schedules` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `schedule_students_student_id_foreign` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `schedule_time_slots`
--
ALTER TABLE `schedule_time_slots`
  ADD CONSTRAINT `schedule_time_slots_schedule_id_foreign` FOREIGN KEY (`schedule_id`) REFERENCES `schedules` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `session_comments`
--
ALTER TABLE `session_comments`
  ADD CONSTRAINT `session_comments_ibfk_1` FOREIGN KEY (`session_id`) REFERENCES `schedule_sessions` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `session_comments_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `students`
--
ALTER TABLE `students`
  ADD CONSTRAINT `students_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `student_attendance`
--
ALTER TABLE `student_attendance`
  ADD CONSTRAINT `student_attendance_session_id_foreign` FOREIGN KEY (`session_id`) REFERENCES `class_sessions` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `student_attendance_student_id_foreign` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `student_documents`
--
ALTER TABLE `student_documents`
  ADD CONSTRAINT `student_documents_student_id_foreign` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `student_documents_uploaded_by_foreign` FOREIGN KEY (`uploaded_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `student_groups`
--
ALTER TABLE `student_groups`
  ADD CONSTRAINT `student_groups_group_id_foreign` FOREIGN KEY (`group_id`) REFERENCES `course_groups` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `student_groups_student_id_foreign` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `student_leaves`
--
ALTER TABLE `student_leaves`
  ADD CONSTRAINT `student_leaves_approved_by_foreign` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `student_leaves_class_id_foreign` FOREIGN KEY (`class_id`) REFERENCES `classes` (`id`),
  ADD CONSTRAINT `student_leaves_student_id_foreign` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `student_progress`
--
ALTER TABLE `student_progress`
  ADD CONSTRAINT `student_progress_evaluated_by_foreign` FOREIGN KEY (`evaluated_by`) REFERENCES `teachers` (`id`),
  ADD CONSTRAINT `student_progress_session_id_foreign` FOREIGN KEY (`session_id`) REFERENCES `class_sessions` (`id`),
  ADD CONSTRAINT `student_progress_student_id_foreign` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `student_registrations`
--
ALTER TABLE `student_registrations`
  ADD CONSTRAINT `student_registrations_admin_id_foreign` FOREIGN KEY (`admin_id`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `student_registrations_course_id_foreign` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`),
  ADD CONSTRAINT `student_registrations_group_preference_id_foreign` FOREIGN KEY (`group_preference_id`) REFERENCES `course_groups` (`id`),
  ADD CONSTRAINT `student_registrations_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `student_schedule_preferences`
--
ALTER TABLE `student_schedule_preferences`
  ADD CONSTRAINT `student_schedule_preferences_schedule_slot_id_foreign` FOREIGN KEY (`schedule_slot_id`) REFERENCES `schedule_slots` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `student_schedule_preferences_student_id_foreign` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `teachers`
--
ALTER TABLE `teachers`
  ADD CONSTRAINT `teachers_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `teacher_salaries`
--
ALTER TABLE `teacher_salaries`
  ADD CONSTRAINT `teacher_salaries_approved_by_foreign` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `teacher_salaries_teacher_id_foreign` FOREIGN KEY (`teacher_id`) REFERENCES `teachers` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `teaching_reports`
--
ALTER TABLE `teaching_reports`
  ADD CONSTRAINT `teaching_reports_class_id_foreign` FOREIGN KEY (`class_id`) REFERENCES `classes` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `teaching_reports_teacher_id_foreign` FOREIGN KEY (`teacher_id`) REFERENCES `teachers` (`id`);

--
-- Constraints for table `test_results`
--
ALTER TABLE `test_results`
  ADD CONSTRAINT `test_results_conducted_by_foreign` FOREIGN KEY (`conducted_by`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `test_results_registration_id_foreign` FOREIGN KEY (`registration_id`) REFERENCES `student_registrations` (`id`),
  ADD CONSTRAINT `test_results_student_id_foreign` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `users`
--
ALTER TABLE `users`
  ADD CONSTRAINT `users_branch_id_foreign` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`);

--
-- Constraints for table `user_permissions`
--
ALTER TABLE `user_permissions`
  ADD CONSTRAINT `user_permissions_granted_by_foreign` FOREIGN KEY (`granted_by`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `user_permissions_permission_id_foreign` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `user_permissions_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
