import { skillPageForPath, type SkillPageContent, type SkillPageIndex, type SkillPage } from "./skill-pages";
import { skillPageLoaders } from "./skill-pages/loaders.generated";

const content = new Map<string, SkillPageContent>();
const pending = new Map<string, Promise<void>>();
const keyFor = (page: SkillPageIndex) => `${page.locale}/${page.slug}`;

export function loadedSkillPage(page: SkillPageIndex): SkillPage | undefined {
    const body = content.get(keyFor(page));
    return body ? { ...page, content: body } : undefined;
}

export function loadSkillPage(path: string): Promise<void> {
    const page = skillPageForPath(path)?.page;
    if (!page) return Promise.resolve();
    const key = keyFor(page);
    if (content.has(key)) return Promise.resolve();
    let request = pending.get(key);
    if (!request) {
        request = skillPageLoaders[key]()
            .then((module) => {
                content.set(key, module.default);
            })
            .finally(() => pending.delete(key));
        pending.set(key, request);
    }
    return request;
}

export function readSkillPage(path: string) {
    const page = skillPageForPath(path)?.page;
    if (!page) return undefined;
    const full = loadedSkillPage(page);
    if (!full) throw loadSkillPage(path);
    return full;
}
