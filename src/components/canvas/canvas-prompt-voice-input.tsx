import { App } from "antd";
import { LoaderCircle, Mic, Square, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import { useVoiceRecording } from "@/hooks/use-voice-recording";
import { useI18n } from "@/i18n/use-i18n";
import { promptMicrophoneErrorKey, shouldFallbackPromptSpeech } from "@/lib/canvas/prompt-voice-input";
import { transcribeCanvasPrompt } from "@/services/canvas-prompt-transcription";

type VoiceState = "idle" | "requesting" | "listening" | "recording" | "transcribing" | "failed";

export function CanvasPromptVoiceInput({ disabled, onTranscribed, onBusyChange }: { disabled?: boolean; onTranscribed: (text: string) => void; onBusyChange: (busy: boolean) => void }) {
    const { t, locale } = useI18n();
    const { message } = App.useApp();
    const [state, setState] = useState<VoiceState>("idle");
    const [failure, setFailure] = useState("");
    const session = useRef(0);
    const active = useRef(false);
    const fallback = useRef(false);
    const stopping = useRef(false);
    const abort = useRef<AbortController | null>(null);
    const callbacks = useRef({ onTranscribed, onBusyChange });
    callbacks.current = { onTranscribed, onBusyChange };
    const stopInputRef = useRef<(blob?: Blob | null) => Promise<void>>(async () => {});
    const recording = useVoiceRecording({ onAutoStop: (blob) => void stopInputRef.current(blob) });
    const speech = useSpeechRecognition({
        lang: locale,
        onEnd: (text) => {
            if (active.current && !stopping.current && !fallback.current) finish(text);
        },
    });
    const supported = typeof navigator !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia) && (speech.supported || typeof MediaRecorder !== "undefined");

    const cancel = () => {
        session.current++;
        active.current = false;
        stopping.current = false;
        abort.current?.abort();
        abort.current = null;
        speech.cancel();
        recording.cancel();
        setState("idle");
        callbacks.current.onBusyChange(false);
    };
    const fail = (detail: string) => {
        cancel();
        setFailure(detail);
        setState("failed");
        message.error(detail);
    };
    const finish = (text: string) => {
        if (!active.current) return;
        cancel();
        if (text.trim()) callbacks.current.onTranscribed(text.trim());
        else message.info(t("voiceInput.empty"));
    };
    useEffect(() => {
        if (!speech.error || !active.current) return;
        if (shouldFallbackPromptSpeech(speech.error.code) && typeof MediaRecorder !== "undefined") {
            fallback.current = true;
            speech.cancel();
            if (!stopping.current) setState("recording");
        } else fail(speech.error.message);
    }, [speech.error]);
    useEffect(() => {
        if (disabled && active.current) cancel();
    }, [disabled]);
    useEffect(
        () => () => {
            session.current++;
            abort.current?.abort();
            speech.cancel();
            recording.cancel();
            if (active.current) callbacks.current.onBusyChange(false);
            active.current = false;
        },
        [],
    );

    const stopInput = async (automaticBlob?: Blob | null) => {
        if (!active.current || stopping.current) return;
        const current = session.current;
        stopping.current = true;
        setState("transcribing");
        try {
            const blob = automaticBlob === undefined ? await recording.stop() : automaticBlob;
            const text = fallback.current ? "" : await speech.stop();
            if (current !== session.current) return;
            if (!fallback.current) {
                finish(text);
                return;
            }
            if (!blob?.size) {
                fail(t("voiceInput.empty"));
                return;
            }
            const controller = new AbortController();
            abort.current = controller;
            const transcript = await transcribeCanvasPrompt(blob, locale, controller.signal);
            if (current === session.current) finish(transcript);
        } catch {
            if (current === session.current) fail(t("canvasPrompt.voiceTranscriptionFailed"));
        }
    };
    stopInputRef.current = stopInput;

    const toggle = async () => {
        if (active.current) {
            if (state !== "requesting" && state !== "transcribing") await stopInput();
            return;
        }
        if (!supported) return;
        const current = ++session.current;
        active.current = true;
        stopping.current = false;
        fallback.current = !speech.supported;
        setFailure("");
        callbacks.current.onBusyChange(true);
        setState("requesting");
        try {
            // Request browser microphone permission before contacting the speech service.
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            if (current !== session.current) {
                stream.getTracks().forEach((track) => track.stop());
                return;
            }
            if (typeof MediaRecorder !== "undefined") {
                if (!(await recording.start(stream))) {
                    fail(t("voiceInput.microphone"));
                    return;
                }
            } else stream.getTracks().forEach((track) => track.stop());
            if (current !== session.current) {
                recording.cancel();
                return;
            }
            setState(fallback.current ? "recording" : "listening");
            if (!fallback.current) speech.start();
        } catch (error) {
            if (current === session.current) fail(t(promptMicrophoneErrorKey(error)));
        }
    };
    const status =
        state === "requesting"
            ? t("canvasPrompt.voiceRequesting")
            : state === "transcribing"
              ? t("voiceInput.transcribing")
              : state === "recording"
                ? t("canvasPrompt.voiceRecordingFallback")
                : state === "listening"
                  ? t("canvasPrompt.voiceListening")
                  : state === "failed"
                    ? failure
                    : "";
    const waiting = state === "requesting" || state === "transcribing";
    const label = !supported ? t("canvasPrompt.voiceUnavailable") : active.current ? t("voiceInput.stop") : t("canvasPrompt.voiceInput");
    return (
        <div className="canvas-prompt-voice-input flex shrink-0 items-center gap-1" data-canvas-no-zoom>
            {status ? (
                <span role={state === "failed" ? "alert" : "status"} title={status} className="max-w-36 truncate text-[var(--fs-tiny)]">
                    {status}
                </span>
            ) : null}
            <button type="button" className="canvas-node-composer-icon-button" disabled={disabled || waiting || !supported} aria-pressed={active.current} aria-label={label} title={label} onClick={() => void toggle()}>
                {waiting ? <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" /> : active.current ? <Square className="size-4" /> : <Mic className="size-4" />}
            </button>
            {active.current ? (
                <button type="button" className="canvas-node-composer-icon-button" aria-label={t("canvasPrompt.voiceCancel")} title={t("canvasPrompt.voiceCancel")} onClick={cancel}>
                    <X className="size-3.5" />
                </button>
            ) : null}
        </div>
    );
}
