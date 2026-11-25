import { memo, type ReactNode } from "react";
import { Plus } from "lucide-react";
import type { AIVideoTemplateQA } from "@/types/ai-video-template";
import { useI18n } from "@/i18n/use-i18n";

type FaqBlockProps = {
    title?: string;
    intro?: ReactNode;
    faq?: AIVideoTemplateQA[];
    id?: string;
};

/** Two-column FAQ: eyebrow + serif heading on the left, quiet accordion on the right. Renders nothing without questions. */
export const FaqBlock = memo(function FaqBlock({ title, intro, faq, id = "faq" }: FaqBlockProps) {
    const { t } = useI18n();
    const items = (faq || []).filter((item) => item.question && item.answer);
    if (items.length === 0) return null;
    return (
        <section className="aivt-split" id={id} aria-labelledby={`${id}-title`}>
            <div className="aivt-split-aside">
                <p className="aivt-eyebrow">{t("aiVideoTemplates.faqEyebrow")}</p>
                <h2 id={`${id}-title`} className="aivt-serif aivt-h2">
                    {title || t("aiVideoTemplates.faqTitle")}
                </h2>
                {intro}
            </div>
            <div className="aivt-faq">
                {items.map((item, idx) => (
                    <details key={idx} className="aivt-faq-item">
                        <summary>
                            <span>{item.question}</span>
                            <Plus className="aivt-faq-icon" aria-hidden="true" />
                        </summary>
                        <p>{item.answer}</p>
                    </details>
                ))}
            </div>
        </section>
    );
});

/** List-page footer: hub/category FAQ from the reviewed directory copy; nothing when absent. */
export const FooterQA = memo(function FooterQA({ faq }: { faq?: AIVideoTemplateQA[] }) {
    return (
        <footer className="aivt-list-footer">
            <FaqBlock faq={faq} id="aivt-directory-faq" />
        </footer>
    );
});
