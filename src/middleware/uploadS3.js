// src/middleware/uploadS3.js
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const crypto = require('crypto');
const { s3Key, putToS3 } = require('../utils/s3');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024, files: 20 }
});

// ตรวจว่าเป็นรูปไหม
function isImage(mime) {
  return /^image\//i.test(mime);
}

// อัปโหลดไฟล์ทั่วไป (non-image) เป็น original เดียว
async function processFile(buffer, originalName, mime, prefix) {
  const ext = (path.extname(originalName) || '').toLowerCase();
  const key = s3Key(prefix, ext);
  await putToS3(key, buffer, mime || 'application/octet-stream');
  return {
    groupId: crypto.randomUUID(),
    variants: [
      { variant: 'original', key, mime: mime || 'application/octet-stream', size: buffer.length }
    ],
    originalName: originalName
  };
}

// อัปโหลดไฟล์รูป: original + webp + thumb
async function processImage(buffer, originalName, mime, prefix) {
  const groupId = crypto.randomUUID();

  // original: ใช้ mimetype เดิม (ถ้าไม่รู้ ให้ default เป็น image/jpeg)
  const ext = (path.extname(originalName) || '').toLowerCase() || '.jpg';
  const origBuf = await sharp(buffer).withMetadata().toBuffer();
  const origKey = s3Key(prefix, ext || '.jpg');
  const origType = mime && mime.startsWith('image/') ? mime : (ext === '.png' ? 'image/png' : 'image/jpeg');
  await putToS3(origKey, origBuf, origType);

  // webp
  const webpBuf = await sharp(buffer).webp({ quality: 80 }).toBuffer();
  const webpKey = s3Key(prefix, '.webp');
  await putToS3(webpKey, webpBuf, 'image/webp');

  // thumb (512w)
  const thumbBuf = await sharp(buffer).resize({ width: 512 }).webp({ quality: 75 }).toBuffer();
  const thumbKey = s3Key(prefix, '.webp');
  await putToS3(thumbKey, thumbBuf, 'image/webp');

  return {
    groupId,
    variants: [
      { variant: 'original', key: origKey, mime: origType, size: origBuf.length },
      { variant: 'webp',     key: webpKey,  mime: 'image/webp', size: webpBuf.length },
      { variant: 'thumb',    key: thumbKey, mime: 'image/webp', size: thumbBuf.length },
    ],
    originalName
  };
}

/**
 * ตัวช่วยรวม: ตัดสินใจจาก mimetype แล้วเรียก process ที่เหมาะ
 * @returns { groupId, variants[], originalName }
 */
async function processAny(file, prefix) {
  if (!file || !file.buffer) throw new Error('Invalid file');
  if (isImage(file.mimetype)) {
    return processImage(file.buffer, file.originalname, file.mimetype, prefix);
  }
  return processFile(file.buffer, file.originalname, file.mimetype, `${prefix}/attachments`);
}

module.exports = { upload, processImage, processFile, processAny };
