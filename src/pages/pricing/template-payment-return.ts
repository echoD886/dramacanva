type ReturnStorage = Pick<Storage, "getItem" | "removeItem">;
export function templatePaymentReturn(search: string, storage: ReturnStorage, rechargeKey: string) {
    const params = new URLSearchParams(search);
    const taskId = params.get("taskId");
    const valid = (path: string | null) => path && /^\/(?:[a-z-]+\/)?ai-video-templates\/[a-z0-9-]+$/.test(path);
    if (params.get("payment") && !taskId) {
        const path = storage.getItem(rechargeKey);
        storage.removeItem(rechargeKey);
        return valid(path) ? { path: path!, close: true } : null;
    }
    if (params.get("payment") !== "success" || !taskId) return null;
    const path = storage.getItem(`aivt-checkout:${taskId}`);
    return valid(path) ? { path: `${path}?taskId=${encodeURIComponent(taskId)}`, close: false } : null;
}
