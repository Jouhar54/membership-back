import { body, param, validationResult } from 'express-validator';
import { errorResponse } from './response.js';

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return errorResponse(res, 400, 'Validation Error', errors.array());
  }
  next();
};

const createApplicationValidation = [
  body('fullName').trim().notEmpty().withMessage('Full name is required'),
  body('email').trim().isEmail().withMessage('Valid email is required'),
  body('phone').trim().matches(/^[6-9]\d{9}$/).withMessage('Valid 10-digit Indian phone number is required'),
  body('batchId').isMongoId().withMessage('Valid batch ID is required'),
  body('district').optional().trim(),
  body('fatherName').optional().trim(),
  body('dob').optional().trim(),
  body('bloodGroup').optional().trim(),
  body('houseName').optional().trim(),
  body('place').optional().trim(),
  body('post').optional().trim(),
  body('pin').optional().trim(),
  body('whatsapp').optional().trim(),
  body('state').optional().trim(),
  body('panchayath').optional().trim(),
  body('mandalam').optional().trim(),
  body('thaluk').optional().trim(),
  body('jobType').optional().trim(),
  body('jobTypeOther').optional().trim(),
  body('declarationAccepted').optional(),
  body('declarationDate').optional().trim(),
  validate,
];

const checkStatusValidation = [
  body().custom((value, { req }) => {
    const { email, phone, identifier } = req.body;
    if (!email && !phone && !identifier) {
      throw new Error('Please provide email or phone number to check status');
    }
    return true;
  }),
  validate,
];

const getPosterValidation = [
  param('id').isMongoId().withMessage('Valid application ID is required'),
  validate,
];

export {
  createApplicationValidation,
  checkStatusValidation,
  getPosterValidation,
};
