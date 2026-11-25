import { upstreamText } from "@/i18n/ddcat-updates";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App, Button, Input } from "antd";
import { Pencil } from "lucide-react";

import { AppModal } from "@/components/ui/product/app-modal";
import { updateDramaChapter, type DramaChapterRef } from "@/services/api/drama";

export function ChapterRenameButton({ projectId, chapter }: { projectId: string; chapter: DramaChapterRef }) {
    const { message } = App.useApp();
    const queryClient = useQueryClient();
    const [open, setOpen] = useState(false);
    const [title, setTitle] = useState(chapter.title);
    const trimmed = title.trim();
    const rename = useMutation({
        mutationFn: () => updateDramaChapter(projectId, chapter.id, { title: trimmed }),
        onSuccess: async () => {
            await Promise.all([queryClient.invalidateQueries({ queryKey: ["drama", projectId] })]);
            setOpen(false);
            message.success(upstreamText("章节名称已保存"));
        },
        onError: (error) => {
            message.error(error instanceof Error ? error.message : upstreamText("修改章节名称失败"));
        },
    });
    const canSave = Boolean(trimmed) && trimmed !== chapter.title && !rename.isPending;
    const save = () => {
        if (canSave) rename.mutate();
    };

    return (
        <>
            <Button
                size="small"
                type="text"
                className="shrink-0"
                icon={<Pencil className="size-3.5" />}
                aria-label={upstreamText("修改章节名称：{0}", [chapter.title])}
                onClick={() => {
                    setTitle(chapter.title);
                    setOpen(true);
                }}
            >
                {upstreamText("改名")}
            </Button>
            <AppModal
                open={open}
                title={upstreamText("修改章节名称")}
                onCancel={() => {
                    if (!rename.isPending) setOpen(false);
                }}
                onOk={save}
                okText={upstreamText("保存名称")}
                cancelText={upstreamText("取消")}
                confirmLoading={rename.isPending}
                okButtonProps={{ disabled: !canSave }}
                cancelButtonProps={{ disabled: rename.isPending }}
                closable={!rename.isPending}
                centered
                width={440}
            >
                <Input
                    aria-label={upstreamText("章节名称")}
                    autoFocus
                    value={title}
                    maxLength={200}
                    showCount
                    disabled={rename.isPending}
                    onChange={(event) => setTitle(event.target.value)}
                    onFocus={(event) => event.currentTarget.select()}
                    onPressEnter={save}
                />
            </AppModal>
        </>
    );
}
