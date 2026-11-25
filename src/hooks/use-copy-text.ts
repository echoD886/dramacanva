import { App } from "antd";

import { useI18n } from "@/i18n/use-i18n";
import copy from "copy-to-clipboard";

export function useCopyText() {
    const { message } = App.useApp();
    const { t } = useI18n();

    return (value: string, successText?: string) => {
        const text = successText ?? t("miscPages.copied");
        copy(value);
        message.success(text);
    };
}
