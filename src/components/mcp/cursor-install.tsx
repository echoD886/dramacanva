import { useI18n } from "@/i18n/use-i18n";
import { cursorInstallHref } from "@/lib/mcp-cursor";

export default function CursorInstall({ secret }: { secret?: string }) {
    const { t } = useI18n();
    return (
        <a className="mcp-action" href={cursorInstallHref(secret)}>
            {t(secret ? "mcp.cursorSecret" : "mcp.cursor")}
        </a>
    );
}
