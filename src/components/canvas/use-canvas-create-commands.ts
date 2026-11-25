import { resolveAddNodeMenuCommands, type AddNodeMenuContext } from "@/lib/canvas/tool-registry";
import { toolCatalogText } from "@/lib/canvas/agent-tool-presentation";
import { useI18n } from "@/i18n/use-i18n";
import type { MessageKey } from "@/i18n/messages";
import { usePluginStore } from "@/stores/use-plugin-store";

import type { CanvasCreateCommand } from "./canvas-create-menu";

export function useCanvasCreateCommands(context: AddNodeMenuContext, runCommand?: (command: () => void) => void): CanvasCreateCommand[] {
    const { t } = useI18n();
    const localized = (value: string | undefined) => value && /^(canvasExtra|nodeSearch|canvasCreate|nodeInfo|nodeToolbar|projectLabels|canvasText)\./.test(value) ? t(value as MessageKey) : toolCatalogText(value);
    const installations = usePluginStore((state) => state.installations);
    const pluginStates = usePluginStore((state) => state.pluginStates);
    const enabledPluginIds = new Set(installations.filter((item) => pluginStates[item.manifest.id]?.effectiveEnabled ?? item.enabled).map((item) => item.manifest.id));

    return resolveAddNodeMenuCommands({ ...context, enabledPluginIds }).map((command) => ({
        id: command.id,
        label: localized(command.label)!,
        icon: command.icon,
        badge: localized(command.badge),
        section: command.section,
        onClick: () => {
            const run = () => command.run(context);
            if (runCommand) runCommand(run);
            else run();
        },
    }));
}
