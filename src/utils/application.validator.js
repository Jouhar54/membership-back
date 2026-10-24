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
  body('phone')
    .optional()
    .trim(),
  body('phone_number')
    .optional()
    .trim(),
  body().custom((value, { req }) => {
    const raw = req.body.phone || req.body.phone_number;
    if (!raw || !String(raw).trim()) {
      throw new Error('Phone number is required');
    }
    const cleaned = String(raw).replace(/[\s\-()]/g, '');
    if (!/^\+?[1-9]\d{6,14}$/.test(cleaned)) {
      throw new Error('Valid phone number is required');
    }
    req.body.phone = cleaned;
    return true;
  }),
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
  body('anwariCertificateNo').optional().trim(),
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


const updateApplicationValidation = [
  param('id').isMongoId().withMessage('Valid application ID is required'),
  body('fullName').optional().trim().notEmpty().withMessage('Full name cannot be empty'),
  body('email').optional().trim().isEmail().withMessage('Valid email is required'),
  body('phone').optional().trim(),
  body('phone_number').optional().trim(),
  body().custom((value, { req }) => {
    const raw = req.body.phone || req.body.phone_number;
    if (raw) {
      const cleaned = String(raw).replace(/[\s\-()]/g, '');
      if (!/^\+?[1-9]\d{6,14}$/.test(cleaned)) {
        throw new Error('Valid phone number is required');
      }
      req.body.phone = cleaned;
    }
    return true;
  }),
  body('batchId').optional().isMongoId().withMessage('Valid batch ID is required'),
  body('batch').optional().isMongoId().withMessage('Valid batch ID is required'),
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
  body('anwariCertificateNo').optional().trim(),
  body('profilePhoto').optional().trim(),
  body('paymentProof').optional().trim(),
  body('paymentScreenshot').optional().trim(),
  validate,
];

export {
  createApplicationValidation,
  updateApplicationValidation,
  checkStatusValidation,
  getPosterValidation,
};
