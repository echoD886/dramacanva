import { Fragment, useState } from "react";
import { Sparkles, TrendingUp, Wrench, Layers } from "lucide-react";
import { useI18n } from "@/i18n/use-i18n";
import { useUserStore } from "@/stores/use-user-store";
import { sendReleaseFeedback, releaseImageURL, type Release } from "@/services/api/changelog";
import { changelogCopy, feedbackErrorCopy } from "./copy";

export const releaseTypes = ["new", "improved", "fixed", "model"];
const releaseIcons = { new: Sparkles, improved: TrendingUp, fixed: Wrench, model: Layers };

function Feedback({ id }: { id: string }) {
    const { locale } = useI18n();
    const user = useUserStore((state) => state.user);
    const c = changelogCopy(locale);
    const [rating, setRating] = useState("neutral");
    const [writing, setWriting] = useState(false);
    const [message, setMessage] = useState("");
    const [email, setEmail] = useState("");
    const [status, setStatus] = useState<"idle" | "sending" | "thanks" | "error">("idle");
    const send = async (value: string) => {
        setRating(value);
        setStatus("sending");
        try {
            await sendReleaseFeedback(id, value, message, email);
            setStatus("thanks");
        } catch {
            setStatus("error");
        }
    };
    if (status === "thanks")
        return (
            <p className="cl-thanks" role="status">
                {c[17]}
            </p>
        );
    return (
        <div className="cl-feedback">
            <span>{c[9]}</span>
            {["useful", "neutral", "poor"].map((value, i) => (
                <button
                    key={value}
                    disabled={status === "sending"}
                    aria-pressed={rating === value && writing}
                    onClick={() => {
                        setRating(value);
                        if (value === "poor" || writing) setWriting(true);
                        else void send(value);
                    }}
                >
                    {c[10 + i]}
                </button>
            ))}
            <button onClick={() => setWriting(true)}>{c[13]}</button>
            {writing && (
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        void send(rating);
                    }}
                >
                    <label>
                        {c[14]}
                        <textarea maxLength={2000} value={message} onChange={(e) => setMessage(e.target.value)} />
                    </label>
                    {!user?.email && (
                        <label>
                            {c[15]}
                            <input type="email" maxLength={254} value={email} onChange={(e) => setEmail(e.target.value)} />
                        </label>
                    )}
                    <button disabled={status === "sending"}>{c[16]}</button>
                </form>
            )}
            {status === "error" && (
                <div role="alert">
                    {feedbackErrorCopy(locale)}
                    <button onClick={() => void send(rating)}>{c[20]}</button>
                </div>
            )}
        </div>
    );
}

export function ReleaseTimeline({
    releases,
    readIds = [],
    filter = "",
    publicPage = false,
    preview = false,
    previewLocale,
    previewImages,
    onRead,
}: {
    releases: Release[];
    readIds?: string[];
    filter?: string;
    publicPage?: boolean;
    preview?: boolean;
    previewLocale?: string;
    previewImages?: Record<string, string>;
    onRead?: (id: string) => void;
}) {
    const { locale } = useI18n();
    const c = changelogCopy(previewLocale || locale);
    const visible = releases.filter((release) => release.entries.some((entry) => !filter || entry.type === filter));
    return (
        <div className="cl-timeline">
            {visible.map((release, index) => {
                const entries = release.entries.filter((entry) => !filter || entry.type === filter);
                if (!entries.length) return null;
                return (
                    <Fragment key={release.id}>
                        {publicPage && (index === 0 || visible[index - 1].releaseDate.slice(0, 7) !== release.releaseDate.slice(0, 7)) && (
                            <h2 className="cl-month" id={`month-${release.releaseDate.slice(0, 7)}`}>
                                {new Intl.DateTimeFormat(previewLocale || locale, { year: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${release.releaseDate}T00:00:00Z`))}
                            </h2>
                        )}
                        <details
                            className={`cl-release ${readIds.includes(release.id) ? "" : "cl-unread"}`}
                            key={release.id}
                            id={`release-${release.releaseDate}`}
                            open={publicPage || index === 0}
                            onToggle={(e) => {
                                if (e.currentTarget.open) onRead?.(release.id);
                            }}
                        >
                            <summary>
                                <time dateTime={release.releaseDate}>{new Intl.DateTimeFormat(previewLocale || locale, { month: "long", day: "numeric", timeZone: "UTC" }).format(new Date(`${release.releaseDate}T00:00:00Z`))}</time>
                                <small>{entries.length} · ⌄</small>
                            </summary>
                            {entries.map((entry) => {
                                const Icon = releaseIcons[entry.type];
                                return (
                                    <article className="cl-entry" id={entry.id} key={entry.id}>
                                        <span className={`cl-tag cl-${entry.type}`}>
                                            <Icon size={12} aria-hidden="true" />
                                            {c[5 + releaseTypes.indexOf(entry.type)]}
                                        </span>
                                        <div>
                                            {entry.text[previewLocale || locale]}
                                            {entry.imageResourceId && (release.id || previewImages?.[entry.id]) && (
                                                <img
                                                    loading="lazy"
                                                    src={previewImages?.[entry.id] || releaseImageURL(release.id, entry.id)}
                                                    alt={entry.text[previewLocale || locale]}
                                                    style={{ display: "block", marginTop: "var(--space-2)", maxWidth: "100%", width: 264, height: "auto", borderRadius: "var(--radius-md)" }}
                                                />
                                            )}
                                            {entry.path && <a href={entry.path}>{c[22]}</a>}
                                        </div>
                                    </article>
                                );
                            })}
                            {!preview && <Feedback id={release.id} />}
                        </details>
                    </Fragment>
                );
            })}
        </div>
    );
}
