# Comprehensive Database Documentation
## English Korat Language School Management System

### 📊 Database Overview

This database schema supports a comprehensive Student Management System with advanced pricing structures, group formation, course management, and billing systems. The system is designed to handle multiple pricing tiers, dynamic group size adjustments, and complex enrollment scenarios.

---

## 🏗️ Core System Tables

### **1. Users Table**
**Purpose:** Central user management for all system actors
```sql
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('owner', 'admin', 'teacher', 'student') NOT NULL,
  first_name VARCHAR(50),
  last_name VARCHAR(50),
  phone VARCHAR(20),
  branch_id INT REFERENCES branches(id),
  avatar VARCHAR(500),
  status ENUM('active', 'inactive', 'suspended') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

**Key Fields:**
- `role`: Defines user permissions (owner > admin > teacher > student)
- `branch_id`: Associates user with specific branch (NULL for owners)
- `avatar`: Profile picture path for UI personalization
- `status`: Account status management

### **2. Branches Table**
**Purpose:** Multi-location school management
```sql
CREATE TABLE branches (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(10) UNIQUE NOT NULL,
  address TEXT,
  phone VARCHAR(20),
  email VARCHAR(100),
  manager_id INT REFERENCES users(id),
  status ENUM('active', 'inactive') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

**Key Fields:**
- `code`: Short identifier (e.g., "MALL", "TECH")
- `manager_id`: Branch manager (admin role user)
- Branch-specific contact information

---

## 📚 Academic System Tables

### **3. Course Categories Table**
**Purpose:** Categorize courses for pricing and management
```sql
CREATE TABLE course_categories (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  name_en VARCHAR(100) NOT NULL,
  code VARCHAR(50),
  description TEXT,
  description_en TEXT,
  type ENUM('conversation', 'skills', 'test_prep', 'language') NOT NULL,
  includes_book_fee BOOLEAN DEFAULT TRUE,
  default_book_fee DECIMAL(8,2) DEFAULT 900.00,
  sort_order INT DEFAULT 0,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

**Key Fields:**
- `code`: Used for pricing calculations ('conversation', 'ielts_toefl_promo')
- `includes_book_fee`: Whether this category typically includes book fees
- `default_book_fee`: Standard book fee amount (900 THB)
- `type`: Broad category classification

**Sample Data:**
- Conversation Course (Thai & Native Teacher)
- IELTS/TOEFL Promotion Courses

### **4. Course Durations Table**
**Purpose:** Define available course duration options
```sql
CREATE TABLE course_durations (
  id INT PRIMARY KEY AUTO_INCREMENT,
  hours INT UNIQUE NOT NULL,
  name VARCHAR(50) NOT NULL,
  is_premium BOOLEAN DEFAULT FALSE,
  description TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

**Key Fields:**
- `hours`: Total course hours (40, 50, 60)
- `is_premium`: Special designation for premium courses
- `name`: Display name ("40 Hours", "60 Hours Premium")

**Sample Data:**
- 40 Hours (Standard)
- 50 Hours (Extended)
- 60 Hours Premium (Premium features)

### **5. Pricing Tiers Table**
**Purpose:** Define group size pricing tiers
```sql
CREATE TABLE pricing_tiers (
  id INT PRIMARY KEY AUTO_INCREMENT,
  tier_type VARCHAR(50) NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  min_students INT NOT NULL,
  max_students INT NOT NULL,
  sort_order INT DEFAULT 0,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

**Key Fields:**
- `tier_type`: Internal identifier ('individual', 'pair', 'group')
- `min_students`, `max_students`: Group size boundaries
- `display_name`: User-friendly name ("Group (3-4 people)")

**Sample Data:**
- Individual (1 student)
- Pair (2 students)
- Group (3-4 students)

### **6. Course Pricing Table** ⭐
**Purpose:** Comprehensive pricing matrix - Core of the new pricing system
```sql
CREATE TABLE course_pricing (
  id INT PRIMARY KEY AUTO_INCREMENT,
  category_id INT NOT NULL REFERENCES course_categories(id),
  duration_id INT NOT NULL REFERENCES course_durations(id),
  pricing_tier_id INT NOT NULL REFERENCES pricing_tiers(id),
  base_price DECIMAL(10,2) NOT NULL,
  book_fee DECIMAL(8,2) DEFAULT 0,
  total_price DECIMAL(10,2) NOT NULL,
  price_per_hour_per_person DECIMAL(8,2) NOT NULL,
  notes TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE(category_id, duration_id, pricing_tier_id)
);
```

**Key Fields:**
- `base_price`: Price without book fee
- `book_fee`: Book fee for this specific combination (0 for premium)
- `total_price`: base_price + book_fee
- `price_per_hour_per_person`: Reference calculation
- `notes`: Special conditions

**Sample Pricing Matrix (18 combinations):**

#### Conversation Courses:
| Duration | Individual | Pair | Group |
|----------|-----------|------|-------|
| 40h | 34,500₿ (840₿/h) | 23,900₿ (575₿/h) | 19,400₿ (475₿/h) |
| 50h | 41,900₿ (820₿/h) | 27,900₿ (540₿/h) | 22,900₿ (440₿/h) |
| 60h | 48,300₿ (790₿/h) | 29,400₿ (475₿/h) | 24,900₿ (400₿/h) |

#### IELTS/TOEFL Promotion:
| Duration | Individual | Pair | Group |
|----------|-----------|------|-------|
| 40h | 31,900₿ (775₿/h) | 22,100₿ (530₿/h) | 17,700₿ (420₿/h) |
| 50h | 39,400₿ (770₿/h) | 27,150₿ (525₿/h) | 21,400₿ (410₿/h) |
| 60h Premium | 45,000₿ (750₿/h) | 30,000₿ (500₿/h) | 24,000₿ (400₿/h) |

### **7. Courses Table**
**Purpose:** Course catalog with enhanced pricing integration
```sql
CREATE TABLE courses (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(200) NOT NULL,
  code VARCHAR(50) UNIQUE NOT NULL,
  course_type ENUM('conversation_kids', 'conversation_adults', 'english_4skills', 
                   'ielts_prep', 'toeic_prep', 'toefl_prep',
                   'chinese_conversation', 'chinese_4skills') NOT NULL,
  branch_id INT NOT NULL REFERENCES branches(id),
  category_id INT REFERENCES course_categories(id),
  duration_id INT REFERENCES course_durations(id),
  max_students INT DEFAULT 8,
  price DECIMAL(10,2) NOT NULL, -- Legacy pricing
  hours_total INT NOT NULL,
  uses_dynamic_pricing BOOLEAN DEFAULT FALSE,
  base_price_per_hour DECIMAL(8,2),
  pricing_notes TEXT,
  payment_terms TEXT, -- JSON for payment options
  description TEXT,
  status ENUM('active', 'inactive') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

**Key Fields:**
- `category_id`, `duration_id`: Links to new pricing system
- `uses_dynamic_pricing`: Whether to use new pricing matrix
- `price`: Legacy single price (for backward compatibility)
- `base_price_per_hour`: Alternative pricing method

### **8. Course Groups Table**
**Purpose:** Individual class groups within courses
```sql
CREATE TABLE course_groups (
  id INT PRIMARY KEY AUTO_INCREMENT,
  course_id INT NOT NULL REFERENCES courses(id),
  group_name VARCHAR(100),
  teacher_id INT REFERENCES teachers(id),
  room_id INT REFERENCES rooms(id),
  current_students INT DEFAULT 0,
  target_students INT, -- Enhanced field
  status ENUM('waiting_for_group', 'ready_to_active', 'in_progress', 'completed', 'cancelled') DEFAULT 'waiting_for_group',
  start_date DATE,
  end_date DATE,
  admin_assigned INT REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

**Key Fields:**
- `current_students`: Real-time student count
- `target_students`: Desired group size for pricing
- `status`: Group formation and progress tracking

---

## 📝 Enrollment & Pricing Tables

### **9. Enrollments Table**
**Purpose:** Student course registrations with payment tracking
```sql
CREATE TABLE enrollments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  student_id INT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  course_id INT NOT NULL REFERENCES courses(id),
  course_group_id INT REFERENCES course_groups(id),
  enrollment_date DATE NOT NULL,
  payment_status ENUM('pending', 'partial', 'completed', 'overdue') DEFAULT 'pending',
  total_amount DECIMAL(10,2) NOT NULL,
  paid_amount DECIMAL(10,2) DEFAULT 0,
  leave_credits INT DEFAULT 0,
  used_leaves INT DEFAULT 0,
  status ENUM('active', 'completed', 'cancelled', 'suspended') DEFAULT 'active',
  promotion_id INT, -- Enhanced field
  referral_source TEXT, -- Enhanced field
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

**Key Fields:**
- `total_amount`: Final calculated price (may change with group size)
- `promotion_id`, `referral_source`: Marketing tracking
- `leave_credits`: Allowed absences

### **10. Enrollment Pricing Table** ⭐
**Purpose:** Track detailed pricing calculations for each enrollment
```sql
CREATE TABLE enrollment_pricing (
  id INT PRIMARY KEY AUTO_INCREMENT,
  enrollment_id INT NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
  course_pricing_id INT REFERENCES course_pricing(id),
  group_size_at_enrollment INT NOT NULL,
  calculated_base_price DECIMAL(10,2) NOT NULL,
  book_fee_applied DECIMAL(8,2) DEFAULT 0,
  total_price_calculated DECIMAL(10,2) NOT NULL,
  book_fee_waived BOOLEAN DEFAULT FALSE,
  pricing_calculation_details TEXT, -- JSON with breakdown
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

**Key Fields:**
- `group_size_at_enrollment`: Group size when student enrolled
- `course_pricing_id`: Links to specific pricing matrix entry
- `pricing_calculation_details`: JSON with complete calculation breakdown
- `book_fee_waived`: Special exceptions

### **11. Pricing Change History Table** ⭐
**Purpose:** Audit trail for pricing adjustments
```sql
CREATE TABLE pricing_change_history (
  id INT PRIMARY KEY AUTO_INCREMENT,
  enrollment_id INT NOT NULL REFERENCES enrollments(id),
  course_group_id INT REFERENCES course_groups(id),
  previous_group_size INT,
  new_group_size INT NOT NULL,
  previous_price DECIMAL(10,2),
  new_price DECIMAL(10,2) NOT NULL,
  change_reason ENUM('student_joined', 'student_left', 'group_disbanded', 'manual_adjustment') NOT NULL,
  change_details TEXT, -- JSON with detailed information
  processed_by INT REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

**Key Fields:**
- `change_reason`: Why pricing changed
- `change_details`: JSON with before/after comparison
- `processed_by`: Admin who approved the change

---

## 💰 Billing & Payment Tables

### **12. Bills Table**
**Purpose:** Generate bills based on enrollment pricing
```sql
CREATE TABLE bills (
  id INT PRIMARY KEY AUTO_INCREMENT,
  student_id INT NOT NULL REFERENCES students(id),
  enrollment_id INT NOT NULL REFERENCES enrollments(id),
  bill_number VARCHAR(50) UNIQUE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  discount DECIMAL(10,2) DEFAULT 0,
  total_amount DECIMAL(10,2) NOT NULL,
  bill_type ENUM('full_payment', 'installment', 'deposit') NOT NULL,
  due_date DATE,
  status ENUM('pending', 'paid', 'overdue', 'cancelled') DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### **13. Payments Table**
**Purpose:** Track payment transactions
```sql
CREATE TABLE payments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  bill_id INT NOT NULL REFERENCES bills(id),
  student_id INT NOT NULL REFERENCES students(id),
  amount DECIMAL(10,2) NOT NULL,
  payment_method ENUM('cash', 'credit_card', 'bank_transfer', 'line_pay') NOT NULL,
  processing_fee DECIMAL(8,2) DEFAULT 0,
  transaction_id VARCHAR(100),
  slip_image VARCHAR(500), -- Payment verification
  payment_date TIMESTAMP NOT NULL,
  verification_status ENUM('pending', 'verified', 'rejected') DEFAULT 'pending',
  verified_by INT REFERENCES users(id),
  verified_at TIMESTAMP,
  verification_notes TEXT,
  thunder_verification_id VARCHAR(100), -- Enhanced field
  thunder_response JSON, -- Enhanced field
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

---

## 👥 Student Management Tables

### **14. Students Table**
**Purpose:** Student profiles and academic information
```sql
CREATE TABLE students (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  student_id VARCHAR(20) UNIQUE NOT NULL,
  first_name VARCHAR(50) NOT NULL,
  last_name VARCHAR(50) NOT NULL,
  nickname VARCHAR(30),
  date_of_birth DATE,
  gender ENUM('male', 'female', 'other'),
  nationality VARCHAR(50),
  phone VARCHAR(20),
  email VARCHAR(100),
  address TEXT,
  emergency_contact_name VARCHAR(100),
  emergency_contact_phone VARCHAR(20),
  cefr_level ENUM('A1', 'A2', 'B1', 'B2', 'C1', 'C2'),
  preferred_teacher_type ENUM('thai', 'native', 'any') DEFAULT 'any',
  learning_goals TEXT,
  registration_status ENUM('registered', 'finding_group', 'has_group_members', 'active_in_course', 'completed_course') DEFAULT 'registered',
  last_status_update TIMESTAMP,
  age_group ENUM('child', 'teen', 'adult') DEFAULT 'adult', -- Enhanced field
  skill_level ENUM('beginner', 'intermediate', 'advanced', 'expert') DEFAULT 'beginner', -- Enhanced field
  branch_id INT REFERENCES branches(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

**Key Fields:**
- `cefr_level`: European language proficiency standard
- `registration_status`: Current enrollment status
- `preferred_teacher_type`: Thai vs Native speaker preference
- `age_group`, `skill_level`: Enhanced classification

---

## 🏫 Scheduling & Class Management

### **15. Schedule Slots Table**
**Purpose:** Available time slots for classes
```sql
CREATE TABLE schedule_slots (
  id INT PRIMARY KEY AUTO_INCREMENT,
  branch_id INT NOT NULL REFERENCES branches(id),
  day_of_week ENUM('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday') NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  slot_type ENUM('morning', 'afternoon', 'evening', 'weekend') NOT NULL,
  max_bookings INT DEFAULT 1,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### **16. Classes Table**
**Purpose:** Individual class sessions
```sql
CREATE TABLE classes (
  id INT PRIMARY KEY AUTO_INCREMENT,
  course_group_id INT NOT NULL REFERENCES course_groups(id),
  teacher_id INT NOT NULL REFERENCES teachers(id),
  room_id INT NOT NULL REFERENCES rooms(id),
  class_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  hours DECIMAL(3,1) NOT NULL,
  qr_code VARCHAR(100), -- Enhanced field
  qr_generated_at TIMESTAMP, -- Enhanced field
  status ENUM('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled') DEFAULT 'scheduled',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### **17. Class Attendances Table**
**Purpose:** Track student attendance
```sql
CREATE TABLE class_attendances (
  id INT PRIMARY KEY AUTO_INCREMENT,
  class_id INT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  student_id INT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  status ENUM('present', 'absent', 'excused', 'late') DEFAULT 'present',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE(class_id, student_id)
);
```

---

## 🔧 System Configuration Tables

### **18. Leave Policy Rules Table**
**Purpose:** Define leave and absence policies
```sql
CREATE TABLE leave_policy_rules (
  id INT PRIMARY KEY AUTO_INCREMENT,
  course_type VARCHAR(50) NOT NULL,
  group_type ENUM('individual', 'pair', 'group') NOT NULL,
  total_leaves_allowed INT NOT NULL,
  advance_notice_required INT DEFAULT 24, -- hours
  makeup_session_allowed BOOLEAN DEFAULT TRUE,
  policy_description TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### **19. Permissions Table**
**Purpose:** Role-based access control
```sql
CREATE TABLE permissions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  resource VARCHAR(50) NOT NULL,
  action VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### **20. User Permissions Table**
**Purpose:** Assign permissions to users
```sql
CREATE TABLE user_permissions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  permission_id INT NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  granted_by INT REFERENCES users(id),
  granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, permission_id)
);
```

---

## 📊 Pricing System Business Rules

### **Key Pricing Rules:**

1. **Level Testing is FREE** for all course types
2. **Book Fee (+900 THB)** applies unless specified as Free
3. **No Cash Refunds** - convert to lesson hours
4. **Group Size Changes:** Recalculate pricing based on current group size
5. **60-Hour Premium Courses:** Book fee included in base price

### **Group Size Impact:**
- **Individual (1 student):** Highest price per hour
- **Pair (2 students):** Medium price per hour  
- **Group (3-4 students):** Lowest price per hour

### **Dynamic Pricing Logic:**
```javascript
// When student joins/leaves group:
1. Determine new group size
2. Find applicable pricing tier
3. Calculate new price from course_pricing table
4. Record change in pricing_change_history
5. Update enrollment_pricing and enrollments tables
6. Generate billing adjustment if needed
```

---

## 🔄 Data Relationships

### **Key Foreign Key Relationships:**
```
users → branches (branch_id)
students → users (user_id)
courses → branches (branch_id)
courses → course_categories (category_id)
courses → course_durations (duration_id)
enrollments → students (student_id)
enrollments → courses (course_id)
enrollment_pricing → enrollments (enrollment_id)
enrollment_pricing → course_pricing (course_pricing_id)
course_pricing → course_categories (category_id)
course_pricing → course_durations (duration_id)
course_pricing → pricing_tiers (pricing_tier_id)
```

### **Critical Indexes:**
```sql
-- Performance indexes
INDEX idx_enrollments_student (student_id);
INDEX idx_enrollments_course (course_id);
INDEX idx_course_pricing_lookup (category_id, duration_id, pricing_tier_id);
INDEX idx_pricing_history_enrollment (enrollment_id);
INDEX idx_students_branch (branch_id);
INDEX idx_classes_date (class_date);
```

---

## 📈 Usage Examples

### **Creating an Enrollment with Dynamic Pricing:**
```javascript
// 1. Student wants Conversation course, 50 hours, group of 3
const pricing = await PricingCalculationService.calculateCoursePricing(
  1, // Conversation category
  2, // 50 hours duration
  3  // Group size
);
// Returns: { totalPrice: 22900, bookFee: 900, ... }

// 2. Create enrollment with calculated pricing
const enrollment = await createEnrollment({
  student_id: 123,
  course_id: 456,
  total_amount: pricing.totalPrice,
  group_size: 3
});
```

### **Handling Group Size Changes:**
```javascript
// Student leaves group (4 → 3 students)
const result = await PricingCalculationService.recalculatePricingForGroupChange(
  enrollmentId,
  3, // New group size
  'student_left',
  adminUserId
);
// Automatically updates pricing and creates history record
```

---

## 🔒 Security Considerations

1. **Branch Isolation:** Non-owner users can only access their branch data
2. **Role-Based Access:** Permissions enforced at controller level
3. **Audit Trails:** All pricing changes logged with user attribution
4. **Data Integrity:** Foreign key constraints prevent orphaned records
5. **Payment Verification:** Multi-step payment verification process

---

## 🚀 Performance Optimizations

1. **Pricing Lookup Cache:** Consider caching pricing matrix in memory
2. **Index Optimization:** Strategic indexes on high-query tables
3. **Denormalized Fields:** Store calculated totals to avoid joins
4. **Batch Operations:** Group size changes processed in transactions
5. **Archive Strategy:** Move completed courses to archive tables

---

This comprehensive database schema supports the full requirements of the English Korat Language School management system with advanced pricing capabilities, group dynamics, and detailed audit trails.