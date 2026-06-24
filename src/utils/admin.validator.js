import { body, validationResult } from 'express-validator';
import { errorResponse } from './response.js';

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return errorResponse(res, 400, 'Validation Error', errors.array());
  }
  next();
};

const createBatchAdminValidation = [
  body('fullName').trim().notEmpty().withMessage('Full name is required'),
  body('email').trim().isEmail().withMessage('Valid email is required'),
  body('phone').trim().matches(/^[6-9]\d{9}$/).withMessage('Valid 10-digit phone number is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  body('batchId').isMongoId().withMessage('Valid batch ID is required'),
  validate,
];

const updateBatchAdminValidation = [
  body('fullName').optional().trim().notEmpty().withMessage('Full name cannot be empty'),
  body('email').optional().trim().isEmail().withMessage('Valid email is required'),
  body('phone').optional().trim().matches(/^[6-9]\d{9}$/).withMessage('Valid 10-digit phone number is required'),
  body('batchId').optional().isMongoId().withMessage('Valid batch ID is required'),
  validate,
];

export {
  createBatchAdminValidation,
  updateBatchAdminValidation,
};
