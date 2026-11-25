import type { CaptchaChallenge, CaptchaProof, CaptchaPurpose } from "../services/api/auth-captcha";

export type CaptchaState = { purpose: CaptchaPurpose; subject: string; challenge?: CaptchaChallenge; answer: string; loading: boolean; failed: boolean } | null;
export class CaptchaInterruption extends Error {
    constructor(readonly reason: "required" | "unavailable" | "incomplete" | "cancelled") {
        super(reason);
    }
}
type Issue = (purpose: CaptchaPurpose, subject: string, signal: AbortSignal) => Promise<CaptchaChallenge>;
const normalized = (value: string) => value.trim().toLowerCase();

// Never automatically replay a credential write: after issuing a new image the
// user must explicitly submit again. Late requests cannot replace fresh images.
export function createAuthCaptchaFlow(issue: Issue, notify: (state: CaptchaState) => void, now = Date.now, requireBeforeSubmit = false) {
    let state: CaptchaState = null;
    let generation = 0;
    let active = true;
    let submitting = false;
    let controller: AbortController | undefined;
    const publish = (value: CaptchaState) => {
        state = value;
        if (active) notify(value);
    };
    async function refresh(purpose: CaptchaPurpose, rawSubject: string) {
        const subject = normalized(rawSubject);
        const ticket = ++generation;
        controller?.abort();
        controller = new AbortController();
        publish({ purpose, subject, answer: "", loading: true, failed: false });
        try {
            const challenge = await issue(purpose, subject, controller.signal);
            if (!/^[A-Za-z0-9_-]{43}$/.test(challenge.id) || !(Date.parse(challenge.expiresAt) > now()))
                throw new Error("Invalid challenge response");
            if (challenge.kind === "turnstile" || challenge.kind === "hcaptcha") {
                if (!/^[A-Za-z0-9_-]{20,100}$/.test(challenge.siteKey ?? "") || challenge.action !== purpose) throw new Error("Invalid provider challenge");
            } else {
                if (!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(challenge.image) || challenge.image.length > 100_000) throw new Error("Invalid challenge image");
                if (challenge.kind && (challenge.kind !== "slider" || challenge.width !== 320 || challenge.height !== 180 || challenge.pieceSize !== 52 || !Number.isInteger(challenge.pieceY) || challenge.pieceY! < 0 || challenge.pieceY! > 128 || !/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(challenge.pieceImage ?? "") || challenge.pieceImage!.length > 100_000)) throw new Error("Invalid puzzle response");
            }
            if (active && ticket === generation) publish({ purpose, subject, challenge, answer: "", loading: false, failed: false });
        } catch {
            if (active && ticket === generation) publish({ purpose, subject, answer: "", loading: false, failed: true });
        }
    }
    return {
        getState: () => state,
        reset() { generation++; controller?.abort(); publish(null); },
        async prepare(purpose: CaptchaPurpose, rawSubject: string) {
            const subject = normalized(rawSubject);
            if (!active || submitting || !subject) return;
            if (state?.purpose === purpose && state.subject === subject) return;
            await refresh(purpose, subject);
        },
        setAnswer(answer: string) {
            if (state) publish({ ...state, answer: state.challenge?.kind === "turnstile" || state.challenge?.kind === "hcaptcha" ? answer.slice(0, 4096) : answer.replace(/\D/g, "").slice(0, 6) });
        },
        imageFailed(id: string) {
            if (state?.challenge?.id === id) publish({ ...state, challenge: undefined, answer: "", failed: true, loading: false });
        },
        async retry() {
            if (state && !state.loading && !submitting) await refresh(state.purpose, state.subject);
        },
        dispose() {
            active = false;
            generation++;
            controller?.abort();
        },
        async run<T>(purpose: CaptchaPurpose, rawSubject: string, action: (proof?: CaptchaProof) => Promise<T>): Promise<T> {
            if (submitting || !active) throw new CaptchaInterruption("incomplete");
            const subject = normalized(rawSubject);
            if (!state && requireBeforeSubmit) {
                await refresh(purpose, subject);
                throw new CaptchaInterruption((state as CaptchaState)?.failed ? "unavailable" : "required");
            }
            let proof: CaptchaProof | undefined;
            if (state) {
                if (state.purpose !== purpose || state.subject !== subject || !state.challenge || Date.parse(state.challenge.expiresAt) <= now()) {
                    await refresh(purpose, subject);
                    throw new CaptchaInterruption(state?.failed ? "unavailable" : "required");
                }
                const complete = state.challenge.kind === "turnstile" || state.challenge.kind === "hcaptcha" ? state.answer.length > 0 : state.challenge.kind === "slider" ? /^(0|[1-9]\d{0,2})$/.test(state.answer) && Number(state.answer) <= 268 : state.answer.length === 6;
                if (state.loading || !complete) throw new CaptchaInterruption("incomplete");
                proof = state.challenge.kind === "turnstile" || state.challenge.kind === "hcaptcha" ? { id: state.challenge.id, answer: "", token: state.answer } : { id: state.challenge.id, answer: state.answer };
            }
            submitting = true;
            try {
                const result = await action(proof);
                generation++;
                controller?.abort();
                publish(null);
                return result;
            } catch (error) {
                const required = typeof error === "object" && error !== null && ((error as { status?: number }).status === 428 || (error as { code?: number }).code === 428);
                if (required || proof) await refresh(purpose, subject);
                if (required) throw new CaptchaInterruption(state?.failed ? "unavailable" : "required");
                throw error;
            } finally {
                submitting = false;
            }
        },
    };
}
