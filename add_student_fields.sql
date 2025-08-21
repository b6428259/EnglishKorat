-- SQL to add missing student registration fields
-- Run this directly in your MySQL database

USE englishkorat;

-- Add missing fields to students table
ALTER TABLE students 
ADD COLUMN first_name_en VARCHAR(100) AFTER first_name,
ADD COLUMN last_name_en VARCHAR(100) AFTER last_name,
ADD COLUMN date_of_birth DATE AFTER nickname,
ADD COLUMN gender ENUM('male', 'female', 'other') AFTER date_of_birth,
ADD COLUMN address TEXT AFTER gender,
ADD COLUMN citizen_id VARCHAR(255) UNIQUE AFTER address,
ADD COLUMN current_education VARCHAR(50) AFTER grade_level,
ADD COLUMN preferred_language VARCHAR(20) AFTER cefr_level,
ADD COLUMN language_level VARCHAR(30) AFTER preferred_language,
ADD COLUMN recent_cefr VARCHAR(10) AFTER language_level,
ADD COLUMN learning_style VARCHAR(20) AFTER recent_cefr,
ADD COLUMN learning_goals TEXT AFTER learning_style,
ADD COLUMN parent_name VARCHAR(100) AFTER learning_goals,
ADD COLUMN parent_phone VARCHAR(20) AFTER parent_name,
ADD COLUMN emergency_contact VARCHAR(100) AFTER parent_phone,
ADD COLUMN emergency_phone VARCHAR(20) AFTER emergency_contact,
ADD COLUMN preferred_time_slots JSON AFTER emergency_phone,
ADD COLUMN unavailable_time_slots JSON AFTER preferred_time_slots,
ADD COLUMN selected_courses JSON AFTER unavailable_time_slots;

-- Update existing records to have default values for required fields
UPDATE students SET 
  registration_status = COALESCE(registration_status, 'ยังไม่สอบ'),
  preferred_time_slots = COALESCE(preferred_time_slots, '[]'),
  unavailable_time_slots = COALESCE(unavailable_time_slots, '[]'),
  selected_courses = COALESCE(selected_courses, '[]')
WHERE registration_status IS NULL;

-- Show the updated table structure
DESCRIBE students;
