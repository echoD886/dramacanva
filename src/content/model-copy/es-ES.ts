import type { ModelLocaleCopy } from "../model-pages";

export const copy: ModelLocaleCopy = {
    video: "Generador de video IA",
    image: "Generador de imágenes IA",
    free: "Gratis",
    online: "Online",
    supported: "Modelos disponibles",
    versions: "Versiones disponibles",
    provider: "Desarrollador",
    generationOptions: "Opciones de generación",
    capabilities: "Opciones de generación",
    scenes: "Escenas para dramas cortos",
    stepsTitle: "Cómo usar {alias} en DramaCanvas",
    faqTitle: "Preguntas frecuentes",
    pricing: "Precios",
    home: "Inicio",
    cta: "Probar {alias} gratis",
    intro: "Usa {alias} online en DramaCanvas para crear videos e imágenes con IA para series cortas y dramas. Diseña tu guion en el storyboard gratis, integra {model} mediante API o BYOK y revisa el precio en créditos antes de generar.",
    controls: "Los parámetros y controles disponibles dependen del modelo y de la versión seleccionada. Revísalos en el selector del canvas antes de generar.",
    tiers: "Resoluciones y formatos disponibles",
    steps: [
        "Abre el canvas de DramaCanvas y estructura tu guion técnico en tomas dentro del storyboard.",
        "Agrega un nodo de generación, selecciona {model} y escribe el prompt de la escena. Añade referencias visuales solo si la versión admite esa función.",
        "Verifica los parámetros y el consumo confirmado de créditos antes de generar. Compara el resultado directamente en el canvas.",
        "Conserva las mejores imágenes como referencia de estilo o pasa los videos a la línea de tiempo para editar tu serie corta.",
    ],
    scene: {
        action: "Planifica coreografías, movimientos de cámara y transiciones en planos independientes. Genera varias tomas en el canvas y compara las mejores antes de editar.",
        story: "Desarrolla planos de ambientación, secuencias de diálogo y cortes de escena a partir del guion. Evalúa cada toma junto a los planos contiguos en el storyboard.",
        character: "Diseña la apariencia de personajes, expresiones y planos de reacción para tus dramas. Reutiliza referencias aprobadas cuando el modelo lo permita; recuerda verificar siempre la coherencia visual entre tomas.",
        art: "Explora vestuario, iluminación, escenografía y arte conceptual para tu miniserie. Guarda las imágenes clave junto al storyboard como guía visual del proyecto.",
    },
    faq: [
        {
            question: "¿Se puede usar {alias} gratis?",
            answer: "El espacio de trabajo en el canvas, la redacción manual de guiones y la edición de storyboards son gratuitos. La generación de imágenes o vídeos con {model} consume créditos, y los guiones y storyboards por IA también se facturan con créditos. La planificación sin costo no implica llamadas ilimitadas al modelo.",
        },
        {
            question: "¿Cómo conectar la API de {alias} o usar DramaCanvas MCP?",
            answer: "Puedes automatizar tareas mediante DramaCanvas MCP (para Cursor, Claude Code u otros agentes) o conectar una API compatible con tu propia clave (BYOK). DramaCanvas no comercializa la API oficial del desarrollador de {model} ni declara afiliación comercial directa.",
        },
        {
            question: "¿Cuánto cuesta {alias} y cómo es su precio por créditos?",
            answer: "Puedes revisar los planes y paquetes de créditos vigentes en la página de precios. El canvas calcula y muestra los créditos confirmados antes de cada generación. En las conexiones BYOK, el consumo del proveedor externo y el servicio del workspace se facturan por separado.",
        },
        {
            question: "¿Qué versiones de {alias} están disponibles?",
            answer: "Las versiones activas son {versions}. La disponibilidad exacta y los parámetros admitidos corresponden a las opciones configuradas en el selector de modelos del canvas, sin incluir automáticamente otros productos del desarrollador.",
        },
        {
            question: "¿{alias} puede crear una serie corta o drama completo por sí solo?",
            answer: "El modelo genera tomas e imágenes individuales para cada plano. Para lograr un episodio final debes revisar la continuidad de los personajes y montar los clips seleccionados en la línea de tiempo. Una sola generación no produce una serie acabada ni garantiza coherencia automática sin supervisión.",
        },
    ],
    casesTitle: "Ejemplos de la comunidad con {alias}",
    casesIntro: "Imágenes reales creadas con {alias} y publicadas en bibliotecas de prompts de código abierto, con el prompt original y el crédito de cada autor. Copia un prompt y adáptalo en el lienzo.",
    promptLabel: "Prompt",
    copyPrompt: "Copiar prompt",
    copied: "Copiado",
    tryPrompt: "Probar este prompt",
    translatedNote: "Prompt traducido del original",
    creditBy: "por",
    creditSource: "fuente",
    capabilitiesTitle: "Qué puedes hacer con {alias}",
    capabilitiesIntro: "Tareas reales de un drama corto: qué le das a {alias}, qué obtienes y en qué paso lo usas.",
    problemsTitle: "Problemas habituales al hacer dramas cortos con {alias} y cómo se resuelven aquí",
    problemsIntro: "Lo que suele frenar a los creadores y lo que hace DramaCanvas en cada caso.",
    seeExample: "Ver ejemplo",
};

// Native model names readers search for in this market, used via {alias} in the copy above. Missing slugs fall back to the English name.
export const aliases: Record<string, string> = {
    "veo-3-1": "Veo 3",
    "kling-3-0": "Kling AI",
    "minimax-h3": "Hailuo AI",
    "wan-3-0": "Wan AI",
    "grok-imagine": "Grok Imagine",
    "midjourney-v7": "Midjourney",
};
