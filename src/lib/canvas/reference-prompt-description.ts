type References = { referenceImages: unknown[]; referenceVideos: unknown[]; referenceAudios: unknown[] };
type PromptLanguage = "zh" | "en" | "ja" | "ko" | "es" | "pt";

const descriptions = {
    zh: {
        heading: "【参考图说明】",
        inputs: ["输入图", "输入视频", "输入音频"],
        full: "请严格按提示词中对各素材的引用使用它们：被要求保持的角色/主体必须保持外观一致（脸型、发型、服装、配色、配饰）；视频/音频按指定用途使用。版式或风格范例不得替代要求保持的角色/主体。",
        short: "按引用用途使用；保持指定主体的脸型、发型、服装、配色、配饰，勿用范例替换主体。",
        minimal: "按引用使用，保持主体一致。",
        overflow: "参考素材说明无法放入模型提示词长度上限，请精简提示词后重试。",
    },
    en: {
        heading: "[Reference guide]",
        inputs: ["Input image", "Input video", "Input audio"],
        full: "Use each reference strictly as directed in the prompt. Preserve the specified character/subject's appearance (face, hairstyle, clothing, colors, accessories). Use video/audio for their assigned purpose. Layout or style examples must not replace the subject to be preserved.",
        short: "Follow reference roles; preserve the subject's face, hair, clothing, colors and accessories. Do not replace the subject with an example.",
        minimal: "Follow references; preserve subject identity.",
        overflow: "The reference guide cannot fit within the model prompt limit. Shorten the prompt and retry.",
    },
    ja: {
        heading: "【参照素材の説明】",
        inputs: ["入力画像", "入力動画", "入力音声"],
        full: "各素材はプロンプトで指定された用途に従って使用してください。維持を求められた人物・被写体の顔、髪型、衣装、配色、装飾品を一致させてください。動画・音声も指定用途に従い、構図やスタイルの見本で被写体を置き換えないでください。",
        short: "指定用途に従い、被写体の顔・髪型・衣装・配色・装飾品を維持し、見本で置き換えないでください。",
        minimal: "指定用途に従い、被写体の同一性を維持。",
        overflow: "参照説明がモデルの文字数上限に収まりません。プロンプトを短くしてください。",
    },
    ko: {
        heading: "[참조 자료 설명]",
        inputs: ["입력 이미지", "입력 영상", "입력 오디오"],
        full: "각 자료를 프롬프트에 지정된 용도로 사용하세요. 유지해야 하는 인물/대상의 얼굴, 헤어스타일, 의상, 색상, 액세서리를 일관되게 유지하세요. 영상/오디오도 지정된 용도로 사용하고 구도나 스타일 예시로 대상을 대체하지 마세요.",
        short: "지정 용도를 따르고 대상의 얼굴, 머리, 의상, 색상, 액세서리를 유지하세요. 예시로 대체하지 마세요.",
        minimal: "참조 용도를 따르고 대상의 정체성을 유지하세요.",
        overflow: "참조 설명이 모델 글자 수 제한을 초과합니다. 프롬프트를 줄여 주세요.",
    },
    es: {
        heading: "[Guía de referencias]",
        inputs: ["Imagen de entrada", "Vídeo de entrada", "Audio de entrada"],
        full: "Usa cada referencia según su función indicada en el prompt. Mantén la apariencia del personaje/sujeto que debe conservarse (rostro, peinado, ropa, colores y accesorios). Usa vídeo/audio según su propósito. Los ejemplos de composición o estilo no deben sustituir al sujeto.",
        short: "Respeta las funciones; conserva rostro, peinado, ropa, colores y accesorios del sujeto. No lo sustituyas por un ejemplo.",
        minimal: "Respeta las referencias y conserva la identidad.",
        overflow: "La guía no cabe en el límite del modelo. Acorta el prompt e inténtalo de nuevo.",
    },
    pt: {
        heading: "[Guia de referências]",
        inputs: ["Imagem de entrada", "Vídeo de entrada", "Áudio de entrada"],
        full: "Use cada referência conforme a função indicada no prompt. Preserve a aparência do personagem/sujeito solicitado (rosto, cabelo, roupa, cores e acessórios). Use vídeo/áudio conforme a finalidade indicada. Exemplos de composição ou estilo não devem substituir o sujeito.",
        short: "Respeite as funções; preserve rosto, cabelo, roupa, cores e acessórios do sujeito. Não o substitua por um exemplo.",
        minimal: "Siga as referências e preserve a identidade.",
        overflow: "O guia não cabe no limite do modelo. Reduza o prompt e tente novamente.",
    },
} satisfies Record<PromptLanguage, { heading: string; inputs: string[]; full: string; short: string; minimal: string; overflow: string }>;

function promptLanguage(prompt: string): PromptLanguage {
    // Serialized mention labels do not indicate the user's language.
    const text = prompt.replace(/@\[[^\]]+\]|@(图片|视频|音频|文本|角色|绘图)\d+/gu, "");
    if (/[\u3040-\u30ff]/u.test(text)) return "ja";
    if (/[\uac00-\ud7af]/u.test(text)) return "ko";
    if (/\p{Script=Han}/u.test(text)) return "zh";
    const words = new Set(text.toLowerCase().match(/\p{L}+/gu) || []);
    const score = (terms: string[]) => terms.filter((term) => words.has(term)).length;
    const es = score(["el", "la", "los", "las", "una", "personaje", "imagen", "mantén", "genera", "rostro", "según", "usa", "con", "del"]);
    const pt = score(["o", "os", "as", "um", "uma", "personagem", "imagem", "mantenha", "gere", "rosto", "não", "referência", "com", "do", "da"]);
    const en = score(["the", "a", "an", "use", "keep", "preserve", "character", "image", "with", "create", "generate", "from", "of", "and", "in", "as"]);
    if (en > Math.max(es, pt)) return "en";
    return pt > es ? "pt" : es > 0 ? "es" : "en";
}

export function referencePromptDescription(prompt: string, references: References, maxChars?: number, languagePrompt = prompt) {
    const groups = [references.referenceImages, references.referenceVideos, references.referenceAudios];
    if (!groups.some((items) => items.length)) return prompt;
    const copy = descriptions[promptLanguage(languagePrompt)];
    const labels = ["图片", "视频", "音频"];
    const mapping = groups.flatMap((items, kind) => items.map((_item, index) => `${copy.inputs[kind]} ${index + 1} = ${labels[kind]}${index + 1}`)).join("; ");
    const compactMapping = groups.flatMap((items, kind) => items.map((_item, index) => `${copy.inputs[kind]}${index + 1}=${labels[kind]}${index + 1}`)).join(";");
    const candidates = [`${copy.heading}${mapping}. ${copy.full}`, `${copy.heading}${mapping}. ${copy.short}`, `${copy.heading}${compactMapping};${copy.minimal}`];
    for (const description of candidates) {
        const result = `${description}\n\n${prompt}`;
        if (!maxChars || maxChars <= 0 || Array.from(result).length <= maxChars) return result;
    }
    // Never truncate user instructions or silently send unlabeled references.
    throw new Error(copy.overflow);
}

/**
 * The prompt a person wrote, without the reference guide referencePromptDescription() prepended for the model.
 * Only an exact guide (known heading + one of its known endings, then a blank line) is removed; anything else is
 * returned unchanged so user text is never altered.
 */
export function userVisiblePrompt(prompt: string | undefined | null): string {
    if (!prompt) return "";
    const split = prompt.indexOf("\n\n");
    if (split < 0) return prompt;
    const guide = prompt.slice(0, split);
    for (const copy of Object.values(descriptions)) {
        if (!guide.startsWith(copy.heading)) continue;
        if (guide.endsWith(`. ${copy.full}`) || guide.endsWith(`. ${copy.short}`) || guide.endsWith(`;${copy.minimal}`)) return prompt.slice(split + 2);
    }
    return prompt;
}
