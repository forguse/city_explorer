import React, { useState, useEffect } from 'react';
import { execution, user } from './services/api';
import { SocketProvider } from './src/contexts/SocketContext';

// Screen Components
import LoginScreen from './components/LoginScreen';
import HomeScreen from './components/HomeScreen';
import CommunityScreen from './components/CommunityScreen';
import ProfileScreen from './components/ProfileScreen';
import MyTasksScreen from './components/MyTasksScreen';
import MapScreen from './components/MapScreen';
import BottomNavigation from './components/BottomNavigation';

// Task Related Screens
import TaskDetailScreen from './components/TaskDetailScreen';
import TaskPreviewScreen from './components/TaskPreviewScreen';
import TaskPrepScreen from './components/TaskPrepScreen';
import TaskExecutionScreen from './components/TaskExecutionScreen';
import CreateTaskScreen from './components/CreateTaskScreen';
import TaskReviewScreen from './components/TaskReviewScreen';
import TaskReviewSpace from './components/TaskReviewSpace';
import TaskMapScreen from './components/TaskMapScreen';
import NavigationScreen from './components/NavigationScreen';

// User Related Screens
import EditProfileScreen from './components/EditProfileScreen';
import SettingsScreen from './components/SettingsScreen';
import HonorScreen from './components/HonorScreen';
import UserPostsScreen from './components/UserPostsScreen';
import UserFollowingScreen from './components/UserFollowingScreen';
import MyFriendsScreen from './components/MyFriendsScreen';
import ShowcaseManagementScreen from './components/ShowcaseManagementScreen';

// Community Related Screens
import PostDetailScreen from './components/PostDetailScreen';
import PublishPostScreen from './components/PublishPostScreen';
import ClubScreen from './components/ClubScreen';
import ClubDetailScreen from './components/ClubDetailScreen';
import ClubCreateScreen from './components/ClubCreateScreen';
import ClubChatScreen from './components/ClubChatScreen';
import ClubMyScreen from './components/ClubMyScreen';
import ClubJoinRequestsScreen from './components/ClubJoinRequestsScreen';
import ClubActivityScreen from './components/ClubActivityScreen';
import ClubEventDetailScreen from './components/ClubEventDetailScreen';

// Message Related Screens
import MessageScreen from './components/MessageScreen';
import ChatScreen from './components/ChatScreen';
import MyMessagesScreen from './components/MyMessagesScreen';
import MessageCardScreen from './components/MessageCardScreen';

// Special Feature Screens
import HiddenRewardScreen from './components/HiddenRewardScreen';
import RewardScreen from './components/RewardScreen';
import SponsorRewardScreen from './components/SponsorRewardScreen';
import CompletionScreen from './components/CompletionScreen';
import QuestScreen from './components/QuestScreen';
import EncounterScreen from './components/EncounterScreen';
import EncounterHistoryScreen from './components/EncounterHistoryScreen';
// import EncounterDetailScreen from './components/EncounterDetailScreen'; // Deprecated
import EncounterRecordScreen from './components/EncounterRecordScreen';
import SerendipityExecutionScreen from './components/SerendipityExecutionScreen';
import FocusModeScreen from './components/FocusModeScreen';
import RemixRouteScreen from './components/RemixRouteScreen';
import TripImportScreen from './components/TripImportScreen';
import HotTasksScreen from './components/HotTasksScreen';
import OfficialRecommendScreen from './components/OfficialRecommendScreen';
import TeamScreen from './components/TeamScreen';
import AchievementDetailScreen from './components/AchievementDetailScreen';

// Admin/Settings Screens
import FeedbackScreen from './components/FeedbackScreen';
import AdminFeedbackScreen from './components/AdminFeedbackScreen';
import GeneralSettingsScreen from './components/GeneralSettingsScreen';
import DeveloperOptionsScreen from './components/DeveloperOptionsScreen';
import ClipboardDetectScreen from './components/ClipboardDetectScreen';
import AdminPostReviewScreen from './components/AdminPostReviewScreen';
import ReportManagementScreen from './components/ReportManagementScreen';
import UserAgreementScreen from './components/UserAgreementScreen';
import PrivacyPolicyScreen from './components/PrivacyPolicyScreen';
import AboutScreen from './components/AboutScreen';

// Screen type definition
type ScreenType =
    | 'home'
    | 'community'
    | 'profile'
    | 'my-tasks'
    | 'map'
    | 'task-detail'
    | 'task-preview'
    | 'task-prep'
    | 'task-execution'
    | 'task-review'
    | 'task-map'
    | 'create-task'
    | 'navigation'
    | 'edit-profile'
    | 'settings'
    | 'general-settings'
    | 'developer-options'
    | 'about' // Added
    | 'honor'
    | 'user-posts'
    | 'user-following'
    | 'post-detail'
    | 'publish-post'
    | 'club'
    | 'club-detail'
    | 'club-create'
    | 'club-chat'
    | 'club-my'
    | 'club-activity'
    | 'club-activity-create'
    | 'club-event-detail'
    | 'message'
    | 'chat'
    | 'my-messages'
    | 'message-card'
    | 'hidden-reward'
    | 'reward'
    | 'sponsor-reward'
    | 'completion'
    | 'quest'
    | 'encounter'
    | 'encounter-history'
    | 'serendipity-execution'
    | 'encounter-detail'
    | 'focus-mode'
    | 'remix-route'
    | 'trip-import'
    | 'hot-tasks'
    | 'official-recommend'
    | 'team'
    | 'achievement-detail'
    | 'feedback'
    | 'admin-feedback'
    | 'clipboard-detect'
    | 'other-profile'
    | 'admin-task-review'
    | 'admin-post-review'
    | 'admin-report-management'
    | 'my-friends'
    | 'club-join-requests'
    | 'showcase-management'
    | 'user-agreement'
    | 'privacy-policy';

const App: React.FC = () => {
    // Auth state
    const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
        return !!localStorage.getItem('token');
    });

    // 启动时验证 token 是否有效
    React.useEffect(() => {
        const validateToken = async () => {
            const token = localStorage.getItem('token');
            if (!token) return;

            try {
                // 尝试获取用户信息来验证 token
                const { user } = await import('./services/api');
                await user.getMe();
            } catch (err: any) {
                // 如果 token 无效（401/403），清除本地存储
                const status = err.response?.status || err.status;
                if (status === 401 || status === 403) {
                    console.log('Token invalid, clearing localStorage');
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    setIsLoggedIn(false);
                }
            }
        };
        validateToken();
    }, []);

    // Navigation state
    const [currentScreen, setCurrentScreen] = useState<ScreenType>('home');
    const [prevScreen, setPrevScreen] = useState<ScreenType | null>(null);
    const [screenHistory, setScreenHistory] = useState<ScreenType[]>([]); // History of PREVIOUS screens only
    const currentScreenRef = React.useRef<ScreenType>(currentScreen);

    // Keep ref in sync with state
    React.useEffect(() => {
        currentScreenRef.current = currentScreen;
    }, [currentScreen]);

    // Context state (for passing data between screens)
    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
    const [selectedClubId, setSelectedClubId] = useState<string | null>(null);
    const [selectedClubData, setSelectedClubData] = useState<any>(null);
    const [selectedEventData, setSelectedEventData] = useState<any>(null);
    const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
    const [selectedEncounterId, setSelectedEncounterId] = useState<string | null>(null);
    const [chatUser, setChatUser] = useState<any>(null);
    const [prepTask, setPrepTask] = useState<any>(null);
    const [taskForReview, setTaskForReview] = useState<any>(null);
    const [hotTasksTab, setHotTasksTab] = useState<'recent' | 'hot'>('hot');
    const [userPostsData, setUserPostsData] = useState<{ userId: string; userName: string } | null>(null);
    const [userFollowingData, setUserFollowingData] = useState<{ userId: string; userName: string } | null>(null);
    const [remixSourceTaskId, setRemixSourceTaskId] = useState<string | null>(null);
    const [navContext, setNavContext] = useState<any>(null);
    const [prepContext, setPrepContext] = useState<{ autoStart?: boolean } | null>(null);
    const [publishPostTaskId, setPublishPostTaskId] = useState<string | null>(null); // 分享成就时关联的任务ID
    const [publishPostEncounterId, setPublishPostEncounterId] = useState<string | null>(null); // 分享奇遇时关联的奇遇ID
    const [showcaseUserId, setShowcaseUserId] = useState<string | null>(null); // 展示管理的用户ID
    const [showcaseCompletedTasks, setShowcaseCompletedTasks] = useState<any[]>([]); // 用户已完成的任务列表
    // Lifted state for MyTasksScreen to preserve tab selection
    const [myTasksTab, setMyTasksTab] = useState<'ongoing' | 'scheduled' | 'completed' | 'favorites'>('ongoing');
    const [isExecutionMode, setIsExecutionMode] = useState(false);
    const [isVerifiedAdmin, setIsVerifiedAdmin] = useState(false);
    const [isVerifyingAdmin, setIsVerifyingAdmin] = useState(false);

    // Admin pages that require verification
    const adminScreens: ScreenType[] = ['admin-task-review', 'admin-post-review', 'admin-report-management', 'admin-feedback'];

    // Verify admin permission when accessing admin pages
    useEffect(() => {
        const verifyAdminAccess = async () => {
            if (adminScreens.includes(currentScreen) && !isVerifiedAdmin && !isVerifyingAdmin) {
                setIsVerifyingAdmin(true);
                try {
                    const response = await user.getMe();
                    if (response.data.isAdmin) {
                        setIsVerifiedAdmin(true);
                    } else {
                        alert('无权限访问管理页面');
                        setCurrentScreen('home');
                        setScreenHistory([]);
                    }
                } catch (error) {
                    console.error('Failed to verify admin status:', error);
                    alert('验证权限失败，请重新登录');
                    setCurrentScreen('home');
                    setScreenHistory([]);
                } finally {
                    setIsVerifyingAdmin(false);
                }
            }
        };

        verifyAdminAccess();
    }, [currentScreen, isVerifiedAdmin, isVerifyingAdmin]);

    // Reset admin verification on logout
    useEffect(() => {
        if (!isLoggedIn) {
            setIsVerifiedAdmin(false);
        }
    }, [isLoggedIn]);

    // Handle Android Hardware Back Button
    useEffect(() => {
        // Lazy import to avoid issues in non-Capacitor environments if needed, 
        // but standard import is fine as plugin mocks in web usually or just doesn't fire.
        import('@capacitor/app').then(({ App: CapApp }) => {
            const backHandler = CapApp.addListener('backButton', () => {
                // 1. Home: Exit App
                if (currentScreenRef.current === 'home') {
                    CapApp.exitApp();
                    return;
                }

                // 2. TaskDetail (Execution Mode): Go to My Tasks
                if (currentScreenRef.current === 'task-detail' && isExecutionMode) {
                    setCurrentScreen('my-tasks');
                    setMyTasksTab('ongoing');
                    return;
                }

                // 3. PublishPost (Share Flow): Go to My Tasks
                if (currentScreenRef.current === 'publish-post' && (publishPostTaskId || publishPostEncounterId)) {
                    setPublishPostTaskId(null);
                    setPublishPostEncounterId(null);
                    setCurrentScreen('my-tasks');
                    setMyTasksTab('ongoing');
                    return;
                }

                // 4. Agreements (Pre-login): Go to Home (Login)
                if ((currentScreenRef.current === 'user-agreement' || currentScreenRef.current === 'privacy-policy') && !isLoggedIn) {
                    setCurrentScreen('home');
                    return;
                }

                // 5. Default: Go Back using existing history logic
                if (screenHistory.length > 0) {
                    const newHistory = [...screenHistory];
                    const targetScreen = newHistory.pop()!;
                    setScreenHistory(newHistory);
                    setCurrentScreen(targetScreen);
                } else {
                    // Fallback if history is empty but we are not on home
                    setCurrentScreen('home');
                }
            });

            // Cleanup listener on unmount
            return () => {
                backHandler.then(h => h.remove());
            };
        });
    }, [isLoggedIn, isExecutionMode, publishPostTaskId, publishPostEncounterId, screenHistory]);

    // Navigation helper functions
    const navigateTo = (screen: ScreenType) => {
        const fromScreen = currentScreenRef.current; // Use ref for accurate value
        setScreenHistory(prev => [...prev, fromScreen]);
        setPrevScreen(fromScreen);
        setCurrentScreen(screen);
        setNavContext(null);
    };

    const navigateToDetail = (id: string, type: 'preview' | 'execution' | 'review' | 'map' = 'preview', context?: any) => {
        const fromScreen = currentScreenRef.current; // Use ref for accurate value

        // Determine target screen
        let targetScreen: ScreenType;
        if (type === 'preview') {
            targetScreen = 'task-preview';
            setIsExecutionMode(false);
        } else if (type === 'execution') {
            targetScreen = 'task-detail';
            setIsExecutionMode(true);
        } else if (type === 'review') {
            targetScreen = 'task-review';
        } else {
            targetScreen = 'task-map';
        }

        // Push current screen to history before switching
        setScreenHistory(prev => [...prev, fromScreen]);
        setPrevScreen(fromScreen);
        setCurrentScreen(targetScreen);

        setSelectedTaskId(id);
        if (context) setNavContext(context);
        else setNavContext(null);
        console.log('[App] navigateToDetail:', { id, type, context, from: fromScreen, to: targetScreen });
    };

    const goBack = () => {
        if (screenHistory.length > 0) {
            const newHistory = [...screenHistory];
            const targetScreen = newHistory.pop()!; // Pop the last screen as our target
            setScreenHistory(newHistory);
            setCurrentScreen(targetScreen);
        } else {
            setCurrentScreen('home');
        }
    };

    // Main navigation functions
    const navigateToHome = () => {
        setScreenHistory([]); // Reset history for main tab
        setCurrentScreen('home');
    };

    const navigateToCommunity = () => {
        setScreenHistory([]); // Reset history for main tab
        setCurrentScreen('community');
    };

    const navigateToProfile = () => {
        setSelectedUserId(null);
        setScreenHistory([]); // Reset history for main tab
        setCurrentScreen('profile');
    };

    const navigateToMyTasks = () => {
        setScreenHistory([]); // Reset history for main tab
        setCurrentScreen('my-tasks');
    };

    const navigateToMap = () => {
        navigateTo('map');
    };

    // Task navigation

    const navigateToTaskPreview = (taskId: string, readonly?: boolean, source?: string) => {
        setSelectedTaskId(taskId);
        navigateTo('task-preview');
    };

    const navigateToTaskPrep = (task: any, options?: { autoStart?: boolean, hideBanner?: boolean }) => {
        setPrepTask(task);
        setPrepContext(options || null);
        navigateTo('task-prep');
    };

    const navigateToTaskExecution = (taskId: string) => {
        setSelectedTaskId(taskId);
        navigateTo('task-execution');
    };

    const navigateToTaskReview = (task: any) => {
        setTaskForReview(task);
        navigateTo('task-review');
    };

    const navigateToCreateTask = () => {
        navigateTo('create-task');
    };

    const navigateToTaskMap = () => {
        navigateTo('task-map');
    };

    const navigateToNavigation = (taskId: string) => {
        setSelectedTaskId(taskId);
        navigateTo('navigation');
    };

    // User navigation
    const navigateToUserProfile = (userId: string) => {
        setSelectedUserId(userId);
        navigateTo('other-profile');
    };

    const navigateToEditProfile = () => {
        navigateTo('edit-profile');
    };

    const navigateToSettings = () => {
        navigateTo('settings');
    };

    const navigateToHonor = () => {
        navigateTo('honor');
    };

    const navigateToUserPosts = (userId: string, userName: string) => {
        setUserPostsData({ userId, userName });
        navigateTo('user-posts');
    };

    const navigateToUserFollowing = (userId: string, userName: string) => {
        setUserFollowingData({ userId, userName });
        navigateTo('user-following');
    };

    const navigateToMyFriends = () => {
        navigateTo('my-friends');
    };

    const navigateToShowcaseManagement = async (userId: string, completedTasks: any[]) => {
        setShowcaseUserId(userId);
        setShowcaseCompletedTasks(completedTasks);
        navigateTo('showcase-management');
    };

    // Community navigation
    const navigateToPostDetail = (postId: string) => {
        setSelectedPostId(postId);
        navigateTo('post-detail');
    };

    const navigateToPublishPost = (taskId?: string, encounterId?: string) => {
        setPublishPostTaskId(taskId || null);
        setPublishPostEncounterId(encounterId || null);
        navigateTo('publish-post');
    };

    const navigateToClub = () => {
        navigateTo('club');
    };

    const navigateToClubDetail = (clubOrId: any) => {
        // Handle both club object and string ID
        const id = typeof clubOrId === 'string' ? clubOrId : (clubOrId?._id || clubOrId?.id);
        setSelectedClubId(id);
        navigateTo('club-detail');
    };

    // Message navigation
    const navigateToMessage = () => {
        navigateTo('message');
    };

    const navigateToChat = (user: any) => {
        setChatUser(user);
        navigateTo('chat');
    };

    const navigateToMyMessages = () => {
        navigateTo('my-messages');
    };

    // Special feature navigation
    const navigateToHiddenReward = () => {
        navigateTo('hidden-reward');
    };

    const navigateToReward = () => {
        navigateTo('reward');
    };

    const navigateToCompletion = (taskId: string) => {
        setSelectedTaskId(taskId);
        navigateTo('completion');
    };

    const navigateToQuest = () => {
        navigateTo('quest');
    };

    const navigateToEncounter = () => {
        navigateTo('encounter');
    };

    const navigateToEncounterHistory = () => {
        navigateTo('encounter-history');
    };

    const navigateToFocusMode = (taskId: string) => {
        setSelectedTaskId(taskId);
        navigateTo('focus-mode');
    };

    const navigateToRemixRoute = (sourceTaskId?: string) => {
        setRemixSourceTaskId(sourceTaskId || null);
        navigateTo('remix-route');
    };

    const navigateToTripImport = () => {
        navigateTo('trip-import');
    };

    const navigateToHotTasks = (tab: 'recent' | 'hot' = 'hot') => {
        setHotTasksTab(tab);
        navigateTo('hot-tasks');
    };

    const navigateToOfficialRecommend = () => {
        navigateTo('official-recommend');
    };

    const navigateToTeam = (teamId: string) => {
        setSelectedTeamId(teamId);
        navigateTo('team');
    };

    const navigateToFeedback = () => {
        navigateTo('feedback');
    };

    // Login handler
    const handleLoginSuccess = () => {
        setIsLoggedIn(true);
        navigateToHome();
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setIsLoggedIn(false);
    };

    // Auth Guard - Show login screen (or legal screens) if not logged in
    if (!isLoggedIn) {
        if (currentScreen === 'user-agreement') {
            return <UserAgreementScreen onBack={() => setCurrentScreen('home')} />;
        }
        if (currentScreen === 'privacy-policy') {
            return <PrivacyPolicyScreen onBack={() => setCurrentScreen('home')} />;
        }

        return (
            <div className="relative w-full max-w-full sm:max-w-md h-screen overflow-hidden flex flex-col sm:shadow-2xl sm:ring-1 sm:ring-black/5">
                <LoginScreen
                    onLoginSuccess={handleLoginSuccess}
                    onUserAgreement={() => setCurrentScreen('user-agreement')}
                    onPrivacyPolicy={() => setCurrentScreen('privacy-policy')}
                />
            </div>
        );
    }

    // Screens that have bottom navigation
    const screensWithBottomNav: ScreenType[] = ['home', 'community', 'profile', 'my-tasks'];
    const showBottomNav = screensWithBottomNav.includes(currentScreen);

    // Get current tab for bottom navigation
    const getCurrentTab = (): string => {
        switch (currentScreen) {
            case 'home': return 'home';
            case 'community': return 'community';
            case 'profile': return 'profile';
            case 'my-tasks': return 'my-tasks';
            default: return '';
        }
    };

    // Render current screen
    const renderScreen = () => {
        switch (currentScreen) {
            case 'home':
                return (
                    <HomeScreen
                        onMap={navigateToMap}
                        onPostDetail={navigateToPostDetail}
                        onTaskDetail={(id) => navigateToDetail(id, 'preview')}
                        onNotifications={navigateToMessage}
                        onCreateTask={navigateToCreateTask}
                        onUserProfile={navigateToUserProfile}
                        onMessage={navigateToChat}
                        onOfficialRecommend={navigateToOfficialRecommend}
                        onHotTasks={navigateToHotTasks}
                    />
                );

            case 'community':
                return (
                    <CommunityScreen
                        onBack={goBack}
                        onProfile={navigateToProfile}
                        onMap={navigateToMap}
                        onNotifications={navigateToMessage}
                        onPostDetail={navigateToPostDetail}
                        onUserProfile={navigateToUserProfile}
                        onPublishPost={() => navigateToPublishPost()}
                        onMessage={navigateToChat}
                        onRemixRoute={navigateToRemixRoute}
                        onStartTask={(id) => navigateToDetail(id, 'execution')}
                        onTaskPreview={(id) => navigateToDetail(id, 'preview')}
                        onClub={navigateToClub}
                    />
                );

            case 'profile':
                return (
                    <ProfileScreen
                        onBack={goBack}
                        onHonor={navigateToHonor}
                        onSettings={navigateToSettings}
                        isOwnProfile={true}
                        onEditProfile={navigateToEditProfile}
                        onMessage={navigateToChat}
                        onUserPosts={navigateToUserPosts}
                        onUserFollowing={navigateToUserFollowing}
                        onStartTask={(id) => navigateToDetail(id, 'execution')}
                        onTaskPreview={(id) => navigateToDetail(id, 'preview')}
                        onTaskReview={(executionId, targetUserId) => navigateToDetail(executionId, 'review', { executionId, targetUserId })}
                        onEncounterHistory={navigateToEncounterHistory}
                        onRemix={navigateToRemixRoute}
                        onPostDetail={navigateToPostDetail}
                        onFriends={navigateToMyFriends}
                        onShowcaseAll={(userId) => {
                            // Fetch completed tasks and navigate
                            import('./services/api').then(({ user }) => {
                                user.getCompletions(userId).then(res => {
                                    navigateToShowcaseManagement(userId, res.data || []);
                                });
                            });
                        }}
                        onLogin={handleLogout}
                    />
                );

            case 'other-profile':
                return (
                    <ProfileScreen
                        onBack={goBack}
                        onHonor={navigateToHonor}
                        isOwnProfile={false}
                        userId={selectedUserId || undefined}
                        onMessage={navigateToChat}
                        onUserPosts={navigateToUserPosts}
                        onUserFollowing={navigateToUserFollowing}
                        onStartTask={(id) => navigateToDetail(id, 'execution')}
                        onTaskPreview={(id) => navigateToDetail(id, 'preview')}
                        onTaskReview={(executionId, targetUserId) => navigateToDetail(executionId, 'review', { executionId, targetUserId })}
                        onRemix={navigateToRemixRoute}
                        onPostDetail={navigateToPostDetail}
                        onShowcaseAll={(userId) => {
                            // Fetch completed tasks and navigate
                            import('./services/api').then(({ user }) => {
                                user.getCompletions(userId).then(res => {
                                    navigateToShowcaseManagement(userId, res.data || []);
                                });
                            });
                        }}
                        onLogin={handleLogout}
                    />
                );

            case 'my-tasks':
                return (
                    <MyTasksScreen
                        key={Date.now()}
                        initialTab={myTasksTab}
                        onTabChange={setMyTasksTab}
                        onBack={goBack}
                        onTaskDetail={(id, context) => {
                            if (context?.from === 'completed' || context?.type === 'review') {
                                navigateToDetail(id, 'review', context);
                            } else {
                                navigateToDetail(id, 'preview', context);
                            }
                        }}
                        onStartTask={(id) => navigateToDetail(id, 'execution')}
                        onCreateTask={navigateToCreateTask}
                        onTaskPrep={navigateToTaskPrep}
                        onNavigation={navigateToNavigation}
                        onSerendipityExecution={(encounterId) => {
                            setSelectedEncounterId(encounterId);
                            navigateTo('serendipity-execution');
                        }}
                    />
                );

            case 'map':
                return (
                    <MapScreen
                        onBack={goBack}
                        onProfile={navigateToProfile}
                        onHiddenReward={navigateToHiddenReward}
                        onTaskSelect={(id) => navigateToDetail(id, 'preview')}
                    />
                );

            case 'task-preview':
                return (
                    <TaskPreviewScreen
                        onBack={goBack}
                        taskId={selectedTaskId || undefined}
                        onStart={(id) => navigateToDetail(id, 'execution')}
                        onPrep={navigateToTaskPrep}
                        onUserProfile={navigateToUserProfile}
                        onRemix={navigateToRemixRoute}
                        onShare={() => console.log('Share task')}
                        onPostDetail={navigateToPostDetail}
                        onSchedule={(id) => console.log('Schedule', id)}
                        fromFavorites={navContext?.from === 'favorites'}
                        fromScheduled={navContext?.from === 'scheduled'}
                        fromOngoing={navContext?.from === 'ongoing'}
                    />
                );

            case 'task-detail':
                return (
                    <TaskDetailScreen
                        key={isExecutionMode ? `exec-${selectedTaskId}` : `detail-${selectedTaskId}`}
                        onBack={() => {
                            if (isExecutionMode) {
                                setCurrentScreen('my-tasks');
                                setMyTasksTab('ongoing');
                            } else {
                                goBack();
                            }
                        }}
                        onCheckIn={() => navigateToCompletion(selectedTaskId || '')}
                        onTeamClick={() => selectedTeamId && navigateToTeam(selectedTeamId)}
                        onNavigate={() => selectedTaskId && navigateToTaskPrep({ id: selectedTaskId, type: 'task' }, { hideBanner: true })}
                        taskId={selectedTaskId}
                        isExecutionView={isExecutionMode}
                        onCreatePost={(taskId) => navigateToPublishPost(taskId)}
                    />
                );

            case 'task-review':
                return (
                    <TaskReviewScreen
                        onBack={goBack}
                        onHome={navigateToHome}
                        taskId={selectedTaskId || undefined}
                        executionId={navContext?.executionId}
                        onRestart={(id) => {
                            // Logic to restart (create new execution)
                            // Assuming onStartTask handles new execution creation or we might need specialized API
                            console.log('Restarting task:', id);
                            // For now navigate to detail -> execution will just continue existing or start new?
                            // Current execution.start() logic finds existing or creates new.
                            // But if existing is completed, start() errors! 
                            // We probably need a specialized "restart" flow later.
                            // For now, let's just go to preview.
                            navigateToDetail(id, 'preview');
                        }}
                    />
                );

            case 'task-execution':
                return (
                    <TaskExecutionScreen
                        onBack={goBack}
                        taskId={selectedTaskId || undefined}
                        onComplete={() => navigateToCompletion(selectedTaskId || '')}
                        onFocusMode={() => selectedTaskId && navigateToFocusMode(selectedTaskId)}
                    />
                );

            case 'task-prep':
                return (
                    <TaskPrepScreen
                        onBack={goBack}
                        onConfirm={async () => {
                            // Conditional navigation based on context
                            const targetId = prepTask?.id || prepTask?.taskId || prepTask?._id;
                            if (prepContext?.autoStart && prepTask && targetId) {
                                try {
                                    // Must call start API to set startTime and status
                                    await execution.start(prepTask.executionId || targetId);
                                } catch (error) {
                                    console.error("Failed to auto-start after prep:", error);
                                }
                                navigateToDetail(targetId, 'execution');
                                setMyTasksTab('ongoing'); // Switch tab for visibility
                            } else {
                                goBack();
                            }
                        }}
                        task={prepTask}
                        readonly={prepTask?.readonly}
                        autoStart={prepContext?.autoStart}
                        hideBanner={prepContext?.hideBanner}
                    />
                );

            case 'create-task':
                return (
                    <CreateTaskScreen
                        onBack={goBack}
                        onSuccess={(taskId) => {
                            if (taskId) navigateToDetail(taskId, 'preview');
                            else goBack();
                        }}
                    />
                );

            case 'task-map':
                return (
                    <TaskMapScreen
                        onBack={goBack}
                        onTaskSelect={(id) => navigateToDetail(id, 'preview')}
                    />
                );

            case 'navigation':
                return (
                    <NavigationScreen
                        onBack={goBack}
                        taskId={selectedTaskId || undefined}
                    />
                );

            case 'edit-profile':
                return (
                    <EditProfileScreen
                        onBack={goBack}
                        onSave={goBack}
                    />
                );

            case 'settings':
                return (
                    <SettingsScreen
                        onBack={goBack}
                        onLogout={handleLogout}
                        onGeneralSettings={() => navigateTo('general-settings')}
                        onDeveloperOptions={() => navigateTo('developer-options')}
                        onFeedback={navigateToFeedback}
                        onTaskReview={() => navigateTo('admin-task-review')}
                        onPostReview={() => navigateTo('admin-post-review')}
                        onReportManagement={() => navigateTo('admin-report-management')}
                        onAbout={() => navigateTo('about')}
                    />
                );

            case 'general-settings':
                return (
                    <GeneralSettingsScreen
                        onBack={goBack}
                    />
                );

            case 'developer-options':
                return (
                    <DeveloperOptionsScreen
                        onBack={goBack}
                    />
                );

            case 'about':
                return (
                    <AboutScreen
                        onBack={goBack}
                        onUserAgreement={() => {
                            // Force correct current screen history
                            setScreenHistory(prev => [...prev, 'about']);
                            setPrevScreen('about');
                            setCurrentScreen('user-agreement');
                        }}
                        onPrivacyPolicy={() => {
                            setScreenHistory(prev => [...prev, 'about']);
                            setPrevScreen('about');
                            setCurrentScreen('privacy-policy');
                        }}
                    />
                );

            case 'honor':
                return (
                    <HonorScreen
                        onBack={goBack}
                        onAchievementDetail={(id) => {
                            navigateTo('achievement-detail');
                        }}
                    />
                );

            case 'achievement-detail':
                return (
                    <AchievementDetailScreen
                        onBack={goBack}
                    />
                );

            case 'user-posts':
                return (
                    <UserPostsScreen
                        onBack={goBack}
                        userId={userPostsData?.userId || ''}
                        userName={userPostsData?.userName || ''}
                        onPostDetail={navigateToPostDetail}
                    />
                );

            case 'user-following':
                return (
                    <UserFollowingScreen
                        onBack={goBack}
                        userId={userFollowingData?.userId || ''}
                        userName={userFollowingData?.userName || ''}
                        onUserProfile={navigateToUserProfile}
                    />
                );

            case 'my-friends':
                return (
                    <MyFriendsScreen
                        onBack={goBack}
                        onUserProfile={navigateToUserProfile}
                    />
                );

            case 'showcase-management':
                return (
                    <ShowcaseManagementScreen
                        onBack={goBack}
                        userId={showcaseUserId || ''}
                        completedTasks={showcaseCompletedTasks}
                    />
                );

            case 'user-agreement':
                return <UserAgreementScreen onBack={() => {
                    if (!isLoggedIn) setCurrentScreen('home');
                    else goBack();
                }} />;

            case 'privacy-policy':
                return <PrivacyPolicyScreen onBack={() => {
                    if (!isLoggedIn) setCurrentScreen('home');
                    else goBack();
                }} />;



            case 'post-detail':
                return (
                    <PostDetailScreen
                        onBack={goBack}
                        postId={selectedPostId || ''}
                        onUserProfile={navigateToUserProfile}
                        onTaskPreview={(id) => navigateToDetail(id, 'preview')}
                    />
                );

            case 'publish-post':
                return (
                    <PublishPostScreen
                        onBack={() => {
                            // 如果是从分享成就进来的，返回到进行中页面
                            if (publishPostTaskId || publishPostEncounterId) {
                                setPublishPostTaskId(null);
                                setPublishPostEncounterId(null);
                                setCurrentScreen('my-tasks');
                                setMyTasksTab('ongoing');
                            } else {
                                goBack();
                            }
                        }}
                        onPublish={() => {
                            setPublishPostTaskId(null);
                            setPublishPostEncounterId(null);
                            setCurrentScreen('my-tasks');
                            setMyTasksTab('ongoing');
                        }}
                        defaultMissionId={publishPostTaskId || undefined}
                        defaultEncounterId={publishPostEncounterId || undefined}
                    />
                );

            case 'club':
                return (
                    <ClubScreen
                        onBack={goBack}
                        onOpenClub={navigateToClubDetail}
                        onOpenCreate={() => navigateTo('club-create')}
                        onOpenMy={() => navigateTo('club-my')}
                        onOpenActivity={() => {
                            setSelectedClubId(null);
                            navigateTo('club-activity');
                        }}
                    />
                );

            case 'club-detail':
                return (
                    <ClubDetailScreen
                        onBack={goBack}
                        clubId={selectedClubId || ''}
                        onOpenEvent={(event) => {
                            setSelectedTaskId(event._id);
                            setIsExecutionMode(false);  // 查看详情，不是执行模式
                            navigateTo('task-preview');
                        }}
                        onCreateActivity={(clubId) => {
                            setSelectedClubId(clubId);
                            navigateTo('club-activity-create');
                        }}
                        onViewProfile={navigateToUserProfile}
                    />
                );

            case 'club-create':
                return (
                    <ClubCreateScreen
                        onBack={goBack}
                        onSuccess={goBack}
                    />
                );

            case 'club-chat':
                return (
                    <ClubChatScreen
                        onBack={goBack}
                        clubId={selectedClubId || ''}
                    />
                );

            case 'club-my':
                return (
                    <ClubMyScreen
                        onBack={goBack}
                        onClubDetail={navigateToClubDetail}
                        onReviewRequests={(club) => {
                            setSelectedClubData(club);
                            navigateTo('club-join-requests');
                        }}
                    />
                );

            case 'club-activity':
                return (
                    <ClubActivityScreen
                        onBack={goBack}
                        clubId={selectedClubId || undefined}
                        onEventDetail={(event) => {
                            // 跳转到任务详情页
                            setSelectedTaskId(event._id);
                            navigateToDetail(event._id, 'preview');
                        }}
                    />
                );

            case 'club-activity-create':
                return (
                    <CreateTaskScreen
                        onBack={goBack}
                        clubId={selectedClubId || ''}
                        onSuccess={() => {
                            goBack();
                        }}
                    />
                );

            case 'club-event-detail':
                return (
                    <ClubEventDetailScreen
                        onBack={goBack}
                        event={selectedEventData}
                        clubId={selectedEventData?.clubId?._id || selectedEventData?.clubId || selectedClubId || undefined}
                        onStartTask={(task) => {
                            setSelectedTaskId(task._id || task.id);
                            navigateToDetail(task._id || task.id, 'execution');
                        }}
                    />
                );

            case 'club-join-requests':
                return (
                    <ClubJoinRequestsScreen
                        onBack={goBack}
                        club={selectedClubData}
                    />
                );

            case 'message':
                return (
                    <MessageScreen
                        onBack={goBack}
                        onJoinTask={(taskId) => navigateToDetail(taskId, 'execution')}
                    />
                );

            case 'chat':
                return (
                    <ChatScreen
                        onBack={goBack}
                        targetUser={chatUser}
                    />
                );

            case 'my-messages':
                return (
                    <MyMessagesScreen
                        onBack={goBack}
                        onChat={navigateToChat}
                    />
                );

            case 'message-card':
                return (
                    <MessageCardScreen
                        onBack={goBack}
                    />
                );

            case 'hidden-reward':
                return (
                    <HiddenRewardScreen
                        onBack={goBack}
                    />
                );

            case 'reward':
                return (
                    <RewardScreen
                        onBack={goBack}
                    />
                );

            case 'sponsor-reward':
                return (
                    <SponsorRewardScreen
                        onBack={goBack}
                    />
                );

            case 'completion':
                return (
                    <CompletionScreen
                        onBack={goBack}
                        taskId={selectedTaskId || ''}
                        onShare={() => navigateToPublishPost(selectedTaskId || undefined)}
                        onHome={navigateToHome}
                    />
                );

            case 'quest':
                return (
                    <QuestScreen
                        onBack={goBack}
                        onTaskSelect={(id) => navigateToDetail(id, 'preview')}
                    />
                );

            case 'encounter':
                return (
                    <EncounterScreen
                        onBack={goBack}
                        onComplete={goBack}
                    />
                );

            case 'encounter-history':
                return (
                    <EncounterHistoryScreen
                        onBack={goBack}
                        onOpenEncounter={(id) => {
                            setSelectedEncounterId(id);
                            navigateTo('encounter-detail');
                        }}
                    />
                );

            case 'serendipity-execution':
                return (
                    <SerendipityExecutionScreen
                        onBack={goBack}
                        encounterId={selectedEncounterId || ''}
                        onComplete={goBack}
                        onShare={() => navigateToPublishPost(undefined, selectedEncounterId || undefined)}
                    />
                );

            case 'encounter-detail':
                return (
                    <EncounterRecordScreen
                        onBack={goBack}
                        encounterId={selectedEncounterId || ''}
                        onShare={() => navigateToPublishPost(undefined, selectedEncounterId || undefined)}
                        onDelete={() => goBack()} // 删除后返回上一页
                    />
                );

            case 'focus-mode':
                return (
                    <FocusModeScreen
                        onBack={goBack}
                        taskId={selectedTaskId || ''}
                    />
                );

            case 'remix-route':
                return (
                    <CreateTaskScreen
                        onBack={goBack}
                        remixSourceId={remixSourceTaskId || undefined}
                        onSuccess={() => {
                            // 魔改发布后直接返回探索页面
                            goBack();
                        }}
                    />
                );

            case 'trip-import':
                return (
                    <TripImportScreen
                        onBack={goBack}
                        onSuccess={(taskId) => {
                            if (taskId) navigateToDetail(taskId, 'preview');
                            else goBack();
                        }}
                    />
                );

            case 'hot-tasks':
                return (
                    <HotTasksScreen
                        onBack={goBack}
                        initialTab={hotTasksTab}
                        onTaskDetail={(id) => navigateToDetail(id, 'preview')}
                    />
                );

            case 'official-recommend':
                return (
                    <OfficialRecommendScreen
                        onBack={goBack}
                        onTaskDetail={(id) => navigateToDetail(id, 'preview')}
                    />
                );

            case 'team':
                return (
                    <TeamScreen
                        onBack={goBack}
                        teamId={selectedTeamId || ''}
                    />
                );

            case 'feedback':
                return (
                    <FeedbackScreen
                        onBack={goBack}
                    />
                );

            case 'admin-task-review':
                // Show loading while verifying admin status
                if (isVerifyingAdmin || !isVerifiedAdmin) {
                    return (
                        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                            <div className="text-gray-500 dark:text-gray-400">验证权限中...</div>
                        </div>
                    );
                }
                return (
                    <TaskReviewSpace
                        onBack={goBack}
                        onTaskDetail={(id) => {
                            setSelectedTaskId(id);
                            navigateTo('task-preview'); // 使用任务预览页而非详情页，避免进入执行流程
                        }}
                    />
                );

            case 'admin-feedback':
                if (isVerifyingAdmin || !isVerifiedAdmin) {
                    return (
                        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                            <div className="text-gray-500 dark:text-gray-400">验证权限中...</div>
                        </div>
                    );
                }
                return (
                    <AdminFeedbackScreen
                        onBack={goBack}
                    />
                );

            case 'admin-report-management':
                if (isVerifyingAdmin || !isVerifiedAdmin) {
                    return (
                        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                            <div className="text-gray-500 dark:text-gray-400">验证权限中...</div>
                        </div>
                    );
                }
                return (
                    <ReportManagementScreen
                        onBack={goBack}
                    />
                );

            case 'admin-post-review':
                if (isVerifyingAdmin || !isVerifiedAdmin) {
                    return (
                        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                            <div className="text-gray-500 dark:text-gray-400">验证权限中...</div>
                        </div>
                    );
                }
                return (
                    <AdminPostReviewScreen
                        onBack={goBack}
                    />
                );

            case 'clipboard-detect':
                return (
                    <ClipboardDetectScreen
                        onBack={goBack}
                        onImport={navigateToTripImport}
                    />
                );

            default:
                return (
                    <HomeScreen
                        onMap={navigateToMap}
                        onPostDetail={navigateToPostDetail}
                        onTaskDetail={(id) => navigateToDetail(id, 'preview')}
                        onNotifications={navigateToMessage}
                        onCreateTask={navigateToCreateTask}
                    />
                );
        }
    };

    return (
        <SocketProvider>
            <div className="fixed inset-0 w-full max-w-full sm:max-w-md overflow-hidden flex flex-col sm:relative sm:h-screen sm:shadow-2xl sm:ring-1 sm:ring-black/5 bg-[#f8f7f5] dark:bg-[#1a120b]">
                <main className="flex-1 overflow-y-auto no-scrollbar">
                    {renderScreen()}
                </main>
                {showBottomNav && (
                    <BottomNavigation
                        currentTab={getCurrentTab()}
                        onCommunity={navigateToCommunity}
                        onProfile={navigateToProfile}
                        onMap={navigateToMap}
                        onHome={navigateToHome}
                        onMyTasks={navigateToMyTasks}
                    />
                )}
            </div>
        </SocketProvider>
    );
};

export default App;
