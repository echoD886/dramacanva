const messages = {
    "canvasPrompt.voiceRequesting": "마이크 권한 요청 중…",
    "canvasPrompt.voiceRecordingFallback": "녹음 중 (대체 변환)",
    "canvasPrompt.voicePermissionHelp": "마이크 접근이 거부되었습니다. 주소창 왼쪽의 사이트 설정 아이콘을 눌러 마이크를 허용한 후 다시 시도하세요.",
    "canvasPrompt.voiceUnavailable": "마이크를 사용할 수 없습니다. 마이크를 지원하는 브라우저에서 HTTPS 또는 localhost로 열어 주세요.",
    "canvasPrompt.voiceTranscriptionFailed": "음성 변환에 실패했습니다. 현재 이 기능을 사용할 수 없습니다. 잠시 후 다시 시도해 주세요.",
    "voiceInput.open": "음성 입력",
    "voiceInput.unsupported": "이 브라우저는 음성 인식을 지원하지 않습니다. Chrome 또는 Edge를 사용하세요.",
    "voiceInput.empty": "음성이 인식되지 않았습니다. 다시 시도하세요.",
    "voiceInput.transcribing": "음성 변환 중…",
    "voiceInput.done": "음성 변환 완료",
    "voiceInput.stop": "중지 후 텍스트로 변환",
    "voiceInput.permission": "마이크 접근이 거부되었습니다. 브라우저 설정에서 허용하세요.",
    "voiceInput.noSpeech": "음성이 감지되지 않았습니다. 다시 시도하세요.",
    "voiceInput.network": "음성 인식을 사용할 수 없습니다. 연결을 확인한 후 다시 시도하세요.",
    "voiceInput.error": "음성 인식 실패({code})",
    "voiceInput.microphone": "마이크에 접근할 수 없습니다",
} as const;
export default messages;
