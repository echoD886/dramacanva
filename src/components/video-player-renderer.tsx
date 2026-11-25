import { useEffect, useMemo, useRef, useState } from "react";
import type { ComponentProps } from "react";
import { isVideoProvider, MediaPlayer, MediaProvider, type MediaPlayerInstance, type VideoMimeType } from "@vidstack/react";
import { DefaultVideoLayout, defaultLayoutIcons, type DefaultLayoutTranslations } from "@vidstack/react/player/layouts/default";
import { detectVideoAudioTrack, detectVideoAudioTrackFromUrl } from "@/lib/video-poster";
import { useI18n } from "@/i18n/use-i18n";
import "@vidstack/react/player/styles/base.css";
import "@vidstack/react/player/styles/default/theme.css";
import "@vidstack/react/player/styles/default/layouts/video.css";
import "./video-player.css";

type MediaPlayerProps = ComponentProps<typeof MediaPlayer>;

type VideoPlayerProps = {
    src: string;
    poster?: string;
    mimeType?: string;
    title?: string;
    className?: string;
    brandColor?: string;
    preload?: MediaPlayerProps["preload"];
    autoPlay?: boolean;
    dataCanvasNoZoom?: boolean;
    compactControls?: boolean;
    /** Explicitly marks videos known to have an audio track (or not). */
    hasAudio?: boolean;
    onCanPlay?: MediaPlayerProps["onCanPlay"];
    onPlay?: MediaPlayerProps["onPlay"];
};

type StrictT = (key: Parameters<ReturnType<typeof useI18n>["t"]>[0], values?: Record<string, string | number>) => string;

const translationKeys = {
    Accessibility: "canvasExtra.player.accessibility",
    AirPlay: "canvasExtra.player.airPlay",
    Audio: "canvasExtra.player.audio",
    Auto: "canvasExtra.player.auto",
    Boost: "canvasExtra.player.boost",
    Captions: "canvasExtra.player.captions",
    "Caption Styles": "canvasExtra.player.captionStyles",
    Chapters: "canvasExtra.player.chapters",
    "Closed-Captions Off": "canvasExtra.player.ccOff",
    "Closed-Captions On": "canvasExtra.player.ccOn",
    Connected: "canvasExtra.player.connected",
    Connecting: "canvasExtra.player.connecting",
    Default: "canvasExtra.player.default",
    Disabled: "canvasExtra.player.disabled",
    Disconnected: "canvasExtra.player.disconnected",
    Download: "canvasExtra.player.download",
    "Enter Fullscreen": "canvasExtra.player.enterFullscreen",
    "Enter PiP": "canvasExtra.player.enterPip",
    "Exit Fullscreen": "canvasExtra.player.exitFullscreen",
    "Exit PiP": "canvasExtra.player.exitPip",
    Fullscreen: "canvasExtra.player.fullscreen",
    Loop: "canvasExtra.player.loop",
    Mute: "canvasExtra.player.mute",
    Normal: "canvasExtra.player.normal",
    Off: "canvasExtra.player.off",
    Pause: "canvasExtra.player.pause",
    Play: "canvasExtra.player.play",
    Playback: "canvasExtra.player.playback",
    PiP: "canvasExtra.player.pip",
    Quality: "canvasExtra.player.quality",
    Replay: "canvasExtra.player.replay",
    Reset: "canvasExtra.player.reset",
    Seek: "canvasExtra.player.seek",
    "Seek Backward": "canvasExtra.player.seekBackward",
    "Seek Forward": "canvasExtra.player.seekForward",
    Settings: "canvasExtra.player.settings",
    Speed: "canvasExtra.player.speed",
    Unmute: "canvasExtra.player.unmute",
    Volume: "canvasExtra.player.volume",
} satisfies Partial<Record<keyof DefaultLayoutTranslations, string>>;

function buildTranslations(t: StrictT) {
    const result: Partial<DefaultLayoutTranslations> = {};
    for (const [label, key] of Object.entries(translationKeys)) {
        result[label as keyof DefaultLayoutTranslations] = t(key as Parameters<StrictT>[0]);
    }
    return result;
}

const supportedVideoMimeTypes = new Set<VideoMimeType>(["video/mp4", "video/webm", "video/3gp", "video/ogg", "video/avi", "video/mpeg", "video/object"]);

/**
 * 统一视频播放表面，保留原生媒体 URL 契约，同时提供可访问的完整控件布局。
 * 画布节点需要隔离播放器手势，避免拖动进度条时被误判为拖动画布。
 */
export function VideoPlayer({ src, poster, mimeType, title, className, brandColor = "#f5f5f5", preload = "metadata", autoPlay = false, dataCanvasNoZoom = false, compactControls = false, hasAudio, onCanPlay, onPlay }: VideoPlayerProps) {
    const { t } = useI18n();
    const [detectedHasAudio, setDetectedHasAudio] = useState<boolean | undefined>(undefined);
    const autoPlayAttemptedRef = useRef(false);
    const audioProbeGenerationRef = useRef(0);
    const mediaPlayerRef = useRef<MediaPlayerInstance>(null);
    // Match LibTV's conservative rule: only explicit/container-confirmed
    // silence mutes the player. Runtime probes are used to confirm audio and
    // correct stale persisted `false`, but a negative/unknown probe never
    // forces an otherwise-unknown video into the muted state.
    // A conclusive container probe wins over stale persisted metadata in
    // either direction. Browser runtime probes remain conservative when they
    // cannot expose an audio-track list.
    const effectiveHasAudio = detectedHasAudio === false ? false : hasAudio === true || detectedHasAudio === true ? true : hasAudio === false ? false : undefined;
    const noAudio = effectiveHasAudio === false;
    const resolvedTitle = title ?? t("canvasExtra.player.title");
    const translations = useMemo(() => buildTranslations(t), [t]);
    const layoutIcons = useMemo(() => {
        if (!noAudio) return defaultLayoutIcons;
        // Vidstack chooses the volume icon from its internal media state. That
        // state can briefly lag behind an explicit `hasAudio: false` prop, so
        // keep all volume variants visually muted for known silent videos.
        return {
            ...defaultLayoutIcons,
            MuteButton: {
                ...defaultLayoutIcons.MuteButton,
                VolumeLow: defaultLayoutIcons.MuteButton.Mute,
                VolumeHigh: defaultLayoutIcons.MuteButton.Mute,
            },
        };
    }, [noAudio]);

    useEffect(() => {
        setDetectedHasAudio(undefined);
        autoPlayAttemptedRef.current = false;
        audioProbeGenerationRef.current += 1;
    }, [src]);

    useEffect(() => {
        const player = mediaPlayerRef.current?.el;
        if (!player) return;
        // Vidstack exposes these controls as custom elements. Setting their
        // disabled state after layout creation keeps both pointer and keyboard
        // access consistent when an audio-track probe resolves asynchronously.
        const muteButton = player.querySelector<HTMLButtonElement>(".vds-mute-button");
        if (muteButton) {
            muteButton.disabled = noAudio;
            muteButton.setAttribute("aria-disabled", String(noAudio));
        }
        const volumeSlider = player.querySelector<HTMLElement>(".vds-volume-slider");
        if (volumeSlider) {
            volumeSlider.setAttribute("aria-disabled", String(noAudio));
        }
    }, [noAudio]);

    const probeRemoteAudioTrack = () => {
        if (hasAudio === false) return;
        const generation = audioProbeGenerationRef.current;
        void detectVideoAudioTrackFromUrl(src).then((detected) => {
            if (generation === audioProbeGenerationRef.current && detected !== undefined) setDetectedHasAudio(detected);
        });
    };

    const stopCanvasControlInteraction = (event: { target: EventTarget | null; nativeEvent?: Event; stopPropagation: () => void; preventDefault?: () => void }) => {
        if (!isPlayerControlEvent(event)) return;
        if (noAudio && isVolumeControlEvent(event)) {
            event.preventDefault?.();
            event.stopPropagation();
            return;
        }
        if (dataCanvasNoZoom) event.stopPropagation();
    };
    const stopCanvasControlClick = (event: React.MouseEvent) => {
        if (!isPlayerControlEvent(event)) return;
        if (noAudio && isVolumeControlEvent(event)) {
            event.preventDefault();
            event.stopPropagation();
            return;
        }
        if (dataCanvasNoZoom) event.stopPropagation();
    };
    const type = mimeType && supportedVideoMimeTypes.has(mimeType as VideoMimeType) ? (mimeType as VideoMimeType) : "video/mp4";
    const mediaSource = useMemo(() => ({ src, type }), [src, type]);
    const handleCanPlay = (detail: Parameters<NonNullable<MediaPlayerProps["onCanPlay"]>>[0], event: Parameters<NonNullable<MediaPlayerProps["onCanPlay"]>>[1]) => {
        const provider = event.target.provider;
        const media = isVideoProvider(provider) ? provider.media : undefined;
        const detected = media ? detectVideoAudioTrack(media) : undefined;
        if (detected !== undefined) setDetectedHasAudio(detected);
        else probeRemoteAudioTrack();
        // `canplay` may fire again after buffering or seeking. Only the first
        // event may satisfy the activation autoplay intent; later events must
        // not override a user pause.
        if (autoPlay && !autoPlayAttemptedRef.current) {
            autoPlayAttemptedRef.current = true;
            void event.target.play().catch(() => undefined);
        }
        onCanPlay?.(detail, event);
    };

    return (
        <MediaPlayer
            className={`canvas-video-player ${compactControls ? "canvas-video-player-compact" : ""} ${className || ""}`}
            data-player-variant={compactControls ? "compact" : "dialog"}
            ref={mediaPlayerRef}
            src={mediaSource}
            poster={poster}
            title={resolvedTitle}
            viewType="video"
            streamType="on-demand"
            playsInline
            autoPlay={autoPlay}
            muted={noAudio ? true : undefined}
            load="eager"
            preload={preload}
            data-canvas-no-zoom={dataCanvasNoZoom ? "true" : undefined}
            data-no-audio={noAudio ? "true" : undefined}
            style={{ "--video-brand": brandColor }}
            onCanPlay={handleCanPlay}
            onPlay={onPlay}
            onLoadedMetadata={(event) => {
                const provider = event.target.provider;
                const media = isVideoProvider(provider) ? provider.media : undefined;
                const detected = media ? detectVideoAudioTrack(media) : undefined;
                if (detected !== undefined) setDetectedHasAudio(detected);
                else probeRemoteAudioTrack();
            }}
            onLoadedData={(event) => {
                const provider = event.target.provider;
                const media = isVideoProvider(provider) ? provider.media : undefined;
                const detected = media ? detectVideoAudioTrack(media) : undefined;
                if (detected !== undefined) setDetectedHasAudio(detected);
                else probeRemoteAudioTrack();
            }}
            onPointerDown={stopCanvasControlInteraction}
            onMouseDown={stopCanvasControlInteraction}
            onClick={stopCanvasControlClick}
            onKeyDown={stopCanvasControlInteraction}
        >
            <MediaProvider />
            <DefaultVideoLayout
                icons={layoutIcons}
                translations={translations}
                // Canvas controls use one stable DOM arrangement regardless
                // of the node's aspect ratio. Without this override Vidstack
                // swaps between its small and large layouts as the node is
                // resized, moving the same icons to different groups.
                smallLayoutWhen={compactControls ? true : undefined}
                // The canvas selects and mounts a player from the node's
                // pointer event. Vidstack's default pointerup gesture can
                // otherwise toggle the freshly mounted player a second time,
                // causing the intermittent play-then-pause-at-zero bug.
                noGestures={dataCanvasNoZoom}
                slots={{
                    // 节点外部已经显示标题，播放器内不再重复渲染章节标题和设置菜单。
                    chapterTitle: null,
                    settingsMenu: null,
                }}
            />
        </MediaPlayer>
    );
}

function isPlayerControlEvent(event: { target: EventTarget | null; nativeEvent?: Event }) {
    if (event.target instanceof Element && event.target.closest(".vds-controls,.vds-menu-items")) return true;
    return event.nativeEvent?.composedPath?.().some((item) => item instanceof Element && Boolean(item.closest(".vds-controls,.vds-menu-items"))) || false;
}

function isVolumeControlEvent(event: { target: EventTarget | null; nativeEvent?: Event }) {
    if (event.target instanceof Element && event.target.closest(".vds-volume,.vds-mute-button,.vds-volume-slider")) return true;
    return event.nativeEvent?.composedPath?.().some((item) => item instanceof Element && Boolean(item.closest(".vds-volume,.vds-mute-button,.vds-volume-slider"))) || false;
}
