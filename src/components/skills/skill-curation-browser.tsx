import { currentLocaleText as upstreamText } from "@/i18n/current-locale-text";
import { useI18n as upstreamUseI18n } from "@/i18n/use-i18n";
import { useEffect, useState } from "react";
import { Alert, Button, Select, Space } from "antd";
import { getActiveUserScope } from "@/lib/user-scope";
import { getSkillCuration, type SkillCuration } from "@/services/api/skill-curation";
import type { Skill } from "@/services/api/skills";
import { Film, ShoppingBag, Megaphone, Landmark, Palette, Users, Wrench, Shapes } from "lucide-react";

export const curationIconKeys = ["shapes", "film", "shopping-bag", "megaphone", "landmark", "palette", "users", "wrench"];
export const curationIconLabels: Record<string, string> = {
    get shapes() {
        return upstreamText("canvasExtra.batchTable.defaultValue");
    },
    get film() {
        return upstreamText("upstream.v165.message137");
    },
    get "shopping-bag"() {
        return upstreamText("upstream.v165.message138");
    },
    get megaphone() {
        return upstreamText("upstream.v165.message139");
    },
    get landmark() {
        return upstreamText("upstream.v165.message140");
    },
    get palette() {
        return upstreamText("upstream.v165.message141");
    },
    get users() {
        return upstreamText("upstream.v165.message142");
    },
    get wrench() {
        return upstreamText("canvasExtra.focusBar.tools");
    },
};
export function curationIcon(key?: string) {
    return ({ film: Film, "shopping-bag": ShoppingBag, megaphone: Megaphone, landmark: Landmark, palette: Palette, users: Users, wrench: Wrench } as Record<string, typeof Shapes>)[key || ""] || Shapes;
}
/** Only translate shipped defaults; administrator-created names remain user content. */
export function curationRootLabel(root: { id: string; name: string }) {
    const defaults: Record<string, [string, import("@/i18n/messages").MessageKey]> = {
        drama: ["短剧影视", "skillsPage.category.drama"],
        screenplay: ["剧本创作", "skillsPage.category.screenplay"],
        storyboard: ["分镜导演", "skillsPage.category.storyboard"],
        video: ["视频生成", "skillsPage.category.video"],
        ecommerce: ["电商营销", "skillsPage.category.ecommerce"],
        creative: ["创意设计", "skillsPage.category.creative"],
        social: ["社媒内容", "skillsPage.category.social"],
        others: ["其他", "skillsPage.category.others"],
        __unassigned__: ["未归入启用分类", "upstream.unassignedRoot"],
    };
    const entry = defaults[root.id];
    return entry && root.name === entry[0] ? upstreamText(entry[1]) : root.name;
}
export function effectiveCurationRoot(skill: Skill, data: SkillCuration) {
    const id = (!skill.isPrivate && data.rootAssignments?.find((item) => item.skillId === skill.skillId)?.rootId) || skill.tag;
    return data.roots?.some((root) => root.id === id && root.enabled) ? id : "__unassigned__";
}
export function curationQuery(data: SkillCuration | null, value: string) {
    if (!data?.enabled || !value) return {};
    if (value.startsWith("root:")) return { platformRootId: value.slice(5) };
    return value === "__uncategorized__" ? { platformUncategorized: true } : { platformCategoryId: value };
}

export function useSkillCuration(active = true) {
    upstreamUseI18n();
    const scope = getActiveUserScope();
    const [result, setResult] = useState<{ scope: string; data: SkillCuration } | null>(null);
    const [error, setError] = useState("");
    const [reload, setReload] = useState(0);
    useEffect(() => {
        if (!active) return;
        let cancelled = false;
        setError("");
        getSkillCuration()
            .then((data) => {
                if (!cancelled) setResult({ scope, data });
            })
            .catch(() => {
                if (!cancelled) {
                    setResult(null);
                    setError(upstreamText("upstream.v165.message143"));
                }
            });
        const refresh = () => setReload((value) => value + 1);
        window.addEventListener("focus", refresh);
        window.addEventListener("canvas-skills-changed", refresh);
        return () => {
            cancelled = true;
            window.removeEventListener("focus", refresh);
            window.removeEventListener("canvas-skills-changed", refresh);
        };
    }, [active, scope, reload]);
    return { curation: result?.scope === scope ? result.data : null, error, retry: () => setReload((value) => value + 1) };
}

export function matchesCuration(skill: Skill, data: SkillCuration | null, category: string) {
    if (!data?.enabled || !category) return true;
    if (category.startsWith("root:")) return effectiveCurationRoot(skill, data) === category.slice(5);
    const ids = data.assignments.filter((item) => item.skillId === skill.skillId).map((item) => item.categoryId);
    return category === "__uncategorized__" ? ids.length === 0 : ids.includes(category);
}

export function SkillCurationBrowser({ data, value, onChange, error, retry }: { data: SkillCuration | null; value: string; onChange: (value: string) => void; error: string; retry: () => void }) {
    upstreamUseI18n();
    useEffect(() => {
        const valid = value.startsWith("root:") ? data?.roots?.some((root) => root.id === value.slice(5)) : data?.categories.some((item) => item.id === value);
        if ((!data?.enabled || (value && value !== "__uncategorized__" && !valid)) && value) onChange("");
    }, [data, value, onChange]);
    if (error) return <Alert type="warning" title={error} action={<Button onClick={retry}>{upstreamText("mcp.scopesRetry")}</Button>} />;
    if (!data?.enabled) return null;
    return (
        <div className="skill-curation-browser">
            <span className="skill-curation-browser-label">{upstreamText("upstream.v165.message144")}</span>
            <Select
                aria-label={upstreamText("upstream.v165.message144")}
                className="skill-curation-browser-select"
                value={value}
                onChange={onChange}
                popupMatchSelectWidth={false}
                options={[
                    { value: "", label: upstreamText("assets.catAll") },
                    { value: "__uncategorized__", label: upstreamText("upstream.v165.message001") },
                    ...(data.roots || []).map((root) => {
                        const Icon = curationIcon(root.iconKey);
                        return {
                            value: `root:${root.id}`,
                            label: (
                                <Space>
                                    <Icon size={16} />
                                    {curationRootLabel(root)}
                                </Space>
                            ),
                        };
                    }),
                    ...data.categories.map((item) => ({ value: item.id, label: `${((root) => (root ? curationRootLabel(root) : undefined))(data.roots?.find((root) => root.id === item.rootTag)) || upstreamText("assets.factCategory")} / ${item.name}` })),
                ]}
            />
        </div>
    );
}
