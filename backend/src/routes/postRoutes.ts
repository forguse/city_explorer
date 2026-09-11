import express from 'express';
import { getPosts, getFeed, getPostById, getPostsByTask, createPost, likePost, addComment, likeComment, deletePost, deleteComment, reportPost, toggleSave, getPendingPosts, reviewPost, getReportedPosts, handlePostReport } from '../controllers/postController';
import { auth } from '../middleware/auth';

const router = express.Router();

router.use(auth);

router.get('/feed', getFeed); // 智能推荐流
router.get('/', getPosts);
router.get('/pending', getPendingPosts); // 获取待审核帖子（管理员）
router.get('/reported', getReportedPosts); // 获取被举报帖子（管理员）
router.get('/task/:taskId', getPostsByTask); // 获取某任务相关的帖子
router.get('/:id', getPostById);
router.post('/', createPost);
router.post('/:id/like', likePost);
router.post('/:id/comment', addComment);
router.post('/:id/comment/:commentId/like', likeComment);  // 评论点赞
router.post('/:id/save', toggleSave); // Toggle save
router.post('/:id/report', reportPost);
router.post('/:id/review', reviewPost); // 审核帖子（管理员）
router.post('/:id/report-action', handlePostReport); // 处理举报（管理员）
router.delete('/:id', deletePost);
router.delete('/:id/comment/:commentId', deleteComment);

export default router;
