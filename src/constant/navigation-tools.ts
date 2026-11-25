import { currentLocaleText as upstreamText } from "@/i18n/current-locale-text";
import { Blocks, CircleDollarSign, Clapperboard, Images, LibraryBig, ListTodo, PanelsTopLeft, Settings, WandSparkles } from "lucide-react";

export const navigationTools = [
    {
        slug: "inspirations",
        get label() {
            return upstreamText("upstream.v165.message003");
        },
        labelKey: "upstream.inspirations",
        icon: Images,
        section: "创作空间",
    },
    {
        slug: "create",
        get label() {
            return upstreamText("miscPages.navCreate");
        },
        labelKey: "miscPages.navCreate",
        icon: WandSparkles,
        section: "创作空间",
    },
    {
        slug: "projects",
        get label() {
            return upstreamText("nav.drama");
        },
        labelKey: "miscPages.navProjects",
        icon: Clapperboard,
        section: "创作空间",
    },
    {
        slug: "canvas",
        get label() {
            return upstreamText("nav.canvas");
        },
        labelKey: "miscPages.navCanvas",
        icon: PanelsTopLeft,
        section: "创作空间",
    },
    {
        slug: "tasks",
        get label() {
            return upstreamText("miscPages.navTasks");
        },
        labelKey: "miscPages.navTasks",
        icon: ListTodo,
        section: "创作空间",
    },
    {
        slug: "assets",
        get label() {
            return upstreamText("adminAnalytics.colAssets");
        },
        labelKey: "miscPages.navAssets",
        icon: Images,
        section: "创作空间",
    },
    {
        slug: "skills",
        get label() {
            return upstreamText("miscPages.navSkills");
        },
        labelKey: "miscPages.navSkills",
        icon: LibraryBig,
        get section() {
            return upstreamText("nav.workspace");
        },
    },
    {
        slug: "plugins",
        get label() {
            return upstreamText("nav.blender");
        },
        labelKey: "miscPages.navPlugins",
        icon: Blocks,
        get section() {
            return upstreamText("nav.workspace");
        },
    },
    {
        slug: "pricing",
        get label() {
            return upstreamText("miscPages.navPricing");
        },
        labelKey: "miscPages.navPricing",
        icon: CircleDollarSign,
        get section() {
            return upstreamText("nav.workspace");
        },
    },
    {
        slug: "wallet",
        get label() {
            return upstreamText("miscPages.navWalletDetail");
        },
        labelKey: "miscPages.navWalletDetail",
        icon: CircleDollarSign,
        get section() {
            return upstreamText("nav.workspace");
        },
    },
    {
        slug: "settings",
        get label() {
            return upstreamText("nav.settings");
        },
        labelKey: "miscPages.navSettings",
        icon: Settings,
        get section() {
            return upstreamText("nav.workspace");
        },
    },
] as const;
