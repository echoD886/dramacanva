const headers = {
    "headers.title": "사용자 정의 요청 헤더",
    "headers.defaultAgent": "기본 전송 값: {agent}. User-Agent를 추가하면 이 값이 대체됩니다.",
    "headers.addAgent": "User-Agent 추가",
    "headers.valueLabel": "요청 헤더 {index} 값",
    "headers.valuePlaceholder": "헤더 값",
    "headers.nameLabel": "요청 헤더 {index} 이름",
    "headers.namePlaceholder": "헤더 이름",
    "headers.remove": "요청 헤더 삭제",
    "headers.removeLabel": "요청 헤더 {index} 삭제",
    "headers.add": "요청 헤더 추가",
    "headers.limit": "사용자 정의 요청 헤더는 최대 {count}개까지 지원됩니다.",
    "headers.invalidName": "유효하지 않은 헤더 이름입니다. 표준 HTTP 헤더 이름을 사용해 주세요.",
    "headers.managed": "{name}: 시스템에서 관리하는 헤더이므로 직접 설정할 수 없습니다.",
    "headers.duplicate": "요청 헤더는 중복될 수 없습니다: {name}",
    "headers.controlCharacter": "{name}의 값에 잘못된 제어 문자가 포함되어 있습니다.",
    "headers.tooLong": "단일 헤더 이름 또는 값이 너무 깁니다.",
    "headers.tooLarge": "사용자 정의 요청 헤더의 총 크기는 16KB를 초과할 수 없습니다."
} as const;
export default headers;

