import express from 'express';
import { getNotifications, markAsRead } from '../controllers/notificationController';
import { auth } from '../middleware/auth';

const router = express.Router();

router.use(auth);

router.get('/', getNotifications);
router.post('/:id/read', markAsRead);

export default router;
