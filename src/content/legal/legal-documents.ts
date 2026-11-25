import type { BlogLocale } from "../blog-locales";
import { toTraditionalChinese } from "../../lib/i18n-traditional";
import termsZh from "./yingce-user-agreement.txt?raw";
import privacyZh from "./yingce-privacy-policy.txt?raw";
import termsEn from "./sayaction-terms-en.txt?raw";
import privacyEn from "./sayaction-privacy-en.txt?raw";
import termsJa from "./sayaction-terms-ja.txt?raw";
import privacyJa from "./sayaction-privacy-ja.txt?raw";
import termsKo from "./sayaction-terms-ko.txt?raw";
import privacyKo from "./sayaction-privacy-ko.txt?raw";
import termsEs from "./sayaction-terms-es.txt?raw";
import privacyEs from "./sayaction-privacy-es.txt?raw";
import termsPt from "./sayaction-terms-pt.txt?raw";
import privacyPt from "./sayaction-privacy-pt.txt?raw";

import refundZh from "./yingce-refund-policy.txt?raw";
import refundEn from "./sayaction-refund-en.txt?raw";
import refundJa from "./sayaction-refund-ja.txt?raw";
import refundKo from "./sayaction-refund-ko.txt?raw";
import refundEs from "./sayaction-refund-es.txt?raw";
import refundPt from "./sayaction-refund-pt.txt?raw";
import acceptableUseZh from "./yingce-acceptable-use-policy.txt?raw";
import acceptableUseEn from "./sayaction-acceptable-use-en.txt?raw";
import acceptableUseJa from "./sayaction-acceptable-use-ja.txt?raw";
import acceptableUseKo from "./sayaction-acceptable-use-ko.txt?raw";
import acceptableUseEs from "./sayaction-acceptable-use-es.txt?raw";
import acceptableUsePt from "./sayaction-acceptable-use-pt.txt?raw";

export type LegalDocumentKind = "terms" | "privacy" | "refund" | "acceptable-use";
/** Translations of the same published policy, not new country-specific commitments. */
export const LEGAL_DOCUMENTS: Record<BlogLocale, Record<LegalDocumentKind, string>> = {
    "zh-CN": { terms: termsZh, privacy: privacyZh, refund: refundZh, "acceptable-use": acceptableUseZh },
    "zh-HK": { terms: toTraditionalChinese(termsZh, "zh-HK"), privacy: toTraditionalChinese(privacyZh, "zh-HK"), refund: toTraditionalChinese(refundZh, "zh-HK"), "acceptable-use": toTraditionalChinese(acceptableUseZh, "zh-HK") },
    "zh-TW": { terms: toTraditionalChinese(termsZh, "zh-TW"), privacy: toTraditionalChinese(privacyZh, "zh-TW"), refund: toTraditionalChinese(refundZh, "zh-TW"), "acceptable-use": toTraditionalChinese(acceptableUseZh, "zh-TW") },
    "en-US": { terms: termsEn, privacy: privacyEn, refund: refundEn, "acceptable-use": acceptableUseEn },
    "ja-JP": { terms: termsJa, privacy: privacyJa, refund: refundJa, "acceptable-use": acceptableUseJa },
    "ko-KR": { terms: termsKo, privacy: privacyKo, refund: refundKo, "acceptable-use": acceptableUseKo },
    "es-ES": { terms: termsEs, privacy: privacyEs, refund: refundEs, "acceptable-use": acceptableUseEs },
    "pt-BR": { terms: termsPt, privacy: privacyPt, refund: refundPt, "acceptable-use": acceptableUsePt },
};
