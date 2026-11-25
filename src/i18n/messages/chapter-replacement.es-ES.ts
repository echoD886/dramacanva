const messages = {
    "chapterReplacement.title": "¿Reemplazar los {count} planos existentes de este capítulo?",
    "chapterReplacement.timing": "Los datos del capítulo se reemplazarán solo cuando el nuevo guion gráfico se genere correctamente. Si la generación falla, se conservará el guion gráfico existente.",
    "chapterReplacement.impact": "El reemplazo eliminará {shots} planos, {revisions} versiones del guion, {references} referencias a recursos y {artifacts} resultados generados. Esta acción no se puede deshacer.",
    "chapterReplacement.impactCandidates": "El reemplazo eliminará {shots} planos, {revisions} versiones del guion, {references} referencias a recursos, {artifacts} resultados generados y {candidates} recursos candidatos relacionados. Esta acción no se puede deshacer.",
    "chapterReplacement.confirm": "Reemplazar tras generar correctamente",
    "chapterReplacement.cancel": "Conservar el guion gráfico existente",
} as const;
export default messages;
