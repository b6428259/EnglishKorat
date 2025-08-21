const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../config/database');
const asyncHandler = require('../utils/asyncHandler');

const { createClient } = require('redis');
const redisClient = createClient({
  socket: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT
  },
  password: process.env.REDIS_PASSWORD
});
redisClient.on('error', (err) => {
  console.error('Redis connection error:', err);
});

// Connect to Redis
redisClient.connect().catch(console.error);

// Generate JWT token
const generateToken = (userId, role) => {
  return jwt.sign(
    { userId, role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// @desc    Register a new user
// @route   POST /api/v1/auth/register
// @access  Public (for students) / Admin (for staff)
const register = asyncHandler(async (req, res) => {
  const { 
    username, 
    password, 
    email, 
    phone, 
    line_id, 
    role = 'student', 
    branch_id 
  } = req.body;

  // Check if user already exists
  const existingUser = await db('users')
    .where('username', username)
    .orWhere('email', email)
    .first();

  if (existingUser) {
    return res.status(400).json({
      success: false,
      message: 'User with this username or email already exists'
    });
  }

  // For non-student roles, require admin authorization
  if (role !== 'student' && (!req.user || !['admin', 'owner'].includes(req.user.role))) {
    return res.status(403).json({
      success: false,
      message: 'Only admins can create staff accounts'
    });
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Create user
  const [userId] = await db('users').insert({
    username,
    password: hashedPassword,
    email,
    phone,
    line_id,
    role,
    branch_id: branch_id || (req.user?.branch_id),
    status: 'active'
  });

  // Get created user (without password)
  const user = await db('users')
    .select('id', 'username', 'email', 'phone', 'line_id', 'role', 'branch_id', 'status', 'created_at')
    .where('id', userId)
    .first();

  // Generate token
  const token = generateToken(user.id, user.role);

  res.status(201).json({
    success: true,
    message: 'User registered successfully',
    data: {
      user,
      token
    }
  });
});

// @desc    Login user
// @route   POST /api/v1/auth/login
// @access  Public
const login = asyncHandler(async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({
      success: false,
      message: 'Username and password are required'
    });
  }

  // Get user with password
  const user = await db('users')
    .select('users.*', 'branches.name as branch_name', 'branches.code as branch_code')
    .leftJoin('branches', 'users.branch_id', 'branches.id')
    .where('users.username', username)
    .first();

  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'Invalid credentials'
    });
  }

  // Check if account is active
  if (user.status !== 'active') {
    return res.status(401).json({
      success: false,
      message: 'Account is not active'
    });
  }

  // Check password
  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    return res.status(401).json({
      success: false,
      message: 'Invalid credentials'
    });
  }

  // Remove password from response
  delete user.password;

  // Generate token
  const token = generateToken(user.id, user.role);

  res.json({
    success: true,
    message: 'Login successful',
    data: {
      user,
      token
    }
  });
});

// @desc    Get current user profile
// @route   GET /api/v1/auth/profile
// @access  Private
const getProfile = asyncHandler(async (req, res) => {
  const user = await db('users')
    .select('users.*', 'branches.name as branch_name', 'branches.code as branch_code')
    .leftJoin('branches', 'users.branch_id', 'branches.id')
    .where('users.id', req.user.id)
    .first();

  delete user.password;

  res.json({
    success: true,
    data: { user }
  });
});


// @desc    Update user profile (with avatar upload)
// @route   PUT /api/v1/auth/profile
// @access  Private
const { processAny } = require('../middleware/uploadS3');
const { fileNaming } = require('../config/upload');
const { S3Client, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const s3 = new S3Client({ region: process.env.AWS_REGION });
const S3_BUCKET = process.env.S3_BUCKET;

const updateProfile = asyncHandler(async (req, res) => {
  const { email, phone, line_id } = req.body;
  const userId = req.user.id;
  const updateData = {};
  if (email !== undefined) updateData.email = email;
  if (phone !== undefined) updateData.phone = phone;
  if (line_id !== undefined) updateData.line_id = line_id;

  // Handle avatar upload
  if (req.file) {
    // ลบ avatar เดิมถ้ามี
    const user = await db('users').select('avatar').where('id', userId).first();
    if (user && user.avatar) {
      try {
        await s3.send(new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: user.avatar }));
      } catch (err) {
        // ไม่ต้อง throw error ถ้าลบไม่ได้
      }
    }
    const avatarResult = await processAny(req.file, `avatars/${userId}`);
    updateData.avatar = avatarResult.variants.find(v => v.variant === 'original')?.key;
  }

  if (Object.keys(updateData).length === 0) {
    return res.status(400).json({
      success: false,
      message: 'No data to update'
    });
  }

  await db('users')
    .where('id', userId)
    .update(updateData);

  const user = await db('users')
    .select('users.*', 'branches.name as branch_name', 'branches.code as branch_code')
    .leftJoin('branches', 'users.branch_id', 'branches.id')
    .where('users.id', userId)
    .first();

  delete user.password;

  res.json({
    success: true,
    message: 'Profile updated successfully',
    data: { user }
  });
});

// @desc    Admin update user profile by ID
// @route   PUT /api/v1/auth/profile/:id
// @access  Private (Admin, Owner)
const updateProfileById = asyncHandler(async (req, res) => {
  const { email, phone, line_id, role, branch_id, status } = req.body;
  const userId = req.params.id;
  const updateData = {};
  if (email !== undefined) updateData.email = email;
  if (phone !== undefined) updateData.phone = phone;
  if (line_id !== undefined) updateData.line_id = line_id;
  if (role !== undefined) updateData.role = role;
  if (branch_id !== undefined) updateData.branch_id = branch_id;
  if (status !== undefined) updateData.status = status;

  // Handle avatar upload
  if (req.file) {
    // ลบ avatar เดิมถ้ามี
    const user = await db('users').select('avatar').where('id', userId).first();
    if (user && user.avatar) {
      try {
        await s3.send(new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: user.avatar }));
      } catch (err) {
        // ไม่ต้อง throw error ถ้าลบไม่ได้
      }
    }
    const avatarResult = await processAny(req.file, `avatars/${userId}`);
    updateData.avatar = avatarResult.variants.find(v => v.variant === 'original')?.key;
  }

  if (Object.keys(updateData).length === 0) {
    return res.status(400).json({
      success: false,
      message: 'No data to update'
    });
  }

  await db('users')
    .where('id', userId)
    .update(updateData);

  const user = await db('users')
    .select('users.*', 'branches.name as branch_name', 'branches.code as branch_code')
    .leftJoin('branches', 'users.branch_id', 'branches.id')
    .where('users.id', userId)
    .first();

  delete user.password;

  res.json({
    success: true,
    message: 'Profile updated by admin',
    data: { user }
  });
});

// @desc    Logout user (blacklist token)
// @route   POST /api/v1/auth/logout
// @access  Private
const logout = asyncHandler(async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'No token provided'
      });
    }

    // Decode token to get expiration time
    const decoded = jwt.decode(token);
    if (!decoded || !decoded.exp) {
      return res.status(400).json({
        success: false,
        message: 'Invalid token'
      });
    }

    // Calculate TTL (time to live) for Redis - remaining time until token expires
    const currentTime = Math.floor(Date.now() / 1000);
    const tokenTtl = decoded.exp - currentTime;
    
    // Only blacklist if token is still valid
    if (tokenTtl > 0) {
      // Store token in Redis blacklist with descriptive key
      const blacklistKey = `auth:blacklist:token:${token.slice(-20)}`;  // Use last 20 chars for uniqueness
      await redisClient.setEx(blacklistKey, Math.max(tokenTtl, 86400), JSON.stringify({
        userId: decoded.userId,
        role: decoded.role,
        blacklistedAt: new Date().toISOString(),
        reason: 'user_logout'
      }));

      console.log(`Token blacklisted: ${blacklistKey}, TTL: ${tokenTtl} seconds`);
    }

    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Error during logout'
    });
  }
});

// @desc    Check if token is blacklisted (utility function)
const isTokenBlacklisted = async (token) => {
  try {
    const blacklistKey = `auth:blacklist:token:${token.slice(-20)}`;
    const result = await redisClient.get(blacklistKey);
    return !!result;
  } catch (error) {
    console.error('Error checking token blacklist:', error);
    return false;
  }
};

// @desc    Change password
// @route   PUT /api/v1/auth/change-password
// @access  Private
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  
  if (!currentPassword || !newPassword) {
    return res.status(400).json({
      success: false,
      message: 'Current password and new password are required'
    });
  }

  // Get user with current password
  const user = await db('users')
    .select('password')
    .where('id', req.user.id)
    .first();

  // Verify current password
  const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
  if (!isCurrentPasswordValid) {
    return res.status(400).json({
      success: false,
      message: 'Current password is incorrect'
    });
  }

  // Hash new password
  const hashedNewPassword = await bcrypt.hash(newPassword, 10);

  // Update password
  await db('users')
    .where('id', req.user.id)
    .update({ password: hashedNewPassword });

  res.json({
    success: true,
    message: 'Password changed successfully'
  });
});

module.exports = {
  register,
  login,
  logout,
  getProfile,
  updateProfile,
  updateProfileById,
  changePassword,
  isTokenBlacklisted
};