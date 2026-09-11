import rateLimit from 'express-rate-limit';

// Helper to skip OPTIONS requests (CORS preflight)
const skipOptions = (req: any) => req.method === 'OPTIONS';

// Global Limiter: Anti-DDoS / Scanners
// 1000 requests per 15 minutes per IP
export const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 1000,
    standardHeaders: true,
    legacyHeaders: false,
    skip: skipOptions,
    skipFailedRequests: false,
    validate: { trustProxy: false }, // Disable validation since we handle proxy correctly
    message: { error: 'Too many requests from this IP, please try again after 15 minutes' }
});

// Login Limiter: Brute-force protection for login only
// 5 attempts per 15 minutes (Strict)
// skipSuccessfulRequests: true means successful logins don't count towards the limit
export const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    standardHeaders: true,
    legacyHeaders: false,
    skip: skipOptions,
    skipSuccessfulRequests: true,  // Only count failed attempts
    skipFailedRequests: false,
    validate: { trustProxy: false }, // Disable validation since we handle proxy correctly
    message: { error: 'Too many login attempts, please try again after 15 minutes' }
});

// Auth General Limiter: For register, refresh token, etc.
// 30 attempts per 15 minutes (More relaxed)
export const authGeneralLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 30,
    standardHeaders: true,
    legacyHeaders: false,
    skip: skipOptions,
    skipFailedRequests: false,
    validate: { trustProxy: false }, // Disable validation since we handle proxy correctly
    message: { error: 'Too many authentication requests, please try again later' }
});

// Creation Limiter: Anti-Spam (Posts, Tasks, Clubs)
// 10 requests per 1 minute
export const creationLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,
    skip: skipOptions,
    skipFailedRequests: false,
    validate: { trustProxy: false }, // Disable validation since we handle proxy correctly
    message: { error: 'You are posting too fast, please slow down' }
});

// Upload Limiter: Resource protection
// 10 uploads per 1 minute
export const uploadLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,
    skip: skipOptions,
    skipFailedRequests: false,
    validate: { trustProxy: false }, // Disable validation since we handle proxy correctly
    message: { error: 'Too many uploads, please wait a minute' }
});
