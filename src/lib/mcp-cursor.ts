import { mcpServerConfig, type McpToolProfile } from "./mcp-connection";

export function cursorInstallHref(secret?: string, profile?: McpToolProfile) {
    const bytes = new TextEncoder().encode(JSON.stringify(mcpServerConfig(secret, profile)));
    const encoded = btoa(Array.from(bytes, (byte) => String.fromCharCode(byte)).join(""));
    return `cursor://anysphere.cursor-deeplink/mcp/install?name=dramacanva&config=${encodeURIComponent(encoded)}`;
}
