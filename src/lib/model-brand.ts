/** Brand identity only; never infer model capabilities from a display name. */
export function modelBrandIcon(name: string): string {
    const key = name.toLowerCase().replace(/[\s_.-]+/g, "");
    if (key.includes("nanobanana")) return "NanoBanana";
    if (key.includes("grok")) return "Grok";
    if (key.includes("gpt") || key.includes("openai") || key.includes("sora")) return "OpenAI";
    if (key.includes("gemini") || key.includes("veo") || key.includes("imagen")) return "Gemini";
    if (key.includes("claude")) return "Claude";
    if (key.includes("midjourney")) return "Midjourney";
    if (key.includes("seedream") || key.includes("seedance") || key.includes("doubao")) return "Doubao";
    if (key.includes("kling")) return "Kling";
    if (key.includes("minimax") || key.includes("hailuo")) return "Minimax";
    if (key.includes("deepseek")) return "DeepSeek";
    if (key.includes("qwen")) return "Qwen";
    if (key.includes("wan")) return "Alibaba";
    if (key.includes("glm")) return "ZAI";
    if (key.includes("kimi")) return "Kimi";
    if (key.includes("suno")) return "Suno";
    return "";
}

export function modelCompany(name: string): string | undefined {
    const icon = modelBrandIcon(name);
    return (
        {
            OpenAI: "OpenAI",
            NanoBanana: "Google",
            Gemini: "Google",
            Grok: "xAI",
            Claude: "Anthropic",
            Doubao: "ByteDance",
            Kling: "Kuaishou",
            Minimax: "MiniMax",
            DeepSeek: "DeepSeek",
            Qwen: "Alibaba",
            Alibaba: "Alibaba",
            ZAI: "Z.ai",
            Kimi: "Moonshot AI",
            Midjourney: "Midjourney",
            Suno: "Suno",
        } as Record<string, string>
    )[icon];
}

export function modelFamily(name: string): string | undefined {
    const key = name.toLowerCase().replace(/[\s_.-]+/g, "");
    const families = ["Seedance", "Seedream", "Kling", "Veo", "Wan", "MiniMax", "Grok", "Sora", "GPT Image", "Nano Banana", "Midjourney", "Suno"];
    return families.find((family) => key.includes(family.toLowerCase().replace(/\s/g, ""))) || (key.includes("hailuo") ? "MiniMax" : modelCompany(name));
}
