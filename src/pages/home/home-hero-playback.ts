import { useEffect, useState, type RefObject } from "react";
import type { HomeHeroCampaignKey } from "@/i18n/home-messages";

/**
 * Only slides with a real player wait for ended/watchdog instead of the slide timer.
 * 创作主场（byokStudio）首屏也有影片：若仍按 7 秒定时切走，影片还没被允许加载就已离开，首屏永远只剩静图。
 */
export function shouldScheduleHomeHeroAdvance(paused: boolean, campaign?: HomeHeroCampaignKey) {
    return !paused && campaign !== "byokStudio" && campaign !== "siteLaunch" && campaign !== "ranking" && campaign !== "creatorChallenge";
}

type HeroVideo = Pick<HTMLVideoElement, "currentTime" | "ended" | "play" | "pause" | "load" | "readyState" | "addEventListener" | "removeEventListener">;
type Schedule = (callback: () => void, delayMs: number) => () => void;
const playbackOwners = new WeakMap<HeroVideo, symbol>();

const schedule: Schedule = (callback, delayMs) => {
    const timer = setTimeout(callback, delayMs);
    return () => clearTimeout(timer);
};

/** A rejected play(), stalled stream, or late promise must not freeze the carousel. */
export function startHomeHeroPlayback(video: HeroVideo, options: { onUnavailable: () => void; delayMs?: number; stallTimeoutMs?: number }, after: Schedule = schedule) {
    const owner = Symbol();
    playbackOwners.set(video, owner);
    let active = true;
    let lastTime = 0;
    let retriedInitialLoad = false;
    let cancelStart = () => {};
    let cancelWatchdog = () => {};
    const stop = () => {
        active = false;
        cancelStart();
        cancelWatchdog();
        video.removeEventListener("timeupdate", onProgress);
        video.removeEventListener("ended", onEnded);
        video.removeEventListener("stalled", onInitialStall);
        if (playbackOwners.get(video) === owner) {
            playbackOwners.delete(video);
            video.pause();
        }
    };
    const armWatchdog = () => {
        cancelWatchdog();
        cancelWatchdog = after(() => {
            if (!active || video.ended) return;
            stop();
            options.onUnavailable();
        }, options.stallTimeoutMs ?? 8000);
    };
    const onProgress = () => {
        if (!active || video.currentTime === lastTime) return;
        lastTime = video.currentTime;
        armWatchdog();
    };
    const onEnded = () => {
        cancelWatchdog();
    };
    const requestPlay = () => {
        try {
            void Promise.resolve(video.play()).then(
                () => {
                    if (!active && !playbackOwners.has(video)) video.pause();
                },
                () => {
                    // The watchdog leaves the poster/copy visible before advancing.
                },
            );
        } catch {
            // Unusable media can throw synchronously; the same watchdog recovers.
        }
    };
    const onInitialStall = () => {
        if (!active || retriedInitialLoad || video.readyState !== 0 || video.currentTime > 0) return;
        retriedInitialLoad = true;
        try {
            // Retry a cold request once without extending the eight-second watchdog.
            // Never reset an already-playing stream or repeat downloads indefinitely.
            video.load();
            requestPlay();
        } catch {
            /* The existing watchdog still owns recovery. */
        }
    };
    const start = () => {
        if (!active) return;
        armWatchdog();
        try {
            video.currentTime = 0;
        } catch {
            /* Unseekable media still follows normal playback recovery. */
        }
        requestPlay();
    };
    video.addEventListener("timeupdate", onProgress);
    video.addEventListener("ended", onEnded);
    video.addEventListener("stalled", onInitialStall);
    if (options.delayMs) cancelStart = after(start, options.delayMs);
    else start();
    return stop;
}

type NetworkInformationLike = { saveData?: boolean; effectiveType?: string };

/**
 * 横幅影片默认一律加载并自动播放，只尊重访客自己开启的“省流量”（saveData）。
 * 不再按 effectiveType 判断：Chrome 用 RTT 推算网速，跨境访客在快网络上也常被判成 3g/2g，
 * 结果横幅永远只剩静图。
 */
export function homeHeroVideoAllowed(connection: NetworkInformationLike | undefined) {
    return !connection?.saveData;
}

/**
 * 当前轮播影片在首屏画出之后（或页面 load，取较早者）且横幅可见时加载。
 * 只等 load 时，首次访问要等首页下方 30 多张案例封面和低优先级模块全部下完（跨境实测 11 秒以上），
 * 首屏横幅长时间只有底色；首屏关键图片在首帧前就已就位，画出后再请求影片不会和它们争抢。
 */
export function useHomeHeroMediaGate(target: RefObject<HTMLElement | null>) {
    const [pageLoaded, setPageLoaded] = useState(false);
    const [firstFramePainted, setFirstFramePainted] = useState(false);
    // 横幅位于页面顶部，首屏默认可见；影片仍等 load，IntersectionObserver 负责滚走后暂停。
    // 不能默认不可见：后台标签页、部分浏览器首个回调会延迟甚至不触发，影片就一直不加载。
    const [visible, setVisible] = useState(true);
    const [videoAllowed] = useState(() => typeof navigator === "undefined" || homeHeroVideoAllowed((navigator as Navigator & { connection?: NetworkInformationLike }).connection));
    useEffect(() => {
        // 首屏影片只等 load 事件（首屏图片已就位），不再额外等浏览器空闲：
        // 空闲回调最长要再等 4 秒，首张轮播常在影片开始加载前就被切走。
        if (document.readyState === "complete") {
            setPageLoaded(true);
            return;
        }
        const onLoad = () => setPageLoaded(true);
        window.addEventListener("load", onLoad, { once: true });
        return () => window.removeEventListener("load", onLoad);
    }, []);
    useEffect(() => {
        // 两次 rAF：第二个回调运行时，挂载后的首帧已经提交绘制。后台标签页不触发 rAF，仍由 load 兜底。
        let second = 0;
        const first = requestAnimationFrame(() => {
            second = requestAnimationFrame(() => setFirstFramePainted(true));
        });
        return () => {
            cancelAnimationFrame(first);
            cancelAnimationFrame(second);
        };
    }, []);
    useEffect(() => {
        const element = target.current;
        if (!element || typeof IntersectionObserver === "undefined") {
            setVisible(true);
            return;
        }
        const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.2 });
        observer.observe(element);
        return () => observer.disconnect();
    }, [target]);
    return { pageLoaded, videoAllowed, mediaReady: (pageLoaded || firstFramePainted) && visible && videoAllowed };
}
