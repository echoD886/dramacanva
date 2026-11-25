import { matchAudioValidationMessageKey } from "./ddcat-updates";
import { generationErrorMessage } from "@/lib/generation-error";
import { generationFailurePresentation } from "@/lib/generation-failure";
import type { MessageKey, MessageValues } from "./messages";

// Display only: stored failures and moderation checks retain their canonical messages.
const labels = {
    "当前方案支持一个自有渠道，请在创作主场更换绑定渠道后重试": "byok.mismatch",
    "创作主场服务未生效或已到期，请前往独立栏目开通或续费": "pricing.byokInactive",
    "模型价格尚未配置，请选择其他模型。": "generationReason.price",
    "当前模型没有可用线路，请选择其他模型或稍后重试。": "generationReason.route",
    "模型目录已更新，请重新选择模型。": "generationReason.catalog",
    "模型选择无效，请重新选择模型。": "generationReason.selection",
    "已达到使用额度，请检查额度后重试。": "generationReason.quota",
    "请求过于频繁，请稍后重试。": "generationReason.rate",
    "生成请求超时，请先查看任务状态再决定是否重试。": "generationReason.requestTimeout",
    "上游服务暂时不可用，请稍后重试。": "generationReason.upstream",
    "没有执行该生成操作的权限。": "generationReason.forbidden",
    "生成条件不满足，请检查参数和参考素材。": "generationReason.precondition",
    "任务状态已变化，请刷新后重试。": "generationReason.conflict",
    "Agent 运行暂时不可用，请稍后重试": "generationReason.agentUnavailable",
    "仅停止本机等待，官方任务仍可能继续。": "creationRuntime.dreaminaWaitStopped",
    "官方任务未完成；可能已在官方取消或生成失败。": "creationRuntime.dreaminaOfficialIncomplete",
    "任务未成功。当前 Dreamina CLI 无法可靠判断是官网取消还是生成失败。": "creationRuntime.dreaminaFailedOrCancelled",
    "任务已转入后台，官方状态会继续同步。": "creationRuntime.dreaminaBackground",
    "内容审核未通过，本次平台积分未扣除或已退还。请修改提示词后重新生成。": "generationErrors.moderation",
    "生成失败，请稍后重试。": "generationErrors.failed",
    "网络异常。": "generationErrors.network",
    "服务当前繁忙，请稍后重试。": "generationErrors.busy",
    "生成服务鉴权失败，请检查渠道配置。": "generationErrors.auth",
    "生成服务地址不可用，请检查渠道配置。": "generationErrors.address",
    "无法启动官方即梦 CLI，任务尚未提交。": "generationErrors.spawn",
    "官方即梦 CLI 未接受本次提交，任务没有自动重试。": "generationErrors.exit",
    "等待官方即梦 CLI 确认提交超时，为避免重复扣费，任务没有自动重试。": "generationErrors.timeout",
    "官方即梦 CLI 未返回任务凭证，为避免重复扣费，任务没有自动重试。": "generationErrors.receipt",
    "提交结果待确认，为避免重复扣费未自动重试。": "generationErrors.unknown",
    "对象存储账号已停用，请检查或更换对象存储配置。": "generationErrors.storageDisabled",
    "参考素材上传到对象存储失败，请检查对象存储配置后重试。": "generationErrors.storageUpload",
} as const satisfies Record<string, MessageKey>;

export function localizedGenerationError(error: unknown, t: (key: MessageKey, values?: MessageValues) => string) {
    const audioValidationKey = matchAudioValidationMessageKey(error);
    if (audioValidationKey) return t(audioValidationKey);
    const message = generationErrorMessage(error);
    const messageValidationKey = matchAudioValidationMessageKey(message);
    if (messageValidationKey) return t(messageValidationKey);
    if (message === "自定义渠道暂未开放") return `${t("channels.title")}: ${t("channels.disabled")}`;
    if (message.startsWith("作品已生成，但保存未完成：")) {
        const stage = message.slice("作品已生成，但保存未完成：".length);
        const stages = { 下载结果失败: "download", "上传 OSS 失败": "upload", 保存本地文件失败: "local_save", 登记作品失败: "register", 记录恢复信息失败: "checkpoint" } as const;
        const key = stages[stage as keyof typeof stages];
        return key ? `${t("mediaRecovery.failed")}: ${t(`mediaRecovery.${key}`)}` : t("mediaRecovery.failed");
    }
    if (message === "官方返回状态：cancelled") return t("generationTask.cancelled");
    return Object.hasOwn(labels, message) ? t(labels[message as keyof typeof labels]) : generationFailurePresentation(error, t).text;
}
