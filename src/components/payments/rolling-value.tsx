import { createContext, useContext, useEffect, useRef, useState, type ComponentPropsWithoutRef, type CSSProperties } from "react";
import "./rolling-value.css";

const ReplayContext = createContext(0);

/** Replays decorative digits when entering a card, without remounting checkout state. */
export function RollingValueGroup({ children, ...props }: ComponentPropsWithoutRef<"article">) {
    const [replay, setReplay] = useState(0);
    const repeat = () => setReplay((value) => value + 1);
    return <ReplayContext.Provider value={replay}><article {...props}
        onPointerEnter={(event) => { props.onPointerEnter?.(event); if (event.pointerType !== "touch") repeat(); }}
        onFocusCapture={(event) => { props.onFocusCapture?.(event); if (!event.currentTarget.contains(event.relatedTarget)) repeat(); }}
    >{children}</article></ReplayContext.Provider>;
}

function RollingDigit({ digit, enter, replay, delay }: { digit: number; enter: boolean; replay: string | number; delay: number }) {
    const target = 10 + digit;
    // Server output and reduced-motion users see the correct price immediately.
    const [position, setPosition] = useState({ index: target, animate: false });
    const mounted = useRef(false);
    const previousReplay = useRef(replay);
    // 预渲染和首帧只输出最终数字：否则 SSR 正文里会出现成百上千个“0 1 2 … 9”，爬虫和 AI 读到的定价页全是噪声。
    // 首帧与服务端输出一致，挂载后再换成可滚动的数字轨道。
    const [trackReady, setTrackReady] = useState(false);
    useEffect(() => { setTrackReady(true); }, []);
    useEffect(() => {
        const shouldReplay = (!mounted.current && enter) || previousReplay.current !== replay;
        mounted.current = true;
        previousReplay.current = replay;
        const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
        let first = 0;
        let second = 0;
        const finish = () => {
            cancelAnimationFrame(first); cancelAnimationFrame(second);
            setPosition({ index: target, animate: false });
        };
        const onPreference = () => { if (preference.matches) finish(); };
        preference.addEventListener("change", onPreference);
        if (preference.matches) finish();
        else if (shouldReplay) {
            setPosition({ index: digit, animate: false });
            first = requestAnimationFrame(() => { second = requestAnimationFrame(() => setPosition({ index: target, animate: true })); });
        } else setPosition({ index: target, animate: true });
        return () => { cancelAnimationFrame(first); cancelAnimationFrame(second); preference.removeEventListener("change", onPreference); };
    }, [target, digit, enter, replay]);
    // The hidden sizer gives each slot the final digit's natural width, so a static
    // price reads like normal text ("$1,199.00") instead of fixed 1ch columns.
    const sizer = <span className="sa-rolling-sizer">{digit}</span>;
    if (!trackReady) return <span className="sa-rolling-digit">{sizer}<span key="static" className="sa-rolling-track"><span>{digit}</span></span></span>;
    // A new element (key), not the static span above: reusing it would transition its transform from none
    // (every slot showing "0") to the final digit, spinning every price on each refresh of a prerendered page.
    return <span className="sa-rolling-digit">{sizer}<span key="rail" className="sa-rolling-track" style={{ transform: `translateY(-${(position.index * 1.15).toFixed(2)}em)`, transition: position.animate ? undefined : "none", "--sa-roll-delay": `${delay}ms` } as CSSProperties}>
        {Array.from({ length: 20 }, (_, index) => <span key={index}>{index % 10}</span>)}
    </span></span>;
}

/** Format once upstream: localized currency, decimal separators and the exact
 * accessible value stay intact. Only the clipped visual digits are animated. */
export function RollingValue({ value, animateOnMount = false, rollKey }: { value: string; animateOnMount?: boolean; rollKey?: string | number }) {
    const groupReplay = useContext(ReplayContext);
    const characters = Array.from(value);
    return <span className="sa-rolling-value" data-rolling-value={value}>
        <span className="sa-rolling-readable">{value}</span>
        <span aria-hidden="true" className="sa-rolling-visual">
            {characters.map((character, index) => /[0-9]/.test(character)
                ? <RollingDigit key={`place:${characters.length - index}`} digit={Number(character)} enter={animateOnMount} replay={`${groupReplay}:${rollKey ?? ""}`} delay={Math.min(index * 22, 150)} />
                : <span key={`symbol:${characters.length - index}`} className="sa-rolling-symbol">{character}</span>)}
        </span>
    </span>;
}
