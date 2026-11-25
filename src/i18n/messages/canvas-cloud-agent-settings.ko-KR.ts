const messages = {
    // 권한 옵션
    "canvasCloudAgentSettings.permission.readOnly": "읽기 전용",
    "canvasCloudAgentSettings.permission.readOnlyDesc": "분석과 제안만",
    "canvasCloudAgentSettings.permission.requestApproval": "승인 요청",
    "canvasCloudAgentSettings.permission.requestApprovalDesc": "쓰기·생성 전 확인",
    "canvasCloudAgentSettings.permission.auto": "자동 실행",
    "canvasCloudAgentSettings.permission.autoDesc": "예산 내에서 허가된 도구 실행",
    "canvasCloudAgentSettings.permission.fallback": "승인 요청",

    // 컨텍스트 범위
    "canvasCloudAgentSettings.context.canvas": "저장된 캔버스 요약",
    "canvasCloudAgentSettings.context.canvasDesc": "최대 80개 노드의 제목과 텍스트 조각. 미디어 본문이나 미동기화 수정은 제외",

    // 추론 옵션
    "canvasCloudAgentSettings.reasoning.off": "끄기",
    "canvasCloudAgentSettings.reasoning.offDesc": "바로 실행",
    "canvasCloudAgentSettings.reasoning.auto": "자동",
    "canvasCloudAgentSettings.reasoning.autoDesc": "작업에 따라 판단",
    "canvasCloudAgentSettings.reasoning.deep": "심층",
    "canvasCloudAgentSettings.reasoning.deepDesc": "복잡한 작업은 먼저 계획",

    // 헤더
    "canvasCloudAgentSettings.homeTitle": "Agent 설정",
    "canvasCloudAgentSettings.backToChat": "대화로 돌아가기",
    "canvasCloudAgentSettings.backToSettings": "설정으로 돌아가기",
    "canvasCloudAgentSettings.homeHint": "다음 새 실행부터 적용",
    "canvasCloudAgentSettings.enabledBadge": "{count}개 활성화됨",
    "canvasCloudAgentSettings.currentAgentBadge": "현재 Agent",

    // 설정 홈
    "canvasCloudAgentSettings.section.reasoning": "추론 모드",
    "canvasCloudAgentSettings.section.model": "대화 모델",
    "canvasCloudAgentSettings.section.permission": "실행 권한",
    "canvasCloudAgentSettings.section.capabilities": "능력과 범위",
    "canvasCloudAgentSettings.hint.newRun": "새 실행부터 적용",
    "canvasCloudAgentSettings.reasoningNote": "추론은 목표 분해·부족 판단·다음 도구 선택에만 사용되며, 내부 사고 과정은 사용자에게 표시되지 않습니다.",
    "canvasCloudAgentSettings.permissionNote": "기본적으로 각 단계를 승인합니다. 자동 모드는 허가된 캔버스 내용을 수정할 수 있습니다. 이미지와 영상은 항상 먼저 초안을 만들고 독립적인 승인을 거쳐 생성합니다.",
    "canvasCloudAgentSettings.selectTextModel": "텍스트 모델 선택",
    "canvasCloudAgentSettings.row.context": "컨텍스트",
    "canvasCloudAgentSettings.row.contextSummary": "노드 {nodes}개 · 범위 {scopes}개",
    "canvasCloudAgentSettings.row.profile": "장기 설정",
    "canvasCloudAgentSettings.row.skills": "Skills · 사용자 스킬 라이브러리",
    "canvasCloudAgentSettings.row.skillsSummary": "{installed}개 설치됨 · 이번 실행 {enabled}개 활성화",
    "canvasCloudAgentSettings.row.mcp": "도구와 연결",
    "canvasCloudAgentSettings.row.mcpSummary": "캔버스, 스킬 참조 파일, 생성 작업",
    "canvasCloudAgentSettings.row.budget": "예산",
    "canvasCloudAgentSettings.row.budgetSummary": "실행당 최대 {credits} 크레딧 · 고정가 모델",
    "canvasCloudAgentSettings.budgetUnset": "미설정",

    // Skills 작업 공간
    "canvasCloudAgentSettings.skills.tabInstalled": "설치됨 {count}",
    "canvasCloudAgentSettings.skills.tabMarket": "Skill 마켓",
    "canvasCloudAgentSettings.skills.searchMarket": "Skill 마켓 검색",
    "canvasCloudAgentSettings.skills.searchInstalled": "설치된 Skill 필터",
    "canvasCloudAgentSettings.skills.searchAria": "Skills 검색",
    "canvasCloudAgentSettings.skills.marketHint": "현재 작업에 맞는 스킬 찾기",
    "canvasCloudAgentSettings.skills.matchCount": "{count}개 일치하는 Skill",
    "canvasCloudAgentSettings.skills.selectAll": "표시된 항목 모두 선택",
    "canvasCloudAgentSettings.skills.deselectAll": "모두 선택 해제",
    "canvasCloudAgentSettings.skills.loading": "스킬을 불러오는 중…",
    "canvasCloudAgentSettings.skills.noMatch": "일치 없음. 다른 키워드를 시도해 보세요",
    "canvasCloudAgentSettings.skills.loadingMore": "불러오는 중…",
    "canvasCloudAgentSettings.skills.loadMore": "더 불러오기",

    // 장기 설정 작업 공간
    "canvasCloudAgentSettings.profile.title": "장기 설정 문서",
    "canvasCloudAgentSettings.profile.intro": "Agent의 장기 작업 습관, 어조, 출력 구조를 정의합니다. 도구·노드·예산·승인 권한은 추가되지 않으며, 안전 계약은 항상 서버 코드가 관리합니다.",
    "canvasCloudAgentSettings.profile.tabUser": "사용자",
    "canvasCloudAgentSettings.profile.tabProject": "프로젝트",
    "canvasCloudAgentSettings.profile.tabCanvas": "캔버스",
    "canvasCloudAgentSettings.profile.projectUnbound": "현재 캔버스가 프로젝트에 연결되지 않아 프로젝트 설정을 사용할 수 없습니다.",
    "canvasCloudAgentSettings.profile.loading": "설정 스냅샷을 불러오는 중…",
    "canvasCloudAgentSettings.profile.revision": "리비전 {revision}",
    "canvasCloudAgentSettings.profile.unsaved": " · 저장 안 됨",
    "canvasCloudAgentSettings.profile.placeholder": "예: 매번 먼저 결론을 제시하고, 변경할 샷을 나열한다. 프롬프트는 중국어와 영어를 모두 제공한다.",
    "canvasCloudAgentSettings.profile.saveHint": "저장 후 다음 새 실행에만 영향을 줍니다. 실행 중인 Agent는 원래 스냅샷을 고정합니다.",
    "canvasCloudAgentSettings.profile.save": "저장",
    "canvasCloudAgentSettings.profile.retry": "다시 불러오기",
    "canvasCloudAgentSettings.profile.scopeUser": "사용자 설정",
    "canvasCloudAgentSettings.profile.scopeProject": "프로젝트 설정",
    "canvasCloudAgentSettings.profile.scopeCanvas": "현재 캔버스 설정",
    "canvasCloudAgentSettings.profile.configured": "{count}개 층 설정됨 · 행동 설정만",
    "canvasCloudAgentSettings.profile.empty": "미설정 · 행동 설정만",

    // Skill 행
    "canvasCloudAgentSettings.skill.enableAria": "{name} 활성화",
    "canvasCloudAgentSettings.skill.noDescription": "설명 없음",
    "canvasCloudAgentSettings.skill.installed": "설치됨",
    "canvasCloudAgentSettings.skill.add": "추가",

    // MCP 작업 공간
    "canvasCloudAgentSettings.mcp.title": "서버 내장 도구",
    "canvasCloudAgentSettings.mcp.intro": "이번 실행 권한에 따라 열립니다. 실제 능력은 전송 전 백엔드에 확인합니다. Skills는 실행 지식만 제공하며 도구 권한을 올리지 않습니다.",
    "canvasCloudAgentSettings.mcp.scope": "도구 범위",
    "canvasCloudAgentSettings.mcp.toolCanvasRead": "저장된 캔버스 읽기",
    "canvasCloudAgentSettings.mcp.toolSkillFiles": "스킬 참조 파일(고정 버전)",
    "canvasCloudAgentSettings.mcp.toolNodeWrite": "텍스트 / Markdown 노드 쓰기",
    "canvasCloudAgentSettings.mcp.toolMediaGenerate": "시스템 모델 미디어 생성 및 작업 조회",
    "canvasCloudAgentSettings.mcp.permissionBound": "권한 제약",
    "canvasCloudAgentSettings.mcp.customNote": "커스텀 MCP는 아직 열려 있지 않습니다. 실제 도구 권한, 키, 호출 한도는 Agent 백엔드가 검증하며, 브라우저에서 활성화된 것으로 가정하면 안 됩니다.",

    // 컨텍스트 작업 공간
    "canvasCloudAgentSettings.context.title": "Agent가 읽을 수 있는 것",
    "canvasCloudAgentSettings.context.subtitle": "이번 새 실행의 컨텍스트 범위에만 영향",

    // 예산 작업 공간
    "canvasCloudAgentSettings.budget.title": "이번 실행 누적 예산",
    "canvasCloudAgentSettings.budget.intro": "크레딧 예산은 비용 보호에 사용됩니다. 생성 작업과 영상 초에 0을 입력하면 해당 항목의 상한이 없어집니다. 모델 루프는 예산과 실행 상태로 제어되며 고정 횟수로 잘리지 않습니다.",
    "canvasCloudAgentSettings.budget.credits": "크레딧 상한",
    "canvasCloudAgentSettings.budget.creditsHint": "필수이며 0보다 커야 함. 모든 단계 누적",
    "canvasCloudAgentSettings.budget.tasks": "생성 작업 상한",
    "canvasCloudAgentSettings.budget.tasksHint": "0은 무제한. 읽기 전용 모드는 생성하지 않음",
    "canvasCloudAgentSettings.budget.video": "영상 초 상한",
    "canvasCloudAgentSettings.budget.videoHint": "0은 무제한. 요청 시간 기준 누적",

    // 섹션 제목
    "canvasCloudAgentSettings.sectionTitle.profile": "장기 설정",
    "canvasCloudAgentSettings.sectionTitle.mcp": "MCP와 도구",
    "canvasCloudAgentSettings.sectionTitle.context": "컨텍스트",
    "canvasCloudAgentSettings.sectionTitle.budget": "예산",
    "canvasCloudAgentSettings.sectionSubtitle.profile": "사용자·프로젝트·캔버스의 장기 행동 설정",
    "canvasCloudAgentSettings.sectionSubtitle.skills": "이번 실행의 스킬을 검색·설치·선택",
    "canvasCloudAgentSettings.sectionSubtitle.mcp": "클라우드 도구와 연결 상태",
    "canvasCloudAgentSettings.sectionSubtitle.context": "Agent가 읽을 수 있는 범위 제어",
    "canvasCloudAgentSettings.sectionSubtitle.budget": "이번 실행의 크레딧과 생성 소비 제어",
} as const;
export default messages;
