import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import Post from '../models/Post';
import User from '../models/User';
import Report from '../models/Report';
import { checkSensitiveWords } from '../utils/sensitiveFilter';

// GET /posts/feed - 智能推荐流（分页）
// 算法：FinalScore = TimeDecayScore + PersonalizationBonus + QualityBonus
export const getFeed = async (req: AuthRequest, res: Response) => {
    try {
        const { page = 1, limit = 6, city } = req.query;
        const pageNum = parseInt(page as string, 10);
        const limitNum = parseInt(limit as string, 10);
        const skip = (pageNum - 1) * limitNum;

        // 获取当前用户信息
        const currentUser = await User.findById(req.userId).select('following');
        const followingIds = currentUser?.following?.map(id => id.toString()) || [];

        // 构建 Aggregation Pipeline
        const pipeline: any[] = [
            // 1. 基础过滤：排除被拒绝的帖子
            {
                $match: {
                    status: { $ne: 'rejected' }
                }
            },

            // 2. 关联任务获取城市信息
            {
                $lookup: {
                    from: 'tasks',
                    localField: 'relatedTask',
                    foreignField: '_id',
                    as: 'taskInfo'
                }
            },

            // 3. 计算各维度分数
            {
                $addFields: {
                    // 时间衰减分 (48小时半衰期，基础100分)
                    hoursAgo: {
                        $divide: [
                            { $subtract: [new Date(), '$createdAt'] },
                            1000 * 60 * 60
                        ]
                    }
                }
            },
            {
                $addFields: {
                    // 时间衰减：100 * e^(-hoursAgo/48)
                    timeDecayScore: {
                        $multiply: [
                            100,
                            { $exp: { $divide: [{ $multiply: ['$hoursAgo', -1] }, 48] } }
                        ]
                    },

                    // 同城加分 (+30分)
                    cityMatchBonus: {
                        $cond: [
                            {
                                $and: [
                                    { $gt: [{ $size: { $ifNull: ['$taskInfo', []] } }, 0] },
                                    { $gt: [city, null] },
                                    {
                                        $in: [
                                            city,
                                            { $ifNull: [{ $arrayElemAt: ['$taskInfo.targetCities', 0] }, []] }
                                        ]
                                    }
                                ]
                            },
                            30,
                            0
                        ]
                    },

                    // 关注加分 (+20分)
                    followingBonus: {
                        $cond: [
                            { $in: [{ $toString: '$author' }, followingIds] },
                            20,
                            0
                        ]
                    },

                    // 热度分：log10(likes + comments*2 + 1) * 5，上限20分
                    hotScore: {
                        $min: [
                            20,
                            {
                                $multiply: [
                                    5,
                                    {
                                        $log10: {
                                            $add: [
                                                { $size: { $ifNull: ['$likes', []] } },
                                                { $multiply: [{ $size: { $ifNull: ['$comments', []] } }, 2] },
                                                1
                                            ]
                                        }
                                    }
                                ]
                            }
                        ]
                    },

                    // 有图片加分 (+5分)
                    hasImageBonus: {
                        $cond: [
                            { $gt: [{ $size: { $ifNull: ['$imageUrls', []] } }, 0] },
                            5,
                            0
                        ]
                    },

                    // 关联任务加分 (+8分)
                    hasTaskBonus: {
                        $cond: [
                            { $ifNull: ['$relatedTask', false] },
                            8,
                            0
                        ]
                    },

                    // 举报减分 (-5分/次)
                    reportPenalty: {
                        $multiply: [{ $ifNull: ['$reportCount', 0] }, -5]
                    }
                }
            },

            // 4. 计算最终分数
            {
                $addFields: {
                    finalScore: {
                        $add: [
                            '$timeDecayScore',
                            '$cityMatchBonus',
                            '$followingBonus',
                            '$hotScore',
                            '$hasImageBonus',
                            '$hasTaskBonus',
                            '$reportPenalty'
                        ]
                    }
                }
            },

            // 5. 按最终分数排序
            { $sort: { finalScore: -1 } },

            // 6. 分页
            { $skip: skip },
            { $limit: limitNum },

            // 7. 关联作者信息
            {
                $lookup: {
                    from: 'users',
                    localField: 'author',
                    foreignField: '_id',
                    as: 'authorInfo'
                }
            },
            { $unwind: { path: '$authorInfo', preserveNullAndEmptyArrays: true } },

            // 8. 关联任务详情
            {
                $lookup: {
                    from: 'tasks',
                    localField: 'relatedTask',
                    foreignField: '_id',
                    as: 'relatedTaskInfo'
                }
            },
            {
                $unwind: { path: '$relatedTaskInfo', preserveNullAndEmptyArrays: true }
            },

            // 9. 关联 remixTask
            {
                $lookup: {
                    from: 'tasks',
                    localField: 'remixTask',
                    foreignField: '_id',
                    as: 'remixTaskInfo'
                }
            },
            {
                $unwind: { path: '$remixTaskInfo', preserveNullAndEmptyArrays: true }
            },

            // 10. 关联评论用户信息
            {
                $lookup: {
                    from: 'users',
                    localField: 'comments.user',
                    foreignField: '_id',
                    as: 'commentUsers'
                }
            },

            // 11. 格式化输出
            {
                $project: {
                    _id: 1,
                    content: 1,
                    imageUrls: 1,
                    likes: 1,
                    createdAt: 1,
                    status: 1,
                    reportCount: 1,
                    saveCount: 1,
                    finalScore: 1, // 调试用
                    author: {
                        _id: '$authorInfo._id',
                        username: '$authorInfo.username',
                        avatarUrl: '$authorInfo.avatarUrl',
                        level: '$authorInfo.level',
                        bio: '$authorInfo.bio',
                        title: '$authorInfo.title'
                    },
                    relatedTask: {
                        $cond: [
                            { $ifNull: ['$relatedTaskInfo', false] },
                            {
                                _id: '$relatedTaskInfo._id',
                                title: '$relatedTaskInfo.title',
                                description: '$relatedTaskInfo.description',
                                coverImageUrl: '$relatedTaskInfo.coverImageUrl',
                                nodes: '$relatedTaskInfo.nodes',
                                prepListConfig: '$relatedTaskInfo.prepListConfig'
                            },
                            null
                        ]
                    },
                    remixTask: {
                        $cond: [
                            { $ifNull: ['$remixTaskInfo', false] },
                            {
                                _id: '$remixTaskInfo._id',
                                title: '$remixTaskInfo.title',
                                coverImageUrl: '$remixTaskInfo.coverImageUrl',
                                nodes: '$remixTaskInfo.nodes',
                                prepListConfig: '$remixTaskInfo.prepListConfig'
                            },
                            null
                        ]
                    },
                    comments: {
                        $map: {
                            input: '$comments',
                            as: 'comment',
                            in: {
                                _id: '$$comment._id',
                                content: '$$comment.content',
                                createdAt: '$$comment.createdAt',
                                likes: '$$comment.likes',
                                user: {
                                    $let: {
                                        vars: {
                                            matchedUser: {
                                                $arrayElemAt: [
                                                    {
                                                        $filter: {
                                                            input: '$commentUsers',
                                                            as: 'cu',
                                                            cond: { $eq: ['$$cu._id', '$$comment.user'] }
                                                        }
                                                    },
                                                    0
                                                ]
                                            }
                                        },
                                        in: {
                                            _id: '$$matchedUser._id',
                                            username: '$$matchedUser.username',
                                            avatarUrl: '$$matchedUser.avatarUrl'
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        ];

        const posts = await Post.aggregate(pipeline);

        // 检查收藏状态
        const SavedPost = (await import('../models/SavedPost')).default;
        const savedPosts = await SavedPost.find({
            user: req.userId,
            post: { $in: posts.map(p => p._id) }
        });
        const savedPostIds = new Set(savedPosts.map(sp => sp.post.toString()));
        const followingIdsSet = new Set(followingIds);

        // 添加 isSaved 和 isFollowing 状态
        const postsWithStatus = posts.map(p => ({
            ...p,
            isSaved: savedPostIds.has(p._id.toString()),
            user: {
                ...p.author,
                isFollowing: followingIdsSet.has(p.author?._id?.toString() || '')
            }
        }));

        res.json(postsWithStatus);
    } catch (error) {
        console.error('getFeed error:', error);
        res.status(500).json({ error: 'Failed to fetch feed' });
    }
};

export const getPosts = async (req: AuthRequest, res: Response) => {
    try {
        // 帖子不需要人工审核，所有通过敏感词检测的帖子都是 approved 状态
        const posts = await Post.find({ status: { $ne: 'rejected' } }) // 排除被拒绝的帖子
            .populate('author', 'username avatarUrl level')
            .populate('relatedTask', 'title description coverImageUrl nodes prepListConfig')
            .populate('remixTask', 'title coverImageUrl nodes prepListConfig')
            .populate({
                path: 'relatedSerendipity',
                populate: {
                    path: 'serendipityTask',
                    select: 'title description coverImageUrl qaModule serendipityConfig'
                }
            })
            .populate('comments.user', 'username avatarUrl') // Populate comment authors
            .sort({ createdAt: -1 });

        // Optimize: Check isSaved and isFollowing status
        const SavedPost = (await import('../models/SavedPost')).default;

        // Fetch current user to get following list
        const currentUser = await User.findById(req.userId).select('following');
        const followingIds = new Set(currentUser?.following?.map(id => id.toString()) || []);

        const savedPosts = await SavedPost.find({
            user: req.userId,
            post: { $in: posts.map(p => p._id) }
        });
        const savedPostIds = new Set(savedPosts.map(sp => sp.post.toString()));

        const postsWithStatus = posts.map(p => ({
            ...p.toObject(),
            isSaved: savedPostIds.has(p._id.toString()),
            user: {
                ...p.toObject().author, // Ensure author detail is preserved or mapped if needed by frontend
                isFollowing: followingIds.has((p.author as any)._id.toString())
            }
        }));

        res.json(postsWithStatus);
    } catch (error) {
        console.error('getPosts error:', error);
        res.status(500).json({ error: 'Failed to fetch posts' });
    }
};

export const getPostById = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const post = await Post.findById(id)
            .populate('author', 'username avatarUrl level')
            .populate('relatedTask', 'title description xp coverImageUrl nodes prepListConfig')
            .populate('remixTask', 'title description xp coverImageUrl nodes prepListConfig')
            .populate({
                path: 'relatedSerendipity',
                populate: {
                    path: 'serendipityTask',
                    select: 'title description coverImageUrl qaModule serendipityConfig'
                }
            })
            .populate('comments.user', 'username avatarUrl');

        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }

        const SavedPost = (await import('../models/SavedPost')).default;
        const isSaved = await SavedPost.exists({ user: req.userId, post: id });

        res.json({
            ...post.toObject(),
            isSaved: !!isSaved
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch post' });
    }
};

// 获取与某个任务相关的帖子，按热度排序
export const getPostsByTask = async (req: AuthRequest, res: Response) => {
    try {
        const { taskId } = req.params;
        const posts = await Post.find({ relatedTask: taskId })
            .populate('author', 'username avatarUrl level')
            .populate('comments.user', 'username avatarUrl');

        // 按热度排序（点赞数 + 评论数 * 2）
        const sortedPosts = posts.sort((a, b) => {
            const scoreA = (a.likes?.length || 0) + (a.comments?.length || 0) * 2;
            const scoreB = (b.likes?.length || 0) + (b.comments?.length || 0) * 2;
            return scoreB - scoreA;
        });

        res.json(sortedPosts);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch posts for task' });
    }
};

export const createPost = async (req: AuthRequest, res: Response) => {
    try {
        const { content } = req.body;

        // 敏感词检测（帖子只需要敏感词过滤，不需要人工审核）
        const filterResult = checkSensitiveWords(content || '');
        if (!filterResult.isClean) {
            return res.status(400).json({
                error: '内容包含敏感词，无法发布',
                code: 'SENSITIVE_CONTENT',
                details: filterResult.matchedWords
            });
        }

        const { imageUrls } = req.body;
        // Determine status: pending if has images, otherwise approved
        const status = (imageUrls && imageUrls.length > 0) ? 'pending' : 'approved';

        const post = new Post({
            ...req.body,
            author: req.userId,
            status
        });
        await post.save();
        await post.populate('author', 'username avatarUrl level');
        res.status(201).json(post);
    } catch (error) {
        res.status(400).json({ error: 'Failed to create post', details: error });
    }
};

import { createNotificationInternal } from './notificationController';

// ... existing imports ...

// ... createPost ...

export const likePost = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const post = await Post.findById(id);
        if (!post) return res.status(404).json({ error: 'Post not found' });

        const userId = req.userId as any;
        let isLiked = false;

        // 使用 some() 和 toString() 进行正确的 ObjectId 比较
        const alreadyLiked = post.likes.some(uid => uid.toString() === userId.toString());

        if (alreadyLiked) {
            post.likes = post.likes.filter(uid => uid.toString() !== userId.toString());
            isLiked = false;
        } else {
            post.likes.push(userId);
            isLiked = true;
            // Trigger Notification
            if (post.author.toString() !== req.userId) {
                await createNotificationInternal(
                    post.author.toString(),
                    'like',
                    req.userId,
                    (post._id as unknown) as string
                );
            }
        }

        await post.save();

        // 返回点赞状态和数量，方便前端同步
        res.json({
            isLiked,
            likeCount: post.likes.length,
            post
        });
    } catch (error) {
        res.status(400).json({ error: 'Failed to like post' });
    }
};

export const addComment = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { content, parentCommentId, replyToUserId, replyToUsername } = req.body;

        if (!content) return res.status(400).json({ error: 'Content is required' });

        // 敏感词检测
        const filterResult = checkSensitiveWords(content);
        if (!filterResult.isClean) {
            return res.status(400).json({
                error: '评论包含敏感词，无法发布',
                code: 'SENSITIVE_CONTENT',
                details: filterResult.matchedWords
            });
        }

        const post = await Post.findById(id);
        if (!post) return res.status(404).json({ error: 'Post not found' });

        // 如果是回复评论，验证父评论存在且不是二级回复
        if (parentCommentId) {
            const parentComment = post.comments.find(
                (c: any) => c._id.toString() === parentCommentId
            );
            if (!parentComment) {
                return res.status(404).json({ error: '父评论不存在' });
            }
            // 检查父评论是否已经是回复（不允许回复的回复）
            if (parentComment.parentComment) {
                return res.status(400).json({ error: '不能回复二级评论' });
            }
        }

        const newComment: any = {
            user: req.userId as any,
            content,
            createdAt: new Date()
        };

        // 如果是回复，添加父评论和被回复用户信息
        if (parentCommentId) {
            newComment.parentComment = parentCommentId;
            if (replyToUserId && replyToUsername) {
                newComment.replyTo = {
                    userId: replyToUserId,
                    username: replyToUsername
                };
            }
        }

        post.comments.push(newComment);

        await post.save();

        // Trigger Notification - 通知帖子作者
        if (post.author.toString() !== req.userId) {
            await createNotificationInternal(
                post.author.toString(),
                'comment',
                req.userId,
                (post._id as unknown) as string,
                content
            );
        }

        // 如果是回复评论，还要通知被回复的用户
        if (replyToUserId && replyToUserId !== req.userId && replyToUserId !== post.author.toString()) {
            await createNotificationInternal(
                replyToUserId,
                'comment',
                req.userId,
                (post._id as unknown) as string,
                content
            );
        }

        // Return the full post with populated comments to update UI
        await post.populate('comments.user', 'username avatarUrl');

        res.json(post);
    } catch (error) {
        res.status(400).json({ error: 'Failed to add comment' });
    }
};

// POST /posts/:id/comment/:commentId/like - 点赞/取消点赞评论
export const likeComment = async (req: AuthRequest, res: Response) => {
    try {
        const { id, commentId } = req.params;
        const userId = req.userId;

        const post = await Post.findById(id);
        if (!post) return res.status(404).json({ error: 'Post not found' });

        const comment = post.comments.find((c: any) => c._id.toString() === commentId);
        if (!comment) return res.status(404).json({ error: 'Comment not found' });

        // 初始化 likes 数组（如果不存在）
        if (!comment.likes) {
            comment.likes = [];
        }

        const likeIndex = comment.likes.findIndex((likeId: any) => likeId.toString() === userId);

        if (likeIndex > -1) {
            // 已点赞，取消点赞
            comment.likes.splice(likeIndex, 1);
        } else {
            // 未点赞，添加点赞
            comment.likes.push(userId as any);
        }

        await post.save();

        // 完整 populate 所有字段，与 getPostById 保持一致
        await post.populate('author', 'username avatarUrl level');
        await post.populate('relatedTask', 'title description xp coverImageUrl nodes prepListConfig');
        await post.populate('remixTask', 'title description xp coverImageUrl nodes prepListConfig');
        await post.populate({
            path: 'relatedSerendipity',
            populate: {
                path: 'serendipityTask',
                select: 'title description coverImageUrl qaModule serendipityConfig'
            }
        });
        await post.populate('comments.user', 'username avatarUrl');

        res.json(post);
    } catch (error) {
        res.status(400).json({ error: 'Failed to like comment' });
    }
};

// DELETE /posts/:id - 删除帖子
export const deletePost = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { reason } = req.body; // 管理员删除时可以提供原因
        const userId = req.userId;

        const post = await Post.findById(id);
        if (!post) return res.status(404).json({ error: 'Post not found' });

        // 获取当前用户信息
        const currentUser = await User.findById(userId);
        if (!currentUser) return res.status(401).json({ error: 'User not found' });

        // 检查权限：只有作者或管理员可以删除帖子
        const isAuthor = post.author.toString() === userId;
        const isAdmin = currentUser.isAdmin === true;

        if (!isAuthor && !isAdmin) {
            return res.status(403).json({ error: 'You do not have permission to delete this post' });
        }

        // 如果是管理员删除（非作者本人），发送通知
        if (isAdmin && !isAuthor) {
            await createNotificationInternal(
                post.author.toString(),
                'post_removed',
                undefined,
                id as string,
                `您的帖子已被管理员删除${reason ? '，原因：' + reason : ''}`
            );
        }

        await Post.findByIdAndDelete(id);
        res.json({ message: 'Post deleted successfully', deletedBy: isAdmin ? 'admin' : 'author' });
    } catch (error) {
        res.status(400).json({ error: 'Failed to delete post' });
    }
};

// POST /posts/:id/report - 举报帖子
const DAILY_REPORT_LIMIT = 5; // 每日举报限制

// 检查并更新用户每日举报次数
const checkAndUpdateDailyReportLimit = async (userId: string): Promise<{ allowed: boolean; remaining: number }> => {
    const user = await User.findById(userId);
    if (!user) return { allowed: false, remaining: 0 };

    // 管理员不受举报次数限制
    if (user.isAdmin) {
        return { allowed: true, remaining: 999 };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const lastReportDate = user.lastReportDate ? new Date(user.lastReportDate) : null;
    const isNewDay = !lastReportDate || lastReportDate < today;

    if (isNewDay) {
        // 新的一天，重置计数
        user.dailyReportCount = 1;
        user.lastReportDate = new Date();
        await user.save();
        return { allowed: true, remaining: DAILY_REPORT_LIMIT - 1 };
    }

    if (user.dailyReportCount >= DAILY_REPORT_LIMIT) {
        return { allowed: false, remaining: 0 };
    }

    user.dailyReportCount += 1;
    await user.save();
    return { allowed: true, remaining: DAILY_REPORT_LIMIT - user.dailyReportCount };
};

export const reportPost = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const userId = req.userId;

        // 检查每日举报限制
        const reportLimit = await checkAndUpdateDailyReportLimit(userId as string);
        if (!reportLimit.allowed) {
            return res.status(400).json({
                error: '您今日的举报次数已用完（每日限5次），请明天再试',
                code: 'DAILY_REPORT_LIMIT_EXCEEDED'
            });
        }

        const post = await Post.findById(id);
        if (!post) return res.status(404).json({ error: 'Post not found' });

        // 注释掉自我举报限制，方便测试
        // if (post.author.toString() === userId) {
        //     return res.status(400).json({ error: '不能举报自己的帖子' });
        // }

        // 检查是否已经举报过
        if (post.reportedBy && post.reportedBy.some(uid => uid.toString() === userId)) {
            return res.status(400).json({ error: '您已经举报过此帖子' });
        }

        // 添加举报
        if (!post.reportedBy) post.reportedBy = [];
        post.reportedBy.push(userId as any);
        post.reportCount = post.reportedBy.length;

        await post.save();

        // 创建举报记录
        const newReport = await Report.create({
            reporter: userId,
            targetType: 'post',
            targetId: id,
            status: 'pending'
        });
        console.log('Created report:', newReport._id, 'for post:', id);

        return res.json({
            message: '举报已记录，我们将尽快处理',
            reportCount: post.reportCount,
            dailyReportRemaining: reportLimit.remaining
        });
    } catch (error) {
        console.error('reportPost error:', error);
        res.status(400).json({ error: 'Failed to report post' });
    }
};

// DELETE /posts/:id/comment/:commentId - 删除评论
export const deleteComment = async (req: AuthRequest, res: Response) => {
    try {
        const { id, commentId } = req.params;
        const userId = req.userId;

        const post = await Post.findById(id);
        if (!post) return res.status(404).json({ error: 'Post not found' });

        // 找到要删除的评论
        const comment = post.comments.find(c => (c as any)._id.toString() === commentId);
        if (!comment) return res.status(404).json({ error: 'Comment not found' });

        // 获取当前用户信息
        const currentUser = await User.findById(userId);
        if (!currentUser) return res.status(401).json({ error: 'User not found' });

        // 检查权限：只有评论作者、帖子作者或管理员可以删除评论
        const isCommentAuthor = comment.user.toString() === userId;
        const isPostAuthor = post.author.toString() === userId;
        const isAdmin = currentUser.isAdmin === true;

        if (!isCommentAuthor && !isPostAuthor && !isAdmin) {
            return res.status(403).json({ error: 'You do not have permission to delete this comment' });
        }

        // 删除评论
        post.comments = post.comments.filter(c => (c as any)._id.toString() !== commentId);
        await post.save();

        res.json({ message: 'Comment deleted successfully' });
    } catch (error) {
        res.status(400).json({ error: 'Failed to delete comment' });
    }
};
// POST /posts/:id/save - Toggle save post
export const toggleSave = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const userId = req.userId;
        const SavedPost = (await import('../models/SavedPost')).default;

        const post = await Post.findById(id);
        if (!post) return res.status(404).json({ error: 'Post not found' });

        const savedPost = await SavedPost.findOne({ user: userId, post: id });
        let isSaved = false;

        if (savedPost) {
            // Unsave
            await SavedPost.deleteOne({ _id: savedPost._id });
            post.saveCount = Math.max(0, (post.saveCount || 0) - 1);
            isSaved = false;
        } else {
            // Save
            await SavedPost.create({ user: userId, post: id });
            post.saveCount = (post.saveCount || 0) + 1;
            isSaved = true;
        }

        await post.save();

        res.json({
            isSaved,
            saveCount: post.saveCount
        });
    } catch (error) {
        console.error('Toggle save error:', error);
        res.status(500).json({ error: 'Failed to toggle save' });
    }
};

// GET /posts/pending - 获取待审核帖子列表（仅管理员）
export const getPendingPosts = async (req: AuthRequest, res: Response) => {
    try {
        // 权限检查：仅管理员可访问
        const currentUser = await User.findById(req.userId);
        if (!currentUser?.isAdmin) {
            return res.status(403).json({ error: '无权限访问' });
        }

        const posts = await Post.find({ status: 'pending' })
            .populate('author', 'username avatarUrl level')
            .populate('relatedTask', 'title coverImageUrl')
            .populate('remixTask', 'title coverImageUrl')
            .sort({ createdAt: -1 });

        res.json(posts);
    } catch (error) {
        console.error('getPendingPosts error:', error);
        res.status(500).json({ error: 'Failed to fetch pending posts' });
    }
};

// POST /posts/:id/review - 审核帖子（仅管理员）
export const reviewPost = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { action } = req.body; // 'approve' | 'reject'

        // 权限检查：仅管理员可操作
        const currentUser = await User.findById(req.userId);
        if (!currentUser?.isAdmin) {
            return res.status(403).json({ error: '无权限操作' });
        }

        if (!['approve', 'reject'].includes(action)) {
            return res.status(400).json({ error: '无效的操作类型' });
        }

        const post = await Post.findById(id);
        if (!post) {
            return res.status(404).json({ error: '帖子不存在' });
        }

        if (post.status !== 'pending') {
            return res.status(400).json({ error: '该帖子已被审核' });
        }

        // 更新状态
        post.status = action === 'approve' ? 'approved' : 'rejected';
        post.reviewedBy = req.userId as any;
        post.reviewedAt = new Date();
        await post.save();

        // 发送通知给作者
        const notificationMessage = action === 'approve'
            ? '您的帖子已通过审核，现在其他用户可以看到了'
            : '您的帖子未通过审核';

        await createNotificationInternal(
            post.author.toString(),
            action === 'approve' ? 'post_approved' : 'post_rejected',
            undefined,
            id as string,
            notificationMessage
        );

        res.json({
            message: action === 'approve' ? '帖子已通过' : '帖子已拒绝',
            post
        });
    } catch (error) {
        console.error('reviewPost error:', error);
        res.status(500).json({ error: 'Failed to review post' });
    }
};

// GET /posts/reported - 获取被举报的帖子列表（仅管理员）
export const getReportedPosts = async (req: AuthRequest, res: Response) => {
    try {
        // 权限检查：仅管理员可访问
        const currentUser = await User.findById(req.userId);
        if (!currentUser?.isAdmin) {
            return res.status(403).json({ error: '无权限访问' });
        }

        const posts = await Post.find({ reportCount: { $gt: 0 } })
            .populate('author', 'username avatarUrl level')
            .populate('reportedBy', 'username avatarUrl')
            .sort({ reportCount: -1, createdAt: -1 });

        res.json(posts);
    } catch (error) {
        console.error('getReportedPosts error:', error);
        res.status(500).json({ error: 'Failed to fetch reported posts' });
    }
};

// POST /posts/:id/report-action - 处理举报（仅管理员）
export const handlePostReport = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { action, reason } = req.body; // action: 'dismiss' | 'accept'

        // 权限检查：仅管理员可操作
        const currentUser = await User.findById(req.userId);
        if (!currentUser?.isAdmin) {
            return res.status(403).json({ error: '无权限操作' });
        }

        if (!['dismiss', 'accept'].includes(action)) {
            return res.status(400).json({ error: '无效的操作类型' });
        }

        const post = await Post.findById(id);
        if (!post) {
            return res.status(404).json({ error: '帖子不存在' });
        }

        if (action === 'dismiss') {
            // 驳回举报：清空举报记录
            post.reportedBy = [];
            post.reportCount = 0;
            await post.save();

            // 通知举报者（可选）
            return res.json({
                message: '举报已驳回',
                reason: reason || '经审核，该内容不违规'
            });
        } else {
            // 接受举报：下架内容
            post.status = 'rejected';
            post.deleteReason = reason || '因被举报违规，已下架';
            post.deletedBy = req.userId as any;
            post.deletedAt = new Date();
            await post.save();

            // 通知作者
            await createNotificationInternal(
                post.author.toString(),
                'post_removed',
                undefined,
                id as string,
                `您的帖子因被举报已下架${reason ? '，原因：' + reason : ''}`
            );

            return res.json({
                message: '举报已接受，帖子已下架',
                post
            });
        }
    } catch (error) {
        console.error('handlePostReport error:', error);
        res.status(500).json({ error: 'Failed to handle report' });
    }
};
