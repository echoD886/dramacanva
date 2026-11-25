import { App, Button, Drawer, Form, Input, Select, Switch } from "antd";
import { Minus, Plus, Save, Wand2 } from "lucide-react";
import { useEffect, useState } from "react";

import { useI18n } from "@/i18n/use-i18n";

import { fallbackSkillCategories } from "@/pages/skills/skill-catalog";
import { generateSkillDraft } from "@/lib/canvas/skill-drafting";
import { navigateToSettings } from "@/lib/settings-navigation";
import { useConfigStore, useEffectiveConfig } from "@/stores/use-config-store";
import { createSkill, updateSkill, type Skill, type SkillMutationInput, type SkillShowcaseMedia } from "@/services/api/skills";

type SkillFormValues = Omit<SkillMutationInput, "isPrivate"> & { isPublic: boolean };

export function SkillEditorDrawer({ open, skill, onClose, onSaved }: { open: boolean; skill: Skill | null; onClose: () => void; onSaved: (skill: Skill) => void }) {
    const { message, modal } = App.useApp();
    const { t } = useI18n();
    const [form] = Form.useForm<SkillFormValues>();
    const [saving, setSaving] = useState(false);
    const [dirty, setDirty] = useState(false);
    const [draftIdea, setDraftIdea] = useState("");
    const [drafting, setDrafting] = useState(false);
    const effectiveConfig = useEffectiveConfig();
    const isPackageSkill = Boolean(skill && skill.sourceType !== "markdown" && skill.sourceType !== "builtin" && skill.sourceType !== "");

    useEffect(() => {
        if (!open) return;
        form.setFieldsValue({
            skillName: skill?.skillName || "",
            description: skill?.description || "",
            instruction: skill?.instruction || "",
            tag: skill?.tag || "creative",
            isPublic: skill ? !skill.isPrivate : false,
            markdownUrl: skill?.markdownUrl || skill?.sourceUrl || "",
            showcaseMedia: skill?.showcaseMedia || [],
            extraInfo: skill?.extraInfo || "",
        });
        setDirty(false);
    }, [form, open, skill]);

    const requestClose = () => {
        if (!dirty) {
            onClose();
            return;
        }
        modal.confirm({ title: t("skillsPage.editor.discardTitle"), content: t("skillsPage.editor.discardContent"), okText: t("skillsPage.editor.discardOk"), okButtonProps: { danger: true }, cancelText: t("skillsPage.editor.discardCancel"), onOk: onClose });
    };

    const submit = async (values: SkillFormValues) => {
        setSaving(true);
        try {
            const input: SkillMutationInput = {
                skillName: values.skillName,
                description: values.description,
                instruction: values.instruction || "",
                tag: values.tag,
                isPrivate: !values.isPublic,
                markdownUrl: values.markdownUrl || "",
                showcaseMedia: (values.showcaseMedia || []).map((item) => ({ ...item, showcaseUri: item.showcaseUri || "" })),
                extraInfo: values.extraInfo || "",
            };
            const result = skill ? await updateSkill(skill.skillId, input) : await createSkill(input);
            setDirty(false);
            message.success(skill ? t("skillsPage.editor.updated") : t("skillsPage.editor.created"));
            onSaved(result.skill);
        } catch (error) {
            message.error(error instanceof Error ? error.message : t("skillsPage.editor.saveFailed"));
        } finally {
            setSaving(false);
        }
    };

    const draftFromIdea = async () => {
        const idea = draftIdea.trim();
        if (!idea) {
            message.warning(t("skillsPage.editor.ideaRequired"));
            return;
        }
        if (!useConfigStore.getState().isAiConfigReady(effectiveConfig, effectiveConfig.model)) {
            message.info(t("skillsPage.editor.modelNotReady"));
            navigateToSettings({ section: "models", continueCreation: true });
            return;
        }
        setDrafting(true);
        try {
            const draft = await generateSkillDraft(idea, effectiveConfig);
            form.setFieldsValue({
                skillName: draft.skillName || "",
                description: draft.description || "",
                instruction: draft.instruction || "",
                ...(draft.tag ? { tag: draft.tag } : {}),
            });
            setDirty(true);
            message.success(t("skillsPage.editor.draftGenerated"));
        } catch (error) {
            message.error(error instanceof Error ? t("skillsPage.editor.draftFailedDetail", { detail: error.message }) : t("skillsPage.editor.draftFailed"));
        } finally {
            setDrafting(false);
        }
    };

    return (
        <Drawer className="library-drawer" open={open} size={720} destroyOnHidden mask={{ closable: !dirty }} title={skill ? t("skillsPage.editor.titleEdit") : t("skillsPage.editor.titleCreate")} onClose={requestClose} extra={<Button type="primary" loading={saving} icon={<Save className="size-4" />} onClick={() => form.submit()}>{t("skillsPage.editor.saveButton")}</Button>}>
            {!isPackageSkill ? <div className="mb-4 rounded-xl border bg-foreground/[.02] p-3">
                <div className="mb-2 flex items-center gap-1.5 text-sm font-medium">
                    <Wand2 className="size-4" />
                    {t("skillsPage.editor.aiDrafting")}
                    <span className="font-normal text-foreground/45">{t("skillsPage.editor.aiDraftingHint")}</span>
                </div>
                <Input.TextArea
                    value={draftIdea}
                    onChange={(event) => setDraftIdea(event.target.value)}
                    autoSize={{ minRows: 3, maxRows: 6 }}
                    maxLength={2000}
                    showCount
                    disabled={drafting}
                    placeholder={t("skillsPage.editor.ideaPlaceholder")}
                />
                <div className="mt-2 flex items-center justify-between gap-2">
                    <span className="text-xs text-foreground/45">{t("skillsPage.editor.willUseModel")}</span>
                    <Button type="primary" loading={drafting} disabled={!draftIdea.trim()} icon={<Wand2 className="size-4" />} onClick={() => void draftFromIdea()}>{t("skillsPage.editor.generateDraft")}</Button>
                </div>
            </div> : <div className="mb-4 rounded-xl border bg-foreground/[.02] p-3 text-sm leading-6 text-foreground/58">{t("skillsPage.editor.packageNotice")}</div>}
            <Form form={form} layout="vertical" requiredMark="optional" onFinish={submit} onValuesChange={() => setDirty(true)}>
                <div className="grid gap-x-4 sm:grid-cols-2">
                    <Form.Item name="skillName" label={t("skillsPage.editor.nameLabel")} rules={[{ required: true, message: t("skillsPage.editor.nameRequired") }, { max: 80, message: t("skillsPage.editor.max80") }]}>
                        <Input maxLength={80} showCount placeholder={t("skillsPage.editor.namePlaceholder")} autoComplete="off" />
                    </Form.Item>
                    <Form.Item name="tag" label={t("skillsPage.editor.tagLabel")} rules={[{ required: true, message: t("skillsPage.editor.tagRequired") }]}>
                        <Select options={fallbackSkillCategories.map(({ value, labelKey }) => ({ value, label: t(labelKey) }))} />
                    </Form.Item>
                </div>

                <Form.Item name="description" label={t("skillsPage.editor.descriptionLabel")} rules={[{ required: true, message: t("skillsPage.editor.descriptionRequired") }, { max: 500, message: t("skillsPage.editor.max500") }]}>
                    <Input.TextArea autoSize={{ minRows: 3, maxRows: 6 }} maxLength={500} showCount placeholder={t("skillsPage.editor.descriptionPlaceholder")} />
                </Form.Item>

                {!isPackageSkill ? <Form.Item name="instruction" label={t("skillsPage.editor.instructionLabel")} rules={[{ required: true, message: t("skillsPage.editor.instructionRequired") }, { max: 100000, message: t("skillsPage.editor.max100000") }]} extra={t("skillsPage.editor.instructionExtra")}>
                    <Input.TextArea className="font-mono text-xs leading-5" autoSize={{ minRows: 14, maxRows: 28 }} maxLength={100000} showCount placeholder={t("skillsPage.editor.instructionPlaceholder")} />
                </Form.Item> : null}

                <div className="grid gap-x-4 sm:grid-cols-[minmax(0,1fr)_180px]">
                    <Form.Item name="markdownUrl" label={isPackageSkill ? t("skillsPage.editor.sourceUrlLabel") : t("skillsPage.editor.markdownUrlLabel")} rules={[{ type: "url", message: t("skillsPage.editor.urlInvalid") }]}>
                        <Input type="url" inputMode="url" spellCheck={false} placeholder="https://example.com/SKILL.md" />
                    </Form.Item>
                    <Form.Item name="isPublic" label={t("skillsPage.editor.visibilityLabel")} valuePropName="checked" extra={t("skillsPage.editor.visibilityExtra")}>
                        <Switch checkedChildren={t("skillsPage.editor.public")} unCheckedChildren={t("skillsPage.editor.private")} />
                    </Form.Item>
                </div>

                <Form.List name="showcaseMedia">
                    {(fields, { add, remove }) => (
                        <section aria-labelledby="skill-media-title">
                            <div className="mb-3 flex items-center justify-between">
                                <div><h3 id="skill-media-title" className="text-sm font-medium">{t("skillsPage.editor.mediaTitle")}</h3><p className="mt-1 text-xs text-foreground/50">{t("skillsPage.editor.mediaHint")}</p></div>
                                <Button disabled={fields.length >= 8} icon={<Plus className="size-4" />} onClick={() => add(emptyMedia())}>{t("skillsPage.editor.addMedia")}</Button>
                            </div>
                            <div className="space-y-2">
                                {fields.map((field) => (
                                    <div key={field.key} className="grid grid-cols-[112px_minmax(0,1fr)_36px] gap-2">
                                        <Form.Item {...field} name={[field.name, "type"]} className="mb-0" rules={[{ required: true, message: t("skillsPage.editor.typeRequired") }]}>
                                            <Select options={[{ value: "image", label: t("skillsPage.editor.mediaImage") }, { value: "video", label: t("skillsPage.editor.mediaVideo") }]} />
                                        </Form.Item>
                                        <Form.Item {...field} name={[field.name, "showcaseUrl"]} className="mb-0" rules={[{ required: true, message: t("skillsPage.editor.mediaUrlRequired") }, { type: "url", message: t("skillsPage.editor.mediaUrlInvalid") }]}>
                                            <Input type="url" inputMode="url" spellCheck={false} placeholder="https://example.com/media" />
                                        </Form.Item>
                                        <Button aria-label={t("skillsPage.editor.removeMedia")} title={t("skillsPage.editor.removeMedia")} icon={<Minus className="size-4" />} onClick={() => remove(field.name)} />
                                        <Form.Item {...field} name={[field.name, "showcaseUri"]} hidden><Input /></Form.Item>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}
                </Form.List>

                <Form.Item name="extraInfo" label={t("skillsPage.editor.extraInfoLabel")} className="mt-5" rules={[{ max: 2000, message: t("skillsPage.editor.max2000") }]}>
                    <Input.TextArea autoSize={{ minRows: 2, maxRows: 5 }} maxLength={2000} showCount placeholder={t("skillsPage.editor.extraInfoPlaceholder")} />
                </Form.Item>
            </Form>
        </Drawer>
    );
}

function emptyMedia(): SkillShowcaseMedia {
    return { type: "image", showcaseUri: "", showcaseUrl: "" };
}
