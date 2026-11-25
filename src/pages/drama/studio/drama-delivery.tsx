import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { App, Button, Input, Modal, Select } from "antd";
import { reviewText, useReviewLocale } from "@/i18n/drama-messages";
import { createDramaCastDraft, getDramaJianyingDraft, listDramaCast, listDramas, type DramaEpisodeDetail } from "@/services/api/drama";
import { getResourceBlob } from "@/services/api/resources";

export function CastDraftActions({ projectId, onCreated }: { projectId: string; onCreated: (id: string) => void }) {
    useReviewLocale();
    const { message } = App.useApp();
    const [mode, setMode] = useState<"create" | "import" | null>(null);
    const [name, setName] = useState("");
    const [style, setStyle] = useState("");
    const [source, setSource] = useState("");
    const [character, setCharacter] = useState("");
    const [busy, setBusy] = useState(false);
    const projects = useQuery({
        queryKey: ["cast-import-projects", projectId],
        enabled: mode === "import",
        queryFn: async ({ signal }) => {
            const items = [];
            for (let page = 1; ; page++) {
                const result = await listDramas({ page, pageSize: 100 }, signal);
                items.push(...result.items.filter((item) => item.project.id !== projectId));
                if (!result.hasMore) return items;
            }
        },
    });
    const cast = useQuery({ queryKey: ["cast-import-characters", source], enabled: mode === "import" && !!source, queryFn: ({ signal }) => listDramaCast(source, signal) });
    const open = (next: "create" | "import") => {
        setMode(next);
        setName("");
        setStyle("");
        setSource("");
        setCharacter("");
    };
    const save = async () => {
        setBusy(true);
        try {
            const result = await createDramaCastDraft(projectId, mode === "import" ? { sourceProjectId: source, sourceCastId: character, stylePrompt: style } : { name, stylePrompt: style });
            onCreated(result.cast.id);
            setMode(null);
        } catch {
            message.error(reviewText("保存失败"));
        } finally {
            setBusy(false);
        }
    };
    const title = mode === "import" ? reviewText("从其他作品导入") : reviewText("新建角色草稿");
    return (
        <>
            <Button onClick={() => open("create")}>{reviewText("新建角色草稿")}</Button>
            <Button onClick={() => open("import")}>{reviewText("从其他作品导入")}</Button>
            <Modal
                open={!!mode}
                title={title}
                okText={title}
                cancelText={reviewText("取消")}
                onCancel={() => {
                    if (!busy) setMode(null);
                }}
                onOk={() => void save()}
                confirmLoading={busy}
                okButtonProps={{ disabled: mode === "import" ? !character : !name.trim() }}
            >
                <div className="grid gap-3">
                    {mode === "import" ? (
                        <>
                            <label>
                                {reviewText("来源作品")}
                                <Select
                                    className="w-full"
                                    value={source || undefined}
                                    loading={projects.isFetching}
                                    options={projects.data?.map(({ project }) => ({ value: project.id, label: project.name }))}
                                    onChange={(value) => {
                                        setSource(value);
                                        setCharacter("");
                                    }}
                                />
                            </label>
                            <label>
                                {reviewText("来源角色")}
                                <Select
                                    className="w-full"
                                    value={character || undefined}
                                    loading={cast.isFetching}
                                    options={cast.data?.cast.filter((item) => item.kind === "character").map((item) => ({ value: item.id, label: item.name }))}
                                    onChange={setCharacter}
                                />
                            </label>
                            {(projects.isError || cast.isError) && <span role="alert">{reviewText("操作失败")}</span>}
                        </>
                    ) : (
                        <label>
                            {reviewText("名称")}
                            <Input value={name} maxLength={60} onChange={(event) => setName(event.target.value)} />
                        </label>
                    )}
                    <label>
                        {reviewText("角色专属风格")}
                        <Input.TextArea value={style} maxLength={2000} onChange={(event) => setStyle(event.target.value)} />
                    </label>
                </div>
            </Modal>
        </>
    );
}

export function JianyingExport({ projectId, detail, open: controlledOpen, onClose }: { projectId: string; detail: DramaEpisodeDetail; open?: boolean; onClose?: () => void }) {
    const locale = useReviewLocale();
    const { message } = App.useApp();
    const [open, setOpen] = useState(false);
    const [busy, setBusy] = useState(false);
    const close = () => {
        setOpen(false);
        onClose?.();
    };

    if (locale !== "zh-CN" && locale !== "zh-TW" && locale !== "zh-HK") {
        return null;
    }

    const ready = detail.segments.filter((seg) => seg.videoResourceId && seg.videoStatus === "ready");
    const download = async () => {
        setBusy(true);
        try {
            const draft = await getDramaJianyingDraft(projectId, detail.episode.id);
            if (draft.clips.length !== ready.length || draft.clips.some((clip, index) => clip.resourceId !== ready[index].videoResourceId)) throw new Error();
            const { Zip, ZipPassThrough, strToU8 } = await import("fflate");
            const chunks: Uint8Array[] = [];
            let zipError: unknown = null;
            const zip = new Zip((err, chunk) => {
                if (err) zipError = err;
                if (chunk) chunks.push(chunk);
            });

            const contentU8 = strToU8(JSON.stringify(draft.content));
            const metaU8 = strToU8(JSON.stringify(draft.meta));

            const addFile = (path: string, data: Uint8Array) => {
                const entry = new ZipPassThrough(path);
                zip.add(entry);
                entry.push(data, true);
            };

            addFile(`${draft.name}/draft_content.json`, contentU8);
            addFile(`${draft.name}/draft_info.json`, contentU8);
            addFile(`${draft.name}/draft_meta_info.json`, metaU8);

            for (const clip of draft.clips) {
                const blob = await getResourceBlob("resource:" + clip.resourceId);
                if (!blob?.size) throw new Error();
                const buffer = await blob.arrayBuffer();
                addFile(`${draft.name}/materials/${clip.fileName}`, new Uint8Array(buffer));
                if (zipError) throw zipError;
            }

            zip.end();
            if (zipError) throw zipError;

            const url = URL.createObjectURL(new Blob(chunks as BlobPart[], { type: "application/zip" }));
            const a = document.createElement("a");
            a.href = url;
            a.download = draft.name + ".zip";
            a.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            close();
        } catch {
            message.error(reviewText("下载失败"));
        } finally {
            setBusy(false);
        }
    };
    return (
        <>
            {controlledOpen === undefined ? <Button onClick={() => setOpen(true)}>{reviewText("导出剪映草稿")}</Button> : null}
            <Modal
                open={controlledOpen ?? open}
                title={reviewText("导出剪映草稿")}
                okText={reviewText("导出剪映草稿")}
                cancelText={reviewText("取消")}
                onCancel={() => {
                    if (!busy) close();
                }}
                onOk={() => void download()}
                confirmLoading={busy}
                okButtonProps={{ disabled: !ready.length }}
            >
                <p>{reviewText("可导出 {v0} 段，缺少视频 {v1} 段。仅导出就绪片段。", { v0: ready.length, v1: detail.segments.length - ready.length })}</p>
                <p>{reviewText("下载后解压，把整个文件夹放进剪映的草稿目录，再打开剪映。")}</p>
            </Modal>
        </>
    );
}
