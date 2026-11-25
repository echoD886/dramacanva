export type HeatStage = "rising" | "peak" | "past" | "cooling" | "new";

export type AIVideoTemplateCard = {
    slug: string;
    title: string;
    categories: string[];
    heatStage: HeatStage;
    plays: number;
    likes: number;
    newToday: boolean;
    publishedAt?: string;
    coverUrl: string;
    previewUrl: string;
    aspectRatio: string;
};

export type AIVideoTemplateClip = {
    uploadDate?: string;
    id: string;
    title: string;
    plays: number;
    likes: number;
    durationMs: number;
    width: number;
    height: number;
    coverUrl: string;
    previewUrl: string;
    fullUrl: string;
};

export type AIVideoTemplateSlot = {
    replacementDefault?: string;
    replacementChoices?: string[];
    name: string;
    kind: string;
    required: boolean;
    labelKey?: string;
    index?: number;
};

export type AIVideoTemplateOption = {
    id: string;
    labelKey: string;
    group?: string;
};

export type AIVideoTemplateQA = {
    question: string;
    answer: string;
};

export type TemplateTimelineNode = {
    date: string;
    label: string;
    detail: string;
    sourceUrl?: string;
};

export type TemplateContentSection = {
    id: string;
    question: string;
    answer: string;
    points?: string[];
    steps?: string[];
};

export type TemplateOriginalPost = {
    creator?: string;
    date?: string;
    url?: string;
    platform?: string;
    sound?: string;
    soundUrl?: string;
};

export type TemplateContentSource = {
    title: string;
    url: string;
};

export type TemplateDirectoryContent = {
    title: string;
    seoTitle?: string;
    seoDescription?: string;
    intro: string;
    faq: AIVideoTemplateQA[];
};

export type TemplateContentFacts = {
    originalCreator?: string;
    firstPosted?: string;
    sound?: string;
    platform?: string;
};

/** Public template prompt: @tokens in `text` map to references (the clip or a numbered photo slot). */
export type AIVideoTemplatePromptReference = {
    token: string;
    kind: "video" | "image" | string;
    clipId?: string;
    slot?: string;
};

export type AIVideoTemplatePrompt = {
    text: string;
    /** Localized display copy of the prompt (same @tokens); `text` is the English generation prompt. */
    displayText?: string;
    references: AIVideoTemplatePromptReference[];
};

export type AIVideoTemplateContent = {
    title: string;
    seoTitle: string;
    seoDescription: string;
    summary?: string;
    facts?: TemplateContentFacts;
    originalPost?: TemplateOriginalPost;
    timeline?: TemplateTimelineNode[];
    sections?: TemplateContentSection[];
    faq?: AIVideoTemplateQA[];
    qa?: AIVideoTemplateQA[];
    sources?: TemplateContentSource[];
};

export type AIVideoTemplateDetail = AIVideoTemplateCard & {
    replacementDefault?: string;
    replacementChoices?: string[];
    models?: { id: string; labelKey: string; resolutions: ("480p" | "720p")[] }[];
    clips: AIVideoTemplateClip[];
    slots: AIVideoTemplateSlot[];
    options: AIVideoTemplateOption[];
    content: Record<string, AIVideoTemplateContent>;
    contentLocale?: string;
    /** Localized long headline for the H1; `title` stays the short template name. */
    headline?: string;
    prompt?: AIVideoTemplatePrompt;
};

export type TaskPriceConfirmation = {
    requestKey: string;
    amountMicrocredits: number;
};

export type AIVideoTemplateQuote = {
    pricePerSecondCredits?: number;
    seconds?: number;
    amountCredits?: number;
    directPayUsd?: number;
    directPayAvailable?: boolean;
    clipId: string;
    resolution: "480p" | "720p";
    durationSeconds: number;
    creditsPerSecond: number;
    totalCredits: number;
    durationMs?: number;
    pricePerSecondMicrocredits?: number;
    amountMicrocredits?: number;
};

export type AIVideoTemplateGenerationInput = {
    replacement?: string;
    model?: string;
    clipId: string;
    images: string[];
    mode: "face_replace" | "scene_match" | "A" | "B";
    optionIds: string[];
    scene?: string;
    extra?: string;
    resolution: "480p" | "720p";
    locale?: string;
    priceConfirmation?: TaskPriceConfirmation;
};

export type UploadSlotState = {
    file?: File;
    previewUrl?: string;
    resourceId?: string;
    status: "idle" | "uploading" | "ready" | "error";
    progress: number;
    error?: string;
};

export type AIVideoTemplatePageResponse = {
    total?: number;
    items: AIVideoTemplateCard[];
    nextCursor?: string;
    directory?: TemplateDirectoryContent;
};
