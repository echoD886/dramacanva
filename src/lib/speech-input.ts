export const DEFAULT_SPEECH_LANGUAGE = "en-US";

/** Speech input has its own default; changing the interface must not switch it. */
export function speechInputLanguage(explicitLanguage?: string): string {
    if (!explicitLanguage?.trim()) return DEFAULT_SPEECH_LANGUAGE;
    try {
        return Intl.getCanonicalLocales(explicitLanguage.trim().replace(/_/g, "-"))[0] || DEFAULT_SPEECH_LANGUAGE;
    } catch {
        return DEFAULT_SPEECH_LANGUAGE;
    }
}

type RecognitionResults = {
    length: number;
    [index: number]: { isFinal: boolean; [index: number]: { transcript: string } };
};

/** Each result event contains the session's cumulative results, not just the delta. */
export function finalSpeechTranscript(results: RecognitionResults): string {
    const segments: string[] = [];
    for (let index = 0; index < results.length; index++) {
        const result = results[index];
        if (result?.isFinal && result[0]?.transcript.trim()) segments.push(result[0].transcript.trim());
    }
    return segments.join(" ");
}
