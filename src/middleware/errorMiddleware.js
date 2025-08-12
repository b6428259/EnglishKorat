const logger = require('../utils/logger');
const { AppError } = require('../utils/errorUtils');

const notFound = (req, res, next) => {
  const error = new AppError(`Not found - ${req.originalUrl}`, 404);
  next(error);
};

const errorHandler = (error, req, res, _next) => {
  let statusCode = error.statusCode || 500;
  let message = error.message || 'Internal Server Error';

  // Log error
  logger.error(`${statusCode} - ${message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);

  // Mongoose bad ObjectId
  if (error.name === 'CastError') {
    message = 'Resource not found';
    statusCode = 404;
  }

  // Mongoose duplicate key
  if (error.code === 11000) {
    message = 'Duplicate field value entered';
    statusCode = 400;
  }

  // Mongoose validation error
  if (error.name === 'ValidationError') {
    message = Object.values(error.errors).map(val => val.message).join(', ');
    statusCode = 400;
  }

  // JWT errors
  if (error.name === 'JsonWebTokenError') {
    message = 'Invalid token';
    statusCode = 401;
  }

  if (error.name === 'TokenExpiredError') {
    message = 'Token expired';
    statusCode = 401;
  }

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    }
  });
};

module.exports = {
  notFound,
  errorHandler
};