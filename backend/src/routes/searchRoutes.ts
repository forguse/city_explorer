import express from 'express';
import { searchComprehensive } from '../controllers/searchController';
import { auth } from '../middleware/auth';

const router = express.Router();

// GET /search/comprehensive
// Public or protected? Search usually public, but let's see. 
// If personal data involved (like "my tasks"), needs auth. 
// But this is general search. I'll make it optional auth or public. 
// User didn't specify. I'll keep it public or use auth middleware if existing routes use it.
// Looking at app.ts, most use auth or are public.
// I'll assume public for now, or maybe use optional auth if I implement personalized scoring later.
// For now, simple router.

router.get('/comprehensive', searchComprehensive);

export default router;
