import express from 'express';
import { createTask, getTasks, getTaskById, joinTask, getMyTasks, updateTask, reviewTask, getPendingTasks, reportTask, deleteTask, likeTask, getReportedTasks, handleTaskReport, getRandomTask } from '../controllers/taskController';
import { auth, optionalAuth } from '../middleware/auth';

const router = express.Router();

// Public read, Auth read? Or all protected? Assuming protected for now based on context.
// Or public for browsing. Let's make browsing public, creation protected.
router.get('/', optionalAuth, getTasks); // 使用可选认证，登录用户可获取点赞状态
router.get('/my', auth, getMyTasks);
router.get('/pending', auth, getPendingTasks); // 获取待审核任务
router.get('/reported', auth, getReportedTasks); // 获取被举报任务（管理员）
router.get('/random', optionalAuth, getRandomTask); // 随机任务 (盲盒)
router.get('/:id', optionalAuth, getTaskById);

// Protected routes
router.post('/', auth, createTask);
router.put('/:id', auth, updateTask);
router.post('/:id/join', auth, joinTask);
router.post('/:id/like', auth, likeTask); // 点赞任务
router.post('/:id/review', auth, reviewTask); // 审核任务
router.post('/:id/report', auth, reportTask); // 举报任务
router.post('/:id/report-action', auth, handleTaskReport); // 处理举报（管理员）
router.delete('/:id', auth, deleteTask); // 软删除任务

export default router;

