import { body, validationResult } from 'express-validator';
import { errorResponse } from './response.js';

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return errorResponse(res, 400, 'Validation Error', errors.array());
  }
  next();
};

const registerValidation = [
  body('fullName').notEmpty().withMessage('Full name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('phone').custom((val) => {
    const cleaned = (val || '').replace(/[\s\-()]/g, '');
    if (!/^\+?[1-9]\d{6,14}$/.test(cleaned)) {
      throw new Error('Valid phone number is required');
    }
    return true;
  }),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
];

const loginValidation = [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

const batchValidation = [
  body('batchName').notEmpty().withMessage('Batch name is required'),
];

export { 
  validate,
  registerValidation,
  loginValidation,
  batchValidation,
 };
