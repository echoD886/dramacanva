import { resolveModelRequestConfig, type AiConfig } from "@/stores/use-config-store";

export const audioVoiceOptions = [
    { value: "alloy", label: "Alloy" },
    { value: "ash", label: "Ash" },
    { value: "ballad", label: "Ballad" },
    { value: "coral", label: "Coral" },
    { value: "echo", label: "Echo" },
    { value: "fable", label: "Fable" },
    { value: "nova", label: "Nova" },
    { value: "onyx", label: "Onyx" },
    { value: "sage", label: "Sage" },
    { value: "shimmer", label: "Shimmer" },
    { value: "verse", label: "Verse" },
    { value: "marin", label: "Marin" },
    { value: "cedar", label: "Cedar" },
];

export const audioFormatOptions = [
    { value: "mp3", label: "MP3" },
    { value: "wav", label: "WAV" },
    { value: "opus", label: "Opus" },
    { value: "aac", label: "AAC" },
    { value: "flac", label: "FLAC" },
    { value: "pcm", label: "PCM" },
];

export function normalizeAudioVoiceValue(value: string) {
    return audioVoiceOptions.some((item) => item.value === value) ? value : "alloy";
}

export function normalizeAudioFormatValue(value: string) {
    return audioFormatOptions.some((item) => item.value === value) ? value : "mp3";
}

export function normalizeAudioSpeedValue(value: string) {
    const speed = Number(value);
    if (!Number.isFinite(speed)) return "1";
    return String(Math.max(0.25, Math.min(4, Number(speed.toFixed(2)))));
}

export function audioProtocol(config: AiConfig) {
    return resolveModelRequestConfig(config, config.model || config.audioModel).interfaceType || "";
}

export function audioVoiceForConfig(config: AiConfig) {
    const protocol = audioProtocol(config);
    const voice = config.audioVoice.trim();
    if (protocol === "evolink-seed-audio") return "";
    if (protocol === "minimax-speech") return voice && !audioVoiceOptions.some((item) => item.value === voice) ? voice : "male-qn-qingse";
    if (protocol === "evolink-qwen-audio-tts") return voice && !audioVoiceOptions.some((item) => item.value === voice) ? voice : "longanhuan_v3.1";
    return normalizeAudioVoiceValue(voice);
}

export function audioFormatsForConfig(config: AiConfig) {
    const protocol = audioProtocol(config);
    if (protocol === "minimax-speech") return audioFormatOptions.filter((item) => ["mp3", "wav", "flac", "pcm"].includes(item.value));
    if (protocol === "evolink-qwen-audio-tts") return audioFormatOptions.filter((item) => ["mp3", "wav", "opus"].includes(item.value));
    return audioFormatOptions;
}

export function audioSpeedForConfig(config: AiConfig, value = config.audioSpeed) {
    const speed = Number(normalizeAudioSpeedValue(value));
    return ["minimax-speech", "evolink-seed-audio", "evolink-qwen-audio-tts"].includes(audioProtocol(config)) ? String(Math.max(0.5, Math.min(2, speed))) : String(speed);
}

export function audioVoiceLabel(value: string) {
    const voice = normalizeAudioVoiceValue(value);
    return audioVoiceOptions.find((item) => item.value === voice)?.label || voice;
}

export function audioFormatLabel(value: string) {
    const format = normalizeAudioFormatValue(value);
    return audioFormatOptions.find((item) => item.value === format)?.label || format;
}

export function audioSpeedLabel(value: string) {
    return `${normalizeAudioSpeedValue(value)}x`;
}

export function audioMimeType(format: string) {
    if (format === "wav") return "audio/wav";
    if (format === "opus") return "audio/opus";
    if (format === "aac") return "audio/aac";
    if (format === "flac") return "audio/flac";
    if (format === "pcm") return "audio/pcm";
    return "audio/mpeg";
}

export function isMusicModel(model?: string): boolean {
    if (!model) return false;
    return /suno/i.test(model);
}
