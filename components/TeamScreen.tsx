import React, { useState, useEffect, useMemo } from 'react';
import { team as teamApi } from '../services/api';
import { getImageUrl } from '../src/utils/imageUrl';
import CapacitorImage from '../src/components/common/CapacitorImage';

interface TeamMember {
  _id: string;
  user: {
    _id: string;
    username: string;
    avatarUrl?: string;
  };
  role: 'leader' | 'member';
  status: 'active' | 'done' | 'offline';
  location?: {
    name?: string;
    latitude?: number;
    longitude?: number;
  };
  completedNodes: number[];
  lastActiveAt: string;
}

interface TeamData {
  _id: string;
  name: string;
  code: string;
  task: {
    _id: string;
    title: string;
    coverImage?: string;
    nodes?: any[];
    location?: { name: string };
  };
  members: TeamMember[];
  status: 'preparing' | 'ongoing' | 'completed' | 'disbanded';
  progress: number;
  completedNodes: number[];
  totalNodes: number;
  startTime?: string;
  endTime?: string;
  timeLimit: number;
}

interface TeamScreenProps {
  onBack: () => void;
  teamId?: string; // 团队ID
}

const TeamScreen: React.FC<TeamScreenProps> = ({ onBack, teamId }) => {
  const [teamData, setTeamData] = useState<TeamData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [remainingTime, setRemainingTime] = useState(0);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // 获取团队数据
  useEffect(() => {
    const fetchTeam = async () => {
      if (!teamId) {
        setError('未指定团队');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await teamApi.getById(teamId);
        setTeamData(response.data);

        // 计算剩余时间
        if (response.data.startTime && response.data.status === 'ongoing') {
          const start = new Date(response.data.startTime).getTime();
          const now = Date.now();
          const elapsed = Math.floor((now - start) / 1000);
          const remaining = Math.max(0, response.data.timeLimit - elapsed);
          setRemainingTime(remaining);
        } else if (response.data.status === 'preparing') {
          setRemainingTime(response.data.timeLimit);
        }
      } catch (err: any) {
        console.error('Failed to fetch team:', err);
        setError(err.response?.data?.error || '加载团队失败');
      } finally {
        setLoading(false);
      }
    };

    fetchTeam();
  }, [teamId]);

  // 倒计时
  useEffect(() => {
    if (teamData?.status !== 'ongoing' || remainingTime <= 0) return;

    const timer = setInterval(() => {
      setRemainingTime(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [teamData?.status, remainingTime]);

  const formattedTime = useMemo(() => {
    const h = Math.floor(remainingTime / 3600);
    const m = Math.floor((remainingTime % 3600) / 60);
    const s = remainingTime % 60;
    return {
      h: h.toString().padStart(2, '0'),
      m: m.toString().padStart(2, '0'),
      s: s.toString().padStart(2, '0')
    };
  }, [remainingTime]);

  const handleNudge = async (member: TeamMember) => {
    if (!teamData) return;
    try {
      setActionLoading(member.user._id);
      await teamApi.nudge(teamData._id, member.user._id, 'nudge');
      alert(`你拍了拍 ${member.user.username}`);
    } catch (err: any) {
      alert(err.response?.data?.error || '操作失败');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemind = async (member: TeamMember) => {
    if (!teamData) return;
    try {
      setActionLoading(member.user._id);
      await teamApi.nudge(teamData._id, member.user._id, 'remind');
      alert(`已发送上线提醒给 ${member.user.username}`);
    } catch (err: any) {
      alert(err.response?.data?.error || '操作失败');
    } finally {
      setActionLoading(null);
    }
  };

  const inviteFriends = async () => {
    if (!teamData) return;
    try {
      const response = await teamApi.getInviteLink(teamData._id);
      if (navigator.share) {
        await navigator.share({
          title: `加入「${teamData.name}」`,
          text: `使用邀请码 ${response.data.code} 加入我的探索队伍！`,
          url: response.data.inviteLink
        });
      } else {
        await navigator.clipboard?.writeText(response.data.inviteLink);
        alert(`邀请链接已复制！邀请码：${response.data.code}`);
      }
    } catch (err: any) {
      console.error('Invite error:', err);
    }
  };

  const openSettings = () => {
    console.log('打开设置');
  };

  // Loading 状态
  if (loading) {
    return (
      <div className="bg-[#f6f7f8] dark:bg-[#101c22] font-display text-slate-900 dark:text-white h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <span className="material-symbols-outlined text-4xl text-[#13a4ec] animate-spin">progress_activity</span>
          <p className="text-slate-500 dark:text-slate-400">加载团队信息...</p>
        </div>
      </div>
    );
  }

  // 错误状态
  if (error || !teamData) {
    return (
      <div className="bg-[#f6f7f8] dark:bg-[#101c22] font-display text-slate-900 dark:text-white h-screen flex flex-col">
        <div className="p-4">
          <button onClick={onBack} className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <span className="material-symbols-outlined text-5xl text-slate-400">error_outline</span>
            <p className="text-slate-500 dark:text-slate-400">{error || '团队不存在'}</p>
          </div>
        </div>
      </div>
    );
  }

  const progress = teamData.progress;
  const completedNodesCount = teamData.completedNodes.length;
  const totalNodes = teamData.totalNodes;

  return (
    <div className="bg-[#f6f7f8] dark:bg-[#101c22] font-display text-slate-900 dark:text-white antialiased overflow-x-hidden relative h-screen w-full flex flex-col transition-colors duration-300">

      {/* Background Image Overlay */}
      <div className="absolute inset-0 z-0 opacity-[0.15] dark:opacity-[0.1] pointer-events-none grayscale mix-blend-multiply dark:mix-blend-overlay">
        <CapacitorImage
          src="/images/team-bg.jpg"
          className="w-full h-full object-cover"
          alt="Team Background"
        />
      </div>

      <div className="relative z-10 flex-1 overflow-y-auto pb-32 no-scrollbar">

        {/* Header */}
        <div className="sticky top-0 z-50 flex items-center bg-[#f6f7f8]/80 dark:bg-[#101c22]/80 backdrop-blur-md p-4 pb-2 justify-between">
          <div onClick={onBack} className="text-slate-900 dark:text-white flex size-12 shrink-0 items-center justify-start cursor-pointer transition-opacity hover:opacity-70">
            <span className="material-symbols-outlined text-2xl">arrow_back_ios_new</span>
          </div>
          <div className="flex flex-col items-center">
            <h2 className="text-slate-900 dark:text-white text-lg font-bold leading-tight tracking-tight text-center">{teamData.name}</h2>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Team ID: {teamData.code}</span>
          </div>
          <div className="flex w-12 items-center justify-end">
            <button onClick={openSettings} className="flex items-center justify-center rounded-full text-slate-900 dark:text-white p-2 hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
              <span className="material-symbols-outlined">settings</span>
            </button>
          </div>
        </div>

        {/* Timer */}
        <div className="w-full px-4 mt-2 mb-6">
          <div className="flex gap-3 justify-center">
            <div className="flex flex-col items-center gap-1">
              <div className="flex w-14 h-14 items-center justify-center rounded-2xl bg-white dark:bg-[#1c2932] shadow-sm border border-slate-100 dark:border-slate-700">
                <p className="text-[#13a4ec] text-2xl font-extrabold leading-tight">{formattedTime.h}</p>
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider">Hours</p>
            </div>
            <div className="flex flex-col items-center gap-1">
              <div className="flex w-14 h-14 items-center justify-center rounded-2xl bg-white dark:bg-[#1c2932] shadow-sm border border-slate-100 dark:border-slate-700">
                <p className="text-[#13a4ec] text-2xl font-extrabold leading-tight">{formattedTime.m}</p>
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider">Min</p>
            </div>
            <div className="flex flex-col items-center gap-1">
              <div className="flex w-14 h-14 items-center justify-center rounded-2xl bg-white dark:bg-[#1c2932] shadow-sm border border-slate-100 dark:border-slate-700">
                <p className="text-[#13a4ec] text-2xl font-extrabold leading-tight">{formattedTime.s}</p>
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider">Sec</p>
            </div>
          </div>
        </div>

        {/* Progress Card */}
        <div className="mx-4 mb-8">
          <div className="bg-white dark:bg-[#1c2932] rounded-3xl p-6 shadow-lg shadow-blue-500/5 border border-slate-100 dark:border-slate-700 relative overflow-hidden">
            <div className="absolute -right-10 -top-10 w-32 h-32 bg-[#13a4ec]/5 rounded-full blur-2xl"></div>

            <div className="flex justify-between items-end mb-4 relative z-10">
              <div>
                <p className="text-slate-500 dark:text-slate-400 text-sm font-semibold mb-1">当前进度 Mission Progress</p>
                <h2 className="text-slate-900 dark:text-white text-4xl font-extrabold tracking-tight">{progress}<span className="text-2xl text-[#13a4ec]">%</span></h2>
              </div>
              <div className="flex items-center gap-1 bg-[#13a4ec]/10 px-3 py-1.5 rounded-full">
                <span className="material-symbols-outlined text-[#13a4ec] text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>flag</span>
                <span className="text-[#13a4ec] text-xs font-bold">{completedNodesCount}/{totalNodes} 站点</span>
              </div>
            </div>

            <div className="relative z-10">
              <div className="flex justify-between mb-2">
                <p className="text-slate-600 dark:text-slate-300 text-sm font-medium">
                  {totalNodes - completedNodesCount > 0 ? `还有 ${totalNodes - completedNodesCount} 个打卡点` : '全部完成！'}
                </p>
                <p className="text-slate-400 dark:text-slate-500 text-xs font-medium">Goal: 100%</p>
              </div>
              <div className="h-3 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                <div className="h-full bg-[#13a4ec] rounded-full relative transition-all duration-500" style={{ width: `${progress}%` }}>
                  <div className="absolute inset-0 bg-white/20 w-full animate-[pulse_2s_infinite]"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Team Members */}
        <div className="px-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-slate-900 dark:text-white font-bold text-lg flex items-center gap-2">
              <span className="material-symbols-outlined text-[#13a4ec]">group</span>
              队友列表 ({teamData.members.length})
            </h3>
            <button className="text-xs font-semibold text-[#13a4ec] hover:text-[#13a4ec]/80 transition-colors">管理 Manage</button>
          </div>

          <div className="flex flex-col gap-3">
            {teamData.members.map(member => {
              const isLeader = member.role === 'leader';
              const isLoading = actionLoading === member.user._id;

              return (
                <div
                  key={member.user._id}
                  className={`group flex items-center gap-4 bg-white dark:bg-[#1c2932] p-3 pr-4 rounded-[20px] shadow-sm border border-slate-100 dark:border-slate-700 ${member.status === 'offline' ? 'opacity-90' : ''}`}
                >
                  <div className="relative shrink-0">
                    <div className={`rounded-full h-12 w-12 border-2 border-white dark:border-[#1c2932] shadow-sm overflow-hidden ${member.status === 'offline' ? 'grayscale' : ''}`}>
                      <CapacitorImage
                        src={member.user.avatarUrl ? getImageUrl(member.user.avatarUrl) : 'https://via.placeholder.com/48'}
                        className="w-full h-full object-cover"
                        alt={member.user.username}
                      />
                    </div>
                    <div
                      className={`absolute bottom-0 right-0 h-3.5 w-3.5 border-2 border-white dark:border-[#1c2932] rounded-full ${member.status === 'offline' ? 'bg-slate-300' :
                        member.status === 'done' ? 'bg-green-500' : 'bg-green-500'
                        }`}
                    ></div>
                  </div>

                  <div className="flex flex-col justify-center grow min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-slate-900 dark:text-white text-base font-bold leading-tight truncate">{member.user.username}</p>
                      {isLeader && (
                        <span className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 text-[10px] font-bold px-1.5 py-0.5 rounded">LEADER</span>
                      )}
                    </div>

                    {member.status === 'active' ? (
                      <p className="text-[#13a4ec] text-sm font-medium leading-normal truncate flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">my_location</span>
                        {member.location?.name || '探索中...'}
                      </p>
                    ) : member.status === 'done' ? (
                      <p className="text-slate-500 dark:text-slate-400 text-sm font-normal leading-normal truncate flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">check_circle</span>
                        任务完成 Task Done
                      </p>
                    ) : (
                      <p className="text-slate-400 dark:text-slate-500 text-sm font-normal leading-normal truncate flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">offline_bolt</span>
                        离线 Offline
                      </p>
                    )}
                  </div>

                  <div className="shrink-0">
                    {isLeader ? (
                      <button className="flex items-center justify-center h-9 w-9 rounded-full bg-slate-50 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed">
                        <span className="material-symbols-outlined text-lg">touch_app</span>
                      </button>
                    ) : member.status === 'done' || member.status === 'active' ? (
                      <button
                        onClick={() => handleNudge(member)}
                        disabled={isLoading}
                        className="flex items-center justify-center overflow-hidden rounded-full h-9 px-3 bg-[#13a4ec]/10 text-[#13a4ec] text-sm font-bold active:scale-95 transition-transform hover:bg-[#13a4ec]/20 disabled:opacity-50"
                      >
                        <span className="material-symbols-outlined text-lg mr-1">touch_app</span>
                        <span className="text-xs">{isLoading ? '...' : '拍一拍'}</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleRemind(member)}
                        disabled={isLoading}
                        className="flex items-center justify-center overflow-hidden rounded-full h-9 px-3 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 text-sm font-bold active:scale-95 transition-transform disabled:opacity-50"
                      >
                        <span className="material-symbols-outlined text-lg mr-1">notifications</span>
                        <span className="text-xs">{isLoading ? '...' : '提醒'}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer Action */}
      <div className="fixed bottom-0 left-0 w-full z-20">
        {/* 状态提示 */}
        {teamData.status === 'preparing' && (
          <div className="flex justify-center mb-4 px-4 pointer-events-none">
            <div className="bg-amber-500/90 backdrop-blur-md rounded-full px-4 py-2 flex items-center gap-2 shadow-lg pointer-events-auto">
              <span className="material-symbols-outlined text-white text-lg">hourglass_empty</span>
              <p className="text-white text-xs font-medium">等待队长开始任务...</p>
            </div>
          </div>
        )}
        {teamData.status === 'completed' && (
          <div className="flex justify-center mb-4 px-4 pointer-events-none">
            <div className="bg-green-500/90 backdrop-blur-md rounded-full px-4 py-2 flex items-center gap-2 shadow-lg pointer-events-auto">
              <span className="material-symbols-outlined text-white text-lg">celebration</span>
              <p className="text-white text-xs font-medium">🎉 团队任务完成！</p>
            </div>
          </div>
        )}

        <div className="bg-white/80 dark:bg-[#1c2932]/90 backdrop-blur-xl p-4 pt-4 pb-8 border-t border-slate-100 dark:border-slate-800 shadow-[0_-5px_20px_-5px_rgba(0,0,0,0.1)]">
          <button
            onClick={inviteFriends}
            className="w-full flex cursor-pointer items-center justify-center overflow-hidden rounded-full h-14 bg-[#13a4ec] hover:bg-sky-500 text-white gap-2 text-base font-bold tracking-[0.015em] shadow-lg shadow-blue-500/30 active:scale-[0.98] transition-all"
          >
            <span className="material-symbols-outlined text-2xl">person_add</span>
            邀请队友 Invite Friends
          </button>
        </div>
      </div>

    </div>
  );
};

export default TeamScreen;
