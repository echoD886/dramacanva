import { Plus, UserRound } from "lucide-react";
import { useI18n } from "@/i18n/use-i18n";
import type { DirectorScene } from "@/types/director";
import { DIRECTOR_PROP_PRESETS, createDirectorPropPreset, directorPropLabel } from "@/lib/canvas/director/director-presets";
import type { DirectorObject } from "@/types/director";
import { PropSilhouette } from "./director-prop-icons";

export const DIRECTOR_ACTOR_DRAG_TYPE = "application/x-director-actor";

export function DirectorActorDrawer({ scene, onPlace }: { scene: DirectorScene; onPlace: (sourceId?: string) => void }) {
    const { t } = useI18n();
    const roles = new Map(scene.objects.filter((object) => object.kind === "actor").map((actor) => [actor.characterBinding?.characterAssetId || actor.characterBinding?.characterName || actor.name, actor]));
    return (
        <div className="pv-asset-grid" data-director-actor-drawer>
            <button
                type="button"
                draggable
                className="pv-asset-card"
                onClick={() => onPlace()}
                onDragStart={(event) => {
                    event.dataTransfer.setData(DIRECTOR_ACTOR_DRAG_TYPE, "new");
                    event.dataTransfer.effectAllowed = "copy";
                }}
            >
                <span className="pv-asset-card__thumb">
                    <Plus className="size-6" />
                </span>
                <span className="pv-asset-card__name">{t("directorP10.newActor")}</span>
            </button>
            {[...roles].map(([role, actor]) => (
                <button
                    type="button"
                    key={role}
                    draggable
                    className="pv-asset-card"
                    onClick={() => onPlace(actor.id)}
                    onDragStart={(event) => {
                        event.dataTransfer.setData(DIRECTOR_ACTOR_DRAG_TYPE, actor.id);
                        event.dataTransfer.effectAllowed = "copy";
                    }}
                >
                    <span className="pv-asset-card__thumb">
                        <UserRound className="size-6" />
                    </span>
                    <span className="pv-asset-card__name">{actor.characterBinding?.characterName || actor.name}</span>
                </button>
            ))}
        </div>
    );
}

export function DirectorPropDrawer({ category, query = "", onPlace }: { category: string; query?: string; onPlace: (object: DirectorObject) => void }) {
    const { t } = useI18n();
    return (
        <div className="pv-asset-grid" data-director-prop-drawer aria-label={t("previs.v165.tabAssets")}>
            {DIRECTOR_PROP_PRESETS.filter((item) => category === "all" || item.category === category).map((item) => {
                const name = directorPropLabel(item.id);
                if (!name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())) return null;
                return (
                    <button
                        type="button"
                        className="pv-asset-card"
                        key={item.id}
                        draggable
                        title={`${name} (${item.size})`}
                        onDragStart={(event) => {
                            event.dataTransfer.setData("application/json", JSON.stringify({ primitive: "box", name, stageProp: item.id, scale: [1, 1, 1] }));
                            event.dataTransfer.effectAllowed = "copy";
                        }}
                        onClick={() => onPlace(createDirectorPropPreset(item.id))}
                    >
                        <span className="pv-asset-card__thumb">
                            <PropSilhouette name={name} />
                        </span>
                        <span className="pv-asset-card__info">
                            <span className="pv-asset-card__name">{name}</span>
                            <span className="pv-asset-card__size">{item.size}</span>
                        </span>
                    </button>
                );
            })}
        </div>
    );
}
