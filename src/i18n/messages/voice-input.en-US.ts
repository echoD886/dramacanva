const messages = {
    "canvasPrompt.voiceRequesting": "Requesting microphone access…",
    "canvasPrompt.voiceRecordingFallback": "Recording (fallback)",
    "canvasPrompt.voicePermissionHelp": "Microphone access was denied. Click the site settings icon to the left of the browser address bar, allow Microphone, then retry.",
    "canvasPrompt.voiceUnavailable": "Microphone input is unavailable. Open this page over HTTPS or localhost in a browser that supports microphones.",
    "canvasPrompt.voiceTranscriptionFailed": "Transcription failed. This feature is currently unavailable — please try again later.",
    "voiceInput.open": "Voice input",
    "voiceInput.unsupported": "This browser does not support speech recognition. Use Chrome or Edge.",
    "voiceInput.empty": "No speech was recognized. Please retry.",
    "voiceInput.transcribing": "Transcribing…",
    "voiceInput.done": "Transcription complete",
    "voiceInput.stop": "Stop and transcribe",
    "voiceInput.permission": "Microphone access was denied. Allow it in your browser settings.",
    "voiceInput.noSpeech": "No speech detected. Please retry.",
    "voiceInput.network": "Speech recognition is unavailable. Check your connection and retry.",
    "voiceInput.error": "Speech recognition failed ({code})",
    "voiceInput.microphone": "Cannot access the microphone",
} as const;
export default messages;
