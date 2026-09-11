import express from 'express';
import {
    checkAndTriggerSerendipity,
    acceptEncounter,
    validateAndCompleteSerendipity,
    getMyCompletedEncounters,
    getEncounterHistory,
    getActiveEncounter,
    debugTriggerSerendipity,
    abandonEncounter,
    getEncounterDetail,
    deleteEncounter
} from '../controllers/encounterController';
import { auth } from '../middleware/auth';

const router = express.Router();

router.use(auth);

// 奇遇触发检测
router.post('/check-trigger', checkAndTriggerSerendipity);

// 接受奇遇
router.post('/:id/accept', acceptEncounter);

// 验证并完成奇遇（三重校验）
router.post('/:id/validate', validateAndCompleteSerendipity);

// 放弃奇遇
router.delete('/:id/abandon', abandonEncounter);

// 获取奇遇详情（含任务和执行记录）
router.get('/:id/detail', getEncounterDetail);

// 删除奇遇记录
router.delete('/:id', deleteEncounter);

// 获取已完成的奇遇（用于发帖关联）
router.get('/my-completed', getMyCompletedEncounters);

// 获取当前活动的奇遇
router.get('/active', getActiveEncounter);

// 获取奇遇历史
router.get('/history', getEncounterHistory);

// 调试端点（仅开发环境）
router.post('/debug-trigger', debugTriggerSerendipity);

export default router;
