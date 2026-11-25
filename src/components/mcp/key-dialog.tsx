import { Alert, Button, Modal } from "antd";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router";
import { useI18n } from "@/i18n/use-i18n";
import { CopyCode } from "./copy-code";
import { KeyConnection } from "./key-connection";
import { SpendLimitField } from "./spend-limit";
import { creditsToMicrocredits } from "@/lib/mcp-connection";
import { updateUserAccessKeySpendLimit, type CreatedUserAccessKey } from "@/services/api/access-keys";
import { useUserStore } from "@/stores/use-user-store";

export default function McpKeyDialog({ accessKey, ownerId, onClose }: { accessKey: CreatedUserAccessKey; ownerId: string; onClose: () => void }) {
    const { t } = useI18n();
    const queryClient = useQueryClient();
    const [limit, setLimit] = useState<number | null>(accessKey.spendLimitMicrocredits === null ? null : accessKey.spendLimitMicrocredits / 1_000_000);
    const [busy, setBusy] = useState(false);
    const [status, setStatus] = useState<"saved" | "failed" | null>(null);
    const [hasSaved, setHasSaved] = useState(false);
    const save = async () => {
        if (busy || useUserStore.getState().user?.id !== ownerId) return;
        setBusy(true);
        setStatus(null);
        try {
            await updateUserAccessKeySpendLimit(accessKey.id, creditsToMicrocredits(limit));
            if (useUserStore.getState().user?.id !== ownerId) return;
            setStatus("saved");
            setHasSaved(true);
            void queryClient.invalidateQueries({ queryKey: ["access-keys", ownerId] });
        } catch {
            if (useUserStore.getState().user?.id === ownerId) setStatus("failed");
        } finally {
            setBusy(false);
        }
    };
    return (
        <Modal title={t("mcp.saveTitle")} open onOk={onClose} okText={t("mcp.close")} cancelButtonProps={{ style: { display: "none" } }} closable={false} mask={{ closable: false }} destroyOnHidden>
            <div className="mcp-key-dialog">
                <Alert type="warning" showIcon message={t("mcp.saveWarning")} />
                <CopyCode value={accessKey.secret} />
                <SpendLimitField
                    value={limit}
                    onChange={(value) => {
                        setLimit(value);
                        setStatus(null);
                    }}
                    disabled={busy}
                />
                <Button loading={busy} onClick={() => void save()}>
                    {t("mcp.limitSave")}
                </Button>
                {status ? (
                    <div role="status">
                        <Alert type={status === "saved" ? "success" : "error"} showIcon message={t(status === "saved" ? "mcp.limitSaved" : "mcp.limitFailed")} />
                    </div>
                ) : !hasSaved ? (
                    <p>{t("mcp.limitLater")}</p>
                ) : null}
                <KeyConnection secret={accessKey.secret} />
                <Link to="/access-keys">{t("mcp.manage")}</Link>
            </div>
        </Modal>
    );
}
