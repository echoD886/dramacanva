import { lazy, Suspense, useEffect, useId, useRef, useState } from "react";
import { Alert } from "antd";
import { Link, useLocation, useNavigate } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useI18n } from "@/i18n/use-i18n";
import { localizedPublicPath, publicPathLocale } from "@/i18n/locale-routing";
import { MCP_CLIENTS, MCP_CLIENT_NAMES, MCP_CODEX_APPROVAL_CONFIG, mcpCommand, mcpLoginHref, mcpScopes, type McpClient } from "@/lib/mcp-connection";
import type { CreatedUserAccessKey } from "@/services/api/access-keys";
import { useUserStore } from "@/stores/use-user-store";
import { CopyCode } from "./copy-code";
const McpKeyDialog = lazy(() => import("./key-dialog"));
const CursorInstall = lazy(() => import("./cursor-install"));

export function McpCommandCard() {
    const { t } = useI18n();
    const location = useLocation();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const id = useId();
    const { user, hydrated } = useUserStore();
    const [client, setClient] = useState<McpClient>("claude");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(false);
    const [created, setCreated] = useState<{ userId: string; key: CreatedUserAccessKey } | null>(null);
    const pending = useRef(false);
    const mounted = useRef(true);
    useEffect(() => {
        mounted.current = true;
        return () => {
            mounted.current = false;
        };
    }, []);
    useEffect(() => {
        setCreated(null);
        setError(false);
    }, [user?.id]);
    const publicLocale = publicPathLocale(location.pathname) ?? "en-US";
    const mcpPath = localizedPublicPath("/mcp", publicLocale);
    const create = async (selected: McpClient) => {
        if (!user) {
            navigate(mcpLoginHref(location.pathname, location.search, selected));
            return;
        }
        if (pending.current) return;
        pending.current = true;
        setBusy(true);
        setError(false);
        const userId = user.id;
        try {
            const { getUserAccessKeyScopes, createUserAccessKey } = await import("@/services/api/access-keys");
            if (useUserStore.getState().user?.id !== userId || !mounted.current) return;
            const options = await getUserAccessKeyScopes();
            if (useUserStore.getState().user?.id !== userId || !mounted.current) return;
            const scopes = mcpScopes(options, "default");
            if (!scopes.length) throw new Error("No MCP scopes");
            const key = await createUserAccessKey({ name: `${MCP_CLIENT_NAMES[selected]} MCP`, scopes, mcpToolProfile: "default" });
            if (useUserStore.getState().user?.id === userId && mounted.current) {
                setCreated({ userId, key });
                void queryClient.invalidateQueries({ queryKey: ["access-keys", userId] });
            }
        } catch {
            if (mounted.current && useUserStore.getState().user?.id === userId) setError(true);
        } finally {
            pending.current = false;
            if (mounted.current) setBusy(false);
        }
    };
    useEffect(() => {
        if (!hydrated || !user) return;
        const params = new URLSearchParams(location.search);
        const selected = params.get("mcpConnect");
        if (!MCP_CLIENTS.includes(selected as McpClient)) return;
        params.delete("mcpConnect");
        // Remove the intent before the write so refresh/back cannot mint another key.
        navigate({ pathname: location.pathname, search: params.toString(), hash: location.hash }, { replace: true });
        setClient(selected as McpClient);
        void create(selected as McpClient);
    }, [hydrated, user?.id, location.search]);
    const shown = created && created.userId === user?.id ? created.key : null;
    return (
        <section className="mcp-command-card" aria-labelledby={`${id}-title`}>
            <div className="mcp-command-heading">
                <h2 id={`${id}-title`}>{t("mcp.title")}</h2>
                <div className="mcp-tabs" role="tablist" aria-label={t("mcp.steps")}>
                    {MCP_CLIENTS.map((item, index) => (
                        <button
                            key={item}
                            id={`${id}-${item}`}
                            type="button"
                            role="tab"
                            aria-selected={client === item}
                            aria-controls={`${id}-panel`}
                            tabIndex={client === item ? 0 : -1}
                            onClick={() => setClient(item)}
                            onKeyDown={(event) => {
                                const direction = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
                                const next = event.key === "Home" ? 0 : event.key === "End" ? MCP_CLIENTS.length - 1 : direction ? (index + direction + MCP_CLIENTS.length) % MCP_CLIENTS.length : -1;
                                if (next < 0) return;
                                event.preventDefault();
                                setClient(MCP_CLIENTS[next]);
                                document.getElementById(`${id}-${MCP_CLIENTS[next]}`)?.focus();
                            }}
                        >
                            {item === "other" ? t("mcp.other") : MCP_CLIENT_NAMES[item]}
                        </button>
                    ))}
                </div>
            </div>
            <div id={`${id}-panel`} role="tabpanel" aria-labelledby={`${id}-${client}`} tabIndex={0}>
                <CopyCode value={mcpCommand(client)} singleLine />
                {client === "codex" ? (
                    <details className="mcp-codex-approval">
                        <summary>
                            {MCP_CLIENT_NAMES.codex} · {t("settings.preferences")}
                        </summary>
                        <p>{t("mcp.codexApproval")}</p>
                        <CopyCode value={MCP_CODEX_APPROVAL_CONFIG} singleLine />
                    </details>
                ) : null}
                {client === "cursor" ? (
                    <div className="mcp-cursor-help">
                        <Suspense fallback={null}>
                            <CursorInstall />
                        </Suspense>
                        <span title={t("mcp.envHelp")}>{t("mcp.envShort")}</span>
                    </div>
                ) : null}
            </div>
            <ol className="mcp-connect-steps">
                <li>
                    <span aria-hidden="true">①</span>
                    <button type="button" className="mcp-action" disabled={busy || Boolean(shown) || !hydrated} aria-busy={busy} onClick={() => void create(client)}>
                        {t("mcp.getKey")}
                    </button>
                </li>
                <li>
                    <span aria-hidden="true">②</span>
                    {t("mcp.paste")}
                </li>
                <li>
                    <span aria-hidden="true">③</span>
                    <Link to={mcpPath}>{t("mcp.explore")}</Link>
                    <Link className="mcp-billing-info" to={`${mcpPath}#billing`} title={t("mcp.billingNote")} aria-label={t("mcp.billingNote")}>
                        ⓘ
                    </Link>
                </li>
            </ol>
            {error ? <Alert type="error" showIcon message={t("mcp.createFailed")} action={<Link to="/access-keys">{t("mcp.manage")}</Link>} /> : null}
            {shown ? (
                <Suspense fallback={null}>
                    <McpKeyDialog accessKey={shown} ownerId={created!.userId} onClose={() => setCreated(null)} />
                </Suspense>
            ) : null}
        </section>
    );
}
