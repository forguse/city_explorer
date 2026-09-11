
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import Reward from '../models/Reward';
import UserReward from '../models/UserReward';
import User from '../models/User';

// GET /rewards/pending - Get pending/latest reward for the user (Mock logic for now: random or specific)
export const getPendingReward = async (req: AuthRequest, res: Response) => {
    try {
        const count = await Reward.countDocuments();
        if (count === 0) {
            // Seed initial data if empty (both badges and albums)
            await Reward.insertMany([
                // Badges
                {
                    title: '成都大熊猫繁育基地',
                    medal: '蓉城护卫',
                    rarity: 4,
                    type: 'badge',
                    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCjsFA2Qd7pnXh57i_3l4ObF6ZYIyBqdyexOgT5L0RPF9WkkBRq46k1lbKmbcscCb-ubsDD5uvjPE8ZgCIx55a4RqS1aiKLm1hjwkfJiGbiTOKFxRZhDL7PAK2jtje9H8xqcIA5noUF-qlPCNrUvbx4YS1LlPDiegtJKK76uJchmjpoZTAfPYjXvedvtAUi0i-7IjHLrtUrDG-crwu-Z7C9DdVyPENIA-gBtHx9IYQTSTJGPI5XLnVprn5N2LGdbsHe1nOEJvbtM1E',
                    description: '成功守护了国宝的栖息地'
                },
                {
                    title: '宽窄巷子',
                    medal: '市井漫步者',
                    rarity: 3,
                    type: 'badge',
                    image: 'https://picsum.photos/400/400?random=1',
                    description: '深入体验了老成都的慢生活'
                },
                {
                    title: '锦里古街',
                    medal: '锦里游侠',
                    rarity: 3,
                    type: 'badge',
                    image: 'https://picsum.photos/400/400?random=2',
                    description: '穿越千年的蜀地风情'
                },
                // Albums
                {
                    title: '春熙路夜景',
                    medal: '春熙路夜景',
                    rarity: 5, // SSR
                    type: 'album',
                    location: '成都中心',
                    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDbgT6KI2SITEHmZLUwScqMuvxE6IQWfVTZs5B7YcWzb397wFPpcSCDiEKQLn_mj31LorVJ4a3HEGyyiwnYHppfV0PxRQmN6LVpk-t_sNEqxr8ZEm6TOMZBzZRjrO5dlxVlB3fF1pX0naDh2-ZNeg4r8vSqfenBepVyo8Y7nCtQFrK3oIM84r9_OJ7zwFRDNvbka5Gw9GiBsovDXbGtsypCjcY86Y_U83ope76a17HMR9XpJm7xy0vhLR0qROWl2VvoSVPVQJ9OBYc',
                    description: '记录了春熙路绚烂的夜色'
                },
                {
                    title: '宽窄巷子',
                    medal: '宽窄巷子',
                    rarity: 4, // SR
                    type: 'album',
                    location: '老成都',
                    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAf5wy1P4i-YPujAGoIzAyvhxZBHhwk9wpShLOarntNf4R0RXWy4vwSgCaRPMkmzlJHpEcShV-XJ49VwNcbm8F0ecicSUqoTdkBmIlh6xtVRr6pJOTOM9fdJlby92-zFeZ8IOptXrmRNQg6imTDo9a0EYVZfrtsgPmWLrlZdTv7d_s9IaAVJokp7UVOl-7c6A4-RI3ld5OurSG3In9W2M4Of8krCA4N2h1cSoOMV95_0yxkNwQFRALFVJ7KgJOOQ7Lryj9gS9KSoB0',
                    description: '老成都的市井风情画'
                },
                {
                    title: '太古里',
                    medal: '太古里',
                    rarity: 3, // R
                    type: 'album',
                    location: '购物中心',
                    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBjm46yegyTIYwg8-Eyk7qjLJG584rpeEhovHChfW78z7v2135s6XsVtB-_rq3glVQ0dxmYrClTj-valzLywd7pt1Cg2NUzbp2NZDCVEqcQUaUSeqZX_0uPML4aj-zvqsR8D2F6drQxMrZIzuXeh7rMnTGDR6jHE6Vu6sRcpshQg_9o6ylx-8jOBPejXksDDduhAPHHG9pilnhsZDKI_WUIKnh6fYKbN7T9oBuKU1FdVWoByr3i8xKm1vIOP5uLT8L6ztstN4GG9IE',
                    description: '现代与传统交织的城市地标'
                }
            ]);
        }

        const random = Math.floor(Math.random() * (await Reward.countDocuments({ type: 'badge' })));
        const reward = await Reward.findOne({ type: 'badge' }).skip(random);

        res.json(reward);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch reward' });
    }
};

export const createReward = async (req: AuthRequest, res: Response) => {
    try {
        const currentUser = await User.findById(req.userId).select('isAdmin');
        if (!currentUser?.isAdmin) {
            return res.status(403).json({ error: 'Administrator access required' });
        }

        const reward = new Reward(req.body);
        await reward.save();
        res.status(201).json(reward);
    } catch (error) {
        res.status(400).json({ error: 'Failed to create reward' });
    }
};

// GET /rewards/my?type=badge|album
export const getMyRewards = async (req: AuthRequest, res: Response) => {
    try {
        const { type } = req.query;

        // First get user's rewards
        let userRewardsQuery = UserReward.find({ user: req.userId }).populate('reward').sort({ acquiredAt: -1 });
        const userRewards = await userRewardsQuery;

        // Filter by type if specified
        let filteredRewards = userRewards;
        if (type && (type === 'badge' || type === 'album')) {
            filteredRewards = userRewards.filter((ur: any) => ur.reward?.type === type);
        }

        res.json(filteredRewards);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch my rewards' });
    }
};
