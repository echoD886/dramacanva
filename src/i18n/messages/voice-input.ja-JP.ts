const messages = {
    "canvasPrompt.voiceRequesting": "マイクの許可をリクエスト中…",
    "canvasPrompt.voiceRecordingFallback": "録音中（代替文字起こし）",
    "canvasPrompt.voicePermissionHelp": "マイクへのアクセスが拒否されました。アドレスバー左側のサイト設定から「マイク」を許可して、再試行してください。",
    "canvasPrompt.voiceUnavailable": "マイクを利用できません。HTTPS または localhost で、マイク対応のブラウザから開いてください。",
    "canvasPrompt.voiceTranscriptionFailed": "文字起こしに失敗しました。現在この機能はご利用いただけません。後でもう一度お試しください。",
    "voiceInput.open": "音声入力",
    "voiceInput.unsupported": "このブラウザーは音声認識に対応していません。Chrome または Edge を使用してください。",
    "voiceInput.empty": "音声を認識できませんでした。再試行してください。",
    "voiceInput.transcribing": "文字起こし中…",
    "voiceInput.done": "文字起こし完了",
    "voiceInput.stop": "停止して文字起こし",
    "voiceInput.permission": "マイクへのアクセスが拒否されました。ブラウザー設定で許可してください。",
    "voiceInput.noSpeech": "音声が検出されませんでした。再試行してください。",
    "voiceInput.network": "音声認識を利用できません。接続を確認して再試行してください。",
    "voiceInput.error": "音声認識に失敗しました（{code}）",
    "voiceInput.microphone": "マイクにアクセスできません",
} as const;
export default messages;
