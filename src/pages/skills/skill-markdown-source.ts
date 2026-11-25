// SKILL.md starts with YAML metadata for the agent runtime. The drawer header already shows
// name, description and version, so the rendered preview hides it; the source view keeps it.
export function stripSkillFrontmatter(source: string) {
    const match = /^﻿?---[ \t]*\r?\n[\s\S]*?\r?\n---[ \t]*(?:\r?\n|$)/.exec(source);
    return match ? source.slice(match[0].length).replace(/^\s*\r?\n/, "") : source;
}
