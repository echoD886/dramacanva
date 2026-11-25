export const dramaKeys = {
    summary: (projectId: string) => ["drama", projectId] as const,
    episode: (projectId: string, episodeId: string) => ["drama", projectId, "episode", episodeId] as const,
    cast: (projectId: string) => ["drama", projectId, "cast"] as const,
    jobs: (projectId: string) => ["drama", projectId, "jobs"] as const,
    worldClips: (projectId: string, episodeId: string, scope?: string) => ["drama", projectId, "episode", episodeId, "world-clips", scope] as const,
};
