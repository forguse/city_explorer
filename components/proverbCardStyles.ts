/**
 * 赠言卡片样式库 - Proverb Card Styles Library
 * 
 * 用于在任务回顾页面随机展示不同风格的赠言卡片背景
 * 添加新卡片：在 PROVERB_CARD_STYLES 数组中添加新对象即可
 */

export interface ProverbCardStyle {
    id: string;
    name: string;
    /** 背景渐变 CSS */
    backgroundGradient: string;
    /** 装饰纹理层样式 (可选) */
    textureStyle?: Record<string, string>;
    /** 装饰线颜色 */
    accentColor: string;
    /** 文字主色 */
    textColor: string;
    /** 文字次色 (署名等) */
    textMutedColor: string;
    /** 标题颜色 */
    labelColor: string;
}

export const PROVERB_CARD_STYLES: ProverbCardStyle[] = [
    {
        id: 'emerald-classic',
        name: '翠竹雅韵',
        backgroundGradient: 'linear-gradient(135deg, #1a2f23 0%, #1f3a2c 50%, #0f1f17 100%)',
        accentColor: 'rgba(16, 185, 129, 0.5)',
        textColor: '#ecfdf5',
        textMutedColor: 'rgba(16, 185, 129, 0.5)',
        labelColor: 'rgba(52, 211, 153, 0.8)',
    },
    {
        id: 'midnight-gold',
        name: '夜阑星辉',
        backgroundGradient: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f0f1a 100%)',
        accentColor: 'rgba(251, 191, 36, 0.5)',
        textColor: '#fefce8',
        textMutedColor: 'rgba(251, 191, 36, 0.5)',
        labelColor: 'rgba(251, 191, 36, 0.8)',
    },
    {
        id: 'sunset-amber',
        name: '落霞余晖',
        backgroundGradient: 'linear-gradient(135deg, #451a03 0%, #78350f 50%, #451a03 100%)',
        accentColor: 'rgba(251, 146, 60, 0.5)',
        textColor: '#fff7ed',
        textMutedColor: 'rgba(251, 146, 60, 0.5)',
        labelColor: 'rgba(251, 146, 60, 0.8)',
    },
    {
        id: 'ink-wash',
        name: '水墨丹青',
        backgroundGradient: 'linear-gradient(135deg, #1c1917 0%, #292524 50%, #0c0a09 100%)',
        accentColor: 'rgba(168, 162, 158, 0.5)',
        textColor: '#fafaf9',
        textMutedColor: 'rgba(168, 162, 158, 0.5)',
        labelColor: 'rgba(168, 162, 158, 0.8)',
    },
    {
        id: 'plum-blossom',
        name: '梅雪争春',
        backgroundGradient: 'linear-gradient(135deg, #3b0764 0%, #581c87 50%, #2e1065 100%)',
        accentColor: 'rgba(232, 121, 249, 0.5)',
        textColor: '#fdf4ff',
        textMutedColor: 'rgba(232, 121, 249, 0.5)',
        labelColor: 'rgba(232, 121, 249, 0.8)',
    },
    {
        id: 'azure-dream',
        name: '碧海云天',
        backgroundGradient: 'linear-gradient(135deg, #0c4a6e 0%, #075985 50%, #0369a1 100%)',
        accentColor: 'rgba(56, 189, 248, 0.5)',
        textColor: '#f0f9ff',
        textMutedColor: 'rgba(56, 189, 248, 0.5)',
        labelColor: 'rgba(56, 189, 248, 0.8)',
    },
];

/**
 * 根据 seed 获取一个稳定的卡片样式（相同 seed 返回相同样式）
 * @param seed - 可以是 task ID 或 execution ID
 */
export function getProverbCardStyle(seed?: string): ProverbCardStyle {
    if (!seed) {
        // 纯随机
        const randomIndex = Math.floor(Math.random() * PROVERB_CARD_STYLES.length);
        return PROVERB_CARD_STYLES[randomIndex];
    }

    // 基于 seed 的稳定选择（相同任务始终显示相同卡片）
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
        const char = seed.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    const index = Math.abs(hash) % PROVERB_CARD_STYLES.length;
    return PROVERB_CARD_STYLES[index];
}

/**
 * 获取所有可用卡片样式（用于预览或设置界面）
 */
export function getAllProverbCardStyles(): ProverbCardStyle[] {
    return PROVERB_CARD_STYLES;
}
