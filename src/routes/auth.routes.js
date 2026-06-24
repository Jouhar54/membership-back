import express from 'express';
import { register, login, logout, refreshToken, getMe } from '../controllers/auth.controller.js';
import { protect } from '../middlewares/auth.middleware.js';
import { validate, registerValidation, loginValidation } from '../utils/validators.js';

const router = express.Router();

router.post('/register', registerValidation, validate, register);
router.post('/login', loginValidation, validate, login);
router.post('/logout', logout);
router.post('/refresh-token', refreshToken);
router.get('/me', protect, getMe);

export default router;
