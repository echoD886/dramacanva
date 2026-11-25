import { appQueryClient } from "./query-client";

export function refreshByokAfterConflict(status: number | undefined, message: string | undefined) {
    if (status === 409 && message === "当前方案支持一个自有渠道，请在创作主场更换绑定渠道后重试") {
        void appQueryClient.invalidateQueries({ queryKey: ["byok-status"] });
    }
}
