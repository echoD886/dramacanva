import { useState, type CSSProperties } from "react";
import { ArrowLeft, Bookmark, Clapperboard, Layers3, Palette, Shapes, Share2, ShoppingBag, Sparkles } from "lucide-react";
import { useI18n } from "@/i18n/use-i18n";
import { skillListingText } from "@/pages/skills/skill-purpose";
import type { MessageKey } from "@/i18n/messages";
import type { CanvasTheme } from "@/lib/canvas-theme";
import type { Skill, SkillPreset } from "@/services/api/skills";
import type { AgentSceneBucket } from "@/lib/canvas/agent-scene-presets";
import "./canvas-agent-entry.css";

const icons = { frequent: Bookmark, drama: Clapperboard, ecommerce: ShoppingBag, creative: Palette, social: Share2, others: Shapes };
const builtinPresets = new Set(["short-drama-starter", "short-drama-pilot", "ad-full-chain", "h3-video", "seedance-video", "ecom-image", "ai-performer", "brand-positioning"]);

export function agentPresetCopy(preset: SkillPreset, t: ReturnType<typeof useI18n>["t"], kind: "preset" | "rationale" = "preset") {
    return builtinPresets.has(preset.presetId) ? t(`canvasAgentEntry.${kind}.${preset.presetId}` as MessageKey) : kind === "preset" ? preset.name : preset.rationale;
}

export function AgentSceneCapsules({
    buckets,
    installedIds,
    selectedIds,
    theme,
    disabled,
    onPick,
    onPickSkill,
}: {
    buckets: AgentSceneBucket[];
    installedIds: Set<string>;
    selectedIds: Set<string>;
    theme: CanvasTheme;
    disabled: boolean;
    onPick: (preset: SkillPreset) => void;
    onPickSkill: (skill: Skill) => void;
}) {
    const { t } = useI18n();
    const [activeKey, setActiveKey] = useState<string | null>(null);
    const visible = buckets.filter((bucket) => bucket.presets.length + bucket.skills.length);
    const active = visible.find((bucket) => bucket.key === activeKey);
    if (!visible.length) return null;
    const label = (key: AgentSceneBucket["key"]) => t(`canvasAgentEntry.${key}`);
    return (
        <section className="agent-scene-capsules" style={{ "--agent-entry-ink": theme.node.text, "--agent-entry-muted": theme.node.muted, "--agent-entry-accent": theme.accent.primary, "--agent-entry-hover": theme.toolbar.itemHover } as CSSProperties}>
            <h3>
                <Sparkles aria-hidden="true" />
                {active ? label(active.key) : t("canvasAgentEntry.recommendations")}
            </h3>
            <div className="agent-scene-capsules-scroll thin-scrollbar" data-canvas-wheel-scroll>
                {active ? (
                    <>
                        <button type="button" data-scene="back" disabled={disabled} onClick={() => setActiveKey(null)}>
                            <ArrowLeft aria-hidden="true" />
                            {t("canvasAgentEntry.allScenes")}
                        </button>
                        {active.presets.map((preset) => {
                            const missing = preset.skillIds.filter((id) => !installedIds.has(id)).length;
                            return (
                                <button
                                    key={preset.presetId}
                                    type="button"
                                    data-scene={active.key}
                                    disabled={disabled}
                                    title={agentPresetCopy(preset, t, "rationale")}
                                    aria-pressed={preset.skillIds.every((id) => selectedIds.has(id))}
                                    onClick={() => onPick(preset)}
                                >
                                    <Layers3 aria-hidden="true" />
                                    <span>{agentPresetCopy(preset, t)}</span>
                                    <small>
                                        {t("canvasAgentEntry.skillCount", { count: preset.skillIds.length })}
                                        {missing ? ` · ${t("canvasAgentEntry.missing", { count: missing })}` : ""}
                                    </small>
                                </button>
                            );
                        })}
                        {active.skills.map((skill) => (
                            <button key={skill.skillId} type="button" data-scene={active.key} disabled={disabled} title={skillListingText(skill, t).description} aria-pressed={selectedIds.has(skill.skillId)} onClick={() => onPickSkill(skill)}>
                                <Sparkles aria-hidden="true" />
                                <span>{skillListingText(skill, t).name}</span>
                                <small>{t(skill.isOwner ? "canvasAgentEntry.own" : skill.isLike ? "canvasAgentEntry.favorite" : installedIds.has(skill.skillId) ? "canvasAgentEntry.installed" : "canvasAgentEntry.notInstalled")}</small>
                            </button>
                        ))}
                    </>
                ) : (
                    visible.map((bucket) => {
                        const Icon = icons[bucket.key];
                        return (
                            <button key={bucket.key} type="button" data-scene={bucket.key} disabled={disabled} onClick={() => setActiveKey(bucket.key)}>
                                <Icon aria-hidden="true" />
                                <span>{label(bucket.key)}</span>
                                <small>{t("canvasAgentEntry.items", { count: bucket.skills.length + bucket.presets.length })}</small>
                            </button>
                        );
                    })
                )}
            </div>
            <p>{t("canvasAgentEntry.sessionNote")}</p>
        </section>
    );
}
