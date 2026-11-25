import { resolveAppLocale } from "./app-locale";
import { translateMessage, type MessageKey, type MessageValues } from "./messages";

/**
 * 在没有 React 上下文的纯函数里按当前语言取文案。
 *
 * 只能用于交互时刻产生的文本（抛错、校验提示）。模块级常量不得使用：
 * 那会把语言固定在模块加载那一刻，之后切换语言不再生效。
 */
export function currentLocaleText(key: MessageKey, values?: MessageValues) {
    return translateMessage(resolveAppLocale(), key, values);
}
