import { useMemo, useState, type ComponentProps } from "react";
import { Button, Dropdown, type MenuProps } from "antd";
import { MoreHorizontal } from "lucide-react";
import type { CanvasDirectorNodePanel } from "./canvas-director-node-panel";
import { CanvasPrevisNodePanel } from "../previs/canvas-previs-node-panel";
import { directorSceneForShot, savedWorldEngineShot } from "@/lib/canvas/director/director-shot-state";
import { useWorldEngineTranslation } from "@/i18n/world-engine-text";
import { useI18n } from "@/i18n/use-i18n";
import type { DirectorScene } from "@/types/director";

/** Keep production connections while the node preview uses the world document. */
type PanelProps = ComponentProps<typeof CanvasDirectorNodePanel>;
export function WorldEngineNodePanel(props: PanelProps & { getConnectionTargets?: () => NonNullable<PanelProps["connectionTargets"]>; onScheduleThumbnail?: (nodeId: string, scene: DirectorScene, shotId: string) => void }) {
    const { t } = useI18n();
    const { t: worldText } = useWorldEngineTranslation();
    const scene = useMemo(() => {
        if (!props.scene) return null;
        const shotId = props.node.metadata?.directorShotId || props.scene.activeShotId;
        return savedWorldEngineShot(props.scene, shotId) || directorSceneForShot(props.scene, shotId);
    }, [props.scene, props.node.metadata?.directorShotId]);

    const { onScheduleThumbnail: onScheduleThumbnailProp, ...restProps } = props;
    const shotId = props.node.metadata?.directorShotId || props.scene?.activeShotId;
    const handleScheduleThumbnail = useMemo(() => {
        if (!onScheduleThumbnailProp || !props.scene || !shotId) return undefined;
        const nodeId = props.node.id;
        const directorScene = props.scene;
        return () => onScheduleThumbnailProp(nodeId, directorScene, shotId);
    }, [onScheduleThumbnailProp, props.scene, props.node.id, shotId]);
    const [menuOpen, setMenuOpen] = useState(false);
    const targets = menuOpen ? (props.getConnectionTargets?.() ?? props.connectionTargets ?? []) : [];
    const items: MenuProps["items"] = [];
    if (props.scene && props.scene.shots.length > 1 && props.onSelectShot) {
        items.push({ key: "shots", label: worldText("切换镜头"), children: props.scene.shots.map((shot) => ({ key: shot.id, label: worldText(shot.name), onClick: () => props.onSelectShot?.(shot.id) })) });
    }
    if (props.onSync && props.node.metadata?.directorSourceStoryboardRowId) {
        items.push({ key: "sync", label: t("directorD4.sync"), onClick: props.onSync });
    }
    if (props.onConnect) {
        items.push({ key: "connect", label: t("canvasDirector.connect"), disabled: !targets.length, children: targets.map((target, index) => ({ key: `target-${index}`, label: target.label, onClick: () => props.onConnect?.(target) })) });
    }
    return (
        <div className="flex h-full w-full min-h-0 min-w-0 flex-col" data-world-engine-node>
            <div className="min-h-0 flex-1">
                <CanvasPrevisNodePanel {...restProps} scene={scene} onOpen={() => props.onOpen()} onScheduleThumbnail={handleScheduleThumbnail} />
            </div>
            <div className="flex items-center gap-2 px-3 pb-3 pt-1" onMouseDown={(event) => event.stopPropagation()} onPointerDown={(event) => event.stopPropagation()}>
                {props.onGenerate ? (
                    <Button size="small" type="primary" className="min-w-0 flex-1" onClick={props.onGenerate}>
                        {t("directorD4.generate")}
                    </Button>
                ) : null}
                {items.length > 0 && (
                    <Dropdown menu={{ items }} trigger={["click"]} onOpenChange={setMenuOpen}>
                        <Button size="small" type="text" aria-label={t("directorNode.more")} title={t("directorNode.more")} icon={<MoreHorizontal size={16} />} />
                    </Dropdown>
                )}
            </div>
        </div>
    );
}
