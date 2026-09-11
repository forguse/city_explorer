import express from 'express';
import { register, login } from '../controllers/authController';
import { loginLimiter, authGeneralLimiter } from '../middleware/rateLimiter';
import { validateRegister, validateLogin } from '../middleware/validators';

const router = express.Router();

// Apply strict limiter only to login (5 failed attempts per 15 min)
router.post('/login', loginLimiter, validateLogin, login);

// Apply relaxed limiter to register (30 attempts per 15 min)
router.post('/register', authGeneralLimiter, validateRegister, register);

export default router;
