import { useCallback, useEffect, useRef, useState } from "react";

export type VoiceRecordingState = "idle" | "recording" | "paused";

type UseVoiceRecordingOptions = {
    /** 最大录音时长（秒），默认 60 秒 */
    maxDuration?: number;
    onAutoStop?: (blob: Blob | null) => void;
};

export type UseVoiceRecordingReturn = {
    state: VoiceRecordingState;
    waveform: number[];
    duration: number;
    error: string | null;
    start: (stream?: MediaStream) => Promise<boolean>;
    stop: () => Promise<Blob | null>;
    cancel: () => void;
    reset: () => void;
};

/**
 * 语音录制 Hook
 * 使用 MediaRecorder API 录制音频，AnalyserNode 获取实时波形数据
 */
export function useVoiceRecording(options: UseVoiceRecordingOptions = {}): UseVoiceRecordingReturn {
    const { maxDuration = 60 } = options;
    const autoStopRef = useRef(options.onAutoStop);
    autoStopRef.current = options.onAutoStop;
    const [state, setState] = useState<VoiceRecordingState>("idle");
    const [waveform, setWaveform] = useState<number[]>([]);
    const [duration, setDuration] = useState(0);
    const [error, setError] = useState<string | null>(null);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const animationFrameRef = useRef<number | null>(null);
    const timerRef = useRef<number | null>(null);
    const startTimeRef = useRef<number>(0);
    const generationRef = useRef(0);
    const stopResolveRef = useRef<((blob: Blob | null) => void) | null>(null);
    const autoStoppingRef = useRef(false);

    // 清理资源
    const cleanup = useCallback(() => {
        const recorder = mediaRecorderRef.current;
        if (recorder) {
            recorder.ondataavailable = null;
            recorder.onstop = null;
            if (recorder.state !== "inactive") recorder.stop();
        }
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
        }
        if (timerRef.current) {
            window.clearInterval(timerRef.current);
            timerRef.current = null;
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
        }
        if (audioContextRef.current) {
            void audioContextRef.current.close();
            audioContextRef.current = null;
        }
        analyserRef.current = null;
        mediaRecorderRef.current = null;
    }, []);

    // 更新波形数据
    const updateWaveform = useCallback(() => {
        const analyser = analyserRef.current;
        if (!analyser) return;

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyser.getByteFrequencyData(dataArray);

        // 取 32 个频段的平均值，用于波形显示
        const step = Math.floor(bufferLength / 32);
        const values: number[] = [];
        for (let i = 0; i < 32; i++) {
            let sum = 0;
            for (let j = 0; j < step; j++) {
                sum += dataArray[i * step + j];
            }
            values.push(sum / step / 255);
        }
        setWaveform(values);

        animationFrameRef.current = requestAnimationFrame(updateWaveform);
    }, []);

    // 开始录制
    const start = useCallback(
        async (grantedStream?: MediaStream) => {
            const generation = ++generationRef.current;
            setError(null);
            setWaveform([]);
            setDuration(0);
            chunksRef.current = [];
            autoStoppingRef.current = false;

            try {
                const stream = grantedStream || (await navigator.mediaDevices.getUserMedia({ audio: true }));
                if (generation !== generationRef.current) {
                    stream.getTracks().forEach((track) => track.stop());
                    return false;
                }
                streamRef.current = stream;

                const audioContext = new AudioContext();
                audioContextRef.current = audioContext;

                const source = audioContext.createMediaStreamSource(stream);
                const analyser = audioContext.createAnalyser();
                analyser.fftSize = 256;
                source.connect(analyser);
                analyserRef.current = analyser;

                const mediaRecorder = new MediaRecorder(stream);
                mediaRecorderRef.current = mediaRecorder;

                mediaRecorder.ondataavailable = (event) => {
                    if (event.data.size > 0) {
                        chunksRef.current.push(event.data);
                    }
                };
                mediaRecorder.onstop = () => {
                    const blob = chunksRef.current.length ? new Blob(chunksRef.current, { type: mediaRecorder.mimeType || chunksRef.current[0].type }) : null;
                    const resolve = stopResolveRef.current;
                    stopResolveRef.current = null;
                    const automatic = autoStoppingRef.current;
                    cleanup();
                    setState("idle");
                    resolve?.(blob);
                    if (automatic) autoStopRef.current?.(blob);
                };

                mediaRecorder.start(100);
                startTimeRef.current = Date.now();
                setState("recording");

                // 启动波形更新
                animationFrameRef.current = requestAnimationFrame(updateWaveform);

                // 启动计时器
                timerRef.current = window.setInterval(() => {
                    const elapsed = (Date.now() - startTimeRef.current) / 1000;
                    setDuration(elapsed);
                    if (elapsed >= maxDuration) {
                        // 达到最大时长，自动停止
                        if (mediaRecorder.state !== "inactive") {
                            autoStoppingRef.current = true;
                            mediaRecorder.stop();
                        }
                    }
                }, 100);
                return true;
            } catch (err) {
                const message = err instanceof Error && err.message ? err.message : "MICROPHONE_UNAVAILABLE";
                setError(message);
                setState("idle");
                cleanup();
                return false;
            }
        },
        [cleanup, maxDuration, updateWaveform],
    );

    // 停止录制
    const stop = useCallback((): Promise<Blob | null> => {
        return new Promise((resolve) => {
            const mediaRecorder = mediaRecorderRef.current;
            if (!mediaRecorder || mediaRecorder.state === "inactive") {
                cleanup();
                setState("idle");
                resolve(null);
                return;
            }

            stopResolveRef.current = resolve;
            mediaRecorder.stop();
        });
    }, [cleanup]);

    // 取消录制
    const cancel = useCallback(() => {
        generationRef.current++;
        stopResolveRef.current?.(null);
        stopResolveRef.current = null;
        chunksRef.current = [];
        cleanup();
        setState("idle");
        setWaveform([]);
        setDuration(0);
    }, [cleanup]);

    // 重置
    const reset = useCallback(() => {
        cancel();
        setError(null);
    }, [cancel]);

    // 组件卸载时清理
    useEffect(() => {
        return cancel;
    }, [cancel]);

    return {
        state,
        waveform,
        duration,
        error,
        start,
        stop,
        cancel,
        reset,
    };
}
