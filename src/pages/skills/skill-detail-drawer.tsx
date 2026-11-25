import { Button, Input, Modal, Segmented, Skeleton, Tooltip, Tree } from "antd";
import type { DataNode } from "antd/es/tree";
import { Check, ChevronRight, Code2, ExternalLink, File, FileArchive, FileCode2, FileImage, FileText, Folder, FolderOpen, Heart, Pencil, Plus, RefreshCw, Sparkles, Users } from "lucide-react";
import { useEffect, useMemo, useState, type MouseEvent, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import { stripSkillFrontmatter } from "./skill-markdown-source";
import remarkGfm from "remark-gfm";

import { useI18n } from "@/i18n/use-i18n";
import { Link } from "react-router";
import skillSlugs from "@/content/skill-pages/slugs.json";
import { skillPageRegistry } from "@/content/skill-pages/registry.generated";
import { BLOG_LOCALES, type BlogLocale } from "@/content/blog-locales";
import { localizedPublicPath } from "@/i18n/locale-routing";
import { SITE_NAME } from "@/lib/site-identity";
import { skillPageCopy } from "@/i18n/skill-page-copy";
import { formatSkillCount, skillCategoryLabel } from "@/pages/skills/skill-catalog";
import { describeSkill, skillListingText } from "@/pages/skills/skill-purpose";
import { getSkillFile, listSkillFiles, skillFileRawURL, type Skill, type SkillCategory, type SkillPackageFile, type SkillPackageFileContent } from "@/services/api/skills";

type PreviewMode = "preview" | "source";

type SkillGuide = { oneLiner: string; intro?: string[]; example?: { input: string; output: string }; steps: string[]; faq: { q: string; a: string }[] };
// Guides come from the same registry the public skill pages and SEO already bundle.
const skillGuides = new Map(skillPageRegistry.map((page) => [`${page.locale}/${page.id}`, page.content]));
const skillGuideLocales = skillPageRegistry.reduce((map, page) => map.set(page.slug, (map.get(page.slug) ?? new Set<string>()).add(page.locale)), new Map<string, Set<string>>());

export function SkillDetailModal({
    skill,
    loading,
    mutating,
    categories,
    onClose,
    onUse,
    onAdd,
    onLike,
    onEdit,
    onSync,
}: {
    skill: Skill | null;
    loading: boolean;
    mutating: boolean;
    categories: SkillCategory[];
    onClose: () => void;
    onUse: (skill: Skill) => void;
    onAdd: (skill: Skill) => void;
    onLike: (skill: Skill) => void;
    onEdit: (skill: Skill) => void;
    onSync: (skill: Skill) => void;
}) {
    const [files, setFiles] = useState<SkillPackageFile[]>([]);
    const [filesLoading, setFilesLoading] = useState(false);
    const [filesError, setFilesError] = useState("");
    const [activePath, setActivePath] = useState("SKILL.md");
    const [content, setContent] = useState<SkillPackageFileContent | null>(null);
    const [contentLoading, setContentLoading] = useState(false);
    const [contentError, setContentError] = useState("");
    const [previewMode, setPreviewMode] = useState<PreviewMode>("preview");
    const [pathFilter, setPathFilter] = useState("");
    const [guide, setGuide] = useState<SkillGuide | null>(null);
    const [showGuide, setShowGuide] = useState(true);
    const { t, number, date, locale } = useI18n();

    useEffect(() => {
        if (!skill) {
            setFiles([]);
            setContent(null);
            return;
        }
        let cancelled = false;
        setFilesLoading(true);
        setFilesError("");
        setPathFilter("");
        listSkillFiles(skill.skillId)
            .then((result) => {
                if (cancelled) return;
                setFiles(result.files);
                const first = result.files.find((file) => file.path === "SKILL.md")?.path || result.files[0]?.path || "";
                setActivePath(first);
            })
            .catch((error) => {
                if (cancelled) return;
                setFiles([]);
                setFilesError(error instanceof Error ? error.message : t("skillsPage.detail.filesLoadFailed"));
            })
            .finally(() => {
                if (!cancelled) setFilesLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [skill?.skillId, skill?.versionId]);

    useEffect(() => {
        if (!skill || !activePath) {
            setContent(null);
            return;
        }
        let cancelled = false;
        setContentLoading(true);
        setContentError("");
        getSkillFile(skill.skillId, activePath)
            .then((result) => {
                if (!cancelled) setContent(result.file);
            })
            .catch((error) => {
                if (cancelled) return;
                setContent(null);
                setContentError(error instanceof Error ? error.message : t("skillsPage.detail.fileReadFailed"));
            })
            .finally(() => {
                if (!cancelled) setContentLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [activePath, skill?.skillId, skill?.versionId]);

    useEffect(() => {
        setPreviewMode("preview");
    }, [activePath]);

    useEffect(() => {
        setGuide(null);
        setShowGuide(true);
        const raw = skill ? skillGuides.get(`${locale}/${skill.skillId}`) : undefined;
        if (raw) setGuide(JSON.parse(JSON.stringify(raw).replaceAll("{brand}", SITE_NAME)) as SkillGuide);
    }, [skill?.skillId, locale]);

    const visibleFiles = useMemo(() => {
        const needle = pathFilter.trim().toLowerCase();
        return needle ? files.filter((file) => file.path.toLowerCase().includes(needle)) : files;
    }, [files, pathFilter]);
    const treeData = useMemo(() => buildSkillTree(visibleFiles), [visibleFiles]);
    const filePaths = useMemo(() => new Set(files.map((file) => file.path)), [files]);
    const selectedFile = files.find((file) => file.path === activePath);
    const canPreviewMarkdown = selectedFile?.kind === "markdown" && !content?.binary;
    const purpose = skill ? describeSkill(skill) : null;
    const listing = skill ? skillListingText(skill, t) : null;
    const promiseText = purpose ? t(purpose.promiseKey) : "";
    const inputText = purpose ? t(purpose.inputKey) : "";
    const outputText = purpose ? t(purpose.outputKey) : "";
    const bestForText = purpose ? t(purpose.bestForKey) : "";
    const guideLocale = (BLOG_LOCALES as readonly string[]).includes(locale) ? (locale as BlogLocale) : undefined;
    const guideSlug = skill ? (skillSlugs as Record<string, string>)[skill.skillId] : undefined;
    // Only link a guide that was written for this language; the guide explains the skill in plain words.
    const guideHref = guideLocale && guideSlug && skillGuideLocales.get(guideSlug)?.has(guideLocale) ? localizedPublicPath(`/skills/${guideSlug}`, guideLocale) : undefined;

    return (
        <Modal className="skill-package-modal" open={Boolean(skill)} width="82vw" footer={null} destroyOnHidden onCancel={onClose} styles={{ container: { height: "82vh", padding: 0, overflow: "hidden" }, body: { height: "100%", padding: 0 } }}>
            {skill ? (
                <div className="skill-package-shell">
                    <header className="skill-package-header">
                        <div className="skill-package-header-copy min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2 text-[var(--fs-label)] text-foreground/45">
                                <span>{skillCategoryLabel(skill.tag, categories, t)}</span>
                                <span aria-hidden="true">/</span>
                                <span>{sourceLabel(skill.sourceType, t)}</span>
                                <span aria-hidden="true">/</span>
                                <span>v{skill.version || "1"}</span>
                                <span aria-hidden="true">/</span>
                                <span>{t("skillsPage.detail.updatedAt", { date: date(skill.updatedAt) })}</span>
                            </div>
                            <h1 className="mt-1 truncate text-[var(--fs-heading-lg)] font-semibold text-foreground">{listing?.name}</h1>
                            <p className="skill-package-promise">{listing?.description || promiseText}</p>
                            {guideHref && guideLocale ? (
                                <Link className="skill-package-guide" to={guideHref} target="_blank" rel="noopener">
                                    {skillPageCopy(guideLocale).read} →
                                </Link>
                            ) : null}
                            <div className="skill-package-overview" aria-label={t("skillsPage.detail.overviewAria")}>
                                <div>
                                    <span>{t("skillsPage.detail.youProvide")}</span>
                                    <strong>{inputText || t("skillsPage.detail.defaultInput")}</strong>
                                </div>
                                <div>
                                    <span>{t("skillsPage.detail.youGet")}</span>
                                    <strong>{outputText || t("skillsPage.detail.defaultOutput")}</strong>
                                </div>
                                <div>
                                    <span>{t("skillsPage.detail.bestFor")}</span>
                                    <strong>{bestForText || t("skillsPage.detail.defaultBestFor")}</strong>
                                </div>
                            </div>
                            {purpose?.sourceNoteKey ? <p className="skill-package-origin">{t("skillsPage.detail.sourceNote", { note: t(purpose.sourceNoteKey) })}</p> : null}
                        </div>
                        <div className="skill-package-actions">
                            {skill.sourceType === "github" && skill.isOwner ? (
                                <Tooltip title={skill.syncError || t("skillsPage.detail.syncTooltip")}>
                                    <Button loading={mutating} icon={<RefreshCw className="size-4" />} onClick={() => onSync(skill)}>
                                        {t("skillsPage.detail.sync")}
                                    </Button>
                                </Tooltip>
                            ) : null}
                            {skill.isOwner ? (
                                <Button icon={<Pencil className="size-4" />} onClick={() => onEdit(skill)}>
                                    {t("skillsPage.detail.edit")}
                                </Button>
                            ) : null}
                            <Button loading={mutating} icon={<Heart className={`size-4 ${skill.isLike ? "fill-current text-rose-500" : ""}`} />} onClick={() => onLike(skill)}>
                                {skill.isLike ? t("skillsPage.message.liked") : t("skillsPage.action.like")}
                            </Button>
                            {!skill.isOwner ? (
                                <Button loading={mutating} icon={skill.isAdded ? <Check className="size-4" /> : <Plus className="size-4" />} onClick={() => onAdd(skill)}>
                                    {skill.isAdded ? t("skillsPage.detail.removeFromMine") : t("skillsPage.detail.addToMine")}
                                </Button>
                            ) : null}
                            <Button type="primary" loading={mutating} icon={<Sparkles className="size-4" />} onClick={() => onUse(skill)}>
                                {t("skillsPage.detail.useSkill")}
                            </Button>
                        </div>
                    </header>

                    <div className="skill-package-workspace">
                        <aside className="skill-package-sidebar" aria-label={t("skillsPage.detail.filesAria")}>
                            <div className="skill-package-sidebar-summary">
                                <span>
                                    <FileArchive className="size-3.5" />
                                    {t("skillsPage.detail.fileCount", { count: skill.fileCount || files.length })}
                                </span>
                                <span>{formatBytes(skill.totalBytes)}</span>
                            </div>
                            {guide ? (
                                <button type="button" className={`skill-package-guide-entry ${showGuide ? "is-active" : ""}`} onClick={() => setShowGuide(true)}>
                                    <Sparkles className="size-3.5" />
                                    {skillPageCopy(guideLocale ?? "en-US").about}
                                </button>
                            ) : null}
                            <Input allowClear size="small" value={pathFilter} onChange={(event) => setPathFilter(event.target.value)} placeholder={t("skillsPage.detail.filterFiles")} prefix={<File className="size-3.5 text-foreground/30" />} />
                            <div className="skill-package-tree thin-scrollbar">
                                {filesLoading || loading ? (
                                    <Skeleton active title={false} paragraph={{ rows: 10 }} />
                                ) : filesError ? (
                                    <div className="skill-package-empty">{filesError}</div>
                                ) : treeData.length ? (
                                    <Tree
                                        blockNode
                                        showIcon
                                        showLine={false}
                                        defaultExpandAll
                                        expandAction="click"
                                        selectedKeys={activePath && !(guide && showGuide) ? [activePath] : []}
                                        treeData={treeData}
                                        switcherIcon={({ expanded, isLeaf }) => (isLeaf ? null : <ChevronRight aria-hidden="true" className={`skill-package-tree-chevron size-3.5 ${expanded ? "is-expanded" : ""}`} />)}
                                        onSelect={(keys, info) => {
                                            if (!info.node.children?.length && keys[0]) {
                                                setActivePath(String(keys[0]));
                                                setShowGuide(false);
                                            }
                                        }}
                                    />
                                ) : (
                                    <div className="skill-package-empty">{t("skillsPage.detail.noMatchingFiles")}</div>
                                )}
                            </div>
                            <div className="skill-package-sidebar-footer">
                                <span className="inline-flex items-center gap-1">
                                    <Users className="size-3.5" />
                                    {t("skillsPage.detail.joinedCount", { count: formatSkillCount(skill.addedCount) })}
                                </span>
                                <span>{skill.isPrivate ? t("skillsPage.detail.privateOnly") : t("skillsPage.editor.public")}</span>
                            </div>
                        </aside>

                        <main className="skill-package-preview">
                            {guide && showGuide ? (
                                <div className="skill-package-preview-body thin-scrollbar">
                                    <SkillGuideOverview guide={guide} locale={guideLocale ?? "en-US"} />
                                </div>
                            ) : (
                                <>
                                    <div className="skill-package-preview-toolbar">
                                        <div className="min-w-0 flex-1 truncate font-mono text-xs text-foreground/58">{activePath || t("skillsPage.detail.selectFile")}</div>
                                        {canPreviewMarkdown ? (
                                            <Segmented
                                                size="small"
                                                value={previewMode}
                                                onChange={(value) => setPreviewMode(value as PreviewMode)}
                                                options={[
                                                    {
                                                        value: "preview",
                                                        label: (
                                                            <span className="inline-flex items-center gap-1">
                                                                <FileText className="size-3.5" />
                                                                {t("skillsPage.detail.preview")}
                                                            </span>
                                                        ),
                                                    },
                                                    {
                                                        value: "source",
                                                        label: (
                                                            <span className="inline-flex items-center gap-1">
                                                                <Code2 className="size-3.5" />
                                                                {t("skillsPage.detail.source")}
                                                            </span>
                                                        ),
                                                    },
                                                ]}
                                            />
                                        ) : null}
                                        {activePath ? (
                                            <Tooltip title={t("skillsPage.detail.openRaw")}>
                                                <a className="skill-package-raw-link" href={skillFileRawURL(skill.skillId, activePath)} target="_blank" rel="noreferrer" aria-label={t("skillsPage.detail.openRaw")}>
                                                    <ExternalLink className="size-4" />
                                                </a>
                                            </Tooltip>
                                        ) : null}
                                    </div>
                                    <div className="skill-package-preview-body thin-scrollbar">
                                        {contentLoading ? (
                                            <Skeleton active paragraph={{ rows: 18 }} />
                                        ) : contentError ? (
                                            <div className="skill-package-empty">{contentError}</div>
                                        ) : content && selectedFile ? (
                                            <SkillFilePreview skill={skill} file={selectedFile} content={content} mode={previewMode} filePaths={filePaths} onNavigate={setActivePath} />
                                        ) : (
                                            <div className="skill-package-empty">{t("skillsPage.detail.chooseFile")}</div>
                                        )}
                                    </div>
                                </>
                            )}
                        </main>
                    </div>
                </div>
            ) : null}
        </Modal>
    );
}

function SkillGuideOverview({ guide, locale }: { guide: SkillGuide; locale: BlogLocale }) {
    const copy = skillPageCopy(locale);
    return (
        <article className="skill-package-markdown skill-guide-overview">
            <p className="skill-guide-lead">{guide.oneLiner}</p>
            {guide.intro?.length ? (
                <section>
                    <h2>{copy.about}</h2>
                    {guide.intro.map((paragraph) => (
                        <p key={paragraph}>{paragraph}</p>
                    ))}
                </section>
            ) : null}
            {guide.example ? (
                <section>
                    <h2>{copy.example}</h2>
                    <dl className="public-skill-example">
                        <div>
                            <dt>{copy.input}</dt>
                            <dd>{guide.example.input}</dd>
                        </div>
                        <div>
                            <dt>{copy.output}</dt>
                            <dd>{guide.example.output}</dd>
                        </div>
                    </dl>
                </section>
            ) : null}
            <section>
                <h2>{copy.steps}</h2>
                <ol>
                    {guide.steps.map((step) => (
                        <li key={step}>{step}</li>
                    ))}
                </ol>
            </section>
            {guide.faq.length ? (
                <section>
                    <h2>{copy.faq}</h2>
                    {guide.faq.map((item) => (
                        <details key={item.q}>
                            <summary>{item.q}</summary>
                            <p>{item.a}</p>
                        </details>
                    ))}
                </section>
            ) : null}
        </article>
    );
}

function SkillFilePreview({ skill, file, content, mode, filePaths, onNavigate }: { skill: Skill; file: SkillPackageFile; content: SkillPackageFileContent; mode: PreviewMode; filePaths: Set<string>; onNavigate: (path: string) => void }) {
    const { t } = useI18n();
    const rawURL = skillFileRawURL(skill.skillId, file.path);
    if (content.binary) {
        if (file.kind === "image")
            return (
                <div className="skill-package-media-stage">
                    <img src={rawURL} alt={file.path} />
                </div>
            );
        if (file.kind === "video")
            return (
                <div className="skill-package-media-stage">
                    <video src={rawURL} controls playsInline preload="metadata" />
                </div>
            );
        if (file.kind === "audio")
            return (
                <div className="skill-package-media-stage">
                    <audio src={rawURL} controls preload="metadata" />
                </div>
            );
        return (
            <div className="skill-package-empty">
                <FileArchive className="mb-3 size-9" />
                <div>{t("skillsPage.detail.previewUnsupported")}</div>
                <a className="mt-3 inline-flex items-center gap-1 text-foreground underline" href={rawURL} target="_blank" rel="noreferrer">
                    {t("skillsPage.detail.openRaw")}
                    <ExternalLink className="size-3.5" />
                </a>
            </div>
        );
    }
    if (file.kind === "markdown" && mode === "preview") {
        return <SkillMarkdown source={content.content} currentPath={file.path} filePaths={filePaths} onNavigate={onNavigate} />;
    }
    return (
        <pre className="skill-package-source">
            <code>{content.content}</code>
        </pre>
    );
}

function SkillMarkdown({ source, currentPath, filePaths, onNavigate }: { source: string; currentPath: string; filePaths: Set<string>; onNavigate: (path: string) => void }) {
    const { t } = useI18n();
    const navigate = (event: MouseEvent<HTMLAnchorElement>, href?: string) => {
        const target = resolveSkillPath(currentPath, href || "");
        if (!target || !filePaths.has(target)) return;
        event.preventDefault();
        onNavigate(target);
    };
    return (
        <article className="skill-package-markdown">
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                    a: ({ children, href }) => (
                        <a href={href} target={isExternalURL(href) ? "_blank" : undefined} rel={isExternalURL(href) ? "noreferrer" : undefined} onClick={(event) => navigate(event, href)}>
                            {children}
                        </a>
                    ),
                    table: ({ children }) => (
                        <div className="skill-package-table-wrap">
                            <table>{children}</table>
                        </div>
                    ),
                    img: ({ src, alt }) => {
                        if (isExternalURL(src)) return <img src={src} alt={alt || ""} loading="lazy" />;
                        const target = resolveSkillPath(currentPath, src || "");
                        if (target && filePaths.has(target))
                            return (
                                <button type="button" className="skill-package-inline-file" onClick={() => onNavigate(target)}>
                                    <FileImage className="size-4" />
                                    {alt || target}
                                </button>
                            );
                        return <span className="skill-package-inline-missing">{alt || src || t("skillsPage.detail.image")}</span>;
                    },
                }}
            >
                {stripSkillFrontmatter(source)}
            </ReactMarkdown>
        </article>
    );
}

function buildSkillTree(files: SkillPackageFile[]): DataNode[] {
    type MutableNode = DataNode & { children?: MutableNode[]; file?: SkillPackageFile };
    const roots: MutableNode[] = [];
    const folders = new Map<string, MutableNode>();
    for (const file of files) {
        const parts = file.path.split("/");
        let children = roots;
        let prefix = "";
        parts.forEach((part, index) => {
            const isLeaf = index === parts.length - 1;
            prefix = prefix ? `${prefix}/${part}` : part;
            if (isLeaf) {
                children.push({ key: file.path, title: treeTitle(part, file), icon: fileIcon(file), isLeaf: true, file });
                return;
            }
            let folder = folders.get(prefix);
            if (!folder) {
                folder = {
                    key: `folder:${prefix}`,
                    title: <span className="skill-package-folder-title">{part}</span>,
                    icon: ({ expanded }) => (expanded ? <FolderOpen aria-hidden="true" className="size-4" /> : <Folder aria-hidden="true" className="size-4" />),
                    children: [],
                };
                folders.set(prefix, folder);
                children.push(folder);
            }
            children = folder.children || [];
        });
    }
    return roots;
}

function treeTitle(name: string, file: SkillPackageFile): ReactNode {
    return (
        <span className="skill-package-tree-title">
            <span>{name}</span>
            <span>{formatBytes(file.size)}</span>
        </span>
    );
}

function fileIcon(file: SkillPackageFile) {
    if (file.kind === "markdown" || file.kind === "text") return <FileText aria-hidden="true" className="size-3.5" />;
    if (file.kind === "code") return <FileCode2 aria-hidden="true" className="size-3.5" />;
    if (file.kind === "image") return <FileImage aria-hidden="true" className="size-3.5" />;
    return <File aria-hidden="true" className="size-3.5" />;
}

function resolveSkillPath(currentPath: string, href: string) {
    const cleanHref = href.split("#", 1)[0]?.split("?", 1)[0] || "";
    if (!cleanHref || isExternalURL(cleanHref) || cleanHref.startsWith("/")) return "";
    const base = currentPath.split("/").slice(0, -1);
    let decoded = cleanHref;
    try {
        decoded = decodeURIComponent(cleanHref);
    } catch {
        return "";
    }
    for (const segment of decoded.replaceAll("\\", "/").split("/")) {
        if (!segment || segment === ".") continue;
        if (segment === "..") base.pop();
        else base.push(segment);
    }
    return base.join("/");
}

function isExternalURL(value?: string) {
    return Boolean(value && /^(https?:|mailto:|data:)/i.test(value));
}

function sourceLabel(source: string, t: ReturnType<typeof useI18n>["t"]) {
    if (source === "github") return "GitHub";
    if (source === "zip") return t("skillsPage.detail.zipPackage");
    if (source === "builtin") return t("skillsPage.detail.builtin");
    return "Markdown";
}

function formatBytes(value: number) {
    if (!value) return "0 B";
    if (value < 1024) return `${value} B`;
    if (value < 1024 * 1024) return `${(value / 1024).toFixed(value < 10 * 1024 ? 1 : 0)} KB`;
    return `${(value / 1024 / 1024).toFixed(1)} MB`;
}
