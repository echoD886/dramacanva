import type { BlogLocale } from "../content/blog-locales";

// Owner removed the rebrand bar on 2026-11-13; the date only gates the bar and the one-time workspace notice.
export const REBRAND_EXPIRES_AT = "2026-11-13T00:00:00+08:00";
export const REBRAND_DISMISSED_KEY = "dramacanva.rename.dismissed";
export const REBRAND_WORKSPACE_KEY = "dramacanva.rename.seen";
export const REBRAND_BLOG_SLUG = "say-action-is-now-dramacanva";
export const REBRAND_COPY = {
    "zh-CN": { announcement: "原 isayaction（Say Action），现更名为 DramaCanvas", more: "了解更多", close: "关闭改名公告", formerly: "原", legacyEmail: "原 {email} 仍可使用" },
    "zh-HK": { announcement: "原 isayaction（Say Action），現更名為 DramaCanvas", more: "了解更多", close: "關閉改名公告", formerly: "原", legacyEmail: "原 {email} 仍可使用" },
    "zh-TW": { announcement: "原 isayaction（Say Action），現更名為 DramaCanvas", more: "了解更多", close: "關閉更名公告", formerly: "原", legacyEmail: "原 {email} 仍可使用" },
    "en-US": { announcement: "isayaction (Say Action) is now DramaCanvas", more: "Learn more", close: "Dismiss rebrand announcement", formerly: "Formerly", legacyEmail: "The former {email} still works" },
    "ja-JP": { announcement: "isayaction（Say Action）は DramaCanvas に名称変更しました", more: "詳しく見る", close: "名称変更のお知らせを閉じる", formerly: "旧", legacyEmail: "旧メールアドレス {email} も引き続きご利用いただけます" },
    "ko-KR": { announcement: "isayaction(Say Action)이 DramaCanvas로 이름을 변경했습니다", more: "자세히 보기", close: "이름 변경 안내 닫기", formerly: "이전 도메인:", legacyEmail: "기존 {email}도 계속 사용할 수 있습니다" },
    "es-ES": { announcement: "isayaction (Say Action) ahora se llama DramaCanvas", more: "Más información", close: "Cerrar aviso de cambio de nombre", formerly: "Antes", legacyEmail: "El correo anterior {email} sigue disponible" },
    "pt-BR": { announcement: "isayaction (Say Action) agora se chama DramaCanvas", more: "Saiba mais", close: "Fechar aviso de mudança de nome", formerly: "Antes", legacyEmail: "O e-mail anterior {email} continua disponível" },
} satisfies Record<BlogLocale, { announcement: string; more: string; close: string; formerly: string; legacyEmail: string }>;

export function rebrandActive(now = Date.now()) {
    return now < Date.parse(REBRAND_EXPIRES_AT);
}
