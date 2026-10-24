import express from 'express';
import * as applicationController from '../controllers/application.controller.js';
import upload from '../middlewares/upload.middleware.js';
import { optionalProtect } from '../middlewares/auth.middleware.js';
import { createApplicationValidation, checkStatusValidation, getPosterValidation, updateApplicationValidation } from '../utils/application.validator.js';

const router = express.Router();

router.post(
  '/',
  upload.any(),
  createApplicationValidation,
  applicationController.createApplication
);
router.patch(
  '/:id',
  optionalProtect,
  upload.any(),
  updateApplicationValidation,
  applicationController.updateApplication
);
router.post('/status', checkStatusValidation, applicationController.checkStatus);
router.get('/poster/:id', getPosterValidation, applicationController.getPoster);
router.get('/:id', getPosterValidation, applicationController.getApplicationById);

export default router;
