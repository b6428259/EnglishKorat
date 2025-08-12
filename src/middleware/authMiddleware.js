const jwt = require('jsonwebtoken');
const { db } = require('../config/database');

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Access denied. No token provided.' 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user with role information
    const user = await db('users')
      .select('users.*', 'branches.name as branch_name', 'branches.code as branch_code')
      .leftJoin('branches', 'users.branch_id', 'branches.id')
      .where('users.id', decoded.userId)
      .first();

    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Token is not valid.' 
      });
    }

    if (user.status !== 'active') {
      return res.status(401).json({ 
        success: false, 
        message: 'Account is not active.' 
      });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ 
      success: false, 
      message: 'Token is not valid.' 
    });
  }
};

// Role-based access control middleware
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Access denied. Authentication required.' 
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. Insufficient permissions.' 
      });
    }

    next();
  };
};

// Branch access control - users can only access their branch data (except owners)
const branchAccess = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      success: false, 
      message: 'Access denied. Authentication required.' 
    });
  }

  // Owners can access all branches
  if (req.user.role === 'owner') {
    return next();
  }

  // Add branch filter to query if branch_id is in the request
  if (req.body.branch_id && req.body.branch_id !== req.user.branch_id) {
    return res.status(403).json({ 
      success: false, 
      message: 'Access denied. Cannot access other branch data.' 
    });
  }

  next();
};

module.exports = { authMiddleware, authorize, branchAccess };