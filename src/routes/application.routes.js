import express from 'express';
import * as applicationController from '../controllers/application.controller.js';
import upload from '../middlewares/upload.middleware.js';
import { createApplicationValidation, checkStatusValidation, getPosterValidation } from '../utils/application.validator.js';

const router = express.Router();

router.post(
  '/',
  upload.fields([
    { name: 'profilePhoto', maxCount: 1 },
    { name: 'signature', maxCount: 1 },
  ]),
  createApplicationValidation,
  applicationController.createApplication
);
router.post('/status', checkStatusValidation, applicationController.checkStatus);
router.get('/poster/:id', getPosterValidation, applicationController.getPoster);
router.get('/:id', getPosterValidation, applicationController.getApplicationById);

export default router;
