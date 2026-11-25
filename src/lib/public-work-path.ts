import type { BlogLocale } from "../content/blog-locales";
import publicRoutes from "./public-route-index.generated.json";

const workPaths: Readonly<Record<string, string>> = publicRoutes.workPaths;
const prefixes: Record<BlogLocale, string> = { "zh-CN": "/zh", "zh-HK": "/hk", "zh-TW": "/tw", "en-US": "", "ja-JP": "/ja", "ko-KR": "/ko", "es-ES": "/es", "pt-BR": "/pt" };

export function localizedWorkPath(uuid: string, locale: BlogLocale) {
    const slug = Object.hasOwn(workPaths, uuid) ? workPaths[uuid] : undefined;
    return slug ? `${prefixes[locale]}/works/${slug}` : undefined;
}
