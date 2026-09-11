import { body, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';

// Validation error handler
export const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            error: 'Validation failed',
            details: errors.array().map(err => ({
                field: err.type === 'field' ? err.path : 'unknown',
                message: err.msg
            }))
        });
    }
    next();
};

// Registration validation rules
export const validateRegister = [
    body('email')
        .isEmail()
        .withMessage('Invalid email address')
        .normalizeEmail()
        .trim(),
    body('password')
        .isLength({ min: 6, max: 128 })
        .withMessage('Password must be between 6 and 128 characters')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
    body('username')
        .optional()
        .isLength({ min: 2, max: 18 })
        .withMessage('Username must be between 2 and 18 characters')
        .matches(/^[\u4e00-\u9fa5a-zA-Z0-9_-]+$/)
        .withMessage('Username can only contain Chinese characters, letters, numbers, underscores, and hyphens')
        .trim(),
    body('inviteCode')
        .notEmpty()
        .withMessage('Invite code is required')
        .isLength({ min: 6, max: 20 })
        .withMessage('Invalid invite code format')
        .trim(),
    handleValidationErrors
];

// Login validation rules
export const validateLogin = [
    body('email')
        .isEmail()
        .withMessage('Invalid email address')
        .normalizeEmail()
        .trim(),
    body('password')
        .notEmpty()
        .withMessage('Password is required')
        .isLength({ max: 128 })
        .withMessage('Password too long'),
    handleValidationErrors
];

// Post creation validation
export const validatePost = [
    body('content')
        .notEmpty()
        .withMessage('Content is required')
        .isLength({ min: 1, max: 5000 })
        .withMessage('Content must be between 1 and 5000 characters')
        .trim(),
    body('imageUrls')
        .optional()
        .isArray({ max: 9 })
        .withMessage('Maximum 9 images allowed'),
    handleValidationErrors
];

// Comment validation
export const validateComment = [
    body('content')
        .notEmpty()
        .withMessage('Comment content is required')
        .isLength({ min: 1, max: 1000 })
        .withMessage('Comment must be between 1 and 1000 characters')
        .trim(),
    handleValidationErrors
];

// Profile update validation
export const validateProfileUpdate = [
    body('nickname')
        .optional()
        .isLength({ min: 2, max: 30 })
        .withMessage('Nickname must be between 2 and 30 characters')
        .trim(),
    body('bio')
        .optional()
        .isLength({ max: 500 })
        .withMessage('Bio must be less than 500 characters')
        .trim(),
    body('avatarUrl')
        .optional()
        .isURL()
        .withMessage('Invalid avatar URL'),
    body('coverUrl')
        .optional()
        .isURL()
        .withMessage('Invalid cover URL'),
    handleValidationErrors
];
