import express from 'express';
import { getUserById, getMyProfile, updateMyProfile, getUserStats, getUserPosts, getUserTasks, getUserCompletions, toggleFollow, getUserFollowing, getUserFollowers, toggleSaveTask, getSavedTasks, getSavedPosts, searchUser, sendFriendRequest, acceptFriendRequest, getMyFriends, deleteFriend, getUserShowcase, updateMyShowcase } from '../controllers/userController';
import { auth } from '../middleware/auth';

const router = express.Router();

router.use(auth);

router.get('/me', getMyProfile);
router.get('/me/saved-posts', getSavedPosts); // Get saved posts
router.put('/me', updateMyProfile);
router.put('/me/showcase', updateMyShowcase); // Update showcase tasks
router.get('/saved-tasks', getSavedTasks); // 获取收藏的任务
router.get('/search', searchUser); // Add search route
router.get('/me/friends', getMyFriends); // Get my friends
router.post('/friends/request', sendFriendRequest); // Send request
router.post('/friends/accept', acceptFriendRequest); // Accept request
router.delete('/friends/:id', deleteFriend); // Delete friend

router.get('/:id', getUserById);
router.get('/:id/stats', getUserStats);
router.get('/:id/posts', getUserPosts);
router.get('/:id/tasks', getUserTasks);
router.get('/:id/completions', getUserCompletions);
router.get('/:id/showcase', getUserShowcase); // Get user's showcase tasks
router.get('/:id/following', getUserFollowing);
router.get('/:id/followers', getUserFollowers);
router.post('/:id/follow', toggleFollow);
router.post('/tasks/:taskId/save', toggleSaveTask); // 收藏/取消收藏任务



export default router;
