import express from 'express';
import { auth } from '../middleware/auth';
import {
    createTeam,
    joinTeam,
    getMyTeams,
    getTeamById,
    startTeam,
    updateMemberStatus,
    completeNode,
    leaveTeam,
    nudgeMember,
    getInviteLink
} from '../controllers/teamController';

const router = express.Router();

// 所有路由需要认证
router.use(auth);

// 创建团队
router.post('/', createTeam);

// 通过邀请码加入团队
router.post('/join', joinTeam);

// 获取我的团队列表
router.get('/mine', getMyTeams);

// 获取单个团队详情
router.get('/:teamId', getTeamById);

// 开始团队任务
router.post('/:teamId/start', startTeam);

// 更新成员状态（位置、在线状态等）
router.put('/:teamId/status', updateMemberStatus);

// 完成节点
router.post('/:teamId/node', completeNode);

// 离开团队
router.post('/:teamId/leave', leaveTeam);

// 拍一拍/提醒成员
router.post('/:teamId/nudge/:targetUserId', nudgeMember);

// 获取邀请链接
router.get('/:teamId/invite', getInviteLink);

export default router;
