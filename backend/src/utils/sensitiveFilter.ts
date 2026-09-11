/**
 * 敏感词过滤工具
 * 用于检测和过滤不当内容
 */

// 敏感词列表 - 可以根据需要扩展
// 分类：政治敏感、暴力、色情、欺诈、侮辱性等
const SENSITIVE_WORDS: string[] = [
    // 暴力相关
    '杀人', '自杀', '炸弹', '爆炸', '恐怖', '袭击', '枪击', '屠杀',
    // 色情相关
    '色情', '裸体', '性交', '卖淫', '嫖娼',
    // 欺诈相关
    '诈骗', '传销', '洗钱', '赌博', '博彩',
    // 毒品相关
    '毒品', '吸毒', '贩毒', '冰毒', '海洛因', '大麻',
    // 侮辱性词汇
    '傻逼', '操你', '妈的', '草泥马', '狗日',
    // 其他不当内容
    '邪教', '法轮功',
];

// 正则模式 - 用于检测变体写法
const SENSITIVE_PATTERNS: RegExp[] = [
    /s\s*e\s*x/i,
    /f\s*u\s*c\s*k/i,
    /p\s*o\s*r\s*n/i,
];

export interface FilterResult {
    isClean: boolean;           // 是否通过检测
    hasSensitiveWords: boolean; // 是否包含敏感词
    matchedWords: string[];     // 匹配到的敏感词
    cleanedText?: string;       // 清理后的文本（用*替换敏感词）
}

/**
 * 检测文本是否包含敏感词
 */
export function checkSensitiveWords(text: string): FilterResult {
    if (!text) {
        return { isClean: true, hasSensitiveWords: false, matchedWords: [] };
    }

    const lowerText = text.toLowerCase();
    const matchedWords: string[] = [];

    // 检查敏感词列表
    for (const word of SENSITIVE_WORDS) {
        if (lowerText.includes(word.toLowerCase())) {
            matchedWords.push(word);
        }
    }

    // 检查正则模式
    for (const pattern of SENSITIVE_PATTERNS) {
        if (pattern.test(text)) {
            matchedWords.push(`[pattern: ${pattern.source}]`);
        }
    }

    const hasSensitiveWords = matchedWords.length > 0;

    return {
        isClean: !hasSensitiveWords,
        hasSensitiveWords,
        matchedWords: [...new Set(matchedWords)], // 去重
    };
}

/**
 * 检测多个字段
 */
export function checkMultipleFields(fields: { [key: string]: string }): FilterResult {
    const allMatchedWords: string[] = [];

    for (const [fieldName, text] of Object.entries(fields)) {
        if (text) {
            const result = checkSensitiveWords(text);
            if (result.hasSensitiveWords) {
                allMatchedWords.push(...result.matchedWords.map(w => `${fieldName}: ${w}`));
            }
        }
    }

    const hasSensitiveWords = allMatchedWords.length > 0;

    return {
        isClean: !hasSensitiveWords,
        hasSensitiveWords,
        matchedWords: allMatchedWords,
    };
}

/**
 * 清理文本（用*替换敏感词）
 */
export function cleanText(text: string): string {
    if (!text) return text;

    let cleaned = text;

    for (const word of SENSITIVE_WORDS) {
        const regex = new RegExp(word, 'gi');
        cleaned = cleaned.replace(regex, '*'.repeat(word.length));
    }

    return cleaned;
}

/**
 * 添加自定义敏感词（运行时）
 */
export function addSensitiveWord(word: string): void {
    if (word && !SENSITIVE_WORDS.includes(word)) {
        SENSITIVE_WORDS.push(word);
    }
}

/**
 * 获取当前敏感词列表长度
 */
export function getSensitiveWordsCount(): number {
    return SENSITIVE_WORDS.length;
}
