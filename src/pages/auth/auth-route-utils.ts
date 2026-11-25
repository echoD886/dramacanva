export const AUTH_DRAG_THRESHOLD = 0.94;

export type LoginValidationError = {
    field: "username" | "password";
};

export { safeInternalAuthReturn as safeAuthNext } from "@/lib/auth-return-path";

export function authCountdownRemaining(expiresAt: number, now = Date.now()) {
    if (expiresAt <= now) return 0;
    return Math.ceil((expiresAt - now) / 1000);
}

export function authDragProgress(deltaX: number, travel: number) {
    if (travel <= 0) return 0;
    return Math.min(1, Math.max(0, deltaX / travel));
}

export function authDragShouldSubmit(progress: number) {
    return progress >= AUTH_DRAG_THRESHOLD;
}

export function loginValidationError(username: string, password: string): LoginValidationError | null {
    if (!username.trim()) return { field: "username" };
    if (!password) return { field: "password" };
    return null;
}
