import generationFailure from "./generation-failure.zh-CN";
const messages = {
    ...generationFailure,
    "agentErrors.details": "详情",
    "agentErrors.supportDetails": "已有结果会保留。若仍无法继续，请联系管理员协助处理。",
    "agentErrors.purchase": "充值积分",
    "agentErrors.prices": "查看价格",
    "agentErrors.login": "重新登录",
    "agentErrors.required": "所需积分：{amount}",
    "agentErrors.available": "可用余额：{amount}",
    "agentErrors.notFoundTitle": "Agent 接口或资源不存在",
    "agentErrors.notFoundText": "此会话或资源暂时不可用，请刷新画布并确认访问权限。",
    "agentErrors.notFoundMeta": "请确认后端已加载 Agent 路由，以及画布、会话和模型仍可访问；旧进程需要更新后重启。",
    "agentErrors.notOpenTitle": "当前 Agent 能力尚未开放",
    "agentErrors.notOpenText": "此功能暂时不可用，请选择其他可用功能或联系管理员。",
    "agentErrors.submitAcceptedCleanupFailed": "运行已接收，但本地提交记录清理失败",
    "agentErrors.submitRejected": "请求已被服务端拒绝",
    "agentErrors.submitServerError": "服务端已返回错误；重试将核对原请求，不重复创建",
    "agentErrors.submitUnconfirmed": "未收到服务端确认；重试将核对原请求，不重复创建",
} as const;
export default messages;
