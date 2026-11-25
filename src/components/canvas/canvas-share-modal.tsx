import { useI18n } from "@/i18n/use-i18n";
import { DATE_TIME_FORMAT } from "@/i18n/locale-core";
import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { App, Button, Input, Modal, Select, Spin } from "antd";
import { Copy, Link2, RefreshCw, Share2, Unlink } from "lucide-react";

import { canvasThemes } from "@/lib/canvas-theme";
import { createCanvasShare, deleteCanvasShare, getCanvasShare, type CanvasShareStatus } from "@/services/api/canvas-share";
import { useActiveTheme } from "@/stores/canvas/use-canvas-theme-store";

export function CanvasShareModal({ projectId, open, onClose, beforeCreate }: { projectId: string; open: boolean; onClose: () => void; beforeCreate: () => Promise<boolean | void> }) {
    const { t, number, date } = useI18n();
    const translationRef = useRef(t);
    translationRef.current = t;
    const { message, modal } = App.useApp();
    const theme = canvasThemes[useActiveTheme()];
    const [share, setShare] = useState<CanvasShareStatus>({ enabled: false });
    const [expiresDays, setExpiresDays] = useState(0);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const shareUrl = useMemo(() => share.token ? `${window.location.origin}/share/canvas/${share.token}` : "", [share.token]);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const result = await getCanvasShare(projectId);
            setShare(result.share);
        } catch (error) {
            message.error(error instanceof Error ? error.message : translationRef.current("canvasTransfer.shareLoad"));
        } finally {
            setLoading(false);
        }
    }, [message, projectId]);

    useEffect(() => {
        if (open) void load();
    }, [load, open]);

    const copy = async (value = shareUrl) => {
        if (!value) return;
        await navigator.clipboard.writeText(value);
        message.success(translationRef.current("canvasTransfer.copied"));
    };

    const create = async (rotate = false) => {
        setSubmitting(true);
        try {
            const saved = await beforeCreate();
            if (saved === false) return;
            const result = await createCanvasShare(projectId, { expiresDays, rotate });
            setShare(result.share);
            const url = result.share.token ? `${window.location.origin}/share/canvas/${result.share.token}` : "";
            await copy(url);
        } catch (error) {
            message.error(error instanceof Error ? error.message : translationRef.current("canvasTransfer.shareFailed"));
        } finally {
            setSubmitting(false);
        }
    };

    const revoke = () => modal.confirm({
        title: t("canvasTransfer.stopTitle"),
        content: t("canvasTransfer.stopHelp"),
        okText: t("canvasTransfer.stop"),
        okButtonProps: { danger: true },
        cancelText: t("adminChannels.cancel"),
        onOk: async () => {
            await deleteCanvasShare(projectId);
            setShare({ enabled: false });
            message.success(translationRef.current("canvasTransfer.stopped"));
        },
    });

    return (
        <Modal title={<span className="inline-flex items-center gap-2"><Share2 className="size-4" />{t("canvasTransfer.share")}</span>} open={open} onCancel={onClose} footer={null} centered width={520} destroyOnHidden>
            <Spin spinning={loading}>
                <div className="border-t pt-5" style={{ borderColor: theme.node.stroke }}>
                    <p className="mb-4 text-sm leading-6" style={{ color: theme.node.muted }}>
                        {t("canvasTransfer.shareHelp")}
                    </p>
                    {share.enabled && shareUrl ? (
                        <div className="space-y-4">
                            <Input value={shareUrl} readOnly suffix={<Button type="text" className="!h-7 !w-7 !min-w-7 !p-0" icon={<Copy className="size-3.5" />} onClick={() => void copy()} aria-label={t("canvasTransfer.copy")} />} />
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <span className="text-xs" style={{ color: theme.node.muted }}>{share.expiresAt ? t("canvasTransfer.expires", { time: date(share.expiresAt, DATE_TIME_FORMAT) }) : t("canvasTransfer.untilStopped")}</span>
                                <div className="flex gap-2">
                                    <Button icon={<RefreshCw className="size-3.5" />} loading={submitting} onClick={() => void create(true)}>{t("canvasTransfer.regenerate")}</Button>
                                    <Button danger icon={<Unlink className="size-3.5" />} onClick={revoke}>{t("canvasTransfer.stop")}</Button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <Select value={expiresDays} onChange={setExpiresDays} className="min-w-40" options={[{ value: 0, label: t("canvasTransfer.unlimited") }, { value: 7, label: t("canvasTransfer.days", { days: number(7) }) }, { value: 30, label: t("canvasTransfer.days", { days: number(30) }) }]} />
                            <Button type="primary" icon={<Link2 className="size-4" />} loading={submitting} onClick={() => void create(false)}>{t("canvasTransfer.create")}</Button>
                        </div>
                    )}
                </div>
            </Spin>
        </Modal>
    );
}
