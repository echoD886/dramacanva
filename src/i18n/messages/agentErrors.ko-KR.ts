import generationFailure from "./generation-failure.ko-KR";
const messages = {
    ...generationFailure,
    "agentErrors.details": "상세 정보",
    "agentErrors.supportDetails": "기존 결과는 보존됩니다. 계속 진행할 수 없으면 관리자에게 도움을 요청하세요.",
    "agentErrors.purchase": "크레딧 충전",
    "agentErrors.prices": "요금 보기",
    "agentErrors.login": "다시 로그인",
    "agentErrors.required": "필요 크레딧: {amount}",
    "agentErrors.available": "사용 가능 잔액: {amount}",
    "agentErrors.notFoundTitle": "Agent 엔드포인트 또는 리소스를 찾을 수 없음",
    "agentErrors.notFoundText": "이 대화나 리소스를 사용할 수 없습니다. 캔버스를 새로 고치고 접근 권한을 확인하세요.",
    "agentErrors.notFoundMeta": "백엔드에 Agent 라우트가 로드되었는지, 캔버스·세션·모델에 여전히 접근 가능한지 확인하세요. 이전 프로세스는 업데이트 후 재시작이 필요합니다.",
    "agentErrors.notOpenTitle": "아직 이용할 수 없는 Agent 기능",
    "agentErrors.notOpenText": "이 기능을 사용할 수 없습니다. 다른 기능을 선택하거나 관리자에게 문의하세요.",
    "agentErrors.submitAcceptedCleanupFailed": "실행은 접수되었지만 로컬 제출 기록 정리에 실패했습니다",
    "agentErrors.submitRejected": "요청이 서버에서 거부되었습니다",
    "agentErrors.submitServerError": "서버가 오류를 반환했습니다. 재시도 시 원본 요청을 확인하고 중복 생성하지 않습니다",
    "agentErrors.submitUnconfirmed": "서버 확인 응답을 받지 못했습니다. 재시도 시 원본 요청을 확인하고 중복 생성하지 않습니다",
} as const;
export default messages;
