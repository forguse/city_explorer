// @ts-ignore
import sensitiveWordsRaw from '../assets/sensitiveWords.txt?raw';

class SensitiveFilter {
    private static instance: SensitiveFilter;
    private sensitiveMap: Map<string, any>;
    private isLoaded: boolean = false;

    private constructor() {
        this.sensitiveMap = new Map();
        this.init();
    }

    public static getInstance(): SensitiveFilter {
        if (!SensitiveFilter.instance) {
            SensitiveFilter.instance = new SensitiveFilter();
        }
        return SensitiveFilter.instance;
    }

    private init() {
        if (this.isLoaded) return;

        try {
            // 处理词库: 按行分割，去除空白和尾部多余逗号
            const words = sensitiveWordsRaw.split(/\r?\n/);

            for (const word of words) {
                // 清理单词：去除首尾空格，去除尾部可能存在的逗号
                const key = word.trim().replace(/[,，]+$/, '');
                if (key && key.length > 0) {
                    this.addWordToMap(key);
                }
            }
            this.isLoaded = true;
            console.log(`[SensitiveFilter] Loaded ${words.length} raw lines, filter ready.`);
        } catch (error) {
            console.error('[SensitiveFilter] Failed to init filter:', error);
        }
    }

    private addWordToMap(word: string) {
        let currentMap = this.sensitiveMap;

        for (let i = 0; i < word.length; i++) {
            const char = word.charAt(i);

            if (!currentMap.has(char)) {
                currentMap.set(char, new Map());
            }
            currentMap = currentMap.get(char);

            // Mark end of word
            if (i === word.length - 1) {
                currentMap.set('isEnd', true);
            }
        }
    }

    /**
     * 检查文本是否包含敏感词
     * @param text 待检查文本
     * @returns { isClean: boolean, matchedWords: string[] }
     */
    public check(text: string): { isClean: boolean, matchedWords: string[] } {
        if (!text) return { isClean: true, matchedWords: [] };

        const matchedWords: Set<string> = new Set();

        for (let i = 0; i < text.length; i++) {
            let currentMap = this.sensitiveMap;
            let matchLen = 0;
            let flag = false; // 是否找到敏感词

            for (let j = i; j < text.length; j++) {
                const char = text.charAt(j);
                currentMap = currentMap.get(char);

                if (currentMap) {
                    matchLen++;
                    if (currentMap.get('isEnd') === true) {
                        flag = true;
                        // 找到一个词后继续往后找，看是否有更长的匹配 (贪婪匹配? 或者找到最短即可? 这里用最长匹配可能更好，或者只要匹配到就记录)
                        // 为简单起见，只要匹配到就记录，并继续尝试匹配更长的
                        matchedWords.add(text.substring(i, i + matchLen));
                    }
                } else {
                    break;
                }
            }
        }

        const words = Array.from(matchedWords);
        return {
            isClean: words.length === 0,
            matchedWords: words
        };
    }
}

export default SensitiveFilter.getInstance();
