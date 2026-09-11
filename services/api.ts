import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import { CapacitorHttp, HttpResponse } from '@capacitor/core';

// --- Configuration ---
// 检测运行环境并选择正确的 API URL
function getApiUrl(): string {
    // @ts-ignore - Vite env types
    if (import.meta.env.VITE_API_URL) {
        // @ts-ignore
        return import.meta.env.VITE_API_URL.replace(/\/$/, '');
    }

    // 检测是否在 Capacitor/Android 环境中运行
    // @ts-ignore
    const isCapacitor = window.Capacitor !== undefined;
    const isLocalFile = window.location.protocol === 'file:' || window.location.protocol === 'capacitor:';

    if (isCapacitor || isLocalFile) {
        // Capacitor 生产构建必须通过 VITE_API_URL 指定服务地址。
        // 本地 Android 调试可配合 adb reverse tcp:5000 tcp:5000 使用该默认值。
        console.warn('[API] VITE_API_URL is not set; falling back to local development API.');
        return 'http://localhost:5000';
    }

    // 生产环境：使用相对路径 /api，通过 Nginx 反向代理
    // 开发环境：使用 localhost:5000
    const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (isDev) {
        return `http://${window.location.hostname}:5000`;
    }

    // 生产环境使用 /api 前缀
    return '/api';
}

const API_URL = getApiUrl();
// @ts-ignore
const isCapacitor = typeof window.Capacitor !== 'undefined';

console.log('[API] Using API URL:', API_URL);
console.log('[API] Environment:', {
    protocol: window.location.protocol,
    hostname: window.location.hostname,
    origin: window.location.origin,
    isCapacitor: isCapacitor,
    VITE_API_URL: import.meta.env.VITE_API_URL
});

// --- HTTP Adapter ---
// 在 Capacitor 环境中使用 CapacitorHttp，在 Web 环境中使用 axios
interface ApiRequestConfig {
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    url: string;
    data?: any;
    params?: any;
    headers?: Record<string, string>;
}

interface ApiResponse<T = any> {
    data: T;
    status: number;
    headers: any;
}

async function makeRequest<T = any>(config: ApiRequestConfig): Promise<ApiResponse<T>> {
    const fullUrl = config.url.startsWith('http') ? config.url : `${API_URL}${config.url}`;

    // 对于 FormData 请求（如文件上传），使用原生 fetch
    // 因为 CapacitorHttp 不支持 FormData
    if (config.data instanceof FormData) {
        console.log('[API] Using native fetch for FormData request:', config.method, fullUrl);

        try {
            const headers: Record<string, string> = {};
            // 添加 Authorization header（如果有 token）
            const token = localStorage.getItem('token');
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
            // 注意：不要手动设置 Content-Type，让浏览器自动设置 multipart/form-data 和 boundary

            const response = await fetch(fullUrl, {
                method: config.method,
                headers,
                body: config.data
            });

            const data = await response.json();
            console.log('[API] Native fetch response:', response.status, data);

            if (!response.ok) {
                throw {
                    response: {
                        status: response.status,
                        data: data,
                        headers: {}
                    },
                    message: data.error || 'Request failed'
                };
            }

            return {
                data,
                status: response.status,
                headers: {}
            };
        } catch (error: any) {
            console.error('[API] Native fetch error:', error);
            if (error.response) {
                throw error;
            }
            throw {
                response: {
                    status: 0,
                    data: { error: error.message },
                    headers: {}
                },
                message: error.message || 'Network request failed'
            };
        }
    }

    if (isCapacitor) {
        // 使用 CapacitorHttp（绕过 CORS）
        // 过滤掉 undefined 和 null 值，避免被转换为字符串
        const cleanParams = config.params ? Object.fromEntries(
            Object.entries(config.params).filter(([_, v]) => v !== undefined && v !== null)
        ) : undefined;

        console.log('[API] Using CapacitorHttp for request:', config.method, fullUrl, 'params:', cleanParams);

        try {
            let response: HttpResponse;
            const headers = config.headers || {};

            // 添加 Content-Type
            if (!headers['Content-Type'] && config.data) {
                headers['Content-Type'] = 'application/json';
            }

            switch (config.method) {
                case 'GET':
                    response = await CapacitorHttp.get({
                        url: fullUrl,
                        headers,
                        params: cleanParams,
                        connectTimeout: 30000,
                        readTimeout: 30000
                    });
                    break;
                case 'POST':
                    response = await CapacitorHttp.post({
                        url: fullUrl,
                        headers,
                        data: config.data,
                        connectTimeout: 30000,
                        readTimeout: 30000
                    });
                    break;
                case 'PUT':
                    response = await CapacitorHttp.put({
                        url: fullUrl,
                        headers,
                        data: config.data,
                        connectTimeout: 30000,
                        readTimeout: 30000
                    });
                    break;
                case 'DELETE':
                    response = await CapacitorHttp.delete({
                        url: fullUrl,
                        headers,
                        connectTimeout: 30000,
                        readTimeout: 30000
                    });
                    break;
                default:
                    throw new Error(`Unsupported method: ${config.method}`);
            }

            console.log('[API] CapacitorHttp response:', response.status, response.data);

            return {
                data: response.data,
                status: response.status,
                headers: response.headers
            };
        } catch (error: any) {
            console.error('[API] CapacitorHttp error:', error);
            // 转换为类似 axios 的错误格式
            throw {
                response: {
                    status: error.status || 0,
                    data: error.data || { error: error.message },
                    headers: error.headers || {}
                },
                message: error.message || 'Network request failed'
            };
        }
    } else {
        // 使用 axios（Web 环境）
        // 过滤掉 undefined 和 null 值
        const cleanParams = config.params ? Object.fromEntries(
            Object.entries(config.params).filter(([_, v]) => v !== undefined && v !== null)
        ) : undefined;

        console.log('[API] Using axios for request:', config.method, fullUrl, 'params:', cleanParams);
        const axiosConfig: AxiosRequestConfig = {
            method: config.method,
            url: fullUrl,
            data: config.data,
            params: cleanParams,
            headers: config.headers
        };

        const response = await axios(axiosConfig);
        return {
            data: response.data,
            status: response.status,
            headers: response.headers
        };
    }
}

// 创建一个类似 axios 实例的 API 对象
const api = {
    defaults: {
        baseURL: API_URL,
        headers: {
            'Content-Type': 'application/json',
        }
    },
    get: <T = any>(url: string, config?: { params?: any; headers?: Record<string, string> }) =>
        makeRequest<T>({ method: 'GET', url, params: config?.params, headers: config?.headers }),
    post: <T = any>(url: string, data?: any, config?: { headers?: Record<string, string> }) =>
        makeRequest<T>({ method: 'POST', url, data, headers: config?.headers }),
    put: <T = any>(url: string, data?: any, config?: { headers?: Record<string, string> }) =>
        makeRequest<T>({ method: 'PUT', url, data, headers: config?.headers }),
    delete: <T = any>(url: string, config?: { data?: any; headers?: Record<string, string> }) =>
        makeRequest<T>({ method: 'DELETE', url, data: config?.data, headers: config?.headers }),
    interceptors: {
        request: {
            use: (onFulfilled: any, onRejected: any) => {
                // 存储拦截器以便后续使用
                api._requestInterceptor = { onFulfilled, onRejected };
            }
        },
        response: {
            use: (onFulfilled: any, onRejected: any) => {
                // 存储拦截器以便后续使用
                api._responseInterceptor = { onFulfilled, onRejected };
            }
        }
    },
    _requestInterceptor: null as any,
    _responseInterceptor: null as any
};

// --- Interceptors ---

// Request Interceptor: Add Token & Sensitive Word Check
import SensitiveFilter from '../src/utils/SensitiveFilter';

function checkSensitiveRecursively(obj: any): string[] {
    let found: string[] = [];
    if (!obj) return found;

    if (typeof obj === 'string') {
        const result = SensitiveFilter.check(obj);
        if (!result.isClean) {
            found.push(...result.matchedWords);
        }
    } else if (Array.isArray(obj)) {
        for (const item of obj) {
            found.push(...checkSensitiveRecursively(item));
        }
    } else if (typeof obj === 'object') {
        for (const key in obj) {
            // Optimization: Skip checking binary fields or huge data if needed, but for now check all
            found.push(...checkSensitiveRecursively(obj[key]));
        }
    }
    return found;
}

// 包装 makeRequest 以应用拦截器
const originalMakeRequest = makeRequest;
async function makeRequestWithInterceptors<T = any>(config: ApiRequestConfig): Promise<ApiResponse<T>> {
    try {
        // 应用请求拦截器
        // 1. Sensitive Word Check
        let sensitiveWords: string[] = [];

        // 跳过上传路由的敏感词检查（base64 数据会误触发）
        const isUploadRoute = config.url.includes('/upload');

        // Check params (GET query)
        if (config.params && !isUploadRoute) {
            sensitiveWords.push(...checkSensitiveRecursively(config.params));
        }

        // Check data (POST/PUT body) - Skip FormData (file uploads) and upload routes
        if (config.data && !(config.data instanceof FormData) && !isUploadRoute) {
            sensitiveWords.push(...checkSensitiveRecursively(config.data));
        }

        if (sensitiveWords.length > 0) {
            const uniqueWords = Array.from(new Set(sensitiveWords));
            const msg = `您的输入包含敏感词汇：${uniqueWords.join(', ')}，请修改后重试。`;
            alert(msg);
            throw new Error('SensitiveWordsDetected');
        }

        // 2. Add Token
        const token = localStorage.getItem('token');
        if (token) {
            if (!config.headers) {
                config.headers = {};
            }
            config.headers.Authorization = `Bearer ${token}`;
        }

        // 执行请求
        const response = await originalMakeRequest<T>(config);
        return response;
    } catch (error: any) {
        // 应用响应拦截器（错误处理）
        if (error.response) {
            // Handle 401 Unauthorized
            if (error.response.status === 401) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                if (window.location.pathname !== '/login') {
                    window.location.href = '/login';
                }
            }
            // Handle 429 Too Many Requests
            if (error.response.status === 429) {
                const msg = error.response.data?.error || '操作过于频繁，请稍后重试 (Too many requests, please try again later)';
                // @ts-ignore
                if (!window._rateLimitAlertShown) {
                    alert(msg);
                    // @ts-ignore
                    window._rateLimitAlertShown = true;
                    setTimeout(() => {
                        // @ts-ignore
                        window._rateLimitAlertShown = false;
                    }, 3000);
                }
                throw new Error('RateLimitExceeded');
            }
        }
        throw error;
    }
}

// 更新 api 对象以使用带拦截器的版本
api.get = <T = any>(url: string, config?: { params?: any; headers?: Record<string, string> }) =>
    makeRequestWithInterceptors<T>({ method: 'GET', url, params: config?.params, headers: config?.headers });
api.post = <T = any>(url: string, data?: any, config?: { headers?: Record<string, string> }) =>
    makeRequestWithInterceptors<T>({ method: 'POST', url, data, headers: config?.headers });
api.put = <T = any>(url: string, data?: any, config?: { headers?: Record<string, string> }) =>
    makeRequestWithInterceptors<T>({ method: 'PUT', url, data, headers: config?.headers });
api.delete = <T = any>(url: string, config?: { data?: any; headers?: Record<string, string> }) =>
    makeRequestWithInterceptors<T>({ method: 'DELETE', url, data: config?.data, headers: config?.headers });

// --- API Methods ---

export const auth = {
    register: (data: any) => api.post('/auth/register', data),
    login: (data: any) => api.post('/auth/login', data),
};

export const user = {
    getById: (id: string) => api.get(`/users/${id}`),
    getMe: () => api.get('/users/me'),
    updateMe: (data: any) => api.put('/users/me', data),
    getStats: (id: string) => api.get(`/users/${id}/stats`),
    getPosts: (id: string) => api.get(`/users/${id}/posts`),
    getTasks: (id: string) => api.get(`/users/${id}/tasks`),
    getCompletions: (id: string) => api.get(`/users/${id}/completions`),
    getFollowing: (id: string) => api.get(`/users/${id}/following`),
    getFollowers: (id: string) => api.get(`/users/${id}/followers`),
    toggleFollow: (id: string) => api.post(`/users/${id}/follow`),
    getSavedTasks: () => api.get('/users/saved-tasks'), // 获取收藏的任务
    getSavedPosts: () => api.get('/users/me/saved-posts'), // 获取收藏的帖子
    toggleSaveTask: (taskId: string) => api.post(`/users/tasks/${taskId}/save`), // 收藏/取消收藏任务
    // 好友系统
    searchUser: (query: string) => api.get('/users/search', { params: { query } }),
    getMyFriends: () => api.get('/users/me/friends'),
    sendFriendRequest: (targetUserId: string) => api.post('/users/friends/request', { targetUserId }),
    acceptFriendRequest: (requesterId: string, notificationId?: string) => api.post('/users/friends/accept', { requesterId, notificationId }),
    deleteFriend: (friendId: string) => api.delete(`/users/friends/${friendId}`),
    // 展示设置
    getShowcase: (id: string) => api.get(`/users/${id}/showcase`), // 获取用户展示的任务
    updateMyShowcase: (showcaseTaskIds: string[]) => api.put('/users/me/showcase', { showcaseTaskIds }), // 更新我的展示任务
};

export const task = {
    create: (data: any) => api.post('/tasks', data),
    getAll: (params?: any) => api.get('/tasks', { params }), // params: { page, limit, isOfficial, isAI }
    getTasks: (params?: any) => api.get('/tasks', { params }), // Alias for consistency
    getById: (id: string) => api.get(`/tasks/${id}`),
    join: (id: string) => api.post(`/tasks/${id}/join`),
    getMyTasks: () => api.get('/tasks/my'),
    update: (id: string, data: any) => api.put(`/tasks/${id}`, data),
    // 审核相关
    getPending: () => api.get('/tasks', { params: { status: 'pending' } }), // 获取待审核任务（审核空间用）
    review: (id: string, action: 'approve' | 'reject') => api.post(`/tasks/${id}/review`, { action }),
    report: (id: string) => api.post(`/tasks/${id}/report`), // 举报任务
    delete: (id: string) => api.delete(`/tasks/${id}`), // 软删除任务
    like: (id: string) => api.post(`/tasks/${id}/like`), // 点赞任务
    // 举报管理（管理员）
    getReported: () => api.get('/tasks/reported'), // 获取被举报任务
    handleReport: (id: string, action: 'dismiss' | 'accept', reason?: string) =>
        api.post(`/tasks/${id}/report-action`, { action, reason }), // 处理举报
    getRandomTask: (city?: string) => api.get('/tasks/random', { params: { city } }), // 随机任务
};

export const execution = {
    getMyExecutions: () => api.get('/executions/mine'),
    getOrCreate: (taskId: string) => api.get(`/executions/task/${taskId}`), // 获取或创建任务执行记录
    getById: (executionId: string) => api.get(`/executions/${executionId}`), // 获取单个执行记录
    schedule: (taskId: string, scheduledStartTime: string) =>
        api.post(`/executions/task/${taskId}/schedule`, { scheduledStartTime }),
    start: (taskId: string) => api.post(`/executions/task/${taskId}/start`),
    updatePrepStatus: (executionId: string, prepItemId: string, status: { isCompleted?: boolean, note?: string }) =>
        api.put(`/executions/${executionId}/prep`, { prepItemId, ...status }),
    updatePrepItem: (executionId: string, prepItemId: string, data: {
        isCompleted?: boolean;
        note?: string;
        kind?: string;
        attachmentUrl?: string;
        data?: {
            hotelName?: string;
            hotelAddress?: string;
            checkInTime?: string;
            checkOutTime?: string;
            trainNumber?: string;
            flightNumber?: string;
            departureTime?: string;
            arrivalTime?: string;
            ticketCode?: string;
            ticketQRCodeUrl?: string;
            documentType?: string;
            documentContent?: string;
            customFields?: Record<string, string>;
        };
    }) => api.put(`/executions/${executionId}/prep`, { prepItemId, ...data }),
    updatePrepBatch: (executionId: string, prepProgress: any[]) =>
        api.put(`/executions/${executionId}/prep-batch`, { prepProgress }), // 批量更新准备清单
    updateAllPrep: (executionId: string, items: any[]) => api.put(`/executions/${executionId}/prep-batch`, { items }),
    saveNodeRecord: (executionId: string, nodeIndex: number, data: { note?: string, imageUrl?: string, imageUrls?: string[] }) =>
        api.post(`/executions/${executionId}/node/record`, { nodeIndex, ...data }),
    validateNodeQA: (executionId: string, nodeIndex: number, answer: string) =>
        api.post(`/executions/${executionId}/node/validate-qa`, { nodeIndex, answer }),
    checkNode: (executionId: string, nodeId: string, method: string, location?: { lat: number, lng: number }, code?: string) =>
        api.put(`/executions/${executionId}/node`, { nodeIndex: Number(nodeId), nodeId, method, location, code }),
    complete: (executionId: string, data?: { summaryNote?: string; summaryImageUrl?: string | null }) => api.post(`/executions/${executionId}/complete`, data),
    delete: (executionId: string) => api.delete(`/executions/${executionId}`),
    inviteFriend: (executionId: string, friendId: string) => api.post(`/executions/${executionId}/invite`, { friendId }),
    joinTask: (executionId: string) => api.post('/executions/join', { executionId }),
    getJournal: (executionId: string, targetUserId: string) => api.get(`/executions/${executionId}/journal/${targetUserId}`),
};

export const club = {
    getAll: (params?: { keyword?: string; city?: string; page?: number; limit?: number }) =>
        api.get('/clubs', { params }),
    getMyClubs: () => api.get('/clubs/my'),
    getDetail: (id: string) => api.get(`/clubs/${id}`),
    create: (data: any) => api.post('/clubs', data),
    join: (id: string) => api.post(`/clubs/${id}/join`),
    // 申请加入社团（需要审核）
    apply: (id: string, message?: string) => api.post(`/clubs/${id}/apply`, { message }),
    getApplyStatus: (id: string) => api.get(`/clubs/${id}/apply/status`),
    // 入社申请管理（团长用）
    getJoinRequests: (id: string, status?: 'pending' | 'approved' | 'rejected' | 'all') =>
        api.get(`/clubs/${id}/join-requests`, { params: { status } }),
    getPendingRequestsCount: () => api.get('/clubs/join-requests/pending-count'),
    reviewJoinRequest: (clubId: string, requestId: string, action: 'approve' | 'reject', rejectReason?: string) =>
        api.post(`/clubs/${clubId}/join-requests/${requestId}/review`, { action, rejectReason }),
    leave: (id: string) => api.post(`/clubs/${id}/leave`),
    dissolve: (id: string) => api.delete(`/clubs/${id}`),
    updateAnnouncement: (id: string, announcement: string) =>
        api.put(`/clubs/${id}/announcement`, { announcement }),
    getClubTasks: (id: string, status?: 'active' | 'all') =>
        api.get(`/clubs/${id}/tasks`, { params: { status } }),
    createActivity: (clubId: string, data: any) => api.post(`/clubs/${clubId}/activity`, data),
    cancelActivity: (clubId: string, taskId: string) =>
        api.delete(`/clubs/${clubId}/tasks/${taskId}`),
    registerActivity: (clubId: string, taskId: string) =>
        api.post(`/clubs/${clubId}/tasks/${taskId}/register`),
    cancelRegistration: (clubId: string, taskId: string) =>
        api.delete(`/clubs/${clubId}/tasks/${taskId}/register`),
    getActivities: () => api.get('/clubs/activity'),
    // 审核相关（管理员）
    getPending: () => api.get('/clubs/pending'),
    review: (id: string, action: 'approve' | 'reject') => api.post(`/clubs/${id}/review`, { action }),
};

export const team = {
    // 创建团队
    create: (data: { taskId: string; name?: string; timeLimit?: number }) =>
        api.post('/teams', data),
    // 通过邀请码加入团队
    join: (code: string) => api.post('/teams/join', { code }),
    // 获取我的团队列表
    getMyTeams: () => api.get('/teams/mine'),
    // 获取单个团队详情
    getById: (teamId: string) => api.get(`/teams/${teamId}`),
    // 开始团队任务
    start: (teamId: string) => api.post(`/teams/${teamId}/start`),
    // 更新成员状态
    updateStatus: (teamId: string, data: { status?: string; location?: { name?: string; latitude?: number; longitude?: number } }) =>
        api.put(`/teams/${teamId}/status`, data),
    // 完成节点
    completeNode: (teamId: string, nodeIndex: number) =>
        api.post(`/teams/${teamId}/node`, { nodeIndex }),
    // 离开团队
    leave: (teamId: string) => api.post(`/teams/${teamId}/leave`),
    // 拍一拍/提醒成员
    nudge: (teamId: string, targetUserId: string, type: 'nudge' | 'remind') =>
        api.post(`/teams/${teamId}/nudge/${targetUserId}`, { type }),
    // 获取邀请链接
    getInviteLink: (teamId: string) => api.get(`/teams/${teamId}/invite`),
};

export const community = {
    getFeed: (params?: { page?: number; limit?: number; city?: string }) => api.get('/posts/feed', { params }),
    getPostById: (id: string) => api.get(`/posts/${id}`),
    getPostsByTask: (taskId: string, params?: { sort?: 'hot' | 'recent' }) => api.get(`/posts/task/${taskId}`, { params }), // 获取任务相关的帖子
    createPost: (data: any) => api.post('/posts', data), // data: { content, imageUrls, relatedTask? }
    likePost: (id: string) => api.post(`/posts/${id}/like`),
    commentPost: (id: string, content: string, replyData?: { parentCommentId: string; replyToUserId: string; replyToUsername: string }) =>
        api.post(`/posts/${id}/comment`, { content, ...replyData }),
    likeComment: (postId: string, commentId: string) => api.post(`/posts/${postId}/comment/${commentId}/like`),  // 评论点赞
    deletePost: (id: string, reason?: string) => api.delete(`/posts/${id}`, { data: { reason } }),
    deleteComment: (postId: string, commentId: string) => api.delete(`/posts/${postId}/comment/${commentId}`),
    toggleSave: (id: string) => api.post(`/posts/${id}/save`), // 收藏/取消收藏帖子
    reportPost: (id: string) => api.post(`/posts/${id}/report`), // 举报帖子
    // 管理员审核
    getPendingPosts: () => api.get('/posts/pending'), // 获取待审核帖子（仅管理员）
    reviewPost: (id: string, action: 'approve' | 'reject') => api.post(`/posts/${id}/review`, { action }), // 审核帖子（仅管理员）
    // 举报管理（管理员）
    getReportedPosts: () => api.get('/posts/reported'), // 获取被举报帖子
    handlePostReport: (id: string, action: 'dismiss' | 'accept', reason?: string) =>
        api.post(`/posts/${id}/report-action`, { action, reason }), // 处理举报
};

export const encounter = {
    checkTrigger: (executionId: string) => api.post('/encounters/check-trigger', { executionId }),
    accept: (id: string) => api.post(`/encounters/${id}/accept`),
    validate: (id: string, userInput?: string) => api.post(`/encounters/${id}/validate`, { userInput }),
    abandon: (id: string) => api.delete(`/encounters/${id}/abandon`),
    getMyCompleted: () => api.get('/encounters/my-completed'),
    getActive: () => api.get('/encounters/active'),
    getHistory: () => api.get('/encounters/history'),
    getDetail: (id: string) => api.get(`/encounters/${id}/detail`),
    delete: (id: string) => api.delete(`/encounters/${id}`),
    debugTrigger: (executionId: string) => api.post('/encounters/debug-trigger', { executionId }),
};

export const utils = {
    parseTrip: (text: string) => api.post('/utils/trip-parse', { text }),
    importTrip: (tripData: { type: string; code: string; from: string; to: string; date: string }) =>
        api.post('/utils/trip-import', tripData),
    remixTask: (sourceTaskId: string) => api.post('/utils/remix', { sourceTaskId }),
    upload: (formData: FormData) => api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }),
    uploadBase64: (base64Image: string) => api.post('/upload/base64', { image: base64Image }),
};

export const message = {
    getConversations: () => api.get('/messages/conversations'),
    getConversation: (targetUserId: string) => api.get(`/messages/${targetUserId}`),
    send: (data: { receiverId: string; content: string; type?: 'text' | 'image' }) => api.post('/messages', data),
    getGroupMessages: (groupId: string) => api.get(`/messages/group/${groupId}`),
    sendGroupMessage: (groupId: string, content: string) => api.post(`/messages/group/${groupId}`, { content }),
};

export const reward = {
    getPending: () => api.get('/rewards/pending'),
    getMyRewards: (params?: { type?: 'badge' | 'album' }) => api.get('/rewards/my', { params }),
    create: (data: any) => api.post('/rewards', data),
};

export const proverb = {
    getMy: (params?: { type?: 'received' | 'sent' | 'gift' }) => api.get('/proverbs/my', { params }),
    getLBS: (lat: number, lng: number) => api.get('/proverbs/lbs', { params: { lat, lng } }),
    create: (data: any) => api.post('/proverbs', data), // { content, recipientId?, isReturnGift?, originId?, originType? }
    delete: (id: string) => api.delete(`/proverbs/${id}`),
    report: (id: string) => api.post(`/proverbs/${id}/report`),
};

export const notification = {
    getMine: () => api.get('/notifications'),
    markRead: (id: string) => api.post(`/notifications/${id}/read`),
};

export const feedback = {
    // 用户端
    create: (data: { type: string; relatedId?: string; content: string }) => api.post('/feedback', data),
    getMine: () => api.get('/feedback'),
    // 管理员端
    getAll: (status?: string) => api.get('/feedback/admin', { params: status ? { status } : {} }),
    process: (id: string, data: { status: 'approved' | 'rejected'; adminNote?: string; compensation?: { type: string; amount: number } }) =>
        api.put(`/feedback/${id}/process`, data),
};

export const search = {
    comprehensive: (query: string, page = 1) => api.get('/search/comprehensive', { params: { q: query, page } }),
};

// 举报管理（仅管理员）
export const report = {
    getAll: (status?: string) => api.get('/reports', { params: status ? { status } : {} }),
    getStats: () => api.get('/reports/stats'),
    approve: (id: string) => api.post(`/reports/${id}/approve`),
    reject: (id: string, reason?: string) => api.post(`/reports/${id}/reject`, { reason }),
};

export default api;
