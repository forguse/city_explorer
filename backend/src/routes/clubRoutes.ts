import express from 'express';
import {
    getClubs,
    getMyClubs,
    getClubDetail,
    createClub,
    joinClub,
    applyToJoinClub,
    getJoinRequestStatus,
    getClubJoinRequests,
    getPendingRequestsCount,
    reviewJoinRequest,
    leaveClub,
    updateAnnouncement,
    getClubTasks,
    createClubActivity,
    registerActivity,
    cancelRegistration,
    getClubActivities,
    dissolveClub,
    getPendingClubs,
    reviewClub,
    cancelActivity
} from '../controllers/clubController';
import { auth } from '../middleware/auth';

const router = express.Router();

router.use(auth);

// 社团基础操作
router.get('/', getClubs);                              // 获取社团列表（支持搜索）
router.get('/my', getMyClubs);                          // 获取我的社团（分类）
router.get('/activity', getClubActivities);             // 获取所有社团活动
router.get('/pending', getPendingClubs);                // 获取待审核社团（管理员）
router.get('/join-requests/pending-count', getPendingRequestsCount);  // 获取待审核申请数量
router.get('/:id', getClubDetail);                      // 获取社团详情
router.post('/', createClub);                           // 创建社团
router.post('/:id/join', joinClub);                     // 直接加入社团（保留用于特殊场景）
router.post('/:id/apply', applyToJoinClub);             // 申请加入社团
router.get('/:id/apply/status', getJoinRequestStatus);  // 获取申请状态
router.get('/:id/join-requests', getClubJoinRequests);  // 获取入社申请列表（团长）
router.post('/:id/join-requests/:requestId/review', reviewJoinRequest);  // 审核入社申请
router.post('/:id/leave', leaveClub);                   // 退出社团
router.post('/:id/review', reviewClub);                 // 审核社团（管理员）
router.delete('/:id', dissolveClub);                    // 解散社团（仅团长）

// 社团公告
router.put('/:id/announcement', updateAnnouncement);    // 更新公告

// 社团任务/活动
router.get('/:id/tasks', getClubTasks);                 // 获取社团任务列表
router.post('/:id/activity', createClubActivity);       // 创建社团活动
router.delete('/:clubId/tasks/:taskId', cancelActivity); // 取消活动（仅团长）

// 活动报名
router.post('/:clubId/tasks/:taskId/register', registerActivity);       // 报名活动
router.delete('/:clubId/tasks/:taskId/register', cancelRegistration);   // 取消报名

export default router;
