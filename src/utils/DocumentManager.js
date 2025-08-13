/**
 * Document Management utility for student documents and file uploads
 * Handles document validation, upload, and management
 */

const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');
const { 
  uploadPaths, 
  studentDocumentTypes, 
  validateStudentDocument,
  fileNaming,
  getFileCategory
} = require('../config/upload');

class DocumentManager {
  constructor() {
    this.uploadPaths = uploadPaths;
    this.documentTypes = studentDocumentTypes;
  }

  // Ensure upload directories exist
  async ensureDirectoriesExist() {
    try {
      for (const uploadPath of Object.values(this.uploadPaths)) {
        await fs.mkdir(uploadPath, { recursive: true });
      }
    } catch (error) {
      throw new Error(`Error creating upload directories: ${error.message}`);
    }
  }

  // Validate and process student document upload
  async validateStudentDocument(file, documentType) {
    try {
      // Validate document type
      if (!this.documentTypes[documentType]) {
        return { valid: false, error: 'Invalid document type' };
      }

      // Validate file
      const validation = validateStudentDocument(file, documentType);
      if (!validation.valid) {
        return validation;
      }

      return { valid: true };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }

  // Save student document
  async saveStudentDocument(file, studentId, documentType, uploadedBy, registrationId = null) {
    try {
      // Validate first
      const validation = await this.validateStudentDocument(file, documentType);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      // Generate filename
      const filename = fileNaming.studentDocument(studentId, documentType, file.originalname);
      const filePath = path.join(this.uploadPaths.studentDocuments, filename);

      // Ensure directory exists
      await fs.mkdir(path.dirname(filePath), { recursive: true });

      // Move file to destination
      await fs.copyFile(file.path, filePath);

      // Clean up temp file
      await fs.unlink(file.path).catch(() => {}); // Ignore errors

      // Prepare document record
      const documentRecord = {
        student_id: studentId,
        registration_id: registrationId,
        document_type: documentType,
        original_name: file.originalname,
        file_path: filePath,
        file_size: file.size.toString(),
        mime_type: file.mimetype,
        uploaded_at: new Date(),
        uploaded_by: uploadedBy
      };

      return {
        success: true,
        document: documentRecord,
        filename
      };
    } catch (error) {
      throw new Error(`Error saving student document: ${error.message}`);
    }
  }

  // Save teaching report attachment
  async saveTeachingReportAttachment(file, teacherId, classId, _uploadedBy) {
    try {
      // Generate filename
      const filename = fileNaming.teachingReport(teacherId, classId, file.originalname);
      const filePath = path.join(this.uploadPaths.teachingReports, filename);

      // Ensure directory exists
      await fs.mkdir(path.dirname(filePath), { recursive: true });

      // Move file to destination
      await fs.copyFile(file.path, filePath);

      // Clean up temp file
      await fs.unlink(file.path).catch(() => {}); // Ignore errors

      return {
        success: true,
        filename,
        filePath,
        originalName: file.originalname,
        size: file.size,
        mimeType: file.mimetype
      };
    } catch (error) {
      throw new Error(`Error saving teaching report attachment: ${error.message}`);
    }
  }

  // Save avatar image
  async saveAvatar(file, userId) {
    try {
      // Validate image file
      const category = getFileCategory(file.mimetype);
      if (category !== 'image') {
        throw new Error('Avatar must be an image file');
      }

      // Generate filename
      const filename = fileNaming.avatar(userId, file.originalname);
      const filePath = path.join(this.uploadPaths.avatars, filename);

      // Ensure directory exists
      await fs.mkdir(path.dirname(filePath), { recursive: true });

      // Move file to destination
      await fs.copyFile(file.path, filePath);

      // Clean up temp file
      await fs.unlink(file.path).catch(() => {}); // Ignore errors

      return {
        success: true,
        filename,
        filePath,
        url: `/uploads/avatars/${filename}`
      };
    } catch (error) {
      throw new Error(`Error saving avatar: ${error.message}`);
    }
  }

  // Save payment slip
  async savePaymentSlip(file, studentId, billId) {
    try {
      // Validate image file
      const category = getFileCategory(file.mimetype);
      if (category !== 'image') {
        throw new Error('Payment slip must be an image file');
      }

      // Generate filename
      const filename = fileNaming.paymentSlip(studentId, billId, file.originalname);
      const filePath = path.join(this.uploadPaths.paymentSlips, filename);

      // Ensure directory exists
      await fs.mkdir(path.dirname(filePath), { recursive: true });

      // Move file to destination
      await fs.copyFile(file.path, filePath);

      // Clean up temp file
      await fs.unlink(file.path).catch(() => {}); // Ignore errors

      return {
        success: true,
        filename,
        filePath,
        originalName: file.originalname,
        size: file.size,
        mimeType: file.mimetype
      };
    } catch (error) {
      throw new Error(`Error saving payment slip: ${error.message}`);
    }
  }

  // Save e-book file
  async saveEbook(file) {
    try {
      // Validate e-book file
      const category = getFileCategory(file.mimetype);
      if (category !== 'ebook' && category !== 'document') {
        throw new Error('E-book must be a PDF, EPUB, or document file');
      }

      // Generate filename
      const filename = fileNaming.ebook(file.originalname);
      const filePath = path.join(this.uploadPaths.ebooks, filename);

      // Ensure directory exists
      await fs.mkdir(path.dirname(filePath), { recursive: true });

      // Move file to destination
      await fs.copyFile(file.path, filePath);

      // Clean up temp file
      await fs.unlink(file.path).catch(() => {}); // Ignore errors

      return {
        success: true,
        filename,
        filePath,
        originalName: file.originalname,
        size: file.size,
        mimeType: file.mimetype
      };
    } catch (error) {
      throw new Error(`Error saving e-book: ${error.message}`);
    }
  }

  // Generate file hash for integrity checking
  async generateFileHash(filePath) {
    try {
      const fileBuffer = await fs.readFile(filePath);
      return crypto.createHash('sha256').update(fileBuffer).digest('hex');
    } catch (error) {
      throw new Error(`Error generating file hash: ${error.message}`);
    }
  }

  // Delete file
  async deleteFile(filePath) {
    try {
      await fs.unlink(filePath);
      return true;
    } catch (error) {
      // File might not exist, which is okay
      return false;
    }
  }

  // Get file info
  async getFileInfo(filePath) {
    try {
      const stats = await fs.stat(filePath);
      const hash = await this.generateFileHash(filePath);
      
      return {
        exists: true,
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        hash
      };
    } catch (error) {
      return {
        exists: false,
        error: error.message
      };
    }
  }

  // Clean up temp files
  async cleanupTempFiles(maxAge = 24 * 60 * 60 * 1000) { // 24 hours
    try {
      const tempDir = this.uploadPaths.temp;
      const files = await fs.readdir(tempDir);
      let cleanedCount = 0;

      for (const file of files) {
        const filePath = path.join(tempDir, file);
        const stats = await fs.stat(filePath);
        const age = Date.now() - stats.mtime.getTime();

        if (age > maxAge) {
          await fs.unlink(filePath);
          cleanedCount++;
        }
      }

      return cleanedCount;
    } catch (error) {
      throw new Error(`Error cleaning up temp files: ${error.message}`);
    }
  }

  // Get storage usage statistics
  async getStorageStats() {
    try {
      const stats = {};

      for (const [type, uploadPath] of Object.entries(this.uploadPaths)) {
        try {
          const files = await fs.readdir(uploadPath);
          let totalSize = 0;
          let fileCount = 0;

          for (const file of files) {
            const filePath = path.join(uploadPath, file);
            const fileStat = await fs.stat(filePath);
            if (fileStat.isFile()) {
              totalSize += fileStat.size;
              fileCount++;
            }
          }

          stats[type] = {
            fileCount,
            totalSize,
            totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2)
          };
        } catch (error) {
          stats[type] = {
            fileCount: 0,
            totalSize: 0,
            totalSizeMB: '0.00',
            error: error.message
          };
        }
      }

      return stats;
    } catch (error) {
      throw new Error(`Error getting storage statistics: ${error.message}`);
    }
  }

  // Verify document integrity
  async verifyDocumentIntegrity(knex, documentId) {
    try {
      const document = await knex('student_documents')
        .where('id', documentId)
        .first();

      if (!document) {
        return { valid: false, error: 'Document not found' };
      }

      const fileInfo = await this.getFileInfo(document.file_path);
      if (!fileInfo.exists) {
        return { valid: false, error: 'File not found on disk' };
      }

      return {
        valid: true,
        document,
        fileInfo
      };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }
}

module.exports = DocumentManager;