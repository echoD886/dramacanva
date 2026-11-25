const messages = {
    "chapterReplacement.title": "Replace this chapter’s {count} existing shots?",
    "chapterReplacement.timing": "The chapter data will be replaced only after the new storyboard is generated successfully. If generation fails, the existing storyboard will be preserved.",
    "chapterReplacement.impact": "Replacement will remove {shots} shots, {revisions} script versions, {references} asset references, and {artifacts} generated outputs. This cannot be undone.",
    "chapterReplacement.impactCandidates": "Replacement will remove {shots} shots, {revisions} script versions, {references} asset references, {artifacts} generated outputs, and {candidates} related candidate assets. This cannot be undone.",
    "chapterReplacement.confirm": "Replace after successful generation",
    "chapterReplacement.cancel": "Keep existing storyboard",
} as const;
export default messages;
