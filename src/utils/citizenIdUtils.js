const crypto = require('crypto');

/**
 * Validate Thai Citizen ID using the standard algorithm
 * @param {string} citizenId - 13-digit Thai citizen ID
 * @returns {boolean} - true if valid, false if invalid
 */
function validateThaiCitizenId(citizenId) {
  // Remove any non-digit characters
  const cleanId = citizenId.toString().replace(/\D/g, '');
  
  // Must be exactly 13 digits
  if (cleanId.length !== 13) {
    return false;
  }
  
  // Convert to array of numbers
  const digits = cleanId.split('').map(Number);
  
  // Calculate checksum using Thai citizen ID algorithm
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += digits[i] * (13 - i);
  }
  
  const remainder = sum % 11;
  let checkDigit;
  
  if (remainder < 2) {
    checkDigit = 1 - remainder;
  } else {
    checkDigit = 11 - remainder;
  }
  
  // Compare calculated check digit with the last digit
  return checkDigit === digits[12];
}

/**
 * Encrypt Thai Citizen ID using AES encryption
 * @param {string} citizenId - Plain text citizen ID
 * @returns {string} - Encrypted citizen ID (hex format)
 */
function encryptCitizenId(citizenId) {
  const secretKey = process.env.CITIZEN_ID_SECRET || 'EKLS_SECRET_KEY_FOR_CITIZEN_ID_2024';
  const key = crypto.createHash('sha256').update(secretKey).digest();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(citizenId, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

/**
 * Decrypt Thai Citizen ID 
 * @param {string} encryptedCitizenId - Encrypted citizen ID (hex format)
 * @returns {string} - Plain text citizen ID
 */
function decryptCitizenId(encryptedCitizenId) {
  try {
    const secretKey = process.env.CITIZEN_ID_SECRET;
    const key = crypto.createHash('sha256').update(secretKey).digest();
    const [ivHex, encryptedText] = encryptedCitizenId.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    throw new Error('Failed to decrypt citizen ID');
  }
}

/**
 * Generate username from phone number
 * @param {string} phone - Phone number
 * @returns {string} - Username (phone number)
 */
function generateUsernameFromPhone(phone) {
  // Remove all non-digit characters
  const cleanPhone = phone.replace(/\D/g, '');
  
  // Return as username (could add prefix if needed)
  return cleanPhone;
}

/**
 * Calculate age from date of birth
 * @param {string} dateOfBirth - Date in YYYY-MM-DD format
 * @returns {number} - Age in years
 */
function calculateAge(dateOfBirth) {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
}

/**
 * Determine age group based on grade level and age
 * @param {string} currentEducation - Current education level
 * @param {number} age - Age in years
 * @returns {string} - Age group: 'kids', 'students', 'adults'
 */
function determineAgeGroup(currentEducation, age) {
  // Based on current education level
  const kidsGrades = ['noCurrentEducation', 'kindergarten', 'grade1', 'grade2', 'grade3', 'grade4', 'grade5', 'grade6'];
  const studentGrades = ['grade7', 'grade8', 'grade9', 'grade10', 'grade11', 'grade12'];
  
  if (kidsGrades.includes(currentEducation)) {
    return 'kids';
  } else if (studentGrades.includes(currentEducation)) {
    return 'students';
  } else if (currentEducation === 'uniandabove' || age >= 17) {
    return 'adults';
  }
  
  // Fallback to age-based determination
  if (age <= 12) return 'kids';
  if (age <= 17) return 'students';
  return 'adults';
}

module.exports = {
  validateThaiCitizenId,
  encryptCitizenId,
  decryptCitizenId,
  generateUsernameFromPhone,
  calculateAge,
  determineAgeGroup
};
