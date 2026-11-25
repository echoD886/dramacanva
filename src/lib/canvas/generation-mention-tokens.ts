// Greedy digits keep 图片10 intact; Chinese suffixes and adjacent @ tokens are valid.
export const GENERATION_MENTION_PATTERN = /@\[(node|asset|attachment):([^\]]+)\]|@(图片|视频|音频|文本|角色|绘图)(\d+)/gu;
const MENTION_AT_START = new RegExp(`^(?:${GENERATION_MENTION_PATTERN.source})`, "u");

export function generationMentionMatches(prompt: string) {
    return prompt.matchAll(GENERATION_MENTION_PATTERN);
}

export function replaceGenerationMentions(prompt: string, replace: (token: string) => string) {
    return prompt.replace(GENERATION_MENTION_PATTERN, replace);
}

export function canvasMentionTokenMatchesAt(value: string, token: string, index: number) {
    if (!value.startsWith(token, index)) return false;
    const match = MENTION_AT_START.exec(value.slice(index));
    if (match) return match[0] === token;
    if (/^@\[[^\]]+\]$/u.test(token)) return true;
    const char = value[index + token.length];
    return !char || /\s|[,.!?;:，。！？；：、)\]}】）]/.test(char);
}
