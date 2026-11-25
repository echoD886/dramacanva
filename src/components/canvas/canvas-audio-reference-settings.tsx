import { Input, Select, Segmented } from "antd";
import { useCallback, useSyncExternalStore } from "react";
import { Pause, Play } from "lucide-react";
import { upstreamText } from "@/i18n/ddcat-updates";
import type { AiConfig } from "@/stores/use-config-store";
import type { CanvasResourceReference } from "@/lib/canvas/canvas-resource-references";
import { filterActiveCanvasAudioVoiceBindings, type CanvasAudioVoiceBinding } from "@/lib/canvas/canvas-audio-voice-bindings";
import { getCanvasAudioPlaybackSnapshot, subscribeCanvasAudioNode, toggleCanvasAudio } from "@/services/canvas-audio-playback";

export function CanvasAudioReferenceSettings({
    config,
    references,
    bindings,
    onBindingsChange,
    onConfigChange,
}: {
    config: AiConfig;
    references: CanvasResourceReference[];
    bindings: CanvasAudioVoiceBinding[];
    onBindingsChange: (bindings: CanvasAudioVoiceBinding[]) => void;
    onConfigChange: (key: "audioMode" | "audioVoice" | "audioFormat" | "audioInstructions", value: string) => void;
}) {
    const audios = references.filter((item) => item.kind === "audio" && item.active);
    const characters = references.filter((item) => item.kind === "character" && item.active);
    const activeBindings = filterActiveCanvasAudioVoiceBindings(bindings, references);
    const mode = config.audioMode || "tts";
    return (
        <div className="flex flex-col gap-3">
            <Segmented
                value={mode}
                aria-label={upstreamText("配音方式")}
                options={[
                    { value: "tts", label: upstreamText("文本朗读") },
                    { value: "unified_edit", label: upstreamText("参考音色配音") },
                ]}
                onChange={(value) => onConfigChange("audioMode", value)}
            />
            {mode === "tts" ? (
                <label>
                    {upstreamText("音色 ID")}
                    <Input aria-label={upstreamText("音色 ID")} value={config.audioVoice === "alloy" ? "" : config.audioVoice} onChange={(event) => onConfigChange("audioVoice", event.target.value)} />
                </label>
            ) : (
                <>
                    {!audios.length ? <p role="status">{upstreamText("全能配音需要连接参考音频")}</p> : audios.map((reference) => <AudioReferencePreview key={reference.id} reference={reference} />)}
                    {characters.map((character) => (
                        <label key={character.nodeId} className="flex flex-col gap-1">
                            {character.title || character.label}
                            <Select
                                aria-label={upstreamText("角色参考音色")}
                                allowClear
                                value={activeBindings.find((item) => item.characterNodeId === character.nodeId)?.audioNodeId}
                                options={audios.map((item) => ({ value: item.nodeId, label: item.title || item.label }))}
                                onChange={(audioNodeId: string | undefined) => onBindingsChange([...activeBindings.filter((item) => item.characterNodeId !== character.nodeId), ...(audioNodeId ? [{ characterNodeId: character.nodeId, audioNodeId }] : [])])}
                            />
                        </label>
                    ))}
                </>
            )}
            <Select aria-label={upstreamText("音频格式")} value={config.audioFormat} options={["mp3", "wav", "ogg_opus", "pcm"].map((value) => ({ value, label: value.toUpperCase() }))} onChange={(value) => onConfigChange("audioFormat", value)} />
        </div>
    );
}

function AudioReferencePreview({ reference }: { reference: CanvasResourceReference }) {
    const subscribe = useCallback((listener: () => void) => subscribeCanvasAudioNode(reference.id, listener), [reference.id]);
    const getSnapshot = useCallback(() => getCanvasAudioPlaybackSnapshot(reference.id), [reference.id]);
    const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
    return (
        <button
            type="button"
            className="flex items-center gap-2 text-sm"
            disabled={snapshot.phase === "loading"}
            onClick={() => void toggleCanvasAudio({ nodeId: reference.id, content: reference.mediaUrl || "", storageKey: reference.storageKey, durationMs: reference.durationMs })}
        >
            {snapshot.phase === "playing" ? <Pause size={16} /> : <Play size={16} />}
            {upstreamText(snapshot.phase === "playing" ? "暂停试听" : "试听参考音频")} · {reference.title || reference.label}
        </button>
    );
}
