import { FolderLock, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";

import { formatBytes } from "@/lib/image-utils";
import { useI18n } from "@/i18n/use-i18n";
import { getLocalWorkspaceState, onLocalWorkspaceChange, openLocalWorkspaceManager, type LocalWorkspaceState } from "@/services/local-workspace-storage";

export function AssetStorageUsage() {
    const { t } = useI18n();
    const [workspace, setWorkspace] = useState<LocalWorkspaceState | null>(null);
    useEffect(() => {
        const load = () => void getLocalWorkspaceState().then(setWorkspace);
        load();
        return onLocalWorkspaceChange(load);
    }, []);
    const status = workspace?.mode === "directory"
        ? workspace.permission === "granted" ? `${workspace.directoryName} · ${t("assets.connected")}` : `${workspace.directoryName} · ${t("assets.reauthorize")}`
        : workspace?.mode === "browser" ? t("assets.storageBrowser") : t("assets.storageChoose");

    return (
        <button type="button" className={`assets-storage-usage${workspace?.recordedBytes ? " has-usage" : ""}`} aria-label={t("assets.storageAria")} aria-busy={!workspace} title={t("assets.storageTitle")} onClick={openLocalWorkspaceManager}>
            <span className="assets-storage-usage-icon" aria-hidden="true">
                <FolderLock />
            </span>
            <span className="assets-storage-usage-title">{t("assets.storageLabel")}</span>
            <span className="assets-storage-usage-value">{workspace ? status : t("assets.reading")}</span>
            {workspace?.recordedBytes ? <span className="assets-storage-usage-percent">{t("assets.recorded", { size: storageBytes(workspace.recordedBytes) })}</span> : <span className="assets-storage-usage-percent"><ShieldCheck />{t("assets.localOnly")}</span>}
        </button>
    );
}

function storageBytes(value: number) {
    return formatBytes(value) || "0 B";
}
