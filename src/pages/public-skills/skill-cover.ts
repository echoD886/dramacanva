import { skillCoverByID } from "../skills/skill-purpose";
import type { SkillPage } from "../../content/skill-pages";

// Use the existing library's purpose covers and category fallback assets.
export function publicSkillCover(page: Pick<SkillPage, "id" | "tag">) {
    const defaults: Record<string, string> = { drama: "drama", ecommerce: "commercial", creative: "motion", social: "social", storyboard: "storyboard", video: "image-video-shot", others: "research" };
    return skillCoverByID[page.id] || `/images/skills/skill-cover-${defaults[page.tag] || defaults.others}.jpg`;
}
