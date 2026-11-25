import { useI18n } from "@/i18n/use-i18n";
import { mcpCommand, mcpEnvironmentCommand } from "@/lib/mcp-connection";
import CursorInstall from "./cursor-install";
import { CopyCode } from "./copy-code";

/** Render only inside the one-time key dialog, never in the key list. */
export function KeyConnection({ secret }: { secret: string }) {
    const { t } = useI18n();
    return (
        <div className="mcp-key-connection">
            <CopyCode value={mcpEnvironmentCommand(secret)} label="macOS / Linux" />
            <CopyCode value={mcpEnvironmentCommand(secret, true)} label="Windows PowerShell" />
            <p>{t("mcp.envHelp")}</p>
            <CopyCode value={mcpCommand("claude", secret)} label="Claude Code" />
            <CopyCode value={mcpCommand("codex", secret)} label="Codex" />
            <CursorInstall secret={secret} />
        </div>
    );
}
