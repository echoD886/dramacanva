const messages = {
    "chapterReplacement.title": "이 챕터의 기존 샷 {count}개를 교체할까요?",
    "chapterReplacement.timing": "새 스토리보드 생성에 성공한 후에만 이 챕터의 데이터를 전체 교체합니다. 생성에 실패하면 기존 스토리보드는 유지됩니다.",
    "chapterReplacement.impact": "교체하면 샷 {shots}개, 스크립트 버전 {revisions}개, 자산 참조 {references}개, 생성 결과물 {artifacts}개가 삭제됩니다. 이 작업은 되돌릴 수 없습니다.",
    "chapterReplacement.impactCandidates": "교체하면 샷 {shots}개, 스크립트 버전 {revisions}개, 자산 참조 {references}개, 생성 결과물 {artifacts}개와 관련 후보 자산 {candidates}개가 삭제됩니다. 이 작업은 되돌릴 수 없습니다.",
    "chapterReplacement.confirm": "생성 성공 후 교체",
    "chapterReplacement.cancel": "기존 스토리보드 유지",
} as const;
export default messages;
