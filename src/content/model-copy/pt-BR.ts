import type { ModelLocaleCopy } from "../model-pages";

export const copy: ModelLocaleCopy = {
    video: "Vídeo IA",
    image: "Imagem IA",
    free: "Grátis",
    online: "Online",
    supported: "Modelos disponíveis",
    versions: "Versões ativas",
    provider: "Desenvolvedor",
    generationOptions: "Recursos de geração",
    capabilities: "Recursos de geração",
    scenes: "Cenas para novela vertical",
    stepsTitle: "Como usar {alias} no DramaCanvas",
    faqTitle: "Perguntas frequentes",
    pricing: "Preços",
    home: "Início",
    cta: "Experimente {alias} grátis",
    intro: "Use {alias} no DramaCanvas para criar cenas e recursos visuais para novela vertical. Planeje a narrativa no storyboard grátis, explore as opções de {model}, conecte fluxos via API/MCP e consulte o preço em créditos antes de gerar.",
    controls: "Os parâmetros disponíveis (resolução, proporção e duração) variam conforme a versão e o modelo selecionados. Consulte o seletor no canvas antes de gerar.",
    tiers: "Formatos e resoluções suportados",
    steps: [
        "Abra o canvas do DramaCanvas e estruture seu roteiro em cenas no storyboard grátis.",
        "Adicione um nó de geração, selecione {model} no seletor de modelos e descreva o prompt da cena. Adicione imagens de referência se a versão permitir.",
        "Confira as configurações e a estimativa de créditos antes de gerar. Compare as tomadas geradas diretamente com o storyboard.",
        "Salve imagens aprovadas como referência visual ou organize os clipes na linha do tempo para finalizar sua novela vertical.",
    ],
    scene: {
        action: "Ideal para planejar ações dinâmicas, entradas dramáticas e transições de cena na novela vertical. Teste e compare tomadas no canvas antes da montagem final.",
        story: "Perfeito para criar planos de ambientação, diálogos tensos e ganchos de episódio a partir do roteiro. Avalie cada clipe em conjunto com as cenas adjacentes no storyboard.",
        character: "Focado em construir a identidade dos personagens, expressões marcantes e reações emocionais. Reutilize referências visuais aprovadas e revise a consistência entre as tomadas.",
        art: "Explore figurinos, cenários imersivos e direção de arte cinematográfica para sua novela vertical. Salve as melhores imagens no storyboard como guia de estilo de produção.",
    },
    faq: [
        {
            question: "Dá para usar {alias} grátis no DramaCanvas?",
            answer: "Sim. O canvas visual, a escrita manual do roteiro e a edição do storyboard são grátis. A geração de imagens e vídeos com {model} consome créditos, e roteiros e storyboards por IA também são cobrados em créditos.",
        },
        {
            question: "Como funciona a API ou integração MCP de {alias}?",
            answer: "Você pode automatizar a criação pelo DramaCanvas MCP (compatível com Claude Code, Cursor e Codex) ou conectar provedores de API próprios via BYOK. Esta página não oferece a API oficial direta do desenvolvedor do modelo.",
        },
        {
            question: "Qual é o preço do {alias} e como funcionam os créditos?",
            answer: "Consulte a tabela atualizada na página de preços. O canvas calcula e exibe a estimativa de créditos antes de cada geração. No modo BYOK, o consumo do provedor e o serviço de workspace são cobrados separadamente.",
        },
        {
            question: "Quais versões de {alias} estão ativas?",
            answer: "{versions}. A disponibilidade exata de recursos e resoluções acompanha o seletor ao vivo do canvas; produtos homônimos do provedor não são incluídos automaticamente.",
        },
        {
            question: "{alias} consegue criar uma novela vertical completa sozinho?",
            answer: "Não em um único comando. A IA gera takes e materiais individuais. É necessário organizar o storyboard, validar a consistência dos personagens e montar os clipes na linha do tempo para concluir seu episódio.",
        },
    ],
    casesTitle: "Exemplos da comunidade com {alias}",
    casesIntro: "Imagens reais criadas com {alias} e publicadas em bibliotecas de prompts de código aberto, com o prompt original e o crédito de cada autor. Copie um prompt e adapte no canvas.",
    promptLabel: "Prompt",
    copyPrompt: "Copiar prompt",
    copied: "Copiado",
    tryPrompt: "Testar este prompt",
    translatedNote: "Prompt traduzido do original",
    creditBy: "por",
    creditSource: "fonte",
    capabilitiesTitle: "O que dá para fazer com o {alias}",
    capabilitiesIntro: "Tarefas reais de uma novela vertical: o que você dá ao {alias}, o que recebe e em que etapa usa.",
    problemsTitle: "Problemas comuns ao criar novelas verticais com o {alias} e como são resolvidos aqui",
    problemsIntro: "O que costuma travar quem cria e o que o DramaCanvas faz em cada caso.",
    seeExample: "Ver exemplo",
};

// Native model names readers search for in this market, used via {alias} in the copy above. Missing slugs fall back to the English name.
export const aliases: Record<string, string> = {
    "veo-3-1": "Veo 3",
    "kling-3-0": "Kling AI",
    "minimax-h3": "Hailuo AI",
    "wan-3-0": "Wan AI",
    "grok-imagine": "Grok Imagine",
};
