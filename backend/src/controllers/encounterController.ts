import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import Task from '../models/Task';
import TaskExecution from '../models/TaskExecution';
import UserEncounter from '../models/UserEncounter';
import User from '../models/User';

// 环境变量：调试模式强制100%触发
const DEBUG_MODE = process.env.SERENDIPITY_DEBUG_MODE === 'true';

/**
 * 检查奇遇是否因倒计时过期
 * 如果过期，删除奇遇记录和执行记录
 * @returns true 如果过期并已删除，false 如果未过期
 */
const checkAndDeleteExpiredCountdown = async (
    encounterId: string,
    taskId: string,
    userId: string
): Promise<boolean> => {
    try {
        // 获取任务信息
        const task: any = await Task.findById(taskId);
        if (!task?.nodes?.[0]?.timeLimit) return false;

        const timeLimit = task.nodes[0].timeLimit;
        if (timeLimit.type !== 'countdown' || !timeLimit.countdownMinutes) return false;

        // 获取执行记录
        const execution = await TaskExecution.findOne({
            user: userId,
            task: taskId
        }).sort({ updatedAt: -1 });

        if (!execution?.startTime) return false;

        // 计算是否超时
        const startTime = new Date(execution.startTime).getTime();
        const totalMs = timeLimit.countdownMinutes * 60 * 1000;
        const endTime = startTime + totalMs;
        const now = Date.now();

        if (now > endTime) {
            // 倒计时已过期，删除奇遇和执行记录
            console.log(`[Serendipity] Countdown expired for encounter ${encounterId}, deleting...`);
            await UserEncounter.findByIdAndDelete(encounterId);
            await TaskExecution.deleteMany({ user: userId, task: taskId });
            return true;
        }

        return false;
    } catch (error) {
        console.error('checkAndDeleteExpiredCountdown error:', error);
        return false;
    }
};

/**
 * 模糊匹配问答答案
 * 规则：忽略大小写、去除首尾空格、包含匹配
 */
const fuzzyMatch = (userInput: string, correctAnswers: string[]): boolean => {
    const normalizedInput = userInput.trim().toLowerCase();
    return correctAnswers.some(answer => {
        const normalizedAnswer = answer.trim().toLowerCase();
        // 包含匹配：用户输入包含正确答案，或正确答案包含用户输入
        return normalizedInput.includes(normalizedAnswer) || normalizedAnswer.includes(normalizedInput);
    });
};

/**
 * POST /encounters/check-trigger
 * 在任务执行过程中检查是否触发奇遇
 */
export const checkAndTriggerSerendipity = async (req: AuthRequest, res: Response) => {
    try {
        const { executionId } = req.body;
        const userId = req.userId;

        console.log(`[Serendipity] Check requested for User: ${userId}, Exec: ${executionId}`);

        if (!executionId) {
            return res.status(400).json({ error: 'executionId is required' });
        }

        // 0. 检查用户是否开启了随机奇遇功能
        const user = await User.findById(userId);
        if (user?.preferences?.randomEncounter === false) {
            console.log(`[Serendipity] BLOCKED: User disabled random encounters`);
            return res.json({ triggered: false, reason: 'user_disabled' });
        }

        // 1. 允许多个奇遇同时进行（已移除单奇遇限制）
        // 之前的逻辑会检查是否已有进行中的奇遇，现在不再限制

        // 2. 获取当前任务执行信息
        const execution = await TaskExecution.findById(executionId).populate('task');
        if (!execution || !execution.task) {
            console.log(`[Serendipity] ERROR: Execution not found`);
            return res.status(404).json({ error: 'Execution not found' });
        }

        const task = execution.task as any;
        console.log(`[Serendipity] Current Task: ${task.title}, Cities: ${JSON.stringify(task.targetCities)}`);


        // 3.1 检查该 Execution 是否已有奇遇记录
        const existingEncounters = await UserEncounter.find({
            triggerTaskExecution: executionId
        }).sort({ createdAt: -1 });

        // 如果已有 active 的奇遇，直接返回它，不要创建新的
        const activeEncounter = existingEncounters.find(e => e.status === 'active');
        if (activeEncounter) {
            console.log(`[Serendipity] Returning existing ACTIVE encounter: ${activeEncounter._id}`);
            return res.json({
                triggered: true,
                encounter: {
                    _id: activeEncounter._id,
                    serendipityTask: await Task.findById(activeEncounter.serendipityTask), // 需要 populate
                    expiresAt: activeEncounter.expiresAt,
                    hasTimeWindow: false, // 简化处理，若需要可查原任务
                    hasQA: activeEncounter.qaAttempts !== undefined
                }
            });
        }

        // 3.2 触发次数限制：每个 Execution 最多触发 2 次
        if (existingEncounters.length >= 2) {
            console.log(`[Serendipity] BLOCKED: Reached max encounters limit (2) for this execution`);
            return res.json({ triggered: false, reason: 'limit_reached' });
        }

        // 获取节点信息
        const nodeCount = task.nodes?.length || 0;
        const completedCount = execution.completedNodes?.length || 0;

        // 分段线性插值：计算累计概率 C(k)
        const getCumulativeProbability = (k: number): number => {
            if (k <= 0) return 0;
            if (k <= 5) return 0.03 * k;
            if (k <= 8) return 0.15 + 0.0833 * (k - 5);
            if (k <= 12) return 0.40 + 0.025 * (k - 8);
            if (k <= 18) return 0.50 + 0.05 * (k - 12);
            return 0.80;
        };

        // 计算单次判定概率 p_k = (C(k) - C(k-1)) / (1 - C(k-1))
        const getSingleProbability = (k: number): number => {
            const Ck = getCumulativeProbability(k);
            const Ck_1 = getCumulativeProbability(k - 1);
            if (Ck_1 >= 1) return 0;
            return (Ck - Ck_1) / (1 - Ck_1);
        };

        let probability: number;

        if (DEBUG_MODE) {
            probability = 1.0;
            console.log(`[Serendipity] DEBUG MODE: probability = 100%`);
        } else if (existingEncounters.length === 1) {
            // 第二次触发：固定 2% 概率
            probability = 0.02;
            console.log(`[Serendipity] 2nd encounter attempt, probability = 2%`);
        } else {
            // 第一次触发：根据已完成节点数计算
            probability = getSingleProbability(completedCount);
            console.log(`[Serendipity] 1st attempt, completed=${completedCount}, probability=${(probability * 100).toFixed(2)}%`);
        }

        if (Math.random() > probability) {
            console.log(`[Serendipity] Failed probability check`);
            return res.json({ triggered: false, reason: 'probability_miss' });
        }

        // 4. 查找匹配城市的奇遇任务
        const cities = task.targetCities?.length > 0 ? task.targetCities : ['全国'];

        const matchQuery = {
            taskType: 'serendipity',
            status: 'approved',
            isDeleted: { $ne: true },
            $or: [
                { targetCities: { $in: cities } },
                { targetCities: { $in: ['全国'] } },
                { targetCities: { $size: 0 } }  // 空数组视为全国
            ]
        };
        console.log(`[Serendipity] Querying tasks with cities: ${JSON.stringify(cities)}`);

        const serendipityTasks = await Task.aggregate([
            { $match: matchQuery },
            { $sample: { size: 1 } }
        ]);

        if (!serendipityTasks.length) {
            console.log(`[Serendipity] NO MATCHING TASKS FOUND. Query:`, JSON.stringify(matchQuery));
            return res.json({ triggered: false, reason: 'no_matching_serendipity' });
        }

        const serendipityTask = serendipityTasks[0];
        console.log(`[Serendipity] TRIGGERED! Task: ${serendipityTask.title} (${serendipityTask._id})`);

        // 5. 创建用户奇遇记录
        const expiryDays = serendipityTask.serendipityConfig?.expiryDays || 3;
        const encounter = new UserEncounter({
            user: userId,
            serendipityTask: serendipityTask._id,
            triggerTaskExecution: executionId,
            status: 'active',
            triggeredAt: new Date(),
            expiresAt: new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000),
            qaAttempts: 0,
            qaUserInputs: []
        });
        await encounter.save();

        // 返回触发的奇遇信息（用于弹窗）
        res.json({
            triggered: true,
            encounter: {
                _id: encounter._id,
                serendipityTask: serendipityTask,
                expiresAt: encounter.expiresAt,
                hasTimeWindow: serendipityTask.serendipityConfig?.executionWindow?.enabled || false,
                hasQA: serendipityTask.qaModule?.enabled || false
            }
        });
    } catch (error) {
        console.error('checkAndTriggerSerendipity error:', error);
        res.status(500).json({ error: 'Failed to check serendipity trigger' });
    }
};

/**
 * POST /encounters/:id/accept
 * 用户接受奇遇任务
 */
export const acceptEncounter = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const encounter = await UserEncounter.findById(id).populate('serendipityTask');

        if (!encounter) {
            return res.status(404).json({ error: 'Encounter not found' });
        }

        if (encounter.user.toString() !== req.userId) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        // 已经是 active 状态，返回成功
        res.json({
            message: '奇遇任务已添加到"进行中"列表，请在3天内完成，否则将失效！',
            encounter
        });
    } catch (error) {
        res.status(400).json({ error: 'Failed to accept encounter' });
    }
};

/**
 * POST /encounters/:id/validate
 * 验证并完成奇遇（三重校验）
 */
export const validateAndCompleteSerendipity = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { userInput } = req.body;
        const userId = req.userId;

        const encounter = await UserEncounter.findById(id).populate('serendipityTask');

        if (!encounter) {
            return res.status(404).json({ error: 'Encounter not found' });
        }

        if (encounter.user.toString() !== userId) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const task = encounter.serendipityTask as any;
        const now = new Date();

        // 校验A: 生命周期检查
        if (now > encounter.expiresAt) {
            await UserEncounter.findByIdAndDelete(id);
            return res.json({
                success: false,
                reason: 'expired',
                message: '任务已过期失效',
                deleted: true
            });
        }

        // 校验B: 执行时段检查
        const window = task.serendipityConfig?.executionWindow;
        if (window?.enabled) {
            const currentTime = now.toTimeString().slice(0, 5); // "HH:MM"
            if (currentTime < window.startTime || currentTime > window.endTime) {
                return res.json({
                    success: false,
                    reason: 'time_window',
                    message: `未到特定时间，无法感应奇遇（可执行时间：${window.startTime}-${window.endTime}）`
                });
            }
        }

        // 校验C: 问答验证
        if (task.qaModule?.enabled) {
            if (!userInput) {
                return res.json({
                    success: false,
                    reason: 'qa_required',
                    message: '请回答问题',
                    question: task.qaModule.question,
                    remainingAttempts: (task.qaModule.maxAttempts || 3) - encounter.qaAttempts
                });
            }

            const isCorrect = fuzzyMatch(userInput, task.qaModule.correctAnswers);

            if (!isCorrect) {
                encounter.qaAttempts += 1;
                encounter.qaUserInputs.push(userInput);
                await encounter.save();

                const maxAttempts = task.qaModule.maxAttempts || 3;
                if (encounter.qaAttempts >= maxAttempts) {
                    // 失败：直接删除，不保存历史
                    await UserEncounter.findByIdAndDelete(id);
                    return res.json({
                        success: false,
                        reason: 'qa_failed',
                        message: '回答错误次数过多，奇遇与你擦肩而过',
                        deleted: true
                    });
                }

                return res.json({
                    success: false,
                    reason: 'qa_wrong',
                    message: `回答错误（${encounter.qaAttempts}/${maxAttempts}）`,
                    remainingAttempts: maxAttempts - encounter.qaAttempts
                });
            }
        }

        // 全部校验通过
        encounter.status = 'completed';
        encounter.completedAt = now;
        await encounter.save();

        // 同时将执行记录标记为已完成，以便下次可以创建新的执行记录
        await TaskExecution.updateMany(
            { user: userId, task: task._id, status: { $ne: 'completed' } },
            { $set: { status: 'completed' } }
        );

        res.json({
            success: true,
            message: task.serendipityConfig?.successMessage || '恭喜你完成奇遇！',
            encounter
        });
    } catch (error) {
        console.error('validateAndCompleteSerendipity error:', error);
        res.status(500).json({ error: 'Failed to validate encounter' });
    }
};

/**
 * GET /encounters/my-completed
 * 获取用户已完成的奇遇列表（用于发帖关联）
 */
export const getMyCompletedEncounters = async (req: AuthRequest, res: Response) => {
    try {
        const encounters = await UserEncounter.find({
            user: req.userId,
            status: 'completed'
        })
            .populate('serendipityTask', 'title description coverImageUrl qaModule serendipityConfig')
            .sort({ completedAt: -1 });

        res.json(encounters);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch completed encounters' });
    }
};

/**
 * GET /encounters/history
 * 获取用户奇遇历史
 */
export const getEncounterHistory = async (req: AuthRequest, res: Response) => {
    try {
        const history = await UserEncounter.find({
            user: req.userId,
            status: { $ne: 'abandoned' }
        })
            .populate('serendipityTask', 'title description coverImageUrl')
            .sort({ createdAt: -1 });
        res.json(history);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch history' });
    }
};

/**
 * GET /encounters/active
 * 获取用户当前活动的奇遇
 */
export const getActiveEncounter = async (req: AuthRequest, res: Response) => {
    try {
        const encounters = await UserEncounter.find({
            user: req.userId,
            status: 'active'
        }).populate('serendipityTask');

        if (!encounters || encounters.length === 0) {
            return res.json({ hasActive: false });
        }

        // 检查每个奇遇是否过期（包括倒计时过期）
        const validEncounters = [];
        for (const encounter of encounters) {
            const task = encounter.serendipityTask as any;

            // 检查生命周期过期
            if (new Date() > encounter.expiresAt) {
                await UserEncounter.findByIdAndDelete(encounter._id);
                continue;
            }

            // 检查倒计时过期
            const isCountdownExpired = await checkAndDeleteExpiredCountdown(
                encounter._id.toString(),
                task._id.toString(),
                req.userId as string
            );
            if (isCountdownExpired) {
                continue;
            }

            validEncounters.push(encounter);
        }

        if (validEncounters.length === 0) {
            return res.json({ hasActive: false, expired: true });
        }

        // 返回第一个有效的奇遇（保持向后兼容）
        res.json({
            hasActive: true,
            encounter: validEncounters[0],
            encounters: validEncounters // 同时返回所有有效奇遇
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch active encounter' });
    }
};

/**
 * POST /encounters/debug-trigger (仅开发环境)
 * 强制触发奇遇（调试用）
 */
export const debugTriggerSerendipity = async (req: AuthRequest, res: Response) => {
    if (process.env.NODE_ENV === 'production') {
        return res.status(403).json({ error: 'Debug endpoint not available in production' });
    }

    // 临时设置 DEBUG_MODE 为 true 并调用触发逻辑
    const originalDebugMode = process.env.SERENDIPITY_DEBUG_MODE;
    process.env.SERENDIPITY_DEBUG_MODE = 'true';

    try {
        await checkAndTriggerSerendipity(req, res);
    } finally {
        process.env.SERENDIPITY_DEBUG_MODE = originalDebugMode;
    }
};

/**
 * DELETE /encounters/:id/abandon
 * 放弃/删除奇遇任务
 */
export const abandonEncounter = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const userId = req.userId;

        const encounter = await UserEncounter.findOne({ _id: id, user: userId });

        if (!encounter) {
            return res.status(404).json({ error: 'Encounter not found' });
        }

        if (encounter.status === 'completed') {
            return res.status(400).json({ error: 'Cannot abandon completed encounter' });
        }

        // 更新状态为 abandoned
        encounter.status = 'abandoned';
        await encounter.save();

        console.log(`[Serendipity] User ${userId} abandoned encounter ${id}`);

        res.json({ success: true, message: 'Encounter abandoned successfully' });
    } catch (error) {
        console.error('Abandon encounter error:', error);
        res.status(500).json({ error: 'Failed to abandon encounter' });
    }
};

/**
 * GET /encounters/:id/detail
 * 获取奇遇详情（含任务和执行记录）
 */
export const getEncounterDetail = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const userId = req.userId;

        const encounter = await UserEncounter.findOne({ _id: id, user: userId })
            .populate({
                path: 'serendipityTask',
                populate: {
                    path: 'author',
                    select: 'username displayName avatarUrl'
                }
            });

        if (!encounter) {
            return res.status(404).json({ error: 'Encounter not found' });
        }

        const task = encounter.serendipityTask as any;

        // 检查倒计时是否过期（仅对进行中的奇遇检查）
        if (encounter.status === 'active') {
            const isExpired = await checkAndDeleteExpiredCountdown(id as string, task._id.toString(), userId as string);
            if (isExpired) {
                return res.json({
                    expired: true,
                    message: '奇遇倒计时已结束，任务失效'
                });
            }
        }

        // 获取关联的执行记录（优先获取未完成的，如果没有则获取最近完成的）
        let execution = await TaskExecution.findOne({
            user: userId,
            task: task._id,
            status: { $in: ['new', 'scheduled', 'ongoing'] }
        }).sort({ updatedAt: -1 });

        // 如果没有进行中的执行记录，尝试获取已完成的（用于查看历史瞬间记录）
        if (!execution) {
            execution = await TaskExecution.findOne({
                user: userId,
                task: task._id
            }).sort({ updatedAt: -1 });
        }

        res.json({
            encounter: {
                _id: encounter._id,
                status: encounter.status,
                triggeredAt: encounter.triggeredAt,
                completedAt: encounter.completedAt,
                expiresAt: encounter.expiresAt,
                qaAttempts: encounter.qaAttempts
            },
            task: {
                _id: task._id,
                title: task.title,
                description: task.description,
                coverImageUrl: task.coverImageUrl,
                nodes: task.nodes,
                targetCities: task.targetCities,
                serendipityConfig: task.serendipityConfig,
                author: task.author
            },
            execution: execution ? {
                _id: execution._id,
                nodeRecords: execution.nodeRecords,
                completedNodes: execution.completedNodes,
                startTime: execution.startTime,
                status: execution.status
            } : null
        });
    } catch (error) {
        console.error('Get encounter detail error:', error);
        res.status(500).json({ error: 'Failed to get encounter detail' });
    }
};

/**
 * DELETE /encounters/:id
 * 删除奇遇记录（支持所有状态）
 */
export const deleteEncounter = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const userId = req.userId;

        const encounter = await UserEncounter.findOne({ _id: id, user: userId });

        if (!encounter) {
            return res.status(404).json({ error: 'Encounter not found' });
        }

        // 删除奇遇记录
        await UserEncounter.findByIdAndDelete(id);

        console.log(`[Serendipity] User ${userId} deleted encounter ${id}`);

        res.json({ success: true, message: 'Encounter deleted successfully' });
    } catch (error) {
        console.error('Delete encounter error:', error);
        res.status(500).json({ error: 'Failed to delete encounter' });
    }
};
