/**
 * File upload and document management configuration
 * Handles student documents, teaching reports attachments, and e-book files
 */

const path = require('path');

// Upload directories
const uploadPaths = {
  studentDocuments: 'uploads/documents/students',
  teachingReports: 'uploads/documents/reports',
  ebooks: 'uploads/ebooks',
  avatars: 'uploads/avatars',
  paymentSlips: 'uploads/payment-slips',
  temp: 'uploads/temp'
};

// File size limits (in bytes)
const fileSizeLimits = {
  image: 5 * 1024 * 1024, // 5MB for images
  document: 10 * 1024 * 1024, // 10MB for documents
  ebook: 50 * 1024 * 1024, // 50MB for e-books
  video: 100 * 1024 * 1024 // 100MB for video files
};

// Allowed file types
const allowedMimeTypes = {
  images: [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp'
  ],
  documents: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain'
  ],
  ebooks: [
    'application/pdf',
    'application/epub+zip',
    'application/x-mobipocket-ebook',
    'text/plain'
  ],
  videos: [
    'video/mp4',
    'video/mpeg',
    'video/quicktime',
    'video/x-msvideo'
  ]
};

// Document types for student registration
const studentDocumentTypes = {
  id_card: {
    name: 'ID Card',
    nameTh: 'บัตรประชาชน',
    required: true,
    allowedTypes: allowedMimeTypes.images,
    maxSize: fileSizeLimits.image
  },
  contract: {
    name: 'Contract',
    nameTh: 'สัญญา',
    required: true,
    allowedTypes: allowedMimeTypes.documents,
    maxSize: fileSizeLimits.document
  },
  photo: {
    name: 'Photo',
    nameTh: 'รูปถ่าย',
    required: true,
    allowedTypes: allowedMimeTypes.images,
    maxSize: fileSizeLimits.image
  },
  certificate: {
    name: 'Certificate',
    nameTh: 'ใบประกาศนียบัตร',
    required: false,
    allowedTypes: [...allowedMimeTypes.images, ...allowedMimeTypes.documents],
    maxSize: fileSizeLimits.document
  },
  test_result: {
    name: 'Test Result',
    nameTh: 'ผลการทดสอบ',
    required: false,
    allowedTypes: [...allowedMimeTypes.images, ...allowedMimeTypes.documents],
    maxSize: fileSizeLimits.document
  },
  payment_slip: {
    name: 'Payment Slip',
    nameTh: 'สลิปการชำระเงิน',
    required: false,
    allowedTypes: allowedMimeTypes.images,
    maxSize: fileSizeLimits.image
  },
  other: {
    name: 'Other',
    nameTh: 'เอกสารอื่นๆ',
    required: false,
    allowedTypes: [...allowedMimeTypes.images, ...allowedMimeTypes.documents],
    maxSize: fileSizeLimits.document
  }
};

// QR Code configuration
const qrCodeConfig = {
  size: 200,
  margin: 2,
  color: {
    dark: '#000000',
    light: '#FFFFFF'
  },
  format: 'png',
  expirationHours: 24, // QR codes expire after 24 hours
  prefix: 'EKLS' // Prefix for QR codes
};

// File naming conventions
const fileNaming = {
  studentDocument: (studentId, documentType, originalName) => {
    const timestamp = Date.now();
    const extension = path.extname(originalName);
    return `student_${studentId}_${documentType}_${timestamp}${extension}`;
  },
  
  teachingReport: (teacherId, classId, originalName) => {
    const timestamp = Date.now();
    const extension = path.extname(originalName);
    return `report_${teacherId}_class_${classId}_${timestamp}${extension}`;
  },
  
  avatar: (userId, originalName) => {
    const timestamp = Date.now();
    const extension = path.extname(originalName);
    return `avatar_${userId}_${timestamp}${extension}`;
  },
  
  paymentSlip: (studentId, billId, originalName) => {
    const timestamp = Date.now();
    const extension = path.extname(originalName);
    return `payment_${studentId}_bill_${billId}_${timestamp}${extension}`;
  },
  
  ebook: (originalName) => {
    const timestamp = Date.now();
    const nameWithoutExt = path.parse(originalName).name.replace(/[^a-zA-Z0-9]/g, '_');
    const extension = path.extname(originalName);
    return `ebook_${nameWithoutExt}_${timestamp}${extension}`;
  },
  
  qrCode: (classId, sessionDate) => {
    const dateString = sessionDate.toISOString().split('T')[0];
    return `qr_class_${classId}_${dateString}.png`;
  }
};

// File validation functions
const validateFileType = (file, allowedTypes) => {
  return allowedTypes.includes(file.mimetype);
};

const validateFileSize = (file, maxSize) => {
  return file.size <= maxSize;
};

const validateStudentDocument = (file, documentType) => {
  const config = studentDocumentTypes[documentType];
  if (!config) {
    return { valid: false, error: 'Invalid document type' };
  }
  
  if (!validateFileType(file, config.allowedTypes)) {
    return { valid: false, error: 'Invalid file type' };
  }
  
  if (!validateFileSize(file, config.maxSize)) {
    return { valid: false, error: 'File size too large' };
  }
  
  return { valid: true };
};

// Helper function to get file type category
const getFileCategory = (mimetype) => {
  if (allowedMimeTypes.images.includes(mimetype)) return 'image';
  if (allowedMimeTypes.documents.includes(mimetype)) return 'document';
  if (allowedMimeTypes.ebooks.includes(mimetype)) return 'ebook';
  if (allowedMimeTypes.videos.includes(mimetype)) return 'video';
  return 'unknown';
};

// Cleanup configuration
const cleanupConfig = {
  tempFiles: {
    maxAge: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
    cleanupInterval: 6 * 60 * 60 * 1000 // Clean every 6 hours
  },
  expiredQrCodes: {
    maxAge: qrCodeConfig.expirationHours * 60 * 60 * 1000,
    cleanupInterval: 12 * 60 * 60 * 1000 // Clean every 12 hours
  }
};

module.exports = {
  uploadPaths,
  fileSizeLimits,
  allowedMimeTypes,
  studentDocumentTypes,
  qrCodeConfig,
  fileNaming,
  validateFileType,
  validateFileSize,
  validateStudentDocument,
  getFileCategory,
  cleanupConfig
};