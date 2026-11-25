// Telemetry is intentionally absent from the public frontend.
export function setAnalyticsUserId(..._args: any[]): any { return undefined; }
export function publicAnalyticsEnabled(..._args: any[]): any { return false; }
export function analyticsReferrer(..._args: any[]): any { return undefined; }
export function initPublicAnalytics(..._args: any[]): any { return undefined; }
export type AuthAnalyticsEvent = "login" | "sign_up" | "sign_up_started";
export type AuthAnalyticsMethod = "email" | "google" | "github" | "microsoft" | "linuxdo";
export type SignupSourceCategory = "direct" | "invite" | "referral" | "utm";
export function trackReferralReceiptTimeout(..._args: any[]): any { return undefined; }
export function trackAuthEvent(..._args: any[]): any { return undefined; }
export function parseOAuthAnalyticsEvent(..._args: any[]): any { return undefined; }
export function consumeOAuthAnalyticsEvent(..._args: any[]): any { return undefined; }
