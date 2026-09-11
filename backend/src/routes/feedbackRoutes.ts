import express from 'express';
import { createFeedback, getMyFeedbacks, getAllFeedbacks, processFeedback } from '../controllers/feedbackController';
import { auth } from '../middleware/auth';

const router = express.Router();

router.use(auth);

// 用户端
router.post('/', createFeedback);          // 提交反馈
router.get('/', getMyFeedbacks);           // 获取我的反馈

// 管理员端
router.get('/admin', getAllFeedbacks);     // 获取所有反馈（管理员）
router.put('/:id/process', processFeedback); // 处理反馈（管理员）

export default router;
