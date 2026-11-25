/** Carry only the explicit tour opt-in across the guest account handoff. */
export function guestCanvasLoginPath(token: string, search: string): string {
    const tour = new URLSearchParams(search).get("tour") === "1" ? "&tour=1" : "";
    const next = `/canvas?guestCanvas=${encodeURIComponent(token)}${tour}`;
    return `/login?next=${encodeURIComponent(next)}`;
}

export function importedGuestCanvasPath(id: string, search: string): string {
    const tour = new URLSearchParams(search).get("tour") === "1" ? "?tour=1" : "";
    return `/canvas/${encodeURIComponent(id)}${tour}`;
}
