import { http } from "@/services/api/request";

export function generateCanvasTitle(content: string, signal?: AbortSignal) {
    return http.post<{ title: string }>("/canvas/title", { content }, { signal });
}
