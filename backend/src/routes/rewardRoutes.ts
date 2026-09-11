import express from 'express';
import { getPendingReward, createReward, getMyRewards } from '../controllers/rewardController';
import { auth } from '../middleware/auth';

const router = express.Router();

router.use(auth);

router.get('/pending', getPendingReward);
router.get('/my', getMyRewards);
router.post('/', createReward);

export default router;
