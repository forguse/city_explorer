import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import TaskExecution from '../models/TaskExecution';
import UserReward from '../models/UserReward';
import Task from '../models/Task';
import User from '../models/User';
import { getSocketIO } from '../socket';

// GET /executions/mine
export const getMyExecutions = async (req: AuthRequest, res: Response) => {
    try {
        const executions = await TaskExecution.find({ user: req.userId })
            .populate({
                path: 'task',
                select: 'title coverImageUrl coverImage difficulty location description isOfficial isAI nodes prepListConfig prepList clubId timeConfig' // 包含备战清单配置、社团ID和时间配置
            })
            .sort({ updatedAt: -1 });
        res.json(executions);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch executions' });
    }
};

// GET /executions/task/:taskId - 获取指定任务的执行记录（如果不存在则创建）
export const getOrCreateExecution = async (req: AuthRequest, res: Response) => {
    try {
        const { taskId } = req.params;
        console.log(`[getOrCreateExecution] Request for taskId: ${taskId}, userId: ${req.userId}`);

        if (!taskId || taskId === 'undefined' || taskId === 'null') {
            console.error('[getOrCreateExecution] Invalid taskId:', taskId);
            return res.status(400).json({ error: 'Invalid Task ID' });
        }

        // 检查任务是否存在
        const task: any = await Task.findById(taskId);
        if (!task) return res.status(404).json({ error: 'Task not found' });

        // 查找现有执行记录 (排除已完成的，以支持重新开始)
        let execution = await TaskExecution.findOne({
            user: req.userId,
            task: taskId,
            status: { $ne: 'completed' }
        }).populate('task').populate('coopContext.participants', 'username avatarUrl');

        if (!execution && task.timeConfig?.isEventTask) {
            const end = task.timeConfig.eventEndDate ? new Date(task.timeConfig.eventEndDate) : null;
            if (end && new Date() > end) {
                return res.status(403).json({ error: '活动已结束，无法参与', code: 'EVENT_ENDED' });
            }
        }

        // 如果不存在，创建新的
        if (!execution) {
            // 从任务的 prepListConfig 构建初始准备清单
            const prepProgress = (task.prepListConfig || []).map((config: any) => ({
                configId: config._id,
                title: config.title,
                kind: config.type,
                isCompleted: false,
                note: '',
                data: {}
            }));

            // 如果没有配置，使用默认清单
            if (prepProgress.length === 0) {
                prepProgress.push(
                    { configId: undefined, title: '门票', kind: 'ticket', isCompleted: false, note: '', data: {} },
                    { configId: undefined, title: '车票', kind: 'transport', isCompleted: false, note: '', data: {} },
                    { configId: undefined, title: '住宿', kind: 'lodging', isCompleted: false, note: '', data: {} },
                    { configId: undefined, title: '证件', kind: 'documents', isCompleted: false, note: '', data: {} },
                    { configId: undefined, title: '其他', kind: 'other', isCompleted: false, note: '', data: {} }
                );
            }

            execution = await TaskExecution.create({
                user: req.userId,
                task: taskId,
                status: 'new',
                prepProgress,
                completedNodes: [],
                startTime: new Date()  // 设置开始时间，用于倒计时
            });

            execution = await TaskExecution.findById(execution._id).populate('task').populate('coopContext.participants', 'username avatarUrl');
        } else if (execution.prepProgress.length === 0) {
            // Repair: If execution exists but prepProgress is empty, re-initialize it
            // 无论任务是否有自定义备战配置，都需要初始化
            console.log('[getOrCreateExecution] Repairing empty prepProgress for execution:', execution._id);
            const prepProgress = (task.prepListConfig || []).map((config: any) => ({
                configId: config._id,
                title: config.title,
                kind: config.type,
                isCompleted: false,
                note: '',
                data: {}
            }));

            // 如果任务没有自定义配置，使用系统默认的5个备战项
            if (prepProgress.length === 0) {
                prepProgress.push(
                    { configId: undefined, title: '门票', kind: 'ticket', isCompleted: false, note: '', data: {} },
                    { configId: undefined, title: '车票', kind: 'transport', isCompleted: false, note: '', data: {} },
                    { configId: undefined, title: '住宿', kind: 'lodging', isCompleted: false, note: '', data: {} },
                    { configId: undefined, title: '证件', kind: 'documents', isCompleted: false, note: '', data: {} },
                    { configId: undefined, title: '其他', kind: 'other', isCompleted: false, note: '', data: {} }
                );
            }
            execution.prepProgress = prepProgress as any;
            await execution.save();
        }

        if (!execution) return res.status(500).json({ error: 'Failed to initialize execution' });

        if (execution.coopContext && !execution.coopContext.isHost && execution.coopContext.hostExecutionId) {
            console.log('[getOrCreateExecution] Guest execution detected, fetching host...');
            console.log('[getOrCreateExecution] Guest execution participants (before merge):', execution.coopContext.participants);

            const hostExecution: any = await TaskExecution.findById(execution.coopContext.hostExecutionId)
                .populate('coopContext.participants', 'username avatarUrl');

            console.log('[getOrCreateExecution] Host execution found:', !!hostExecution);
            if (hostExecution) {
                console.log('[getOrCreateExecution] Host participants:', hostExecution.coopContext?.participants);

                const merged = execution.toObject();
                merged.status = hostExecution.status;
                merged.completedNodes = hostExecution.completedNodes;
                merged.nodeStartTimes = hostExecution.nodeStartTimes;
                merged.startTime = hostExecution.startTime;
                merged.nodeRecords = hostExecution.nodeRecords; // 合并节点记录（包含QA结果）
                merged.task = (execution as any).task; // Keep populated task
                merged.coopContext = merged.coopContext || { isHost: false, participants: [] };
                merged.coopContext.participants = hostExecution.coopContext?.participants || [];

                console.log('[getOrCreateExecution] Merged participants:', merged.coopContext.participants);
                res.json(merged);
                return;
            }
        }

        res.json(execution);
    } catch (error) {
        console.error('Get/Create execution error:', error);
        res.status(500).json({ error: `Failed to get or create execution: ${error instanceof Error ? error.message : String(error)}` });
    }
};

// GET /executions/:id - 获取单个执行记录详情
export const getExecutionById = async (req: AuthRequest, res: Response) => {
    try {
        const { executionId } = req.params;

        const execution = await TaskExecution.findOne({
            _id: executionId,
            user: req.userId
        }).populate('task').populate('coopContext.participants', 'username avatarUrl');

        if (!execution) return res.status(404).json({ error: 'Execution not found' });

        // Co-op Merge Logic
        if (execution.coopContext && !execution.coopContext.isHost && execution.coopContext.hostExecutionId) {
            const hostExecution: any = await TaskExecution.findById(execution.coopContext.hostExecutionId)
                .populate('coopContext.participants', 'username avatarUrl');
            if (hostExecution) {
                // Merge Host State into Response (Do not save to DB)
                const merged = execution.toObject();
                merged.status = hostExecution.status;
                merged.completedNodes = hostExecution.completedNodes;
                merged.nodeStartTimes = hostExecution.nodeStartTimes;
                merged.startTime = hostExecution.startTime;
                merged.nodeRecords = hostExecution.nodeRecords; // 合并节点记录（包含QA结果）
                merged.coopContext = merged.coopContext || { isHost: false, participants: [] };
                merged.coopContext.participants = hostExecution.coopContext?.participants || [];
                return res.json(merged);
            }
        }

        res.json(execution);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch execution' });
    }
};

// POST /executions/task/:taskId/schedule - schedule a task execution
export const scheduleExecution = async (req: AuthRequest, res: Response) => {
    try {
        const { taskId } = req.params;
        const { scheduledStartTime } = req.body;

        if (!taskId || taskId === 'undefined' || taskId === 'null') {
            return res.status(400).json({ error: 'Invalid Task ID' });
        }

        const scheduleDate = new Date(scheduledStartTime);
        if (!scheduledStartTime || Number.isNaN(scheduleDate.getTime())) {
            return res.status(400).json({ error: 'Invalid scheduledStartTime' });
        }

        const task: any = await Task.findById(taskId);
        if (!task) return res.status(404).json({ error: 'Task not found' });

        // Event Task Validation - only validate if task has actual event dates
        if (task.timeConfig?.isEventTask && (task.timeConfig.eventStartDate || task.timeConfig.eventEndDate)) {
            const start = task.timeConfig.eventStartDate ? new Date(task.timeConfig.eventStartDate) : null;
            const end = task.timeConfig.eventEndDate ? new Date(task.timeConfig.eventEndDate) : null;
            const now = new Date();

            // 1. Check if event has ended (cannot schedule past event)
            if (end && now > end) {
                return res.status(400).json({ error: '活动已结束，无法预约' });
            }

            // 2. Check if scheduled time is within event window
            if (start && scheduleDate < start) {
                return res.status(400).json({ error: '预约时间不能早于活动开始时间' });
            }
            if (end && scheduleDate > end) {
                return res.status(400).json({ error: '预约时间不能晚于活动结束时间' });
            }
        }

        // 查找未完成的执行记录
        let execution = await TaskExecution.findOne({ user: req.userId, task: taskId, status: { $ne: 'completed' } });

        if (!execution) {
            // 检查是否有已完成的记录（用于重新开始）
            const completedExecution = await TaskExecution.findOne({ user: req.userId, task: taskId, status: 'completed' });
            if (completedExecution) {
                console.log('[scheduleExecution] Found completed execution, creating new one for restart');
            }

            const prepProgress = (task.prepListConfig || []).map((config: any) => ({
                configId: config._id,
                title: config.title,
                kind: config.type,
                isCompleted: false,
                note: '',
                data: {}
            }));

            if (prepProgress.length === 0) {
                prepProgress.push(
                    { configId: undefined, title: '门票', kind: 'ticket', isCompleted: false, note: '', data: {} },
                    { configId: undefined, title: '车票', kind: 'transport', isCompleted: false, note: '', data: {} },
                    { configId: undefined, title: '住宿', kind: 'lodging', isCompleted: false, note: '', data: {} },
                    { configId: undefined, title: '证件', kind: 'documents', isCompleted: false, note: '', data: {} },
                    { configId: undefined, title: '其他', kind: 'other', isCompleted: false, note: '', data: {} }
                );
            }

            execution = await TaskExecution.create({
                user: req.userId,
                task: taskId,
                status: 'scheduled',  // 预约状态
                prepProgress,
                completedNodes: [],
                scheduledStartTime: scheduleDate
            });
        } else {
            // 更新现有的未完成执行记录
            execution.status = 'scheduled';  // 预约状态
            execution.scheduledStartTime = scheduleDate;
            execution.startTime = undefined as any;
            await execution.save();
        }

        execution = await TaskExecution.findById(execution._id).populate('task');
        res.json(execution);
    } catch (error) {
        console.error('Schedule execution error:', error);
        res.status(500).json({ error: 'Failed to schedule execution' });
    }
};

// POST /executions/task/:taskId/start - start execution immediately
export const startExecution = async (req: AuthRequest, res: Response) => {
    try {
        const { taskId } = req.params;

        if (!taskId || taskId === 'undefined' || taskId === 'null') {
            return res.status(400).json({ error: 'Invalid Task ID' });
        }

        const task: any = await Task.findById(taskId);
        if (!task) return res.status(404).json({ error: 'Task not found' });

        // Check Event Task Time Limits
        if (task.timeConfig?.isEventTask) {
            const now = new Date();
            const start = task.timeConfig.eventStartDate;
            const end = task.timeConfig.eventEndDate;

            if (start && now < new Date(start)) {
                return res.status(400).json({ error: '活动尚未开始', startTime: start });
            }
            if (end && now > new Date(end)) {
                return res.status(400).json({ error: '活动已结束', endTime: end });
            }
        }

        // 查找未完成的执行记录
        let execution = await TaskExecution.findOne({ user: req.userId, task: taskId, status: { $ne: 'completed' } });

        if (!execution) {
            // 检查是否有已完成的记录（用于重新开始）
            const completedExecution = await TaskExecution.findOne({ user: req.userId, task: taskId, status: 'completed' });
            if (completedExecution) {
                console.log('[startExecution] Found completed execution, creating new one for restart');
            }

            const prepProgress = (task.prepListConfig || []).map((config: any) => ({
                configId: config._id,
                title: config.title,
                kind: config.type,
                isCompleted: false,
                note: '',
                data: {}
            }));

            if (prepProgress.length === 0) {
                prepProgress.push(
                    { configId: undefined, title: '门票', kind: 'ticket', isCompleted: false, note: '', data: {} },
                    { configId: undefined, title: '车票', kind: 'transport', isCompleted: false, note: '', data: {} },
                    { configId: undefined, title: '住宿', kind: 'lodging', isCompleted: false, note: '', data: {} },
                    { configId: undefined, title: '证件', kind: 'documents', isCompleted: false, note: '', data: {} },
                    { configId: undefined, title: '其他', kind: 'other', isCompleted: false, note: '', data: {} }
                );
            }

            execution = await TaskExecution.create({
                user: req.userId,
                task: taskId,
                status: 'ongoing',
                prepProgress,
                completedNodes: [],
                startTime: new Date(),
                nodeStartTimes: new Map([['0', new Date()]])  // 第一个节点的开始时间
            });
        } else {

            // 修复空的 prepProgress
            if (execution.prepProgress.length === 0) {
                console.log('[startExecution] Repairing empty prepProgress for execution:', execution._id);
                const prepProgress = (task.prepListConfig || []).map((config: any) => ({
                    configId: config._id,
                    title: config.title,
                    kind: config.type,
                    isCompleted: false,
                    note: '',
                    data: {}
                }));

                if (prepProgress.length === 0) {
                    prepProgress.push(
                        { configId: undefined, title: '门票', kind: 'ticket', isCompleted: false, note: '', data: {} },
                        { configId: undefined, title: '车票', kind: 'transport', isCompleted: false, note: '', data: {} },
                        { configId: undefined, title: '住宿', kind: 'lodging', isCompleted: false, note: '', data: {} },
                        { configId: undefined, title: '证件', kind: 'documents', isCompleted: false, note: '', data: {} },
                        { configId: undefined, title: '其他', kind: 'other', isCompleted: false, note: '', data: {} }
                    );
                }
                execution.prepProgress = prepProgress as any;
            }

            execution.status = 'ongoing';
            execution.startTime = new Date();
            execution.scheduledStartTime = undefined as any;
            await execution.save();
        }

        execution = await TaskExecution.findById(execution._id).populate('task');
        res.json(execution);
    } catch (error) {
        console.error('Start execution error:', error);
        res.status(500).json({ error: 'Failed to start execution' });
    }
};

// PUT /executions/:id/prep
export const updatePrepProgress = async (req: AuthRequest, res: Response) => {
    try {
        const { executionId } = req.params;
        const { prepItemId, isCompleted, note, data, title, kind, attachmentUrl } = req.body;

        const execution = await TaskExecution.findOne({ _id: executionId, user: req.userId });
        if (!execution) return res.status(404).json({ error: 'Execution not found' });

        const prepItem = execution.prepProgress.find((p: any) =>
            p._id?.toString() === prepItemId ||
            p.configId?.toString() === prepItemId ||
            p.title === title
        );
        if (!prepItem) return res.status(404).json({ error: 'Prep item not found' });

        // 更新基本字段
        if (isCompleted !== undefined) prepItem.isCompleted = isCompleted;
        if (note !== undefined) prepItem.note = note;
        if (kind !== undefined) prepItem.kind = kind;
        if (attachmentUrl !== undefined) prepItem.attachmentUrl = attachmentUrl;

        // 更新扩展数据
        if (data !== undefined) {
            prepItem.data = { ...(prepItem.data || {}), ...data };
        }

        await execution.save();
        res.json(execution);
    } catch (error) {
        res.status(400).json({ error: 'Update failed', details: error });
    }
};

// PUT /executions/:id/prep-batch - 批量更新所有准备项
export const updateAllPrepProgress = async (req: AuthRequest, res: Response) => {
    try {
        const { executionId } = req.params;
        const { prepProgress } = req.body; // 完整的准备清单数组

        const execution = await TaskExecution.findOne({ _id: executionId, user: req.userId });
        if (!execution) return res.status(404).json({ error: 'Execution not found' });

        // 替换整个准备清单
        execution.prepProgress = prepProgress;

        await execution.save();
        res.json(execution);
    } catch (error) {
        res.status(400).json({ error: 'Batch update failed', details: error });
    }
};

// POST /executions/:id/node/record (Save Node Record without completing)
export const saveNodeRecord = async (req: AuthRequest, res: Response) => {
    try {
        const { executionId } = req.params;
        const { nodeIndex, note, imageUrl, imageUrls } = req.body;

        const execution = await TaskExecution.findOne({ _id: executionId, user: req.userId });
        if (!execution) return res.status(404).json({ error: 'Execution not found' });

        // Update or Push record
        const existingRecordIndex = execution.nodeRecords?.findIndex((r: any) => r.nodeIndex === nodeIndex);

        if (execution.nodeRecords && existingRecordIndex !== undefined && existingRecordIndex !== -1) {
            // Update existing
            execution.nodeRecords[existingRecordIndex].note = note;
            if (imageUrl !== undefined) execution.nodeRecords[existingRecordIndex].imageUrl = imageUrl;
            if (imageUrls !== undefined) execution.nodeRecords[existingRecordIndex].imageUrls = imageUrls;
            execution.nodeRecords[existingRecordIndex].recordedAt = new Date();
        } else {
            // Push new
            if (!execution.nodeRecords) execution.nodeRecords = [];
            execution.nodeRecords.push({
                nodeIndex,
                note,
                imageUrl,
                imageUrls,
                recordedAt: new Date()
            });
        }

        await execution.save();
        res.json(execution);
    } catch (error) {
        res.status(400).json({ error: 'Save record failed', details: error });
    }
};

// PUT /executions/:id/node
export const checkNode = async (req: AuthRequest, res: Response) => {
    try {
        const { executionId } = req.params;
        const { nodeIndex } = req.body; // Index of the node in Task.nodes

        const execution = await TaskExecution.findOne({ _id: executionId, user: req.userId });
        if (!execution) return res.status(404).json({ error: 'Execution not found' });

        // Auto-heal: Ensure completedNodes only contains valid numbers
        execution.completedNodes = execution.completedNodes.filter((n: any) => typeof n === 'number' && !isNaN(n));

        if (!execution.completedNodes.includes(nodeIndex)) {
            execution.completedNodes.push(nodeIndex);
            // Change status to ongoing if it was new
            if (execution.status === 'new') execution.status = 'ongoing';

            // 设置下一个节点的开始时间
            const nextNodeIndex = nodeIndex + 1;
            if (!execution.nodeStartTimes) {
                execution.nodeStartTimes = new Map();
            }
            // 如果下一个节点的开始时间还没设置，则设置它
            if (!execution.nodeStartTimes.get(String(nextNodeIndex))) {
                execution.nodeStartTimes.set(String(nextNodeIndex), new Date());
            }

            await execution.save();

            // 发送 Socket 事件通知所有队友
            // 如果是协作任务，通知所有参与者
            if (execution.coopContext) {
                const roomId = execution.coopContext.isHost
                    ? execution._id.toString()
                    : execution.coopContext.hostExecutionId?.toString();

                if (roomId) {
                    console.log(`[Socket] Emitting execution-updated to room: execution:${roomId}`);
                    const io = getSocketIO();
                    io.to(`execution:${roomId}`).emit('execution-updated', {
                        executionId: roomId,
                        completedNodes: execution.completedNodes,
                        status: execution.status,
                        nodeStartTimes: execution.nodeStartTimes
                    });
                }
            }
        }

        res.json(execution);
    } catch (error) {
        res.status(400).json({ error: 'Check-in failed', details: error });
    }
};

// Helper to check time constraints
const checkTimeConstraint = (limit: any, start: Date | string | number | undefined, end: Date | string | number | undefined): boolean => {
    if (!limit || limit.type === 'none' || !start || !end) return true;

    const startTime = new Date(start).getTime();
    const endTime = new Date(end).getTime();

    // Countdown
    if (limit.type === 'countdown' && limit.countdownMinutes) {
        const durationMinutes = (endTime - startTime) / 1000 / 60;
        return durationMinutes <= limit.countdownMinutes;
    }

    // TimeParsing Helper
    const getDateFromTime = (timeStr: string, baseDate: Date) => {
        const [h, m] = timeStr.split(':').map(Number);
        const d = new Date(baseDate);
        d.setHours(h, m, 0, 0);
        return d;
    };

    // TimeRange
    if (limit.type === 'timeRange' && limit.timeRangeStart && limit.timeRangeEnd) {
        const baseDate = limit.timeRangeDate ? new Date(limit.timeRangeDate) : new Date(start);
        const rangeStart = getDateFromTime(limit.timeRangeStart, baseDate).getTime();
        let rangeEnd = getDateFromTime(limit.timeRangeEnd, baseDate).getTime();

        // Handle cross-day range if needed (e.g. 23:00 - 02:00)
        if (rangeEnd < rangeStart) rangeEnd += 24 * 60 * 60 * 1000;

        // Strict: Start >= RangeStart AND End <= RangeEnd
        return startTime >= rangeStart && endTime <= rangeEnd;
    }

    // Deadline
    if (limit.type === 'deadline' && limit.deadlineTime) {
        const baseDate = limit.deadlineDate ? new Date(limit.deadlineDate) : new Date(end);
        const deadline = getDateFromTime(limit.deadlineTime, baseDate).getTime();

        if (limit.deadlineType === 'before') {
            return endTime <= deadline;
        } else { // after
            return startTime >= deadline;
        }
    }

    return true;
};

// POST /executions/:id/complete
export const completeTask = async (req: AuthRequest, res: Response) => {
    try {
        const { executionId } = req.params;
        const { summaryNote, summaryImageUrl } = req.body;

        const execution = await TaskExecution.findOne({ _id: executionId, user: req.userId });
        if (!execution) return res.status(404).json({ error: 'Execution not found' });

        // Fetch task to check limits
        const task: any = await Task.findById(execution.task).populate('completionReward');

        // For co-op mode, get the host execution to check QA results
        let executionToCheck = execution;
        if (execution.coopContext?.isHost === false && execution.coopContext?.hostExecutionId) {
            // This is a guest execution, fetch host execution for QA validation
            const hostExecution = await TaskExecution.findById(execution.coopContext.hostExecutionId);
            if (hostExecution) {
                executionToCheck = hostExecution;
                console.log('[Backend] Guest completing task, using host execution for QA validation');
            }
        }

        // ---------------------------------------------------------
        // Calculate isSuccess (Check Time Limits)
        // ---------------------------------------------------------
        let isSuccess = true;
        const now = new Date();

        // 1. Check Overall Task Time Limit
        if (task.timeConfig?.taskTimeLimit?.type && task.timeConfig.taskTimeLimit.type !== 'none') {
            const limit = task.timeConfig.taskTimeLimit;
            // Let's implement a helper for checking constraints
            if (!checkTimeConstraint(limit, execution.startTime, now)) {
                isSuccess = false;
            }
        }

        // 2. Check Node Limits and QA
        if (isSuccess && task.nodes) {
            for (let i = 0; i < task.nodes.length; i++) {
                const node = task.nodes[i];

                // Time Limit Check
                if (node.timeLimit && node.timeLimit.type !== 'none') {
                    const nodeStartTime = execution.nodeStartTimes?.get(String(i)) || execution.startTime;
                    const record = execution.nodeRecords?.find((r: any) => r.nodeIndex === i);
                    const nodeEndTime = record ? new Date(record.recordedAt) : now;

                    if (!checkTimeConstraint(node.timeLimit, nodeStartTime, nodeEndTime)) {
                        isSuccess = false;
                        console.log(`[Backend] Node ${i} Time Limit failed.`);
                        break;
                    }
                }

                // QA Check - use executionToCheck (host execution for guests)
                if (node.qaModule?.enabled) {
                    const record = executionToCheck.nodeRecords?.find((r: any) => r.nodeIndex === i);
                    if (!record?.qaResult?.passed) {
                        isSuccess = false;
                        console.log(`[Backend] Node ${i} QA failed or not passed.`);
                        break;
                    }
                }
            }
        }

        console.log('[Backend] Completing execution:', executionId, 'isSuccess:', isSuccess);

        execution.status = 'completed';
        execution.completionTime = now;
        execution.isSuccess = isSuccess;
        if (summaryNote) execution.summaryNote = summaryNote;
        if (summaryImageUrl) execution.summaryImageUrl = summaryImageUrl;

        await execution.save();

        // Award Logic
        let newReward = null;

        if (task && task.completionReward && isSuccess) { // 只有成功完成才给奖励？用户需求没明确说，但通常是这样。
            // Wait, user said "成功完成加一个炫酷的tag，完成什么tag都别加".
            // "如果任务的每个节点包括整个任务有任何一个没有满足限时要求就点了完成的话，那任务最终完成会认为是完成而非成功完成"
            // Doesn't explicitly say reward is conditional, but usually reward is for success.
            // Let's assume reward is for success for now, OR keep it for completion but Tag differs.
            // User didn't say change reward logic. I'll keep reward logic as is (any completion gets reward? Or maybe just success?)
            // Given "成功完成" vs "完成" distinction, I will ONLY grant reward if isSuccess is true, to make it more meaningful?
            // "如果没有显示道德经那句话的页面... 区别于成功完成的增言页面"
            // I'll keep reward logic tied to COMPLETED for now to avoid breaking existing expectations unless asked.
            // Actually, let's keep it as is (grant on completion), but tag differs.

            // Check if user already has it
            const existing = await UserReward.findOne({
                user: req.userId,
                reward: task.completionReward._id
            });

            if (!existing) {
                // Grant reward
                await UserReward.create({
                    user: req.userId,
                    reward: task.completionReward._id
                });
                newReward = task.completionReward;
            }
        }

        // 通知用户自己（总是发送）
        const { createNotificationInternal } = await import('./notificationController');
        await createNotificationInternal(
            req.userId as string,
            'self_task_completed',
            undefined,
            task._id.toString(),
            isSuccess ?
                `恭喜！您成功完成了任务"${task.title}"` :
                `您已完成任务"${task.title}"，但未达成所有目标`
        );

        // 检查任务完成人数，达到里程碑时通知作者
        if (task.author.toString() !== req.userId) {
            // 获取该任务的总完成人数
            const completionCount = await TaskExecution.countDocuments({
                task: task._id,
                status: 'completed'
            });

            // 里程碑：10、50、100、500、1000人
            const milestones = [10, 50, 100, 500, 1000];
            if (milestones.includes(completionCount)) {
                await createNotificationInternal(
                    task.author.toString(),
                    'task_milestone',
                    undefined,
                    task._id.toString(),
                    `您的任务"${task.title}"已有${completionCount}人完成！`
                );
            }
        }

        // Populate participants before returning
        const populatedExecution = await TaskExecution.findById(execution._id)
            .populate('coopContext.participants', 'username avatarUrl')
            .populate('task');

        if (!populatedExecution) {
            return res.status(404).json({ error: 'Execution not found after save' });
        }

        // Return execution with newReward attached if any
        res.json({ ...populatedExecution.toObject(), newReward });
    } catch (error) {
        console.error('Task complete error:', error);
        res.status(400).json({ error: 'Completion failed', details: error });
    }
};

// DELETE /executions/:id
export const deleteExecution = async (req: AuthRequest, res: Response) => {
    try {
        const { executionId } = req.params;
        const execution = await TaskExecution.findOneAndDelete({
            _id: executionId,
            user: req.userId
        });

        if (!execution) {
            return res.status(404).json({ error: 'Execution not found' });
        }

        res.json({ message: 'Execution deleted successfully' });
    } catch (error) {
        console.error('Delete execution error:', error);
        res.status(500).json({ error: 'Failed to delete execution' });
    }
};

// POST /executions/:id/node/validate-qa
// POST /executions/:id/node/validate-qa
export const validateNodeQA = async (req: AuthRequest, res: Response) => {
    try {
        const { executionId } = req.params;
        const { nodeIndex, answer } = req.body;

        const execution = await TaskExecution.findOne({ _id: executionId, user: req.userId });
        if (!execution) return res.status(404).json({ error: 'Execution not found' });

        const task: any = await Task.findById(execution.task);
        if (!task) return res.status(404).json({ error: 'Task not found' });

        const node = task.nodes[nodeIndex];
        if (!node?.qaModule?.enabled) return res.json({ correct: true, message: 'No QA for this node' });

        // Normalize answer
        const input = (answer || '').trim().toLowerCase();
        const correctAnswers = node.qaModule.correctAnswers.map((a: string) => a.trim().toLowerCase());

        // Check match (fuzzy match as requested: input includes answer OR answer includes input)
        const isCorrect = correctAnswers.some((ans: string) => input.includes(ans) || ans.includes(input));

        // Update record
        let record = execution.nodeRecords?.find((r: any) => r.nodeIndex === nodeIndex);
        if (!record) {
            if (!execution.nodeRecords) execution.nodeRecords = [];
            record = { nodeIndex, recordedAt: new Date(), qaResult: { passed: false, attempts: 0 } };
            execution.nodeRecords.push(record);
            // We need to access the pushed object.
            record = execution.nodeRecords[execution.nodeRecords.length - 1];
        } else if (!record.qaResult) {
            record.qaResult = { passed: false, attempts: 0 };
        }

        // Update stats
        if (record.qaResult) {
            record.qaResult.lastInput = answer;
            if (!record.qaResult.passed) { // Only increment if not already passed
                // Don't increment if we are just re-submitting a passed one (though frontend shouldn't allow)
                // Actually, if it's already passed, we just return true.
                if (!isCorrect) {
                    record.qaResult.attempts += 1;
                }
            }

            if (isCorrect) {
                record.qaResult.passed = true;
            }

            // Check max attempts
            const maxAttempts = node.qaModule.maxAttempts || 3;

            if (!isCorrect && record.qaResult.attempts >= maxAttempts) {
                // FAILED TOO MANY TIMES

                if (task.taskType === 'serendipity') {
                    // Serendipity logic: Fail completely
                    await TaskExecution.findByIdAndDelete(executionId);
                    return res.status(400).json({
                        error: 'Check failed',
                        failed: true,
                        deleted: true,
                        message: 'QA failed too many times. Serendipity lost.'
                    });
                } else {
                    // Normal task logic: Auto-skip (mark as completed but NOT passed)
                    // We treat it as "completed" in terms of navigation, but "failed" in terms of QA.
                    // Frontend needs to know to move on.

                    // Mark node as completed in execution if not already
                    if (!execution.completedNodes.includes(nodeIndex)) {
                        execution.completedNodes.push(nodeIndex);

                        // Set next node start time
                        const nextNodeIndex = nodeIndex + 1;
                        if (!execution.nodeStartTimes) execution.nodeStartTimes = new Map();
                        if (!execution.nodeStartTimes.get(String(nextNodeIndex))) {
                            execution.nodeStartTimes.set(String(nextNodeIndex), new Date());
                        }
                    }

                    await execution.save();

                    return res.json({
                        correct: false,
                        attempts: record.qaResult.attempts,
                        passed: false,
                        failed_and_skipped: true,
                        message: '次数用尽，已自动跳过该挑战'
                    });
                }
            }
        }

        await execution.save();

        res.json({ correct: isCorrect, attempts: record.qaResult?.attempts, passed: record.qaResult?.passed });
    } catch (error) {
        console.error('Validate QA error:', error);
        res.status(500).json({ error: 'Validation failed', details: error });
    }
};
// POST /executions/:id/invite - Invite a friend to join execution
export const inviteFriend = async (req: AuthRequest, res: Response) => {
    try {
        const { executionId } = req.params;
        const { friendId } = req.body;
        const currentUserId = req.userId;
        const Notification = (await import('../models/Notification')).default;

        const execution = await TaskExecution.findOne({ _id: executionId, user: currentUserId });
        if (!execution) return res.status(404).json({ error: 'Execution not found' });

        // Check if Host
        if (execution.coopContext && !execution.coopContext.isHost) {
            return res.status(403).json({ error: 'Only the host can invite friends' });
        }

        // Check Team Size Limit (Max 18)
        const participantsCount = execution.coopContext?.participants?.length || 1;
        if (participantsCount >= 18) {
            return res.status(400).json({ error: '队伍人数已达上限 (18人)' });
        }

        const friend = await User.findById(friendId);
        if (!friend) return res.status(404).json({ error: 'User not found' });

        const currentUser = await User.findById(currentUserId);

        // Send Notification
        await Notification.create({
            recipient: friendId,
            sender: currentUserId,
            type: 'task_invite',
            referenceId: execution._id,
            content: `${currentUser?.username || '你的好友'} 邀请你一同参加任务`
        });

        // Ensure coopContext is initialized on Host
        if (!execution.coopContext) {
            execution.coopContext = {
                isHost: true,
                participants: [currentUserId as any]
            };
        }
        await execution.save();

        res.json({ success: true, message: 'Invite sent' });
    } catch (error) {
        console.error('Invite friend error:', error);
        res.status(500).json({ error: 'Failed to invite friend' });
    }
};

// POST /executions/join - Join a task via invite (referenceId=hostExecutionId)
export const joinTask = async (req: AuthRequest, res: Response) => {
    try {
        const { executionId } = req.body; // This is the Host's execution ID
        const currentUserId = req.userId;

        const hostExecution = await TaskExecution.findById(executionId);
        if (!hostExecution) return res.status(404).json({ error: 'Task execution not found' });

        // Check if already joined (or is host)
        const existing = await TaskExecution.findOne({
            user: currentUserId,
            task: hostExecution.task,
            status: { $ne: 'completed' }
        });

        if (existing) {
            // If already exists, just return it (maybe already joined)
            return res.json(existing);
        }

        // Add to Host's participants list
        console.log('[joinTask] Host execution before update:', {
            hasCoopContext: !!hostExecution.coopContext,
            participants: hostExecution.coopContext?.participants,
            hostUser: hostExecution.user
        });

        let needsSave = false;

        if (!hostExecution.coopContext) {
            hostExecution.coopContext = { isHost: true, participants: [hostExecution.user] };
            needsSave = true;
        }

        // Ensure host is in participants list
        if (!hostExecution.coopContext.participants) {
            hostExecution.coopContext.participants = [];
            needsSave = true;
        }
        if (!hostExecution.coopContext.participants.includes(hostExecution.user as any)) {
            hostExecution.coopContext.participants.push(hostExecution.user as any);
            needsSave = true;
        }

        // Add guest to participants list
        if (!hostExecution.coopContext.participants.includes(currentUserId as any)) {
            hostExecution.coopContext.participants.push(currentUserId as any);
            needsSave = true;
        }

        if (needsSave) {
            await hostExecution.save();

            // Broadcast participant update to all members in the room
            const roomId = hostExecution._id.toString();
            console.log(`[Socket] Broadcasting participant-joined to room: execution:${roomId}`);

            // Populate participants for the broadcast
            const populatedHost = await TaskExecution.findById(hostExecution._id)
                .populate('coopContext.participants', 'username avatarUrl');

            const io = getSocketIO();
            io.to(`execution:${roomId}`).emit('participant-joined', {
                executionId: roomId,
                participants: populatedHost?.coopContext?.participants || []
            });
        }

        console.log('[joinTask] Host execution after update:', {
            participants: hostExecution.coopContext.participants
        });

        // Create Guest Execution (Shadow)
        // Copy prepProgress init structure from host or task
        const guestExecution = await TaskExecution.create({
            user: currentUserId,
            task: hostExecution.task,
            status: 'ongoing', // Follow host status? Or just ongoing.
            startTime: hostExecution.startTime || new Date(),
            completedNodes: [], // Unused, read from Host
            coopContext: {
                isHost: false,
                hostExecutionId: hostExecution._id,
                participants: hostExecution.coopContext.participants // Initial sync
            },
            prepProgress: hostExecution.prepProgress.map((p: any) => ({ // Copy config but reset status
                configId: p.configId,
                title: p.title,
                kind: p.kind,
                isCompleted: false,
                note: '',
                data: {}
            }))
        });

        res.json(guestExecution);
    } catch (error) {
        console.error('Join task error:', error);
        res.status(500).json({ error: 'Failed to join task' });
    }
};

// GET /executions/:executionId/journal/:targetUserId
export const getExecutionJournal = async (req: AuthRequest, res: Response) => {
    try {
        const { executionId, targetUserId } = req.params;
        const currentUserId = req.userId;

        // 1. Verify Permission (Must be in same Co-op context or is viewing self)
        console.log(`[getExecutionJournal] executionId: ${executionId}, targetUserId: ${targetUserId}, requester: ${currentUserId}`);

        const contextExecution = await TaskExecution.findById(executionId);
        if (!contextExecution) return res.status(404).json({ error: 'Context execution not found' });

        // Ensure current user is part of this execution (either owner or participant)
        // Note: contextExecution might be the user's OWN execution, or a Host's.
        // If it's my execution, contextExecution.user === currentUserId.
        // If it's a team execution I joined, I should confirm I am in participants?
        // Actually, the frontend passes *my* execution ID (TaskReviewScreen uses execution._id).
        // So contextExecution should be "my" execution.

        if (contextExecution.user.toString() !== currentUserId) {
            // If I am requesting someone else's execution directly?
            // Technically I should be protected. But for now let's assume valid access if I'm checking my review page.
            // Let's enforce: I must be part of this "room".
            // If I am accessing "my" executionId, then user == me.
            // If I am accessing via a "room" ID (host ID), I must be in participants.
            const isParticipant = contextExecution.coopContext?.participants?.some(p => p.toString() === currentUserId);
            if (!isParticipant && contextExecution.user.toString() !== currentUserId) {
                return res.status(403).json({ error: 'Access denied' });
            }
        }

        // 2. Locate Target Execution
        let targetExecution: any = null;

        if (targetUserId === contextExecution.user.toString()) {
            // Viewing owner of this execution context (which is typically ME if I passed my ID)
            targetExecution = contextExecution;
        } else {
            // Viewing a teammate
            // We need to find the teammate's execution that shares the SAME Host/Room.
            const contextHostId = contextExecution.coopContext?.isHost
                ? contextExecution._id.toString()
                : contextExecution.coopContext?.hostExecutionId?.toString();

            if (!contextHostId) {
                // If no coop context, I can't see "teammates".
                // UNLESS, I am looking for "myself" using my own execution ID, which handled above.
                // So if here, trying to see someone else in a single-player run? Impossible.
                return res.status(404).json({ error: 'Teammate not found in this single-player execution' });
            }

            // Find execution where user is targetUserId AND hostExecutionId is match (or is Host and matches)
            // Query: User = target, Task = context.task (implied), AND ( (isHost=true AND _id=hostId) OR (hostExecutionId=hostId) )

            // Simplified: Find valid execution for targetUser on this task, then check context match.
            // But we can be more specific.
            targetExecution = await TaskExecution.findOne({
                user: targetUserId,
                task: contextExecution.task,
                status: { $ne: 'new' } // exclude new empty ones?
            }).populate('user', 'username avatarUrl level');

            // Verify they are in same group
            if (targetExecution) {
                const targetHostId = targetExecution.coopContext?.isHost
                    ? targetExecution._id.toString()
                    : targetExecution.coopContext?.hostExecutionId?.toString();

                if (targetHostId !== contextHostId) {
                    targetExecution = null; // Wrong session
                    console.log(`[getExecutionJournal] Mismatch session. MyHost: ${contextHostId}, TargetHost: ${targetHostId}`);
                }
            }
        }

        if (!targetExecution) {
            // Fallback/Retry: Maybe targetUser IS the host?
            // (Logic above handles it via targetHostId check, but explicit check doesn't hurt)
            // If targetExecution was null from findOne.
            return res.status(404).json({ error: 'Journal not found for this specific session' });
        }

        // Populate if not already (for self case)
        if (!targetExecution.populated('user')) {
            await targetExecution.populate('user', 'username avatarUrl level');
        }


        // 3. Fetch Host Progress (for "Passed" status logic)
        let hostCompletedNodesCount = 0;
        const contextHostId = contextExecution.coopContext?.isHost
            ? contextExecution._id.toString()
            : contextExecution.coopContext?.hostExecutionId?.toString();

        if (contextHostId) {
            if (targetExecution._id.toString() === contextHostId) {
                hostCompletedNodesCount = targetExecution.completedNodes.length;
            } else {
                const hostExec = await TaskExecution.findById(contextHostId);
                hostCompletedNodesCount = hostExec?.completedNodes.length || 0;
            }
        }

        // 4. Construct Response
        const journal = {
            user: targetExecution.user,
            status: targetExecution.status,
            completedNodesCount: targetExecution.completedNodes.length,
            hostCompletedNodesCount,
            nodeRecords: targetExecution.nodeRecords || [],
            summary: {
                note: targetExecution.summaryNote,
                imageUrl: targetExecution.summaryImageUrl,
                completedAt: targetExecution.completionTime
            }
        };

        res.json(journal);
    } catch (error) {
        console.error('Get journal error:', error);
        res.status(500).json({ error: 'Failed to fetch journal' });
    }
};
