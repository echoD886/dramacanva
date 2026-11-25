import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/i18n/use-i18n";
import type { MessageKey } from "@/i18n/messages";
import { Button, Spin, Tooltip } from "antd";
import { Check, Mic, Square, X } from "lucide-react";

import { AudioWaveform } from "./audio-waveform";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import { speechInputLanguage } from "@/lib/speech-input";
import { useVoiceRecording } from "@/hooks/use-voice-recording";
import { canvasThemes } from "@/lib/canvas-theme";
import { useThemeStore } from "@/stores/use-theme-store";

type VoiceRecordingInlineProps = {
    /** Optional recording language, independent of the interface language. */
    lang?: string;
    /** 转写完成回调，返回转写文本 */
    onTranscribed: (text: string) => void;
    /** 取消录制回调 */
    onCancel: () => void;
};

type TranscribeState = "idle" | "transcribing" | "done" | "error";

/**
 * 内联语音录制条（输入行内展示）
 * 挂载后自动开始录音，显示波形动画；点击停止后自动转写为文字（浏览器 Web Speech API，无需后端与 API Key）
 */
export function VoiceRecordingInline({ onTranscribed, onCancel, lang }: VoiceRecordingInlineProps) {
    const { t } = useI18n();
    // Keep the recognition language fixed for this recording session.
    const recognitionLanguage = useRef(speechInputLanguage(lang));
    const theme = canvasThemes[useThemeStore((state) => state.theme)];
    const {
        state,
        waveform,
        duration,
        error: recorderError,
        start: startRecording,
        stop: stopRecording,
        cancel: cancelRecording,
    } = useVoiceRecording({
        maxDuration: 60,
    });
    const {
        supported: speechSupported,
        error: speechError,
        start: startSpeech,
        stop: stopSpeech,
        cancel: cancelSpeech,
    } = useSpeechRecognition({ lang: recognitionLanguage.current });
    const [transcribeState, setTranscribeState] = useState<TranscribeState>("idle");
    const [transcribeError, setTranscribeError] = useState<MessageKey | "">("");
    const stopRequestedRef = useRef(false);
    const wasRecordingRef = useRef(false);

    // 挂载后自动开始录音与语音识别，卸载时清理
    useEffect(() => {
        if (!speechSupported) {
            setTranscribeError("voiceInput.unsupported");
            setTranscribeState("error");
            return;
        }
        void startRecording();
        startSpeech();
        return () => {
            cancelRecording();
            cancelSpeech();
        };
    }, [startRecording, cancelRecording, startSpeech, cancelSpeech, speechSupported]);

    const handleStop = async () => {
        if (stopRequestedRef.current || transcribeState !== "idle") return;
        stopRequestedRef.current = true;
        setTranscribeState("transcribing");
        setTranscribeError("");
        const text = await stopSpeech();
        void stopRecording();
        const trimmed = text.trim();
        if (!trimmed) {
            setTranscribeError("voiceInput.empty");
            setTranscribeState("error");
            stopRequestedRef.current = false;
            return;
        }
        setTranscribeState("done");
        // 短暂展示成功状态后回调
        window.setTimeout(() => onTranscribed(trimmed), 600);
    };

    // 录音达到最大时长自动停止时，自动触发转写
    useEffect(() => {
        if (state === "recording") wasRecordingRef.current = true;
        if (state === "idle" && wasRecordingRef.current && transcribeState === "idle" && !stopRequestedRef.current) {
            wasRecordingRef.current = false;
            void handleStop();
        }
    }, [state, transcribeState]);

    const handleRetry = () => {
        stopRequestedRef.current = false;
        wasRecordingRef.current = false;
        setTranscribeError("");
        setTranscribeState("idle");
        void startRecording();
        startSpeech();
    };

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, "0")}`;
    };

    const speechDisplayError = speechError ? speechError.code === "unsupported" ? t("voiceInput.unsupported")
        : speechError.code === "not-allowed" || speechError.code === "service-not-allowed" ? t("voiceInput.permission")
        : speechError.code === "no-speech" ? t("voiceInput.noSpeech")
        : speechError.code === "network" ? t("voiceInput.network")
        : t("voiceInput.error", { code: speechError.code }) : "";
    const displayError = (recorderError === "MICROPHONE_UNAVAILABLE" ? t("voiceInput.microphone") : recorderError) || speechDisplayError || (transcribeState === "error" && transcribeError ? t(transcribeError) : "");

    return (
        <div
            className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border px-2 py-1.5"
            style={{ background: theme.toolbar.panel, borderColor: theme.toolbar.border }}
        >
            {displayError ? (
                <div className="flex min-w-0 flex-1 items-center gap-2">
                    <span className="truncate text-xs" style={{ color: "#dc2626" }}>
                        {displayError}
                    </span>
                    {speechSupported ? (
                        <Tooltip title={t("common.retry")}>
                            <Button
                                type="text"
                                size="small"
                                icon={<Mic className="size-3.5" />}
                                onClick={handleRetry}
                                style={{ color: theme.node.muted }}
                            />
                        </Tooltip>
                    ) : null}
                    <Tooltip title={t("common.cancel")}>
                        <Button
                            type="text"
                            size="small"
                            icon={<X className="size-3.5" />}
                            onClick={onCancel}
                            style={{ color: theme.node.muted }}
                        />
                    </Tooltip>
                </div>
            ) : transcribeState === "transcribing" ? (
                <div className="flex items-center gap-2 px-2" style={{ color: theme.node.muted }}>
                    <Spin size="small" />
                    <span className="text-xs">{t("voiceInput.transcribing")}</span>
                </div>
            ) : transcribeState === "done" ? (
                <div className="flex items-center gap-2 px-2" style={{ color: "#16a34a" }}>
                    <Check className="size-4" />
                    <span className="text-xs">{t("voiceInput.done")}</span>
                </div>
            ) : (
                <>
                    <AudioWaveform
                        waveform={waveform}
                        color={theme.accent.primary}
                        height={32}
                        width={160}
                        animated={state === "recording"}
                    />
                    {state === "recording" ? (
                        <span className="font-mono text-xs tabular-nums" style={{ color: theme.node.text }}>
                            {formatDuration(duration)}
                        </span>
                    ) : null}
                    <Tooltip title={t("common.cancel")}>
                        <Button
                            type="text"
                            size="small"
                            icon={<X className="size-3.5" />}
                            onClick={() => {
                                cancelRecording();
                                cancelSpeech();
                                onCancel();
                            }}
                            style={{ color: theme.node.muted }}
                        />
                    </Tooltip>
                    <Tooltip title={t("voiceInput.stop")}>
                        <Button
                            type="text"
                            size="small"
                            icon={<Square className="size-3.5" />}
                            onClick={handleStop}
                            disabled={state !== "recording" || transcribeState !== "idle"}
                            style={{ color: theme.accent.primary }}
                        />
                    </Tooltip>
                </>
            )}
        </div>
    );
}
