export function shouldFallbackPromptSpeech(code: string) {
    return ["network", "not-allowed", "service-not-allowed", "service-unavailable", "unsupported", "start-failed"].includes(code);
}

export function promptMicrophoneErrorKey(error: unknown) {
    return error instanceof Error && ["NotAllowedError", "PermissionDeniedError", "SecurityError"].includes(error.name) ? "canvasPrompt.voicePermissionHelp" : "voiceInput.microphone";
}
