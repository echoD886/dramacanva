import { App, Button, InputNumber, Select } from "antd";
import { useI18n } from "@/i18n/use-i18n";
import type { DirectorScene, PrevisCameraSegment } from "@/types/director";
import { directorActorFrameDetails, directorActorRemovalImpact, directorSegmentDollyConflict } from "@/lib/canvas/director/director-segment-settings";

const ACTION_LABELS = { idle: "canvasExtra.directorWB.poseStand", walk: "canvasExtra.directorWB.poseWalk", run: "canvasExtra.directorWB.poseRun", turn: "directorP10.turn", sit: "canvasExtra.directorWB.poseSit" } as const;

export function DirectorSegmentInspector({ scene, segment, onUpdate, onConvert }: { scene: DirectorScene; segment: PrevisCameraSegment; onUpdate: (patch: Partial<PrevisCameraSegment>) => void; onConvert: () => void }) {
    const { t } = useI18n();
    const { modal } = App.useApp();
    const disabled = Boolean(segment.legacyShotId);
    const seconds = (segment.endFrameExclusive - segment.startFrame) / (scene.previs?.fps ?? scene.shots[0]?.fps ?? 24);
    const fps = scene.previs?.fps ?? scene.shots[0]?.fps ?? 24;
    const actors = scene.objects.filter((object) => object.kind === "actor");
    const updateParams = (params: NonNullable<PrevisCameraSegment["params"]>) => onUpdate({ params: { ...segment.params, ...params } });
    return (
        <section className="director-segment-settings" data-director-segment-settings={segment.id}>
            {disabled && (
                <div className="director-settings-note">
                    <p>{t("directorP10.legacy")}</p>
                    <Button onClick={() => modal.confirm({ title: t("directorP10.convert"), content: t("directorP10.convertConfirm"), onOk: onConvert })}>{t("directorP10.convert")}</Button>
                </div>
            )}
            <label>
                <span>{t("directorP10.target")}</span>
                <Select
                    mode="multiple"
                    aria-label={t("directorP10.target")}
                    disabled={disabled}
                    value={segment.targetIds.length ? segment.targetIds : ["__fixed__"]}
                    options={[{ value: "__fixed__", label: t("directorP10.fixedPosition") }, ...actors.map((actor) => ({ value: actor.id, label: actor.characterBinding?.characterName || actor.name }))]}
                    onChange={(ids: string[]) => onUpdate({ targetIds: ids.at(-1) === "__fixed__" ? [] : ids.filter((id) => id !== "__fixed__") })}
                />
            </label>
            <label>
                <span>{t("directorP10.move")}</span>
                <Select
                    aria-label={t("directorP10.move")}
                    disabled={disabled}
                    value={segment.move}
                    options={(["fixed", "follow", "push", "pull", "orbit", "crane", "path"] as const).map((value) => ({
                        value,
                        label: t(value === "path" ? "directorP17.path" : `directorP10.${value}`),
                        disabled: value !== "fixed" && value !== "path" && !segment.targetIds.length,
                    }))}
                    onChange={(move) => onUpdate({ move })}
                />
            </label>
            {!segment.targetIds.length && <p className="director-settings-note">{t("directorP10.noTarget")}</p>}
            {segment.move === "follow" && (
                <>
                    <label>
                        <span>{t("directorP10.side")}</span>
                        <Select
                            aria-label={t("directorP10.side")}
                            disabled={disabled}
                            value={segment.side ?? "front"}
                            options={(["front", "back", "left", "right"] as const).map((value) => ({ value, label: t(`directorP10.${value}`) }))}
                            onChange={(side) => onUpdate({ side })}
                        />
                    </label>
                    <label>
                        <span>{t("directorP10.distance")}</span>
                        <Select
                            aria-label={t("directorP10.distance")}
                            disabled={disabled}
                            value={segment.params?.distance ?? "auto"}
                            options={[
                                { value: "auto", label: t("directorP10.auto") },
                                { value: 1.5, label: t("directorP10.near") },
                                { value: 3, label: t("directorP10.middle") },
                                { value: 5, label: t("directorP10.far") },
                            ]}
                            onChange={(distance) => updateParams({ distance: distance === "auto" ? undefined : Number(distance) })}
                        />
                    </label>
                </>
            )}
            {segment.move === "orbit" && (
                <>
                    <label>
                        <span>{t("directorP10.orbitDirection")}</span>
                        <Select
                            aria-label={t("directorP10.orbitDirection")}
                            disabled={disabled}
                            value={segment.params?.orbitDirection ?? "left"}
                            options={(["left", "right"] as const).map((value) => ({ value, label: t(`directorP10.${value}`) }))}
                            onChange={(orbitDirection) => updateParams({ orbitDirection })}
                        />
                    </label>
                    <label>
                        <span>{t("directorP10.orbitDegrees")}</span>
                        <InputNumber aria-label={t("directorP10.orbitDegrees")} disabled={disabled} min={0} max={360} value={segment.params?.orbitDegrees ?? 90} onChange={(value) => value !== null && updateParams({ orbitDegrees: value })} />
                    </label>
                </>
            )}
            {segment.move === "crane" && (
                <>
                    <label>
                        <span>{t("directorP10.heightFrom")}</span>
                        <InputNumber aria-label={t("directorP10.heightFrom")} disabled={disabled} min={0} step={0.1} value={segment.params?.heightFrom ?? 1.55} onChange={(value) => value !== null && updateParams({ heightFrom: value })} />
                    </label>
                    <label>
                        <span>{t("directorP10.heightTo")}</span>
                        <InputNumber aria-label={t("directorP10.heightTo")} disabled={disabled} min={0} step={0.1} value={segment.params?.heightTo ?? 2.4} onChange={(value) => value !== null && updateParams({ heightTo: value })} />
                    </label>
                </>
            )}
            <label>
                <span>{t("directorP10.framing")}</span>
                <Select
                    aria-label={t("directorP10.framing")}
                    disabled={disabled}
                    value={segment.framing}
                    options={(["full", "half", "face", "group", "wide"] as const).map((value) => ({ value, label: t(`directorP10.${value}`) }))}
                    onChange={(framing) => onUpdate({ framing })}
                />
            </label>
            <label>
                <span>{t("directorP10.entry")}</span>
                <Select
                    aria-label={t("directorP10.entry")}
                    disabled={disabled}
                    value={segment.transitionIn}
                    options={(["cut", "continuous"] as const).map((value) => ({ value, label: t(`directorP10.${value}`) }))}
                    onChange={(transitionIn) => onUpdate({ transitionIn, transitionFrames: transitionIn === "cut" ? 0 : Math.min(fps, segment.endFrameExclusive - segment.startFrame) })}
                />
            </label>
            {segment.transitionIn === "continuous" && (
                <label>
                    <span>{t("directorP10.seconds")}</span>
                    <InputNumber
                        aria-label={t("directorP10.seconds")}
                        disabled={disabled}
                        min={1 / fps}
                        max={seconds}
                        step={1 / fps}
                        precision={3}
                        value={segment.transitionFrames ? segment.transitionFrames / fps : seconds}
                        onChange={(value) => value !== null && onUpdate({ transitionFrames: Math.max(1, Math.round(value * fps)) })}
                    />
                </label>
            )}
            {directorSegmentDollyConflict(scene, segment.id) && (
                <p role="status" className="director-settings-note">
                    {t("directorP10.dollyWarning")}
                </p>
            )}
        </section>
    );
}

export function DirectorActorFrameInspector({ scene, actorId, frame }: { scene: DirectorScene; actorId: string; frame: number }) {
    const { t } = useI18n();
    const details = directorActorFrameDetails(scene, actorId, frame);
    return (
        <dl className="director-actor-frame" data-director-actor-frame={actorId}>
            <dt>{t("directorP10.action")}</dt>
            <dd>
                {details.action ? (
                    <>
                        {t(ACTION_LABELS[details.action.kind])} · {details.action.id}
                    </>
                ) : (
                    t("directorP10.none")
                )}
            </dd>
            <dt>{t("directorP10.destination")}</dt>
            <dd>{details.destination?.map((value) => value.toFixed(2)).join(" / ") ?? t("directorP10.none")}</dd>
            <dt>{t("directorP10.yaw")}</dt>
            <dd>{details.yaw.toFixed(1)}°</dd>
        </dl>
    );
}

export function DirectorActorRemovalList({ scene, actorId }: { scene: DirectorScene; actorId: string }) {
    const { t } = useI18n();
    const impact = directorActorRemovalImpact(scene, actorId);
    return (
        <div data-director-actor-removal={actorId}>
            <p>{t("directorP10.affectedActions")}</p>
            <ul>
                {impact.actions.length ? (
                    impact.actions.map((action) => (
                        <li key={action.id}>
                            {action.id} · {t(ACTION_LABELS[action.kind])}
                        </li>
                    ))
                ) : (
                    <li>{t("directorP10.none")}</li>
                )}
            </ul>
            <p>{t("directorP10.affectedSegments")}</p>
            <ul>
                {impact.segments.length ? (
                    impact.segments.map((segment) => (
                        <li key={segment.id}>
                            {segment.id} · {scene.shots.find((shot) => shot.id === (segment.shotId ?? segment.legacyShotId))?.name}
                        </li>
                    ))
                ) : (
                    <li>{t("directorP10.none")}</li>
                )}
            </ul>
        </div>
    );
}
