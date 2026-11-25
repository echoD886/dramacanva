export const SKILL_CANVAS_HANDOFF_STORAGE_KEY = "dramacanva-public:skill-canvas-handoff";

export type SkillCanvasHandoff = {
    id: string;
    skillId: string;
    skillName: string;
    prompt: string;
    createdAt: number;
};

function handoffID() {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
    return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function buildSkillCanvasPrompt(skillName: string, intent: string) {
    return `@${skillName}\n\n使用「${skillName}」这个 Skill 处理以下创作需求：\n${intent}\n\n请先读取这个 Skill 的 SKILL.md，再把结果整理成能继续在画布中制作的工作流。`;
}

export function saveSkillCanvasHandoff(input: Pick<SkillCanvasHandoff, "skillId" | "skillName" | "prompt">) {
    if (typeof window === "undefined") return null;
    const handoff: SkillCanvasHandoff = { ...input, id: handoffID(), createdAt: Date.now() };
    try {
        window.sessionStorage.setItem(SKILL_CANVAS_HANDOFF_STORAGE_KEY, JSON.stringify(handoff));
        return handoff;
    } catch {
        return null;
    }
}

