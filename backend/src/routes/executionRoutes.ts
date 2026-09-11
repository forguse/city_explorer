import express from 'express';
import {
    getMyExecutions,
    getOrCreateExecution,
    getExecutionById,
    updatePrepProgress,
    updateAllPrepProgress,
    checkNode,
    completeTask,
    deleteExecution,
    scheduleExecution,
    startExecution,
    saveNodeRecord,
    validateNodeQA,
    inviteFriend,
    joinTask,
    getExecutionJournal
} from '../controllers/executionController';
import { auth } from '../middleware/auth';

const router = express.Router();

// All routes require authentication
router.use(auth);

router.get('/mine', getMyExecutions);
router.get('/task/:taskId', getOrCreateExecution); // 获取或创建任务执行记录
router.get('/:executionId', getExecutionById); // 获取单个执行记录
router.put('/:executionId/prep', updatePrepProgress); // 更新单个准备项
router.put('/:executionId/prep-batch', updateAllPrepProgress); // 批量更新准备清单
router.post('/:executionId/node/record', saveNodeRecord); // 保存节点记录 (不完成)
router.post('/:executionId/node/validate-qa', validateNodeQA); // 🆕 验证节点问答
router.put('/:executionId/node', checkNode);
router.post('/:executionId/complete', completeTask);
router.post('/:executionId/invite', inviteFriend); // 🆕 Invite Friend
router.post('/join', joinTask);
router.get('/:executionId/journal/:targetUserId', getExecutionJournal); // New Journal API using ExecutionID
router.post('/task/:taskId/schedule', scheduleExecution);
router.post('/task/:taskId/start', startExecution);
router.delete('/:executionId', deleteExecution);

export default router;
