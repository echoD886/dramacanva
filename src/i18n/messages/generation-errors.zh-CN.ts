const messages = {
    "generationErrors.moderation": "内容审核未通过，本次平台积分未扣除或已退还。请修改提示词后重新生成。",
    "generationErrors.failed": "生成失败，请稍后重试。",
    "generationErrors.network": "网络异常。",
    "generationErrors.busy": "服务当前繁忙，请稍后重试。",
    "generationErrors.auth": "生成服务鉴权失败，请检查渠道配置。",
    "generationErrors.address": "生成服务地址不可用，请检查渠道配置。",
    "generationErrors.spawn": "无法启动官方即梦 CLI，任务尚未提交。",
    "generationErrors.exit": "官方即梦 CLI 未接受本次提交，任务没有自动重试。",
    "generationErrors.timeout": "等待官方即梦 CLI 确认提交超时，为避免重复扣费，任务没有自动重试。",
    "generationErrors.receipt": "官方即梦 CLI 未返回任务凭证，为避免重复扣费，任务没有自动重试。",
    "generationErrors.unknown": "提交结果待确认，为避免重复扣费未自动重试。",
    "generationErrors.storageDisabled": "对象存储账号已停用，请检查或更换对象存储配置。",
    "generationErrors.storageUpload": "参考素材上传到对象存储失败，请检查对象存储配置后重试。",
    "generationErrors.audioReferenceRequired": "全能配音需要连接参考音频",
    "generationErrors.audioReferenceUnsupported": "当前音频协议不支持参考音色配音",
    "generationErrors.audioVoiceBindingChanged": "角色或参考音频连接已变化，请重新确认音色对应关系",
} as const;
export default messages;
