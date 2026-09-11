import express from 'express';
import { auth } from '../middleware/auth';
import {
    getReports,
    approveReport,
    rejectReport,
    getReportStats
} from '../controllers/reportController';

const router = express.Router();

// 所有路由都需要认证
router.use(auth);

// GET /reports - 获取举报列表（仅管理员）
router.get('/', getReports);

// GET /reports/stats - 获取举报统计（仅管理员）
router.get('/stats', getReportStats);

// POST /reports/:id/approve - 接受举报（仅管理员）
router.post('/:id/approve', approveReport);

// POST /reports/:id/reject - 驳回举报（仅管理员）
router.post('/:id/reject', rejectReport);

export default router;
