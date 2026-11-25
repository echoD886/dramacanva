import { useI18n } from "@/i18n/use-i18n";
import type { BlogLocale } from "@/content/blog-locales";
import { LEGACY_SUPPORT_EMAIL, SUPPORT_EMAIL } from "@/lib/site-identity";
import { REBRAND_COPY } from "@/lib/rebrand-announcement";
import "./rebrand-announcement.css";

export function LegacySupportEmail() {
    const { locale } = useI18n();
    const copy = REBRAND_COPY[locale as BlogLocale] || REBRAND_COPY["en-US"];
    const [before, after] = copy.legacyEmail.split("{email}");
    return (
        <span className="dc-legacy-email">
            {before}
            <a href={`mailto:${LEGACY_SUPPORT_EMAIL}`}>{LEGACY_SUPPORT_EMAIL}</a>
            {after}
        </span>
    );
}

export function SupportEmails() {
    return (
        <span>
            <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
            <LegacySupportEmail />
        </span>
    );
}
