
import { useI18n } from "@/i18n/use-i18n";
import { AudioLines, BadgeCheck, Image as ImageIcon, UserRound, Volume2 } from "lucide-react";
import { AppModal } from "@/components/ui/product/app-modal";
import type { ReactNode } from "react";

import type { CanvasNodeData } from "@/types/canvas";

export function CanvasCharacterReferenceModal({ node, open, onClose }: { node: CanvasNodeData | null; open: boolean; onClose: () => void }) {
    const { t } = useI18n();
    if (!node) return null;
    const metadata = node.metadata;
    const definition = metadata?.characterDefinition || {};
    const name = metadata?.characterName || node.title || t("characterRef.untitled");
    const aliases = metadata?.characterAliases || stringList(definition.aliases);
    const visualReady = metadata?.characterVisualStatus === "ready";
    const voiceReady = metadata?.characterVoiceStatus === "ready";
    const voiceProfile = metadata?.characterVoiceProfile;

    return (
        <AppModal
            open={open}
            title={null}
            footer={null}
            destroyOnHidden
            width="min(1180px, calc(100vw - 32px))"
            onCancel={onClose}
            flush
        >
            <div className="grid h-[min(720px,calc(100dvh-48px))] min-h-0 grid-rows-[minmax(240px,42vh)_minmax(0,1fr)] overflow-hidden bg-background text-foreground md:grid-cols-[minmax(0,1.55fr)_minmax(360px,.85fr)] md:grid-rows-1">
                <section className="relative min-h-0 overflow-hidden border-b border-border bg-foreground/[.035] md:border-b-0 md:border-r" aria-label={t("projectAssetVoice.threeViews")}>
                    <div className="absolute inset-x-0 top-0 z-10 flex h-14 items-center justify-between px-5 pr-14">
                        <span className="inline-flex h-7 items-center gap-1.5 rounded-md border border-border/80 bg-background/80 px-2.5 text-[var(--fs-label)] font-medium shadow-sm backdrop-blur-xl">
                            <ImageIcon className="size-3.5" />
                            {t("characterRef.threeViews")}
                        </span>
                        <StatusDot icon={<ImageIcon />} ready={visualReady} readyLabel={t("characterRef.visualBound")} emptyLabel={t("characterRef.visualPending")} />
                    </div>
                    {metadata?.characterCoverUrl ? (
                        <div className="flex h-full w-full items-center justify-center p-5 pt-16 md:p-8 md:pt-20">
                            <img
                                src={metadata.characterCoverUrl}
                                alt={t("characterRef.threeViewsAlt", { name })}
                                className="max-h-full max-w-full select-none object-contain drop-shadow-[0_22px_42px_rgba(0,0,0,.14)]"
                                draggable={false}
                            />
                        </div>
                    ) : (
                        <div className="grid h-full place-items-center px-8 text-center text-foreground/35">
                            <div>
                                <UserRound className="mx-auto size-14 stroke-[1.25]" />
                                <p className="mt-3 text-xs">{t("characterRef.noThreeViews")}</p>
                            </div>
                        </div>
                    )}
                </section>

                <aside className="thin-scrollbar min-h-0 overflow-y-auto">
                    <header className="border-b border-border px-6 pb-5 pt-7 pr-14">
                        <div className="flex items-start gap-3">
                            <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-md bg-foreground/[.07]">
                                <UserRound className="size-4.5" />
                            </span>
                            <div className="min-w-0">
                                <h2 className="truncate text-xl font-semibold leading-7">{name}</h2>
                                <p className="mt-1 text-[var(--fs-label)] text-foreground/45">{t("characterRef.subtitle")}</p>
                            </div>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-1.5">
                            <StatusDot icon={<ImageIcon />} ready={visualReady} readyLabel={t("projectCharacterCard.imageReady")} emptyLabel={t("projectCharacterCard.imageMissing")} />
                            <StatusDot icon={<Volume2 />} ready={voiceReady} readyLabel={t("characterRef.voiceBound")} emptyLabel={t("projectCharacterCard.voiceMissing")} />
                        </div>
                    </header>

                    <div className="space-y-7 px-6 py-6">
                        <DetailSection icon={<BadgeCheck />} title={t("projectCharacterEditor.identity")}>
                            <DetailRow label={t("characterRef.role")} value={stringValue(definition.role)} />
                            <DetailRow label={t("projectCharacterEditor.aliases")} value={aliases.join("、")} />
                            <DetailRow label={t("characterRef.appearance")} value={stringValue(definition.appearance)} />
                            <DetailRow label={t("characterRef.physique")} value={stringValue(definition.physique)} />
                            <DetailRow label={t("characterRef.clothing")} value={stringValue(definition.clothing)} />
                            <DetailRow label={t("characterRef.personality")} value={stringValue(definition.personality)} />
                            <DetailRow label={t("characterRef.props")} value={stringValue(definition.props)} />
                            <DetailRow label={t("characterRef.consistency")} value={stringValue(definition.consistencyPrompt)} />
                        </DetailSection>

                        <DetailSection icon={<AudioLines />} title={t("canvasTaskDetail.voice")}>
                            <DetailRow label={t("characterRef.voiceLanguage")} value={stringValue(definition.voiceLanguage) || voiceProfile?.language} />
                            <DetailRow label={t("projectCharacterEditor.voiceAge")} value={stringValue(definition.voiceAge)} />
                            <DetailRow label={t("projectCharacterEditor.voiceTimbre")} value={stringValue(definition.voiceTimbre) || voiceProfile?.timbre} />
                            <DetailRow label={t("characterRef.voiceBind")} value={metadata?.characterVoiceName} emphasis={voiceReady} />
                            <DetailRow label={t("characterRef.voiceInstructions")} value={metadata?.characterVoiceInstructions} />
                        </DetailSection>
                    </div>
                </aside>
            </div>
        </AppModal>
    );
}

function DetailSection({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
    return (
        <section>
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold">
                <span className="grid size-6 place-items-center rounded bg-foreground/[.06] [&_svg]:size-3.5">{icon}</span>
                {title}
            </div>
            <dl className="divide-y divide-border/65 border-y border-border/65">{children}</dl>
        </section>
    );
}

function DetailRow({ label, value, emphasis = false }: { label: string; value?: string; emphasis?: boolean }) {
    const { t } = useI18n();
    return (
        <div className="grid grid-cols-[76px_minmax(0,1fr)] gap-3 py-3 text-[var(--fs-caption)] leading-5">
            <dt className="text-foreground/42">{label}</dt>
            <dd className={value ? (emphasis ? "font-medium text-emerald-600 dark:text-emerald-300" : "text-foreground/78") : "text-foreground/28"}>{value || t("characterRef.unset")}</dd>
        </div>
    );
}

function StatusDot({ icon, ready, readyLabel, emptyLabel }: { icon: ReactNode; ready: boolean; readyLabel: string; emptyLabel: string }) {
    return (
        <span className={`inline-flex h-7 items-center gap-1.5 rounded-md border px-2 text-[var(--fs-tiny)] font-medium ${ready ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "border-border bg-background/65 text-foreground/42"}`}>
            <span className="[&_svg]:size-3">{icon}</span>
            {ready ? readyLabel : emptyLabel}
        </span>
    );
}

function stringValue(value: unknown) {
    return typeof value === "string" ? value.trim() : "";
}

function stringList(value: unknown) {
    return Array.isArray(value) ? value.map(stringValue).filter(Boolean) : [];
}
