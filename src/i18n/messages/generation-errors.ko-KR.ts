const messages = {
    "generationErrors.moderation": "콘텐츠 검토를 통과하지 못했습니다. 이번 플랫폼 크레딧은 차감되지 않았거나 반환되었습니다. 프롬프트를 수정한 후 다시 생성하세요.",
    "generationErrors.failed": "생성에 실패했습니다. 나중에 다시 시도하세요.",
    "generationErrors.network": "네트워크 오류입니다.",
    "generationErrors.busy": "현재 서비스가 혼잡합니다. 나중에 다시 시도하세요.",
    "generationErrors.auth": "생성 서비스 인증에 실패했습니다. 채널 설정을 확인하세요.",
    "generationErrors.address": "생성 서비스 주소를 사용할 수 없습니다. 채널 설정을 확인하세요.",
    "generationErrors.spawn": "공식 Dreamina CLI를 시작할 수 없습니다. 작업은 아직 제출되지 않았습니다.",
    "generationErrors.exit": "공식 Dreamina CLI가 이번 제출을 수락하지 않았습니다. 작업을 자동으로 재시도하지 않았습니다.",
    "generationErrors.timeout": "공식 Dreamina CLI의 제출 확인 시간이 초과되었습니다. 중복 청구를 방지하기 위해 자동으로 재시도하지 않았습니다.",
    "generationErrors.receipt": "공식 Dreamina CLI가 작업 접수 정보를 반환하지 않았습니다. 중복 청구를 방지하기 위해 자동으로 재시도하지 않았습니다.",
    "generationErrors.unknown": "제출 결과 확인 대기 중입니다. 중복 청구를 방지하기 위해 자동으로 재시도하지 않았습니다.",
    "generationErrors.storageDisabled": "객체 스토리지 계정이 비활성화되었습니다. 객체 스토리지 설정을 확인하거나 변경하세요.",
    "generationErrors.storageUpload": "참조 에셋을 객체 스토리지에 업로드하지 못했습니다. 스토리지 설정을 확인한 후 다시 시도하세요.",
    "generationErrors.audioReferenceRequired": "참조 오디오를 연결하세요",
    "generationErrors.audioReferenceUnsupported": "이 오디오 프로토콜은 참조 음성을 지원하지 않습니다",
    "generationErrors.audioVoiceBindingChanged": "캐릭터 또는 오디오 연결이 변경되었습니다. 음성 연결을 확인하세요.",
} as const;
export default messages;
