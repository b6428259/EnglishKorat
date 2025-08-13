/**
 * Multi-language configuration for English Korat School
 * Supports Thai and English languages
 */

const languages = {
  th: {
    name: 'ไทย',
    code: 'th',
    locale: 'th-TH',
    timezone: 'Asia/Bangkok',
    currency: 'THB',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '24h'
  },
  en: {
    name: 'English',
    code: 'en',
    locale: 'en-US',
    timezone: 'Asia/Bangkok', // Still using Bangkok timezone for consistency
    currency: 'THB',
    dateFormat: 'MM/DD/YYYY',
    timeFormat: '12h'
  }
};

const defaultLanguage = 'th';
const supportedLanguages = ['th', 'en'];

// Branch-specific timezone configurations
const branchTimezones = {
  'MALL': 'Asia/Bangkok',    // The Mall Branch
  'TECH': 'Asia/Bangkok',    // Technology Branch
  'ONLINE': 'Asia/Bangkok'   // Online Branch (same timezone for consistency)
};

// Common translations for system messages
const translations = {
  th: {
    // User roles
    roles: {
      student: 'นักเรียน',
      teacher: 'ครูผู้สอน',
      admin: 'ผู้ดูแลระบบ',
      owner: 'เจ้าของโรงเรียน'
    },
    
    // Course types
    courseTypes: {
      conversation_kids: 'คอร์สสนทนาเด็ก',
      conversation_adults: 'คอร์สสนทนาผู้ใหญ่',
      english_4skills: 'คอร์สภาษาอังกฤษ 4 ทักษะ',
      ielts_prep: 'คอร์สเตรียมสอบ IELTS',
      toeic_prep: 'คอร์สเตรียมสอบ TOEIC',
      toefl_prep: 'คอร์สเตรียมสอบ TOEFL',
      chinese_conversation: 'คอร์สสนทนาภาษาจีน',
      chinese_4skills: 'คอร์สภาษาจีน 4 ทักษะ'
    },
    
    // Class status
    classStatus: {
      scheduled: 'กำหนดการเรียน',
      confirmed: 'ยืนยันแล้ว',
      in_progress: 'กำลังเรียน',
      completed: 'เสร็จสิ้น',
      cancelled: 'ยกเลิก'
    },
    
    // Attendance status
    attendanceStatus: {
      present: 'มาเรียน',
      absent: 'ขาดเรียน',
      excused: 'ลา',
      late: 'มาสาย'
    },
    
    // Leave request status
    leaveStatus: {
      pending: 'รอการอนุมัติ',
      approved: 'อนุมัติแล้ว',
      rejected: 'ไม่อนุมัติ'
    },
    
    // Payment status
    paymentStatus: {
      pending: 'รอการชำระ',
      paid: 'ชำระแล้ว',
      overdue: 'เกินกำหนด',
      cancelled: 'ยกเลิก'
    },
    
    // Common messages
    messages: {
      success: 'สำเร็จ',
      error: 'เกิดข้อผิดพลาด',
      loading: 'กำลังโหลด...',
      noData: 'ไม่มีข้อมูล',
      confirmDelete: 'คุณต้องการลบข้อมูลนี้หรือไม่?',
      saved: 'บันทึกข้อมูลแล้ว',
      updated: 'อัพเดทข้อมูลแล้ว',
      deleted: 'ลบข้อมูลแล้ว'
    },
    
    // Navigation
    navigation: {
      dashboard: 'หน้าหลัก',
      students: 'นักเรียน',
      teachers: 'ครูผู้สอน',
      courses: 'คอร์สเรียน',
      classes: 'ตารางเรียน',
      reports: 'รายงาน',
      billing: 'การเงิน',
      settings: 'การตั้งค่า'
    }
  },
  
  en: {
    // User roles
    roles: {
      student: 'Student',
      teacher: 'Teacher',
      admin: 'Administrator',
      owner: 'Owner'
    },
    
    // Course types
    courseTypes: {
      conversation_kids: 'Kids Conversation',
      conversation_adults: 'Adults Conversation',
      english_4skills: 'English 4 Skills',
      ielts_prep: 'IELTS Preparation',
      toeic_prep: 'TOEIC Preparation',
      toefl_prep: 'TOEFL Preparation',
      chinese_conversation: 'Chinese Conversation',
      chinese_4skills: 'Chinese 4 Skills'
    },
    
    // Class status
    classStatus: {
      scheduled: 'Scheduled',
      confirmed: 'Confirmed',
      in_progress: 'In Progress',
      completed: 'Completed',
      cancelled: 'Cancelled'
    },
    
    // Attendance status
    attendanceStatus: {
      present: 'Present',
      absent: 'Absent',
      excused: 'Excused',
      late: 'Late'
    },
    
    // Leave request status
    leaveStatus: {
      pending: 'Pending',
      approved: 'Approved',
      rejected: 'Rejected'
    },
    
    // Payment status
    paymentStatus: {
      pending: 'Pending',
      paid: 'Paid',
      overdue: 'Overdue',
      cancelled: 'Cancelled'
    },
    
    // Common messages
    messages: {
      success: 'Success',
      error: 'Error occurred',
      loading: 'Loading...',
      noData: 'No data available',
      confirmDelete: 'Are you sure you want to delete this?',
      saved: 'Data saved successfully',
      updated: 'Data updated successfully',
      deleted: 'Data deleted successfully'
    },
    
    // Navigation
    navigation: {
      dashboard: 'Dashboard',
      students: 'Students',
      teachers: 'Teachers',
      courses: 'Courses',
      classes: 'Classes',
      reports: 'Reports',
      billing: 'Billing',
      settings: 'Settings'
    }
  }
};

// Helper functions
const getTranslation = (key, language = defaultLanguage, params = {}) => {
  const keys = key.split('.');
  let translation = translations[language];
  
  for (const k of keys) {
    if (translation && typeof translation === 'object') {
      translation = translation[k];
    } else {
      // Fallback to English if Thai translation not found
      translation = translations['en'];
      for (const k2 of keys) {
        if (translation && typeof translation === 'object') {
          translation = translation[k2];
        } else {
          return key; // Return key if translation not found
        }
      }
      break;
    }
  }
  
  if (typeof translation === 'string') {
    // Replace parameters in translation
    return translation.replace(/\{\{(\w+)\}\}/g, (match, param) => {
      return params[param] || match;
    });
  }
  
  return key;
};

const getBranchTimezone = (branchCode) => {
  return branchTimezones[branchCode] || 'Asia/Bangkok';
};

const formatDate = (date /* , language = defaultLanguage */) => {
  // You would implement actual date formatting here based on language
  // const format = languages[language].dateFormat;
  return date; // Placeholder - implement with date library
};

const formatTime = (time /* , language = defaultLanguage */) => {
  // You would implement actual time formatting here based on language
  // const format = languages[language].timeFormat;
  return time; // Placeholder - implement with date library
};

module.exports = {
  languages,
  defaultLanguage,
  supportedLanguages,
  branchTimezones,
  translations,
  getTranslation,
  getBranchTimezone,
  formatDate,
  formatTime
};