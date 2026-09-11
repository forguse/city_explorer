import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import Post from '../models/Post';
import Task from '../models/Task';

// GET /search/comprehensive?q=keyword
export const searchComprehensive = async (req: AuthRequest, res: Response) => {
    try {
        const { q, page = 1, limit = 20 } = req.query;

        if (!q || typeof q !== 'string') {
            return res.status(400).json({ error: 'Search query is required' });
        }

        const keyword = q.trim();
        // Escape special regex characters to avoid errors
        const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regexPattern = escapedKeyword;
        const regexOptions = 'i';

        const pageNum = Number(page) || 1;
        const limitNum = Number(limit) || 20;
        const skip = (pageNum - 1) * limitNum;

        // Pipeline for Posts
        const pipeline = [
            // 1. Initial Match (Optimization)
            {
                $match: {
                    content: { $regex: regexPattern, $options: regexOptions },
                    // isDeleted: { $ne: true } // Assuming schema has this or not
                }
            },
            // 2. Calculate Score
            {
                $addFields: {
                    score: {
                        $cond: [
                            { $regexMatch: { input: '$content', regex: regexPattern, options: regexOptions } },
                            1,
                            0
                        ]
                    },
                    type: 'post',
                    // Generate a "title" from content for UI consistency
                    title: { $concat: [{ $substrCP: ['$content', 0, 20] }, "..."] }
                }
            },
            // 3. Project common fields
            {
                $project: {
                    _id: 1,
                    title: 1,
                    content: 1,
                    coverImage: { $ifNull: [{ $arrayElemAt: ['$images', 0] }, null] },
                    // author is ObjectId, needed for lookup later
                    author: 1,
                    createdAt: 1,
                    score: 1,
                    type: 1
                }
            },
            // 4. Union with Tasks
            {
                $unionWith: {
                    coll: 'tasks',
                    pipeline: [
                        {
                            $match: {
                                $or: [
                                    { title: { $regex: regexPattern, $options: regexOptions } },
                                    { description: { $regex: regexPattern, $options: regexOptions } }
                                ],
                                isDeleted: { $ne: true },
                                status: 'approved',
                                taskType: { $ne: 'serendipity' }  // 隐藏奇遇任务
                            }
                        },
                        {
                            $addFields: {
                                score: {
                                    $add: [
                                        // 10 pts for Title
                                        {
                                            $cond: [
                                                { $regexMatch: { input: '$title', regex: regexPattern, options: regexOptions } },
                                                10,
                                                0
                                            ]
                                        },
                                        // 5 pts for Description
                                        {
                                            $cond: [
                                                { $regexMatch: { input: '$description', regex: regexPattern, options: regexOptions } },
                                                5,
                                                0
                                            ]
                                        }
                                    ]
                                },
                                type: 'task',
                                // Map description to content
                                content: '$description'
                            }
                        },
                        {
                            $project: {
                                _id: 1,
                                title: 1,
                                content: 1,
                                coverImage: '$coverImageUrl',
                                author: 1,
                                createdAt: 1,
                                score: 1,
                                type: 1,
                                difficulty: 1,
                                location: 1
                            }
                        }
                    ]
                }
            },
            // 5. Global Sort & Pagination
            { $sort: { score: -1, createdAt: -1 } },
            { $skip: skip },
            { $limit: limitNum },
            // 6. Populate Author Info (Since Author is ObjectId, we need to lookup)
            // Note: $lookup might be expensive on large datasets, but for paged results it's okay-ish.
            {
                $lookup: {
                    from: 'users',
                    localField: 'author',
                    foreignField: '_id',
                    as: 'authorInfo'
                }
            },
            {
                $unwind: { path: '$authorInfo', preserveNullAndEmptyArrays: true }
            },
            {
                $project: {
                    _id: 1,
                    title: 1,
                    content: 1,
                    coverImage: 1,
                    score: 1,
                    type: 1,
                    difficulty: 1,
                    location: 1,
                    createdAt: 1,
                    author: {
                        _id: '$authorInfo._id',
                        username: '$authorInfo.username',
                        avatarUrl: '$authorInfo.avatarUrl'
                    }
                }
            }
        ];

        const results = await Post.aggregate(pipeline as any[]);

        res.json(results);

    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ error: 'Search failed' });
    }
};
