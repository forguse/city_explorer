import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import User from '../models/User';
import TaskExecution from '../models/TaskExecution';
import mongoose from 'mongoose';

// GET /users/:id - Get user profile by ID
export const getUserById = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const user = await User.findById(id).select('-passwordHash');

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json(user);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch user' });
    }
};

// GET /users/me - Get current user profile
export const getMyProfile = async (req: AuthRequest, res: Response) => {
    try {
        const user = await User.findById(req.userId).select('-passwordHash');

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json(user);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
};

// PUT /users/me - Update current user profile
export const updateMyProfile = async (req: AuthRequest, res: Response) => {
    try {
        const { nickname, bio, avatarUrl, coverUrl, preferences } = req.body;

        // Find and update
        // Note: Not allowing updating critical fields like email/password here
        const user = await User.findById(req.userId);
        if (!user) return res.status(404).json({ error: 'User not found' });

        if (nickname) user.username = nickname; // Map nickname to username for now
        if (bio) user.bio = bio;
        if (avatarUrl) user.avatarUrl = avatarUrl;
        if (coverUrl) (user as any).coverUrl = coverUrl;  // 添加背景图支持

        if (preferences) {
            user.preferences = { ...user.preferences, ...preferences };
        }

        await user.save();

        // Return updated user without password
        const updatedUser = user.toObject();
        delete (updatedUser as any).passwordHash;

        res.json(updatedUser);
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(400).json({ error: 'Failed to update profile' });
    }
};

// GET /users/:id/stats - Get user statistics
export const getUserStats = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const Post = (await import('../models/Post')).default;
        const Task = (await import('../models/Task')).default;
        const TaskExecution = (await import('../models/TaskExecution')).default;

        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // 统计数据
        const postsCount = await Post.countDocuments({ author: id });
        const publishedTasksCount = await Task.countDocuments({ author: id, status: 'approved' });
        const completedTasksCount = await TaskExecution.countDocuments({ user: id, status: 'completed' });

        // 计算用户发布的任务被收藏的总次数 (用 savedTasks 统计)
        const userTasks = await Task.find({ author: id }).select('_id');
        const taskIds = userTasks.map(t => t._id);
        const savedByOthersCount = await User.countDocuments({ savedTasks: { $in: taskIds } });

        res.json({
            following: user.following?.length || 0,
            followers: user.followers?.length || 0,
            posts: postsCount,
            publishedTasks: publishedTasksCount,
            completedTasks: completedTasksCount,
            savedByOthers: savedByOthersCount
        });
    } catch (error) {
        console.error('Get user stats error:', error);
        res.status(500).json({ error: 'Failed to fetch user stats' });
    }
};

// GET /users/:id/posts - Get user's posts
export const getUserPosts = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const Post = (await import('../models/Post')).default;

        const posts = await Post.find({ author: id })
            .populate('author', 'username avatarUrl level')
            .populate('relatedTask', 'title')
            .populate('comments.user', 'username avatarUrl')
            .sort({ createdAt: -1 });

        res.json(posts);
    } catch (error) {
        console.error('Get user posts error:', error);
        res.status(500).json({ error: 'Failed to fetch user posts' });
    }
};

// GET /users/:id/tasks - Get user's published tasks
export const getUserTasks = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const Task = (await import('../models/Task')).default;

        const tasks = await Task.find({ author: id, status: 'approved' })
            .populate('author', 'username avatarUrl level')
            .sort({ createdAt: -1 });

        res.json(tasks);
    } catch (error) {
        console.error('Get user tasks error:', error);
        res.status(500).json({ error: 'Failed to fetch user tasks' });
    }
};

// GET /users/:id/completions - Get user's completed tasks
export const getUserCompletions = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const TaskExecution = (await import('../models/TaskExecution')).default;

        const executions = await TaskExecution.find({ user: id, status: 'completed' })
            .populate('task', 'title description coverImageUrl xp')
            .sort({ completedAt: -1 });

        res.json(executions);
    } catch (error) {
        console.error('Get user completions error:', error);
        res.status(500).json({ error: 'Failed to fetch user completions' });
    }
};

// POST /users/:id/follow - Follow/unfollow a user
export const toggleFollow = async (req: AuthRequest, res: Response) => {
    try {
        const { id: targetId } = req.params;
        const userId = req.userId;

        if (targetId === userId) {
            return res.status(400).json({ error: '不能关注自己' });
        }

        const currentUser = await User.findById(userId);
        const targetUser = await User.findById(targetId);

        if (!currentUser || !targetUser) {
            return res.status(404).json({ error: 'User not found' });
        }

        const isFollowing = currentUser.following.some(f => f.toString() === targetId);

        if (isFollowing) {
            // 取消关注
            currentUser.following = currentUser.following.filter(f => f.toString() !== targetId);
            targetUser.followers = targetUser.followers.filter(f => f.toString() !== userId);
        } else {
            // 关注
            currentUser.following.push(targetId as any);
            targetUser.followers.push(userId as any);
        }

        await currentUser.save();
        await targetUser.save();

        res.json({
            isFollowing: !isFollowing,
            followingCount: currentUser.following.length,
            followersCount: targetUser.followers.length
        });
    } catch (error) {
        console.error('Toggle follow error:', error);
        res.status(400).json({ error: 'Failed to toggle follow' });
    }
};

// GET /users/:id/following - Get user's following list
export const getUserFollowing = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const currentUserId = req.userId;

        const user = await User.findById(id)
            .populate('following', 'username avatarUrl level bio')
            .select('following');

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // 获取当前用户的关注列表，用于判断 isFollowing 状态
        const currentUser = await User.findById(currentUserId).select('following');
        const currentFollowingIds = currentUser?.following?.map(f => f.toString()) || [];

        // 为每个用户添加 isFollowing 状态
        const followingList = (user.following || []).map((u: any) => ({
            id: u._id,
            name: u.username,
            avatar: u.avatarUrl,
            level: u.level || 1,
            title: u.title || '探索者',
            bio: u.bio || '',
            isFollowing: currentFollowingIds.includes(u._id.toString())
        }));

        res.json(followingList);
    } catch (error) {
        console.error('Get user following error:', error);
        res.status(500).json({ error: 'Failed to fetch following list' });
    }
};

// GET /users/:id/followers - Get user's followers list
export const getUserFollowers = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const currentUserId = req.userId;

        const user = await User.findById(id)
            .populate('followers', 'username avatarUrl level bio')
            .select('followers');

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // 获取当前用户的关注列表，用于判断 isFollowing 状态
        const currentUser = await User.findById(currentUserId).select('following');
        const currentFollowingIds = currentUser?.following?.map(f => f.toString()) || [];

        // 为每个用户添加 isFollowing 状态
        const followersList = (user.followers || []).map((u: any) => ({
            id: u._id,
            name: u.username,
            avatar: u.avatarUrl,
            level: u.level || 1,
            title: u.title || '探索者',
            bio: u.bio || '',
            isFollowing: currentFollowingIds.includes(u._id.toString())
        }));

        res.json(followersList);
    } catch (error) {
        console.error('Get user followers error:', error);
        res.status(500).json({ error: 'Failed to fetch followers list' });
    }
};

// POST /users/tasks/:taskId/save - Toggle save/unsave a task
export const toggleSaveTask = async (req: AuthRequest, res: Response) => {
    try {
        const { taskId } = req.params;
        const userId = req.userId;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const isSaved = user.savedTasks.some(t => t.toString() === taskId);

        if (isSaved) {
            // 取消收藏
            user.savedTasks = user.savedTasks.filter(t => t.toString() !== taskId);
            // Remove active execution so next save starts fresh
            await TaskExecution.deleteMany({
                user: userId,
                task: taskId
            });
        } else {
            // 收藏
            user.savedTasks.push(taskId as any);
        }

        await user.save();

        res.json({
            isSaved: !isSaved,
            savedCount: user.savedTasks.length
        });
    } catch (error) {
        console.error('Toggle save task error:', error);
        res.status(400).json({ error: 'Failed to toggle save task' });
    }
};

// GET /users/saved-tasks - Get current user's saved tasks
export const getSavedTasks = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.userId;
        const Task = (await import('../models/Task')).default;

        const user = await User.findById(userId).select('savedTasks');
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // 获取收藏的任务详情
        const savedTasks = await Task.find({ _id: { $in: user.savedTasks } })
            .populate('author', 'username avatarUrl level')
            .sort({ createdAt: -1 });

        res.json(savedTasks);
    } catch (error) {
        console.error('Get saved tasks error:', error);
        res.status(500).json({ error: 'Failed to fetch saved tasks' });
    }
};
// GET /users/me/saved-posts - Get current user's saved posts
export const getSavedPosts = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.userId;
        const SavedPost = (await import('../models/SavedPost')).default;

        // Simple pagination
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;

        const savedPosts = await SavedPost.find({ user: userId })
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .populate({
                path: 'post',
                populate: [
                    { path: 'author', select: 'username avatarUrl level' },
                    { path: 'relatedTask', select: 'title' },
                    { path: 'comments.user', select: 'username avatarUrl' }
                ]
            });

        // Extract posts and filter out nulls (deleted posts)
        const posts = savedPosts
            .map(sp => sp.post)
            .filter(p => p != null);

        res.json(posts);
    } catch (error) {
        console.error('Get saved posts error:', error);
        res.status(500).json({ error: 'Failed to fetch saved posts' });
    }
};
// GET /users/search - Search users by ID or username
export const searchUser = async (req: AuthRequest, res: Response) => {
    try {
        const { query } = req.query;
        const currentUserId = req.userId;

        if (!query || typeof query !== 'string') {
            return res.status(400).json({ error: 'Search query is required' });
        }

        let users: any[] = [];

        // 1. If query is a valid ObjectId, try to find by ID first
        if (mongoose.Types.ObjectId.isValid(query)) {
            const userById = await User.findById(query).select('username avatarUrl level bio friends');
            if (userById) {
                users.push(userById);
            }
        }

        // 2. Fuzzy search by username (limit 20)
        let nameFilter: any = {};
        try {
            // Escape special regex characters to prevent crashes
            const safeQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            nameFilter.username = { $regex: new RegExp(safeQuery, 'i') };
        } catch (e) {
            nameFilter.username = query;
        }

        if (users.length > 0) {
            // Only exclude if we actually found someone by ID
            nameFilter._id = { $ne: users[0]._id };
        }

        const usersByName = await User.find(nameFilter)
            .select('username avatarUrl level bio friends')
            .limit(20);

        users = [...users, ...usersByName];

        if (users.length === 0) {
            return res.json({ found: true, users: [] });
        }

        // Check relationship for each user
        const currentUser = await User.findById(currentUserId);

        const results = users.map(user => {
            const isSelf = user._id.toString() === currentUserId;
            const isFriend = currentUser?.friends?.includes(user._id);
            return {
                id: user._id,
                name: user.username,
                avatar: user.avatarUrl,
                level: user.level,
                bio: user.bio,
                isSelf,
                isFriend
            };
        });

        res.json({
            found: true,
            users: results
        });
    } catch (error: any) {
        console.error('Search user error:', error);
        res.status(500).json({ error: `Search failed: ${error.message}` });
    }
};

// POST /users/friends/request - Send friend request
export const sendFriendRequest = async (req: AuthRequest, res: Response) => {
    try {
        const { targetUserId } = req.body;
        const currentUserId = req.userId;
        const Notification = (await import('../models/Notification')).default;

        if (targetUserId === currentUserId) {
            return res.status(400).json({ error: '不能添加自己为好友' });
        }

        const currentUser = await User.findById(currentUserId);
        const targetUser = await User.findById(targetUserId);

        if (!currentUser || !targetUser) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Check friend limit (100)
        if ((currentUser.friends?.length || 0) >= 100) {
            return res.status(400).json({ error: '您的好友数量已达上限 (100人)' });
        }
        if ((targetUser.friends?.length || 0) >= 100) {
            return res.status(400).json({ error: '对方好友数量已达上限' });
        }

        if (currentUser.friends?.includes(targetUser._id)) {
            return res.status(400).json({ error: '已经是好友了' });
        }

        // Check if request already sent
        const existingRequest = await Notification.findOne({
            recipient: targetUser._id,
            sender: currentUser._id,
            type: 'friend_request',
            isRead: false
        });

        if (existingRequest) {
            return res.status(400).json({ error: '已发送过好友申请，请等待对方处理' });
        }

        // Create Notification
        await Notification.create({
            recipient: targetUser._id,
            sender: currentUser._id,
            type: 'friend_request',
            content: `${currentUser.username} 请求添加您为好友`
        });

        res.json({ success: true, message: '好友申请已发送' });
    } catch (error: any) {
        console.error('Send friend request error:', error);
        res.status(500).json({ error: `Failed to send request: ${error.message}` });
    }
};

// POST /users/friends/accept - Accept friend request
export const acceptFriendRequest = async (req: AuthRequest, res: Response) => {
    try {
        const { requesterId, notificationId } = req.body;
        const currentUserId = req.userId;
        const Notification = (await import('../models/Notification')).default;

        const currentUser = await User.findById(currentUserId);
        const requester = await User.findById(requesterId);

        if (!currentUser || !requester) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Double check limit before accepting
        if ((currentUser.friends?.length || 0) >= 100 || (requester.friends?.length || 0) >= 100) {
            return res.status(400).json({ error: '无法添加好友：人数已达上限' });
        }

        // Add to friends lists (ensure unique)
        if (!currentUser.friends?.includes(requester._id)) {
            currentUser.friends = [...(currentUser.friends || []), requester._id];
            await currentUser.save();
        }
        if (!requester.friends?.includes(currentUser._id)) {
            requester.friends = [...(requester.friends || []), currentUser._id];
            await requester.save();
        }

        // Mark notification as read/handled
        if (notificationId) {
            await Notification.findByIdAndUpdate(notificationId, { isRead: true });
        }

        // Optional: Send "Request Accepted" notification back
        await Notification.create({
            recipient: requester._id,
            sender: currentUser._id,
            type: 'friend_accepted',
            content: `${currentUser.username} 接受了您的好友请求`
        });

        res.json({ success: true, message: '已添加好友' });
    } catch (error) {
        console.error('Accept friend request error:', error);
        res.status(500).json({ error: 'Failed to accept request' });
    }
};

// GET /users/me/friends - Get my friends list
export const getMyFriends = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.userId;
        const user = await User.findById(userId).populate('friends', 'username avatarUrl level bio title');

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const friendsList = (user.friends || []).map((f: any) => ({
            id: f._id,
            name: f.username,
            avatar: f.avatarUrl,
            level: f.level || 1,
            bio: f.bio || '',
            title: f.title || '探索者'
        }));

        res.json(friendsList);
    } catch (error) {
        console.error('Get friends error:', error);
        res.status(500).json({ error: 'Failed to fetch friends' });
    }
};

// DELETE /users/friends/:id - Delete friend
export const deleteFriend = async (req: AuthRequest, res: Response) => {
    try {
        const { id: friendId } = req.params;
        const currentUserId = req.userId;

        const currentUser = await User.findById(currentUserId);
        const friend = await User.findById(friendId);

        if (!currentUser || !friend) {
            return res.status(404).json({ error: 'User not found' });
        }

        // 双向删除
        // Remove from current user's friends list
        if (currentUser.friends) {
            currentUser.friends = currentUser.friends.filter(f => f.toString() !== friendId);
        }

        // Remove from friend's friends list
        if (friend.friends) {
            friend.friends = friend.friends.filter(f => f.toString() !== currentUserId);
        }

        await currentUser.save();
        await friend.save();

        res.json({ success: true, message: '好友已删除' });
    } catch (error) {
        console.error('Delete friend error:', error);
        res.status(500).json({ error: 'Failed to delete friend' });
    }
};

// GET /users/:id/showcase - Get user's showcase tasks
export const getUserShowcase = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;

        const user = await User.findById(id)
            .populate({
                path: 'showcaseTasks',
                populate: {
                    path: 'task',
                    select: 'title coverImageUrl'
                }
            })
            .select('showcaseTasks');

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json(user.showcaseTasks || []);
    } catch (error) {
        console.error('Get user showcase error:', error);
        res.status(500).json({ error: 'Failed to fetch showcase' });
    }
};

// PUT /users/me/showcase - Update current user's showcase tasks
export const updateMyShowcase = async (req: AuthRequest, res: Response) => {
    try {
        const { showcaseTaskIds } = req.body;
        const userId = req.userId;

        if (!Array.isArray(showcaseTaskIds)) {
            return res.status(400).json({ error: 'showcaseTaskIds must be an array' });
        }

        if (showcaseTaskIds.length > 9) {
            return res.status(400).json({ error: '最多只能展示9个任务' });
        }

        // Verify all execution IDs belong to the user and are completed
        const executions = await TaskExecution.find({
            _id: { $in: showcaseTaskIds },
            user: userId,
            status: 'completed'
        });

        if (executions.length !== showcaseTaskIds.length) {
            return res.status(400).json({ error: '部分任务不存在或未完成' });
        }

        // Update user's showcase
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        user.showcaseTasks = showcaseTaskIds as any;
        await user.save();

        // Return updated showcase with populated data
        const updatedUser = await User.findById(userId)
            .populate({
                path: 'showcaseTasks',
                populate: {
                    path: 'task',
                    select: 'title coverImageUrl'
                }
            })
            .select('showcaseTasks');

        res.json(updatedUser?.showcaseTasks || []);
    } catch (error) {
        console.error('Update showcase error:', error);
        res.status(500).json({ error: 'Failed to update showcase' });
    }
};
