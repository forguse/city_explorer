import express from 'express';
import { parseTrip, importTrip, remixTask } from '../controllers/utilController';
import { auth } from '../middleware/auth';

const router = express.Router();

router.use(auth);

router.post('/trip-parse', parseTrip);   // Parse clipboard text
router.post('/trip-import', importTrip); // Save parsed trip as task
router.post('/remix', remixTask);

export default router;
