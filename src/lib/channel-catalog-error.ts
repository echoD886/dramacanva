export type CatalogFailure = "catalogUnsupported" | "catalogAuth" | "catalogLimited" | "catalogNetwork" | "catalogParse";
export class ChannelCatalogError extends Error {
    constructor(
        readonly kind: CatalogFailure,
        message: string,
    ) {
        super(message);
    }
}
export function catalogFailure(status: number | undefined, detail: string, code?: string): CatalogFailure {
    if (/不支持拉取模型|未提供 \/models/.test(detail)) return "catalogUnsupported";
    if (status === 401 || status === 403 || /鉴权失败/.test(detail)) return "catalogAuth";
    if (status === 429 || /过于频繁|额度不足/.test(detail)) return "catalogLimited";
    if (/JSON|解析|结构/.test(detail)) return "catalogParse";
    if (code === "ECONNABORTED" || code === "ETIMEDOUT" || !status) return "catalogNetwork";
    return "catalogNetwork";
}
