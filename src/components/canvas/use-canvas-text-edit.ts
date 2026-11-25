import { useEffect, useRef, useState } from "react";
import { finishCanvasTextEdit, queueCanvasTextEdit } from "@/services/canvas-text-edits";

/** Keep the active editing transaction local while saves/tasks publish older props. */
export function useCanvasTextEdit(value: string, onChange: (value: string) => void, batch = false) {
    const session = useRef<{ value: string; dirty: boolean } | null>(null);
    const [draft, setDraft] = useState<string | null>(null);
    const latest = useRef(onChange);
    latest.current = onChange;
    const buffered = useRef<string | null>(null);
    const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const flush = useRef(() => {
        if (timer.current !== undefined) clearTimeout(timer.current);
        timer.current = undefined;
        const next = buffered.current;
        if (next === null) return;
        latest.current(next);
        buffered.current = null;
        finishCanvasTextEdit(flush.current);
    });
    useEffect(() => () => {
        if (timer.current !== undefined) clearTimeout(timer.current);
        buffered.current = null;
        finishCanvasTextEdit(flush.current);
    }, []);

    const begin = () => {
        if (session.current) return;
        session.current = { value, dirty: false };
        setDraft(value);
    };
    const change = (next: string) => {
        if (batch && !session.current) begin();
        if (session.current) {
            session.current = { value: next, dirty: true };
            setDraft(next);
        }
        if (batch) {
            buffered.current = next;
            queueCanvasTextEdit(flush.current);
            // A bounded batch, not a reset-on-every-key debounce: continuous input
            // still reaches persistence, while the focused cell paints every key.
            if (timer.current === undefined) timer.current = setTimeout(flush.current, 120);
        } else onChange(next);
    };
    const end = () => {
        const hadBuffered = buffered.current !== null;
        flush.current();
        const edited = session.current;
        session.current = null;
        setDraft(null);
        // Reconcile only at the user event boundary, never from a prop-change effect.
        if (!hadBuffered && edited?.dirty && edited.value !== value) onChange(edited.value);
    };
    return {
        value: session.current?.dirty ? draft ?? value : value,
        onFocus: begin,
        onChange: change,
        onBlur: end,
        onCompositionStart: () => {
            begin();
            if (!session.current!.dirty) {
                session.current!.value = value;
                setDraft(value);
            }
            session.current!.dirty = true;
        },
    };
}
