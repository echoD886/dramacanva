import { displayedStarterTitle } from "./starter-display-copy";
import type { AppLocale } from "@/i18n/app-locale";
import { translateMessage } from "@/i18n/messages";
import type { CanvasNodeMetadata } from "@/types/canvas";
import { originalShowcaseProjectTitle, localizedShowcaseProjectTitle } from "./showcase-project-titles";

export function showcaseImportedTitle(templateUuid: string, originalTitle: string, locale: AppLocale) {
    const title = localizedShowcaseProjectTitle(templateUuid, originalTitle, locale);
    return translateMessage(locale, "canvasLibrary.importName.project", { title });
}

export function displayedShowcaseProjectTitle(project: { title: string; importSource?: CanvasNodeMetadata["importSource"] }, locale: AppLocale) {
    const source = project.importSource;
    if (source?.provider !== "libtv" || !source.templateUuid) return project.title;
    if (source.starterKey && !source.titleEdited) return displayedStarterTitle(project.title, source.projectUuid, locale);
    if (source.generatedTitle !== undefined) {
        return source.generatedTitle === project.title && source.originalTitle !== undefined
            ? showcaseImportedTitle(source.templateUuid, source.originalTitle, locale) : project.title;
    }
    const original = originalShowcaseProjectTitle(source.templateUuid);
    return original && project.title === `导入 · ${original}`
        ? showcaseImportedTitle(source.templateUuid, original, locale) : project.title;
}
