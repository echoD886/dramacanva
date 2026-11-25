import { App, Button, Form, Input, Modal, Segmented, Select, Switch, Upload, type UploadFile } from "antd";
import { FileArchive, FileText, GitBranch, UploadCloud } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { fallbackSkillCategories } from "@/pages/skills/skill-catalog";
import { SKILL_INSTALL_COPY } from "@/pages/skills/skill-install-copy";
import { useI18n } from "@/i18n/use-i18n";
import type { BlogLocale } from "@/content/blog-locales";
import { installGitHubSkill, installSkillUpload, type Skill } from "@/services/api/skills";

type InstallMode = "markdown" | "zip" | "github";

type InstallFormValues = {
    name?: string;
    description?: string;
    tag: string;
    isPublic: boolean;
    url?: string;
    ref?: string;
    subdir?: string;
    autoUpdate: boolean;
};

export function SkillInstallModal({ open, onClose, onInstalled, onManualCreate }: { open: boolean; onClose: () => void; onInstalled: (skill: Skill) => void; onManualCreate: () => void }) {
    const { locale, t } = useI18n();
    const copy = SKILL_INSTALL_COPY[locale as BlogLocale] ?? SKILL_INSTALL_COPY["en-US"];
    const modeOptions = [
        { value: "markdown", label: <span className="inline-flex items-center gap-1.5"><FileText className="size-3.5" />Markdown</span> },
        { value: "zip", label: <span className="inline-flex items-center gap-1.5"><FileArchive className="size-3.5" />{copy.zip}</span> },
        { value: "github", label: <span className="inline-flex items-center gap-1.5"><GitBranch className="size-3.5" />GitHub</span> },
    ];
    const { message } = App.useApp();
    const [form] = Form.useForm<InstallFormValues>();
    const [mode, setMode] = useState<InstallMode>("markdown");
    const [fileList, setFileList] = useState<UploadFile[]>([]);
    const [installing, setInstalling] = useState(false);
    const installLock = useRef(false);

    useEffect(() => {
        if (!open) return;
        setMode("markdown");
        setFileList([]);
        form.setFieldsValue({ tag: "creative", isPublic: false, autoUpdate: true, name: "", description: "", url: "", ref: "", subdir: "" });
    }, [form, open]);

    const install = async () => {
        if (installLock.current) return;
        installLock.current = true;
        setInstalling(true);
        try {
            const values = await form.validateFields().catch(() => null);
            if (!values) return;
            const file = fileList[0]?.originFileObj;
            if (mode !== "github" && !file) {
                message.warning(`${copy.selectFile}: ${mode === "zip" ? copy.zip : "Markdown"}`);
                return;
            }
            const result = mode === "github"
                ? await installGitHubSkill({
                    url: values.url || "",
                    ref: values.ref || undefined,
                    subdir: values.subdir || undefined,
                    tag: values.tag,
                    isPrivate: !values.isPublic,
                    autoUpdate: values.autoUpdate,
                })
                : await installSkillUpload({
                    file: file as File,
                    sourceType: mode,
                    name: values.name || undefined,
                    description: values.description || undefined,
                    tag: values.tag,
                    isPrivate: !values.isPublic,
                });
            message.success(copy.success);
            onInstalled(result.skill);
        } catch (error) {
            console.error("Skill installation failed", error);
            message.error(copy.failed);
        } finally {
            installLock.current = false;
            setInstalling(false);
        }
    };

    return (
        <Modal
            className="skill-install-modal"
            open={open}
            width={680}
            destroyOnHidden
            mask={{ closable: !installing }}
            closable={!installing}
            keyboard={!installing}
            title={copy.install}
            onCancel={() => { if (!installing) onClose(); }}
            footer={(
                <div className="flex items-center justify-between gap-3">
                    <Button type="text" disabled={installing} onClick={onManualCreate}>{copy.manual}</Button>
                    <div className="flex gap-2"><Button disabled={installing} onClick={onClose}>{t("skillsPage.message.deleteCancel")}</Button><Button type="primary" loading={installing} onClick={() => void install()}>{copy.install}</Button></div>
                </div>
            )}
        >
            <p className="mb-4 text-sm leading-6 text-foreground/55">{copy.intro}</p>
            <Segmented className="skill-install-mode" block options={modeOptions} value={mode} onChange={(value) => { setMode(value as InstallMode); setFileList([]); }} />

            <Form form={form} layout="vertical" requiredMark="optional" className="skill-install-form">
                {mode === "github" ? (
                    <>
                        <Form.Item name="url" label={t("skillsPage.editor.sourceUrlLabel")} rules={[{ required: true, message: copy.sourceRequired }, { type: "url", message: t("skillsPage.editor.urlInvalid") }]}>
                            <Input type="url" inputMode="url" spellCheck={false} prefix={<GitBranch className="size-4 text-foreground/35" />} placeholder="https://github.com/owner/repository" />
                        </Form.Item>
                        <div className="grid gap-x-3 sm:grid-cols-2">
                            <Form.Item name="ref" label={copy.branch} extra={copy.branchHint}><Input spellCheck={false} placeholder="main" /></Form.Item>
                            <Form.Item name="subdir" label={copy.subdir} extra={copy.subdirHint}><Input spellCheck={false} placeholder="skills/ai-director" /></Form.Item>
                        </div>
                    </>
                ) : (
                    <>
                        <Upload.Dragger
                            accept={mode === "zip" ? ".zip,application/zip" : ".md,.markdown,text/markdown"}
                            maxCount={1}
                            fileList={fileList}
                            beforeUpload={(file) => {
                                if (file.size > 20 * 1024 * 1024) {
                                    message.error(copy.tooLarge.replace("{size}", "20"));
                                    return Upload.LIST_IGNORE;
                                }
                                return false;
                            }}
                            onChange={({ fileList: next }) => setFileList(next.slice(-1))}
                            onRemove={() => { setFileList([]); return true; }}
                        >
                            <UploadCloud className="mx-auto mb-3 size-8 text-foreground/38" />
                            <div className="text-sm font-medium">{copy.drop} · {mode === "zip" ? copy.zip : "Markdown"}</div>
                            <div className="mt-1 text-xs text-foreground/45">{mode === "zip" ? copy.zipHint : copy.mdHint}</div>
                        </Upload.Dragger>
                        <div className="mt-4 grid gap-x-3 sm:grid-cols-2">
                            <Form.Item name="name" label={t("skillsPage.editor.nameLabel")} extra={copy.optional}><Input maxLength={80} autoComplete="off" /></Form.Item>
                            <Form.Item name="description" label={t("skillsPage.editor.descriptionLabel")} extra={copy.optional}><Input maxLength={500} autoComplete="off" /></Form.Item>
                        </div>
                    </>
                )}

                <div className="grid gap-x-3 sm:grid-cols-2">
                    <Form.Item name="tag" label={t("skillsPage.editor.tagLabel")} rules={[{ required: true, message: t("skillsPage.editor.tagRequired") }]}>
                        <Select options={fallbackSkillCategories.map((category) => ({ value: category.value, label: t(category.labelKey) }))} />
                    </Form.Item>
                    <Form.Item name="isPublic" label={t("skillsPage.editor.visibilityLabel")} valuePropName="checked" extra={t("skillsPage.editor.visibilityExtra")}>
                        <Switch checkedChildren={t("skillsPage.editor.public")} unCheckedChildren={t("skillsPage.editor.private")} />
                    </Form.Item>
                </div>
                {mode === "github" ? <Form.Item name="autoUpdate" label={copy.sync} valuePropName="checked" extra={copy.syncHint}><Switch checkedChildren={copy.on} unCheckedChildren={copy.off} /></Form.Item> : null}
            </Form>
        </Modal>
    );
}
