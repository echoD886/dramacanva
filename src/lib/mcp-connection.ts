import { SITE_URL } from "./site-identity";
import type { AccessKeyScopeOption } from "../services/api/access-keys";

export const MCP_ENDPOINT = `${SITE_URL}/api/mcp`;
export type McpToolProfile = "default" | "expert";
export function mcpEndpoint(profile?: McpToolProfile) {
    return profile ? `${MCP_ENDPOINT}?profile=${profile}` : MCP_ENDPOINT;
}
export const MCP_CODEX_APPROVAL_CONFIG = 'default_tools_approval_mode = "approve"';
export const MCP_CLIENTS = ["claude", "codex", "cursor", "other"] as const;
export type McpClient = (typeof MCP_CLIENTS)[number];
export const MCP_CLIENT_NAMES = { claude: "Claude Code", codex: "Codex", cursor: "Cursor", other: "Other" } as const;
const MCP_SCOPE_VALUES = new Set(["account:read", "projects:read", "projects:write", "canvas:read", "canvas:write", "tasks:read", "tasks:write", "assets:read", "assets:write", "models:read", "agent:run"]);
const MCP_DEFAULT_SCOPE_VALUES = new Set(["account:read", "models:read", "projects:read", "projects:write", "canvas:read", "canvas:write", "tasks:read", "tasks:write"]);

export function mcpScopes(options: AccessKeyScopeOption[], profile: McpToolProfile = "expert") {
    const values = profile === "default" ? MCP_DEFAULT_SCOPE_VALUES : MCP_SCOPE_VALUES;
    return options.filter((option) => values.has(option.value)).map((option) => option.value);
}

export function mcpServerConfig(secret?: string, profile?: McpToolProfile) {
    return { url: mcpEndpoint(profile), headers: { Authorization: `Bearer ${secret ?? "${env:DRAMACANVA_API_KEY}"}` } };
}

export function mcpCommand(client: McpClient, secret?: string, profile?: McpToolProfile) {
    const endpoint = mcpEndpoint(profile);
    const cliEndpoint = profile ? `"${endpoint}"` : endpoint;
    if (client === "claude") return `claude mcp add --transport http dramacanva ${cliEndpoint} --header "Authorization: Bearer ${secret ?? "$DRAMACANVA_API_KEY"}"`;
    if (client === "codex") return `codex mcp add dramacanva --url ${cliEndpoint} --bearer-token-env-var DRAMACANVA_API_KEY`;
    return JSON.stringify({ mcpServers: { dramacanva: client === "other" ? { url: endpoint, headers: { Authorization: `Bearer ${secret ?? "<YOUR_KEY>"}` } } : mcpServerConfig(secret, profile) } }, null, 2);
}

export function mcpEnvironmentCommand(secret: string, powershell = false) {
    return powershell ? `$env:DRAMACANVA_API_KEY="${secret}"` : `export DRAMACANVA_API_KEY=${secret}`;
}

export function mcpLoginHref(pathname: string, search: string, client: McpClient) {
    const params = new URLSearchParams(search);
    params.set("mcpConnect", client);
    return `/login?next=${encodeURIComponent(`${pathname}?${params}`)}`;
}

export function creditsToMicrocredits(value: number | null) {
    if (value === null) return null;
    const amount = Math.round(value * 1_000_000);
    if (!Number.isFinite(value) || value < 0 || !Number.isSafeInteger(amount)) throw new Error("Invalid credit limit");
    return amount;
}
