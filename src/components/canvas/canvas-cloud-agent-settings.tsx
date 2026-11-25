import { useEffect, useState, type ReactNode } from "react";
import { Button, Checkbox, Input } from "antd";
import { ArrowLeft, Check, ChevronRight, Cpu, Gauge, LockKeyhole, PlugZap, Search, ShieldCheck, Sparkles, Wrench } from "lucide-react";

import { ModelPicker } from "@/components/model-picker";
import type { CanvasTheme } from "@/lib/canvas-theme";
import { useI18n } from "@/i18n/use-i18n";
import { skillListingText } from "@/pages/skills/skill-purpose";
import { translateMessage, type MessageKey } from "@/i18n/messages";
import type { AgentPermissionMode, AgentProfileLayer, AgentProfileScope, AgentProfileView, AgentReasoningMode } from "@/services/api/agent";
import type { Skill } from "@/services/api/skills";
import type { AiConfig } from "@/stores/use-config-store";

export type AgentContextKey = "canvas" | "resources" | "generation_history" | "skills" | "project";
type SettingsSection = "home" | "profile" | "skills" | "mcp" | "context" | "budget";
type SettingsTranslateFn = (key: MessageKey, values?: Record<string, string | number>) => string;

type AgentSettingsProps = {
    theme: CanvasTheme;
    config: AiConfig;
    selectedModel: string;
    permissionMode: AgentPermissionMode;
    reasoningMode: AgentReasoningMode;
    onReasoningModeChange: (value: AgentReasoningMode) => void;
    profileView: AgentProfileView | null;
    profileLoading: boolean;
    profileSaving: boolean;
    profileError?: string;
    projectId?: string;
    canvasId: string;
    onReloadProfile: () => Promise<void>;
    onSaveProfile: (input: { scope: AgentProfileScope; projectId?: string; canvasId?: string; content: string; revision: number }) => Promise<AgentProfileView>;
    contextScope: AgentContextKey[];
    nodeCount: number;
    installedSkills: Skill[];
    marketSkills: Skill[];
    selectedSkillIds: string[];
    skillSearch: string;
    skillsLoading: boolean;
    skillHasMore: boolean;
    maxCredits: string;
    maxGenerationTasks: string;
    maxVideoSeconds: string;
    onBack: () => void;
    onModelChange: (model: string) => void;
    onPermissionChange: (mode: AgentPermissionMode) => void;
    onContextToggle: (value: AgentContextKey) => void;
    onSkillSearch: (value: string) => void;
    onSkillToggle: (skillId: string) => void;
    onSkillInstall: (skill: Skill) => Promise<void>;
    onLoadMoreSkills: () => Promise<void>;
    onMaxCreditsChange: (value: string) => void;
    onMaxGenerationTasksChange: (value: string) => void;
    onMaxVideoSecondsChange: (value: string) => void;
};

const permissionOptions: Array<{ value: AgentPermissionMode; labelKey: MessageKey; descriptionKey: MessageKey; icon: typeof ShieldCheck; color: string }> = [
    { value: "read_only", labelKey: "canvasCloudAgentSettings.permission.readOnly", descriptionKey: "canvasCloudAgentSettings.permission.readOnlyDesc", icon: LockKeyhole, color: "#4f7cff" },
    { value: "request_approval", labelKey: "canvasCloudAgentSettings.permission.requestApproval", descriptionKey: "canvasCloudAgentSettings.permission.requestApprovalDesc", icon: ShieldCheck, color: "#b58336" },
    { value: "auto", labelKey: "canvasCloudAgentSettings.permission.auto", descriptionKey: "canvasCloudAgentSettings.permission.autoDesc", icon: Sparkles, color: "#429477" },
];

const contextOptions: Array<{ value: AgentContextKey; labelKey: MessageKey; descriptionKey: MessageKey }> = [{ value: "canvas", labelKey: "canvasCloudAgentSettings.context.canvas", descriptionKey: "canvasCloudAgentSettings.context.canvasDesc" }];

const reasoningOptions: Array<{ value: AgentReasoningMode; labelKey: MessageKey; descriptionKey: MessageKey }> = [
    { value: "off", labelKey: "canvasCloudAgentSettings.reasoning.off", descriptionKey: "canvasCloudAgentSettings.reasoning.offDesc" },
    { value: "auto", labelKey: "canvasCloudAgentSettings.reasoning.auto", descriptionKey: "canvasCloudAgentSettings.reasoning.autoDesc" },
    { value: "deep", labelKey: "canvasCloudAgentSettings.reasoning.deep", descriptionKey: "canvasCloudAgentSettings.reasoning.deepDesc" },
];

const sectionTitleKeys: Record<Exclude<SettingsSection, "home" | "skills">, MessageKey> = {
    profile: "canvasCloudAgentSettings.sectionTitle.profile",
    mcp: "canvasCloudAgentSettings.sectionTitle.mcp",
    context: "canvasCloudAgentSettings.sectionTitle.context",
    budget: "canvasCloudAgentSettings.sectionTitle.budget",
};
const sectionSubtitleKeys: Record<Exclude<SettingsSection, "home">, MessageKey> = {
    profile: "canvasCloudAgentSettings.sectionSubtitle.profile",
    skills: "canvasCloudAgentSettings.sectionSubtitle.skills",
    mcp: "canvasCloudAgentSettings.sectionSubtitle.mcp",
    context: "canvasCloudAgentSettings.sectionSubtitle.context",
    budget: "canvasCloudAgentSettings.sectionSubtitle.budget",
};

function sectionTitle(t: SettingsTranslateFn, section: SettingsSection) {
    return section === "profile" || section === "mcp" || section === "context" || section === "budget" ? t(sectionTitleKeys[section]) : "Skills";
}
function sectionSubtitle(t: SettingsTranslateFn, section: Exclude<SettingsSection, "home">) {
    return t(sectionSubtitleKeys[section]);
}

export function CanvasCloudAgentSettings(props: AgentSettingsProps) {
    const { t } = useI18n();
    const [section, setSection] = useState<SettingsSection>("home");
    const [skillTab, setSkillTab] = useState<"installed" | "market">("installed");
    const { theme } = props;
    const title = section === "home" ? t("canvasCloudAgentSettings.homeTitle") : sectionTitle(t, section);
    const goHome = () => setSection("home");

    return (
        <div className="canvas-agent-settings flex min-h-0 min-w-0 flex-1 flex-col">
            <header data-agent-drag-handle className="agent-panel-header flex shrink-0 items-center gap-2">
                <Button
                    type="text"
                    shape="circle"
                    icon={<ArrowLeft className="size-4" />}
                    onClick={section === "home" ? props.onBack : goHome}
                    aria-label={section === "home" ? t("canvasCloudAgentSettings.backToChat") : t("canvasCloudAgentSettings.backToSettings")}
                />
                <div className="min-w-0 flex-1">
                    <div className="agent-panel-title">{title}</div>
                    <div className="agent-panel-context">{section === "home" ? t("canvasCloudAgentSettings.homeHint") : sectionSubtitle(t, section)}</div>
                </div>
                {section !== "home" ? (
                    <span className="rounded-full px-2 py-1 text-[10px] opacity-50" style={{ background: theme.node.fill }}>
                        {section === "skills" ? t("canvasCloudAgentSettings.enabledBadge", { count: props.selectedSkillIds.length }) : t("canvasCloudAgentSettings.currentAgentBadge")}
                    </span>
                ) : null}
            </header>

            {section === "home" ? <SettingsHome props={props} theme={theme} onOpen={setSection} /> : null}
            {section === "profile" ? <ProfileWorkspace props={props} theme={theme} /> : null}
            {section === "skills" ? <SkillsWorkspace props={props} theme={theme} tab={skillTab} onTabChange={setSkillTab} /> : null}
            {section === "mcp" ? <McpWorkspace theme={theme} /> : null}
            {section === "context" ? <ContextWorkspace props={props} theme={theme} /> : null}
            {section === "budget" ? <BudgetWorkspace props={props} theme={theme} /> : null}
        </div>
    );
}

function SettingsHome({ props, theme, onOpen }: { props: AgentSettingsProps; theme: CanvasTheme; onOpen: (section: SettingsSection) => void }) {
    const { t } = useI18n();
    return (
        <div className="canvas-agent-settings-scroll thin-scrollbar min-h-0 flex-1 space-y-6 overflow-y-auto p-4">
            <section>
                <SettingLabel t={t} label={t("canvasCloudAgentSettings.section.reasoning")} hint={t("canvasCloudAgentSettings.hint.newRun")} />
                <div className="grid grid-cols-3 gap-2">
                    {reasoningOptions.map((option) => (
                        <button
                            key={option.value}
                            type="button"
                            aria-pressed={props.reasoningMode === option.value}
                            onClick={() => props.onReasoningModeChange(option.value)}
                            className="rounded-xl p-3 text-left"
                            style={{ background: props.reasoningMode === option.value ? theme.toolbar.itemHover : theme.node.fill, border: `1px solid ${props.reasoningMode === option.value ? theme.accent.primary : "transparent"}` }}
                        >
                            <div className="text-xs font-semibold">{t(option.labelKey)}</div>
                            <div className="mt-1 text-[10px] opacity-50">{t(option.descriptionKey)}</div>
                        </button>
                    ))}
                </div>
                <p className="mt-2 text-xs leading-5" style={{ color: theme.node.muted }}>
                    {t("canvasCloudAgentSettings.reasoningNote")}
                </p>
            </section>
            <section>
                <SettingLabel t={t} label={t("canvasCloudAgentSettings.section.model")} hint={t("canvasCloudAgentSettings.hint.newRun")} />
                <div className="min-w-0 rounded-xl px-2 py-1.5" style={{ background: theme.node.fill }}>
                    <ModelPicker
                        config={props.config}
                        value={props.selectedModel}
                        capability="text"
                        onChange={props.onModelChange}
                        variant="creation"
                        fullWidth
                        showSelectedPrice
                        showOptionPrices
                        placeholder={t("canvasCloudAgentSettings.selectTextModel")}
                        className="!border-0 !bg-transparent !shadow-none"
                        popoverClassName="agent-model-picker-popover"
                    />
                </div>
            </section>
            <section>
                <SettingLabel t={t} label={t("canvasCloudAgentSettings.section.permission")} hint={t("canvasCloudAgentSettings.hint.newRun")} />
                <div className="canvas-agent-permissions">
                    {permissionOptions.map((option) => {
                        const Icon = option.icon;
                        const active = option.value === props.permissionMode;
                        return (
                            <button
                                key={option.value}
                                type="button"
                                className="flex min-w-0 flex-col gap-2 rounded-xl p-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current/30"
                                style={{ background: theme.node.fill, color: theme.node.text, boxShadow: active ? `inset 0 0 0 1px ${theme.node.muted}` : "none" }}
                                onClick={() => props.onPermissionChange(option.value)}
                                aria-pressed={active}
                            >
                                <span className="flex w-full items-center gap-1.5 text-xs font-medium">
                                    <Icon className="size-3.5 shrink-0" style={{ color: option.color }} />
                                    <span>{t(option.labelKey)}</span>
                                    {active ? <Check className="ml-auto size-3 shrink-0" /> : null}
                                </span>
                                <span className="text-[11px] leading-4" style={{ color: theme.node.muted }}>
                                    {t(option.descriptionKey)}
                                </span>
                            </button>
                        );
                    })}
                </div>
                <p className="mt-2 text-xs leading-5" style={{ color: theme.node.muted }}>
                    {t("canvasCloudAgentSettings.permissionNote")}
                </p>
            </section>
            <section>
                <SettingLabel t={t} label={t("canvasCloudAgentSettings.section.capabilities")} />
                <div className="space-y-1">
                    {props.canvasId && (
                        <SettingRow
                            theme={theme}
                            icon={<Cpu className="size-4" />}
                            title={t("canvasCloudAgentSettings.row.context")}
                            summary={t("canvasCloudAgentSettings.row.contextSummary", { nodes: props.nodeCount, scopes: props.contextScope.length })}
                            onClick={() => onOpen("context")}
                        />
                    )}
                    <SettingRow theme={theme} icon={<Sparkles className="size-4" />} title={t("canvasCloudAgentSettings.row.profile")} summary={profileSummary(t, props.profileView)} onClick={() => onOpen("profile")} />
                    <SettingRow
                        theme={theme}
                        icon={<Sparkles className="size-4" />}
                        title={t("canvasCloudAgentSettings.row.skills")}
                        summary={t("canvasCloudAgentSettings.row.skillsSummary", { installed: props.installedSkills.length, enabled: props.selectedSkillIds.length })}
                        onClick={() => onOpen("skills")}
                    />
                    <SettingRow theme={theme} icon={<Wrench className="size-4" />} title={t("canvasCloudAgentSettings.row.mcp")} summary={t("canvasCloudAgentSettings.row.mcpSummary")} onClick={() => onOpen("mcp")} />
                    <SettingRow
                        theme={theme}
                        icon={<Gauge className="size-4" />}
                        title={t("canvasCloudAgentSettings.row.budget")}
                        summary={t("canvasCloudAgentSettings.row.budgetSummary", { credits: props.maxCredits || t("canvasCloudAgentSettings.budgetUnset") })}
                        onClick={() => onOpen("budget")}
                    />
                </div>
            </section>
        </div>
    );
}

function SkillsWorkspace({ props, theme, tab, onTabChange }: { props: AgentSettingsProps; theme: CanvasTheme; tab: "installed" | "market"; onTabChange: (tab: "installed" | "market") => void }) {
    const { t } = useI18n();
    const query = props.skillSearch.trim().toLocaleLowerCase();
    const source =
        tab === "installed"
            ? props.installedSkills.filter((skill) => `${skillListingText(skill, t).name} ${skillListingText(skill, t).description || ""} ${skill.skillName} ${skill.description || ""}`.toLocaleLowerCase().includes(query))
            : props.marketSkills;
    const allVisibleSelected = tab === "installed" && source.length > 0 && source.every((skill) => props.selectedSkillIds.includes(skill.skillId));
    const toggleAll = () =>
        source.forEach((skill) => {
            const selected = props.selectedSkillIds.includes(skill.skillId);
            if (tab === "installed" && selected === allVisibleSelected) props.onSkillToggle(skill.skillId);
        });
    return (
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            <div className="shrink-0 px-4 pt-4">
                <div className="flex gap-1 rounded-xl p-1" style={{ background: theme.node.fill }}>
                    <TabButton theme={theme} active={tab === "installed"} label={t("canvasCloudAgentSettings.skills.tabInstalled", { count: props.installedSkills.length })} onClick={() => onTabChange("installed")} />
                    <TabButton theme={theme} active={tab === "market"} label={t("canvasCloudAgentSettings.skills.tabMarket")} onClick={() => onTabChange("market")} />
                </div>
                <Input
                    prefix={<Search className="size-4" style={{ color: theme.node.muted }} />}
                    value={props.skillSearch}
                    onChange={(event) => props.onSkillSearch(event.target.value)}
                    placeholder={tab === "market" ? t("canvasCloudAgentSettings.skills.searchMarket") : t("canvasCloudAgentSettings.skills.searchInstalled")}
                    aria-label={t("canvasCloudAgentSettings.skills.searchAria")}
                    className="mt-3 !h-10 !rounded-xl"
                />
                <div className="mt-4 flex items-center justify-between gap-2 text-xs" style={{ color: theme.node.muted }}>
                    <span>{tab === "market" ? t("canvasCloudAgentSettings.skills.marketHint") : t("canvasCloudAgentSettings.skills.matchCount", { count: source.length })}</span>
                    {tab === "installed" && source.length > 0 ? (
                        <button type="button" className="shrink-0 rounded px-1 py-1 focus-visible:outline focus-visible:outline-2" onClick={toggleAll}>
                            {allVisibleSelected ? t("canvasCloudAgentSettings.skills.deselectAll") : t("canvasCloudAgentSettings.skills.selectAll")}
                        </button>
                    ) : null}
                </div>
            </div>
            <div className="canvas-agent-settings-scroll thin-scrollbar min-h-0 min-w-0 flex-1 space-y-1 overflow-y-auto p-4 pt-2">
                {props.skillsLoading && !source.length ? (
                    <div className="py-8 text-center text-xs" style={{ color: theme.node.muted }}>
                        {t("canvasCloudAgentSettings.skills.loading")}
                    </div>
                ) : null}
                {source.map((skill) => (
                    <SkillRow
                        key={skill.skillId}
                        skill={skill}
                        theme={theme}
                        selected={props.selectedSkillIds.includes(skill.skillId)}
                        installed={skill.isAdded}
                        selectable={tab === "installed"}
                        onToggle={() => props.onSkillToggle(skill.skillId)}
                        onInstall={() => void props.onSkillInstall(skill)}
                    />
                ))}
                {!props.skillsLoading && !source.length ? (
                    <div className="py-10 text-center text-xs" style={{ color: theme.node.muted }}>
                        {t("canvasCloudAgentSettings.skills.noMatch")}
                        {tab === "installed" && props.installedSkills.length === 0 ? (
                            <div className="mt-3">
                                <Button size="small" onClick={() => onTabChange("market")}>
                                    {t("canvasAgentSkillLibrary.browseMarket")}
                                </Button>
                            </div>
                        ) : null}
                    </div>
                ) : null}
                {tab === "market" && props.skillHasMore ? (
                    <button type="button" className="my-3 w-full rounded-xl py-2 text-xs" style={{ background: theme.node.fill, color: theme.node.text }} onClick={() => void props.onLoadMoreSkills()} disabled={props.skillsLoading}>
                        {props.skillsLoading ? t("canvasCloudAgentSettings.skills.loadingMore") : t("canvasCloudAgentSettings.skills.loadMore")}
                    </button>
                ) : null}
            </div>
        </div>
    );
}

type ProfileDraft = Pick<AgentProfileLayer, "content" | "revision" | "hash"> & { dirty: boolean };

function ProfileWorkspace({ props, theme }: { props: AgentSettingsProps; theme: CanvasTheme }) {
    const { t } = useI18n();
    const [scope, setScope] = useState<AgentProfileScope>("user");
    const [drafts, setDrafts] = useState<Record<string, ProfileDraft>>({});
    const [error, setError] = useState("");
    const layer = profileLayer(props.profileView, scope, props.projectId, props.canvasId);
    const draftKey = profileDraftKey(scope, props.projectId, props.canvasId);
    const serverDraft: ProfileDraft = { content: layer.content, revision: layer.revision, hash: layer.hash, dirty: false };
    const draft = drafts[draftKey] || serverDraft;
    const profileUnavailable = props.profileLoading || !props.profileView || Boolean(props.profileError);

    useEffect(() => {
        setDrafts((current) => {
            const existing = current[draftKey];
            if (existing?.dirty) return current;
            if (existing && existing.revision === layer.revision && existing.hash === layer.hash && existing.content === layer.content) return current;
            return { ...current, [draftKey]: { content: layer.content, revision: layer.revision, hash: layer.hash, dirty: false } };
        });
        setError("");
    }, [draftKey, layer.content, layer.hash, layer.revision]);

    const updateDraft = (content: string) => {
        setDrafts((current) => {
            const base = current[draftKey] || serverDraft;
            return { ...current, [draftKey]: { ...base, content, dirty: true } };
        });
    };

    const save = async () => {
        setError("");
        try {
            const result = await props.onSaveProfile({
                scope,
                projectId: scope === "project" ? props.projectId : undefined,
                canvasId: scope === "canvas" ? props.canvasId : undefined,
                content: draft.content,
                revision: draft.revision,
            });
            const savedLayer = profileLayer(result, scope, props.projectId, props.canvasId);
            setDrafts((current) => ({
                ...current,
                [draftKey]: { content: savedLayer.content, revision: savedLayer.revision, hash: savedLayer.hash, dirty: false },
            }));
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : String(cause));
        }
    };

    const disabled = profileUnavailable || props.profileSaving || (scope === "project" && !props.projectId);
    return (
        <div className="canvas-agent-settings-scroll thin-scrollbar min-h-0 flex-1 overflow-y-auto p-4">
            <div className="rounded-xl p-4" style={{ background: theme.node.fill }}>
                <div className="text-sm font-semibold">{t("canvasCloudAgentSettings.profile.title")}</div>
                <p className="mt-2 text-xs leading-5" style={{ color: theme.node.muted }}>
                    {t("canvasCloudAgentSettings.profile.intro")}
                </p>
            </div>
            <div className="mt-4 flex gap-1 rounded-xl p-1" style={{ background: theme.node.fill }}>
                <TabButton theme={theme} active={scope === "user"} label={t("canvasCloudAgentSettings.profile.tabUser")} onClick={() => setScope("user")} />
                <TabButton theme={theme} active={scope === "project"} label={t("canvasCloudAgentSettings.profile.tabProject")} onClick={() => setScope("project")} />
                {props.canvasId && <TabButton theme={theme} active={scope === "canvas"} label={t("canvasCloudAgentSettings.profile.tabCanvas")} onClick={() => setScope("canvas")} />}
            </div>
            {scope === "project" && !props.projectId ? (
                <p className="mt-3 text-xs leading-5" style={{ color: theme.node.muted }}>
                    {t("canvasCloudAgentSettings.profile.projectUnbound")}
                </p>
            ) : null}
            {props.profileLoading ? (
                <p className="mt-4 text-xs" style={{ color: theme.node.muted }}>
                    {t("canvasCloudAgentSettings.profile.loading")}
                </p>
            ) : null}
            {props.profileError ? <ProfileError message={props.profileError} onRetry={props.onReloadProfile} theme={theme} retryLabel={t("canvasCloudAgentSettings.profile.retry")} /> : null}
            <label className="mt-4 block">
                <span className="flex items-center justify-between text-xs font-semibold">
                    <span>{scopeLabel(t, scope)}</span>
                    <span className="text-[10px] font-normal opacity-40">
                        {t("canvasCloudAgentSettings.profile.revision", { revision: draft.revision })}
                        {draft.dirty ? t("canvasCloudAgentSettings.profile.unsaved") : ""}
                    </span>
                </span>
                <Input.TextArea
                    value={draft.content}
                    onChange={(event) => updateDraft(event.target.value)}
                    disabled={disabled}
                    maxLength={12000}
                    showCount
                    autoSize={{ minRows: 10, maxRows: 20 }}
                    placeholder={t("canvasCloudAgentSettings.profile.placeholder")}
                    className="mt-2 !rounded-xl"
                    style={{ background: theme.node.fill }}
                />
            </label>
            <div className="mt-3 flex items-center justify-between gap-3">
                <span className="text-[10px] leading-4 opacity-45">{t("canvasCloudAgentSettings.profile.saveHint")}</span>
                <Button type="primary" onClick={() => void save()} loading={props.profileSaving} disabled={disabled || !draft.dirty}>
                    {t("canvasCloudAgentSettings.profile.save")}
                </Button>
            </div>
            {error ? (
                <div className="mt-3 rounded-lg px-3 py-2 text-xs" style={{ background: "#d66b6b1f", color: "#d66b6b" }}>
                    {error}
                </div>
            ) : null}
        </div>
    );
}

function profileDraftKey(scope: AgentProfileScope, projectId: string | undefined, canvasId: string) {
    if (scope === "project") return `project:${projectId || "unbound"}`;
    if (scope === "canvas") return `canvas:${canvasId}`;
    return "user";
}

function profileLayer(view: AgentProfileView | null, scope: AgentProfileScope, projectId: string | undefined, canvasId: string): AgentProfileLayer {
    return view?.layers.find((item) => item.scope === scope) || { scope, projectId: scope === "project" ? projectId : undefined, canvasId: scope === "canvas" ? canvasId : undefined, content: "", revision: 0, hash: "" };
}

function profileSummary(t: SettingsTranslateFn, view: AgentProfileView | null) {
    const count = view?.layers.filter((layer) => layer.content.trim()).length || 0;
    return count ? t("canvasCloudAgentSettings.profile.configured", { count }) : t("canvasCloudAgentSettings.profile.empty");
}

function scopeLabel(t: SettingsTranslateFn, scope: AgentProfileScope) {
    return t(scope === "user" ? "canvasCloudAgentSettings.profile.scopeUser" : scope === "project" ? "canvasCloudAgentSettings.profile.scopeProject" : "canvasCloudAgentSettings.profile.scopeCanvas");
}

function ProfileError({ message, onRetry, theme, retryLabel }: { message: string; onRetry: () => Promise<void>; theme: CanvasTheme; retryLabel: string }) {
    return (
        <div className="mt-3 rounded-lg px-3 py-2 text-xs" style={{ background: "#d6a24a1f", color: theme.node.text }}>
            <div>{message}</div>
            <button type="button" className="mt-2 underline" onClick={() => void onRetry()}>
                {retryLabel}
            </button>
        </div>
    );
}

function SkillRow({ skill, theme, selected, installed, selectable, onToggle, onInstall }: { skill: Skill; theme: CanvasTheme; selected: boolean; installed: boolean; selectable: boolean; onToggle: () => void; onInstall: () => void }) {
    const { t } = useI18n();
    return (
        <div className="canvas-agent-skill-row flex min-w-0 items-start gap-3 rounded-xl p-3 transition-colors">
            {selectable ? (
                <Checkbox className="mt-0.5 shrink-0" checked={selected} onChange={onToggle} aria-label={t("canvasCloudAgentSettings.skill.enableAria", { name: skillListingText(skill, t).name })} />
            ) : (
                <span className="grid size-8 shrink-0 place-items-center rounded-lg" style={{ background: theme.node.fill, color: theme.node.muted }}>
                    <Sparkles className="size-4" />
                </span>
            )}
            <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-baseline gap-2">
                    <span className="min-w-0 flex-1 break-words text-[13px] font-medium [overflow-wrap:anywhere]">{skillListingText(skill, t).name}</span>
                    {skill.version ? (
                        <span className="shrink-0 text-[10px]" style={{ color: theme.node.muted }}>
                            v{skill.version}
                        </span>
                    ) : null}
                </div>
                <p className="mt-1 line-clamp-2 text-xs leading-5 [overflow-wrap:anywhere]" style={{ color: theme.node.muted }} title={skillListingText(skill, t).description || undefined}>
                    {skillListingText(skill, t).description || t("canvasCloudAgentSettings.skill.noDescription")}
                </p>
            </div>
            {!selectable ? (
                <Button size="small" type="text" className="!shrink-0 !px-2" disabled={installed} onClick={onInstall}>
                    {installed ? t("canvasCloudAgentSettings.skill.installed") : t("canvasCloudAgentSettings.skill.add")}
                </Button>
            ) : null}
        </div>
    );
}

function McpWorkspace({ theme }: { theme: CanvasTheme }) {
    const { t } = useI18n();
    const tools: Array<[MessageKey, string]> = [
        ["canvasCloudAgentSettings.mcp.toolCanvasRead", t("canvasCloudAgentSettings.mcp.toolCanvasRead")],
        ["canvasCloudAgentSettings.mcp.toolSkillFiles", t("canvasCloudAgentSettings.mcp.toolSkillFiles")],
        ["canvasCloudAgentSettings.mcp.toolNodeWrite", t("canvasCloudAgentSettings.mcp.toolNodeWrite")],
        ["canvasCloudAgentSettings.mcp.toolMediaGenerate", t("canvasCloudAgentSettings.mcp.toolMediaGenerate")],
    ];
    return (
        <div className="canvas-agent-settings-scroll thin-scrollbar min-h-0 flex-1 space-y-5 overflow-y-auto p-4">
            <div className="rounded-xl p-4" style={{ background: theme.node.fill }}>
                <div className="flex items-center gap-2 text-sm font-medium">
                    <PlugZap className="size-4 shrink-0" />
                    {t("canvasCloudAgentSettings.mcp.title")}
                </div>
                <p className="mt-2 text-xs leading-5" style={{ color: theme.node.muted }}>
                    {t("canvasCloudAgentSettings.mcp.intro")}
                </p>
            </div>
            <section>
                <SettingLabel t={t} label={t("canvasCloudAgentSettings.mcp.scope")} />
                {tools.map(([key, tool]) => (
                    <div key={key} className="flex items-center gap-3 py-3 text-xs">
                        <Wrench className="size-4 shrink-0" style={{ color: theme.node.muted }} />
                        <span className="flex-1">{tool}</span>
                        <span style={{ color: theme.node.muted }}>{t("canvasCloudAgentSettings.mcp.permissionBound")}</span>
                    </div>
                ))}
            </section>
            <p className="text-xs leading-5" style={{ color: theme.node.muted }}>
                {t("canvasCloudAgentSettings.mcp.customNote")}
            </p>
        </div>
    );
}

function ContextWorkspace({ props, theme }: { props: AgentSettingsProps; theme: CanvasTheme }) {
    const { t } = useI18n();
    return (
        <div className="thin-scrollbar min-h-0 flex-1 overflow-y-auto px-5 py-5">
            <div className="rounded-xl p-4" style={{ background: theme.node.fill }}>
                <div className="text-sm font-semibold">{t("canvasCloudAgentSettings.context.title")}</div>
                <div className="mt-1 text-[11px] opacity-45">{t("canvasCloudAgentSettings.context.subtitle")}</div>
            </div>
            <div className="mt-4 space-y-1">
                {contextOptions.map((option) => {
                    const active = props.contextScope.includes(option.value);
                    return (
                        <button
                            key={option.value}
                            type="button"
                            className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left"
                            style={{ background: active ? theme.accent.primarySoft : theme.node.fill }}
                            onClick={() => props.onContextToggle(option.value)}
                            aria-pressed={active}
                        >
                            <span className="grid size-5 shrink-0 place-items-center rounded" style={{ background: active ? theme.accent.primary : theme.node.panel, color: active ? theme.accent.onPrimary : theme.node.muted }}>
                                {active ? <Check className="size-3" /> : null}
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="block text-xs font-medium">{t(option.labelKey)}</span>
                                <span className="mt-0.5 block text-[10px] opacity-45">{t(option.descriptionKey)}</span>
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

function BudgetWorkspace({ props, theme }: { props: AgentSettingsProps; theme: CanvasTheme }) {
    const { t } = useI18n();
    return (
        <div className="thin-scrollbar min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5">
            <div className="rounded-xl p-4" style={{ background: theme.node.fill }}>
                <div className="text-sm font-semibold">{t("canvasCloudAgentSettings.budget.title")}</div>
                <p className="mt-2 text-xs opacity-60">{t("canvasCloudAgentSettings.budget.intro")}</p>
            </div>
            <BudgetInput label={t("canvasCloudAgentSettings.budget.credits")} hint={t("canvasCloudAgentSettings.budget.creditsHint")} value={props.maxCredits} onChange={props.onMaxCreditsChange} theme={theme} />
            <BudgetInput label={t("canvasCloudAgentSettings.budget.tasks")} hint={t("canvasCloudAgentSettings.budget.tasksHint")} value={props.maxGenerationTasks} onChange={props.onMaxGenerationTasksChange} theme={theme} />
            <BudgetInput label={t("canvasCloudAgentSettings.budget.video")} hint={t("canvasCloudAgentSettings.budget.videoHint")} value={props.maxVideoSeconds} onChange={props.onMaxVideoSecondsChange} theme={theme} />
        </div>
    );
}

function SettingRow({ theme, icon, title, summary, onClick }: { theme: CanvasTheme; icon: ReactNode; title: string; summary: string; onClick: () => void }) {
    return (
        <button type="button" className="canvas-agent-setting-row flex w-full min-w-0 items-center gap-3 rounded-xl p-3 text-left transition-colors focus-visible:outline focus-visible:outline-2" onClick={onClick}>
            <span className="grid size-9 shrink-0 place-items-center rounded-xl" style={{ background: theme.node.fill, color: theme.node.muted }}>
                {icon}
            </span>
            <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-medium">{title}</span>
                <span className="mt-1 block text-xs leading-5" style={{ color: theme.node.muted }}>
                    {summary}
                </span>
            </span>
            <ChevronRight className="size-4 shrink-0" style={{ color: theme.node.muted }} />
        </button>
    );
}
function TabButton({ active, label, onClick, theme }: { active: boolean; label: string; onClick: () => void; theme: CanvasTheme }) {
    return (
        <button
            type="button"
            aria-pressed={active}
            className="min-w-0 flex-1 rounded-lg px-2 py-2 text-xs font-medium transition-colors focus-visible:outline focus-visible:outline-2"
            style={{ background: active ? theme.toolbar.itemHover : "transparent", color: active ? theme.node.text : theme.node.muted }}
            onClick={onClick}
        >
            {label}
        </button>
    );
}
function SettingLabel({ label, hint, t: _t }: { label: string; hint?: string; t?: SettingsTranslateFn }) {
    return (
        <div className="mb-2 flex items-center justify-between text-xs font-semibold">
            <span>{label}</span>
            {hint ? <span className="text-[10px] font-normal opacity-40">{hint}</span> : null}
        </div>
    );
}
function BudgetInput({ label, hint, value, onChange, theme }: { label: string; hint: string; value: string; onChange: (value: string) => void; theme: CanvasTheme }) {
    return (
        <label className="block">
            <span className="flex items-center justify-between text-xs font-medium">
                <span>{label}</span>
                <span className="text-[10px] opacity-40">{hint}</span>
            </span>
            <Input size="large" value={value} onChange={(event) => onChange(event.target.value.replace(/[^0-9]/g, ""))} inputMode="numeric" className="mt-2 !rounded-lg" style={{ background: theme.node.fill }} />
        </label>
    );
}

export function agentPermissionLabel(t: SettingsTranslateFn, mode: AgentPermissionMode) {
    const option = permissionOptions.find((item) => item.value === mode);
    return option ? t(option.labelKey) : t("canvasCloudAgentSettings.permission.fallback");
}
export function agentPermissionVisual(mode: AgentPermissionMode) {
    const option = permissionOptions.find((item) => item.value === mode) || permissionOptions[0];
    return { color: option.color, soft: `${option.color}1f` };
}
export function agentPermissionMenuItems(t: SettingsTranslateFn, mode: AgentPermissionMode, onChange: (mode: AgentPermissionMode) => void) {
    return permissionOptions.map((option) => ({
        key: option.value,
        label: <span>{t(option.labelKey)}</span>,
        icon: mode === option.value ? <Check className="size-3.5" style={{ color: option.color }} /> : <option.icon className="size-3.5" style={{ color: option.color }} />,
        onClick: () => onChange(option.value),
    }));
}
