const messages = {
    "chapterReplacement.title": "この章の既存の{count}カットを置き換えますか？",
    "chapterReplacement.timing": "新しい絵コンテの生成に成功した場合のみ、この章のデータを一括で置き換えます。生成に失敗した場合、既存の絵コンテは維持されます。",
    "chapterReplacement.impact": "置き換えにより、{shots}カット、{revisions}個の脚本バージョン、{references}件のアセット参照、{artifacts}個の生成物が削除されます。この操作は取り消せません。",
    "chapterReplacement.impactCandidates": "置き換えにより、{shots}カット、{revisions}個の脚本バージョン、{references}件のアセット参照、{artifacts}個の生成物、および{candidates}件の関連アセット候補が削除されます。この操作は取り消せません。",
    "chapterReplacement.confirm": "生成成功後に置き換える",
    "chapterReplacement.cancel": "既存の絵コンテを保持",
} as const;
export default messages;
