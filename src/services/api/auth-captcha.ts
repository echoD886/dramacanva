import { apiClient, request } from "./request";

export type CaptchaPurpose = "login" | "register" | "register-email" | "reset-email" | "password-reset";
export type CaptchaProof = { id: string; answer: string; token?: string };
export type CaptchaChallenge = { id: string; image: string; expiresAt: string; kind?: "slider" | "turnstile" | "hcaptcha"; siteKey?: string; action?: CaptchaPurpose; pieceImage?: string; pieceY?: number; width?: number; height?: number; pieceSize?: number };

export function issueAuthCaptcha(purpose: CaptchaPurpose, subject: string, signal?: AbortSignal, kind?: "slider") {
    return request<CaptchaChallenge>(apiClient.post("/auth/captcha", { purpose, subject, kind }, { signal }));
}
