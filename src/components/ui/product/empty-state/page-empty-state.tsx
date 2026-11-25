import { Button, type EmptyProps } from "antd";
import { useI18n } from "@/i18n/use-i18n";
import { EmptyState } from "./empty-state";

/** Page migration boundary: preserves existing descriptions and actions while
 * sharing the token-based empty illustration across legacy AntD callers. */
export function PageEmptyState({ description, children, className, style }: EmptyProps) {
    const { t } = useI18n();
    return <EmptyState className={className} style={style} description={description === undefined ? t("emptyState.noData") : description} action={children || <Button onClick={() => window.location.reload()}>{t("common.reload")}</Button>} />;
}
PageEmptyState.PRESENTED_IMAGE_SIMPLE = null;
