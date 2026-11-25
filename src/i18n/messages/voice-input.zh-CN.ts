const messages = {
    "canvasPrompt.voiceRequesting": "正在请求麦克风权限…",
    "canvasPrompt.voiceRecordingFallback": "录音中（备用转写）",
    "canvasPrompt.voicePermissionHelp": "麦克风权限被拒绝。请点击浏览器地址栏左侧的网站设置图标，允许“麦克风”，然后重试。",
    "canvasPrompt.voiceUnavailable": "当前浏览器无法使用麦克风。请通过 HTTPS 或 localhost 打开，并使用支持麦克风的浏览器。",
    "canvasPrompt.voiceTranscriptionFailed": "语音转写失败，该功能暂时不可用，请稍后重试。",
    "voiceInput.open": "实时对话",
    "voiceInput.unsupported": "当前浏览器不支持语音识别，请使用 Chrome 或 Edge 浏览器",
    "voiceInput.empty": "未识别到语音内容，请重试",
    "voiceInput.transcribing": "正在转写...",
    "voiceInput.done": "转写完成",
    "voiceInput.stop": "停止并转写",
    "voiceInput.permission": "麦克风权限被拒绝，请在浏览器设置中允许访问麦克风",
    "voiceInput.noSpeech": "未检测到语音，请重试",
    "voiceInput.network": "语音识别服务不可用，请检查网络后重试",
    "voiceInput.error": "语音识别失败（{code}）",
    "voiceInput.microphone": "无法访问麦克风",
} as const;
export default messages;
