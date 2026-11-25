import { CaptchaInterruption, type createAuthCaptchaFlow } from "./auth-captcha-flow";
import type { CaptchaProof, CaptchaPurpose } from "../services/api/auth-captcha";

export function createCaptchaDialogFlow(flow: ReturnType<typeof createAuthCaptchaFlow>, onBusy: (busy: boolean) => void, onRetry: () => void) {
    type Pending = { purpose: CaptchaPurpose; subject: string; action: (proof?: CaptchaProof) => Promise<unknown>; resolve: (value: unknown) => void; reject: (error: unknown) => void };
    let pending: Pending | null = null;
    let busy = false;
    let active = true;
    return {
        run<T>(purpose: CaptchaPurpose, subject: string, action: (proof?: CaptchaProof) => Promise<T>) {
            if (!active || pending || !subject.trim()) return Promise.reject<T>(new CaptchaInterruption("incomplete"));
            return new Promise<T>((resolve, reject) => {
                pending = { purpose, subject, action, resolve: (value) => resolve(value as T), reject };
                void flow.prepare(purpose, subject);
            });
        },
        async confirm(answer: string) {
            const current = pending;
            if (!active || !current || busy) return;
            flow.setAnswer(answer);
            busy = true; onBusy(true);
            try {
                const value = await flow.run(current.purpose, current.subject, current.action);
                if (pending === current) { pending = null; current.resolve(value); }
            } catch (error) {
                if (pending !== current) return;
                if (error instanceof CaptchaInterruption && error.reason !== "cancelled") onRetry();
                else { pending = null; flow.reset(); current.reject(error); }
            } finally { busy = false; if (active) onBusy(false); }
        },
        cancel() {
            if (busy) return;
            const current = pending; pending = null; flow.reset();
            current?.reject(new CaptchaInterruption("cancelled"));
        },
        dispose() {
            active = false;
            const current = pending; pending = null;
            current?.reject(new CaptchaInterruption("cancelled"));
        },
    };
}
