import React, { useState, useEffect } from 'react';
import { user as userApi } from '../services/api';
import { getImageUrl } from '../src/utils/imageUrl';
import CapacitorImage from '../src/components/common/CapacitorImage';

interface FriendSelectionModalProps {
    visible: boolean;
    onClose: () => void;
    onSelect: (friendId: string) => void;
    currentParticipants?: any[]; // Passed from parent
    onParticipantClick?: (participantId: string) => void;
}

const FriendSelectionModal: React.FC<FriendSelectionModalProps> = ({ visible, onClose, onSelect, currentParticipants = [], onParticipantClick }) => {
    const [friends, setFriends] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentUser, setCurrentUser] = useState<any>(null);

    useEffect(() => {
        if (visible) {
            fetchFriends();
            fetchCurrentUser();
        }
    }, [visible]);

    const fetchCurrentUser = async () => {
        try {
            const res = await userApi.getMe();
            setCurrentUser(res.data);
        } catch (error) {
            console.error('Failed to fetch current user:', error);
        }
    };

    const fetchFriends = async () => {
        try {
            setLoading(true);
            const res = await userApi.getMyFriends();
            setFriends(res.data);
        } catch (error) {
            console.error('Failed to fetch friends:', error);
        } finally {
            setLoading(false);
        }
    };

    // Filter friends who are NOT in currentParticipants
    const availableFriends = friends.filter(f => {
        // Handle both populated objects and string IDs in currentParticipants
        const isParticipant = currentParticipants.some(p => {
            const pId = typeof p === 'string' ? p : (p._id || p.userId || p.id);
            return pId === f.id || pId === f._id;
        });
        const matchesSearch = f.name.toLowerCase().includes(searchTerm.toLowerCase());
        return !isParticipant && matchesSearch;
    });

    if (!visible) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white dark:bg-[#1e293b] w-full max-w-sm rounded-[2rem] flex flex-col max-h-[80vh] shadow-2xl animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="p-5 pb-3 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">邀请好友同行</h3>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                    >
                        <span className="material-symbols-outlined text-[20px]">close</span>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 pt-2 space-y-6">

                    {/* Section 1: Current Participants */}
                    {(() => {
                        // Filter out current user from participants
                        const otherParticipants = currentParticipants.filter((p: any) => {
                            const pId = typeof p === 'string' ? p : (p._id || p.userId || p.id);
                            const currentId = currentUser?._id || currentUser?.id;
                            return pId && pId !== currentId;
                        });

                        console.log('=== FriendSelectionModal Debug ===');
                        console.log('Current User:', currentUser);
                        console.log('All Participants:', currentParticipants);
                        console.log('Other Participants (excluding self):', otherParticipants);
                        console.log('===================================');

                        if (otherParticipants.length === 0) return null;

                        return (
                            <div>
                                <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3 px-1">
                                    已加入同行 ({otherParticipants.length})
                                </h4>
                                <div className="grid grid-cols-4 gap-3">
                                    {otherParticipants.map((p: any) => {
                                        const participantId = typeof p === 'string' ? p : (p._id || p.userId || p.id);
                                        const participantName = typeof p === 'string' ? 'user' : (p.username || p.name || 'user');
                                        const participantAvatar = typeof p === 'string'
                                            ? `https://api.dicebear.com/7.x/notionists/svg?seed=${participantId}`
                                            : (p.avatarUrl || p.avatar ? getImageUrl(p.avatarUrl || p.avatar) : `https://api.dicebear.com/7.x/notionists/svg?seed=${participantName}`);

                                        return (
                                            <div
                                                key={participantId}
                                                className={`flex flex-col items-center gap-1 ${onParticipantClick ? 'cursor-pointer group' : ''}`}
                                                onClick={() => onParticipantClick && onParticipantClick(participantId)}
                                            >
                                                <div className="w-12 h-12 rounded-full bg-slate-200 border-2 border-white dark:border-slate-700 shadow-md overflow-hidden group-hover:scale-110 transition-all">
                                                    <CapacitorImage
                                                        src={participantAvatar}
                                                        alt={participantName}
                                                        className="w-full h-full object-cover grayscale-[20%] group-hover:grayscale-0"
                                                    />
                                                </div>
                                                <span className="text-[10px] text-slate-600 dark:text-slate-400 font-medium truncate w-full text-center group-hover:text-primary transition-colors">
                                                    {participantName}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })()}

                    {/* Section 2: Invite New Friends */}
                    <div>
                        <div className="flex items-center justify-between mb-3 px-1">
                            <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                                邀请新好友
                            </h4>
                            <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                <span className="material-symbols-outlined text-slate-400 text-[18px]">add</span>
                            </div>
                        </div>

                        {/* Search Input */}
                        <div className="relative mb-4">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-400 text-[20px]">search</span>
                            <input
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="搜索好友..."
                                className="w-full h-10 pl-10 pr-4 rounded-xl bg-slate-100 dark:bg-slate-800 border-none text-sm focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-white placeholder:text-slate-400"
                            />
                        </div>

                        {/* Friends List */}
                        {loading ? (
                            <div className="flex justify-center py-4">
                                <span className="material-symbols-outlined animate-spin text-primary">progress_activity</span>
                            </div>
                        ) : availableFriends.length === 0 ? (
                            <div className="text-center py-8 text-gray-400 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                                <p className="text-sm">暂无可邀请好友</p>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-2">
                                {availableFriends.map(friend => (
                                    <button
                                        key={friend.id}
                                        onClick={() => onSelect(friend.id)}
                                        className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors text-left group bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm"
                                    >
                                        <div className="w-10 h-10 rounded-full bg-slate-200 shrink-0 border border-slate-100 dark:border-slate-700 overflow-hidden">
                                            <CapacitorImage
                                                src={getImageUrl(friend.avatar)}
                                                alt={friend.name}
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <div className="font-bold text-slate-900 dark:text-white text-sm">{friend.name}</div>
                                            <div className="text-xs text-slate-500 dark:text-slate-400">Lv.{friend.level} · {friend.title}</div>
                                        </div>
                                        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all">
                                            <span className="material-symbols-outlined text-[18px]">add</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer hint */}
                <div className="p-4 pt-2 text-center border-t border-slate-100 dark:border-slate-800">
                    <p className="text-[10px] text-slate-400 dark:text-slate-500">
                        仅能邀请已添加的好友
                    </p>
                </div>
            </div>
        </div>
    );
};

export default FriendSelectionModal;
