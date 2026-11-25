import type { Skill, SkillPreset } from "@/services/api/skills";

export const AGENT_SCENE_KEYS = ["frequent", "drama", "ecommerce", "creative", "social", "others"] as const;
export type AgentSceneKey = (typeof AGENT_SCENE_KEYS)[number];
export type AgentSceneBucket = { key: AgentSceneKey; presets: SkillPreset[]; skills: Skill[] };

export function buildAgentSceneBuckets(presets: SkillPreset[] | null | undefined, installed: Skill[], created: Skill[]): AgentSceneBucket[] {
    const pool = [...new Map([...installed, ...created].map((skill) => [skill.skillId, skill])).values()].sort(
        (a, b) => Number(b.isOwner) - Number(a.isOwner) || Number(b.isLike) - Number(a.isLike) || b.addedCount - a.addedCount || a.skillId.localeCompare(b.skillId),
    );
    return AGENT_SCENE_KEYS.map((key) => ({
        key,
        presets: key === "frequent" ? [] : (presets ?? []).filter((preset) => preset.scene === key),
        skills: key === "frequent" ? pool.slice(0, 8) : pool.slice(0, 24).filter((skill) => (skill.tag || "others") === key),
    }));
}

// Select only after the library confirms every requested skill, including newly installed ones.
export function confirmedAgentSkillIds(ids: string[], skills: Skill[]): string[] | null {
    const unique = [...new Set(ids)];
    const installed = new Set(skills.filter((skill) => skill.isAdded).map((skill) => skill.skillId));
    return unique.length > 0 && unique.length <= 8 && unique.every((id) => installed.has(id)) ? unique : null;
}
