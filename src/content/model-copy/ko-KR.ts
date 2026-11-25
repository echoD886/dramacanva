import type { ModelLocaleCopy } from "../model-pages";

export const copy: ModelLocaleCopy = {
    video: "AI 영상 생성",
    image: "AI 이미지 생성",
    free: "무료",
    online: "온라인",
    supported: "지원 모델",
    versions: "지원 버전",
    provider: "개발사",
    generationOptions: "생성 옵션",
    capabilities: "생성 옵션",
    scenes: "숏드라마 활용",
    stepsTitle: "DramaCanvas에서 {alias} 사용법 및 제작 가이드",
    faqTitle: "자주 묻는 질문",
    pricing: "요금제",
    home: "홈",
    cta: "{alias} 무료로 시작하기",
    intro: "DramaCanvas 웹 캔버스에서 {alias}({model}) 모델로 숏폼 드라마와 AI 영상 소스를 제작해 보세요. 무료 콘티·스토리보드 기획부터 API 연동과 요금제까지 확인하고 바로 생성할 수 있습니다.",
    controls: "사용 가능한 해상도 및 생성 옵션은 선택한 모델과 버전 설정에 따라 달라집니다. 생성 전 캔버스 모델 선택기에서 확인하세요.",
    tiers: "지원 해상도",
    steps: [
        "DramaCanvas 웹 캔버스를 열고, 대본을 씬별 콘티와 스토리보드 컷으로 구조화합니다.",
        "생성 노드를 추가해 {alias} 모델을 선택하고 컷 프롬프트를 작성합니다. 선택한 버전이 지원하는 경우에만 캐릭터나 구도 참조 이미지를 연결합니다.",
        "해상도 설정과 소모 예정 크레딧을 확인한 후 생성을 실행하고, 나온 결과를 스토리보드 기획과 비교 검증합니다.",
        "채택한 이미지는 다음 컷의 일관성 참조로 보관하고, 생성된 영상 컷은 타임라인에 배열해 완성도 높은 숏폼 드라마로 편집합니다.",
    ],
    scene: {
        action: "인물의 역동적인 동작, 등장 씬, 카메라 무빙 전환을 개별 컷으로 세분화해 기획하세요. 캔버스에서 여러 생성 테이크를 나란히 비교한 후 최상의 클립을 타임라인 편집에 활용할 수 있습니다.",
        story: "대본 흐름에 맞춰 공간을 보여주는 설정 샷(익스태블리싱), 인물 간 대화 컷, 회차 간 긴장감 넘치는 전환 씬을 연출하세요. 앞뒤 콘티 컷과의 연결성을 한눈에 대조하며 완성도를 높입니다.",
        character: "숏드라마 주연의 비주얼 콘셉트, 표정 반응 샷, 반복 등장하는 캐릭터 레퍼런스를 설계하세요. 모델이 지원할 경우 확정된 참조 이미지를 재사용할 수 있으나, 인물 일관성은 반드시 직접 검수해야 합니다.",
        art: "드라마의 시대적 배경, 의상 스타일, 조명 톤앤매너 등 시각적 연출 방향을 탐색하세요. 마음에 드는 생성 이미지를 캔버스 콘티 옆에 배치해 전체 제작의 핵심 미술 레퍼런스로 활용합니다.",
    },
    faq: [
        {
            question: "{alias} 무료로 쓸 수 있나요?",
            answer: "DramaCanvas의 작업 캔버스와 수동 대본 작성, 콘티 편집은 무료로 이용할 수 있습니다. {alias} 모델을 통한 이미지 및 영상 생성은 크레딧이 차감되며, AI 대본과 AI 콘티 역시 크레딧으로 차감됩니다. 무료 기획이 모델 무료 호출을 보장하는 것은 아닙니다.",
        },
        {
            question: "{alias} API 연동이나 MCP 워크플로우를 지원하나요?",
            answer: "DramaCanvas MCP를 통해 Claude Code, Cursor, Codex 등 AI Agent에서 캔버스 작업을 직접 제어하거나, BYOK(Bring Your Own Key)로 호환 API를 연결할 수 있습니다. 본 페이지는 해당 모델 개발사의 공식 API 공급처가 아니며 공식 제휴 관계를 의미하지 않습니다.",
        },
        {
            question: "{alias} 가격과 크레딧 요금은 어떻게 계산되나요?",
            answer: "최신 요금제 플랜 및 크레딧 단가는 요금 페이지에서 확인하실 수 있습니다. 캔버스에서 생성을 누르기 전 해상도와 옵션에 따른 확정 소모 크레딧이 미리 표시됩니다. BYOK 연결 시 업스트림 모델 API 비용과 DramaCanvas 작업 공간 서비스 요금은 각각 별도로 청구됩니다.",
        },
        {
            question: "{alias}에서 지원하는 최신 버전은 무엇인가요?",
            answer: "현재 연동된 버전은 {versions}입니다. 실제 사용 가능한 해상도와 파라미터는 캔버스 내 실시간 모델 선택기(Selector)의 최신 설정을 따르며, 이름이 유사한 개발사의 타 제품군이 자동으로 포함되지는 않습니다.",
        },
        {
            question: "{alias}만으로 완성된 숏폼 드라마를 한 번에 만들 수 있나요?",
            answer: "AI 모델 한 번의 호출로 완벽하고 일관된 드라마 한 편이 자동 완성되지는 않습니다. 씬별 개별 컷을 생성한 뒤 주연 캐릭터의 시각적 연속성을 직접 검수하고, 타임라인에서 컷들을 배치·편집해야 완성도 높은 숏폼 드라마 에피소드가 제작됩니다.",
        },
    ],
    casesTitle: "{alias} 커뮤니티 사례와 프롬프트",
    casesIntro: "크리에이터들이 {alias} 모델로 만들어 오픈소스 프롬프트 모음에 공개한 실제 결과물입니다. 원본 프롬프트와 제작자 출처를 함께 표기했습니다. 프롬프트를 복사해 캔버스에서 내 작품에 맞게 바꿔 보세요.",
    promptLabel: "프롬프트",
    copyPrompt: "프롬프트 복사",
    copied: "복사됨",
    tryPrompt: "이 프롬프트로 생성하기",
    translatedNote: "원문에서 번역된 프롬프트입니다",
    creditBy: "제작",
    creditSource: "출처",
    capabilitiesTitle: "{alias} 모델로 할 수 있는 작업",
    capabilitiesIntro: "숏드라마 제작의 실제 작업: {alias}에 무엇을 넣고, 무엇을 얻고, 어느 단계에 쓰는지.",
    problemsTitle: "{alias} 모델로 숏드라마를 만들 때 자주 겪는 문제와 여기서의 해결 방법",
    problemsIntro: "크리에이터가 실제로 겪는 문제와 DramaCanvas의 대응 방식입니다.",
    seeExample: "예시 보기",
};

// Native model names readers search for in this market, used via {alias} in the copy above. Missing slugs fall back to the English name.
export const aliases: Record<string, string> = {
    "sora-2": "소라2",
    "kling-3-0": "클링",
    "minimax-h3": "하이루오",
    "grok-imagine": "그록 이매진",
    "nano-banana": "나노바나나",
    "midjourney-v7": "미드저니",
};
