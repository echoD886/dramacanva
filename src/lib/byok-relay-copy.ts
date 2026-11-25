import type { BlogLocale } from "../content/blog-locales";
export interface ByokRelayCopy {
    title: string;
    question: string;
    answer: string;
    setup: string;
    safety: string;
    keywords: string;
}
/** Shared by visible FAQs, guides, metadata and machine-readable exports. */
export const BYOK_RELAY_COPY: Record<BlogLocale, ByokRelayCopy> = {
    "zh-CN": {
        title: "连接自带模型与第三方中转站",
        question: "可以连接 OneAPI、NewAPI 和自定义 Header 吗？",
        answer: "BYOK 支持配置自有 API 地址、模型密钥和自定义 Header。使用 OneAPI、NewAPI 等中转站时，需要选择与其实际接口匹配的 OpenAI、Gemini 或 Claude 协议，并核对模型 ID 及图像、视频接口支持情况；不是所有中转站和私有协议都能直接使用。BYOK 模型调用不加收平台模型费用、不扣平台生成积分，但工作空间服务和上游模型费用仍分别收取。",
        setup: "在模型渠道设置中填写 Base URL 和 API Key，按供应商文档选择协议、模型 ID 与所需 Header。先确认所需的文生图、图生视频等能力，再开始生成；接口路径、分辨率和首尾帧参数以实际渠道为准。不支持的渠道可以提交适配申请，申请不代表已兼容。",
        safety: "仅连接你信任的渠道，生产连接使用 HTTPS。自定义请求经登录态后端转发；必要的提示词、参考素材和凭证会参与请求。不要把 API Key、密码或含密钥的 Header 放进公开画布、截图或客服申请。",
        keywords: "BYOK, 自带模型渠道, 第三方API中转站, OneAPI, NewAPI, 自定义Header",
    },
    "zh-HK": {
        title: "連接自帶模型與第三方中轉站",
        question: "可以連接 OneAPI、NewAPI 同自訂 Header 嗎？",
        answer: "BYOK 支援自訂 API 地址、模型金鑰同 Header。使用 OneAPI、NewAPI 等中轉站時，要揀與實際接口相符嘅 OpenAI、Gemini 或 Claude 協議，並核對模型 ID 同圖片、影片接口；唔係所有中轉站或私有協議都可直接使用。BYOK 模型調用唔加收平台模型費用，亦唔扣平台生成積分；工作空間服務同供應商模型費用仍分開收取。",
        setup: "喺模型渠道設定填寫 Base URL 同 API Key，按供應商文件設定協議、模型 ID 同所需 Header。先確認文字生圖、圖片轉影片等功能，再開始生成；接口路徑、解像度同首尾幀參數以實際渠道為準。未支援嘅渠道可提交適配申請，申請唔代表已相容。",
        safety: "只連接你信任嘅渠道，正式環境使用 HTTPS。自訂請求會經已登入嘅後端轉發；所需提示詞、參考素材同憑證會參與請求。唔好將 API Key、密碼或含金鑰嘅 Header 放入公開畫布、截圖或客服申請。",
        keywords: "BYOK, 自帶模型, 第三方API中轉站, OneAPI, NewAPI, 自訂Header",
    },
    "zh-TW": {
        title: "串接自帶模型與第三方中轉站",
        question: "可以串接 OneAPI、NewAPI 和自訂 Header 嗎？",
        answer: "BYOK 支援自訂 API 網址、模型金鑰與 Header。使用 OneAPI、NewAPI 等中轉站時，需選擇與實際介面相符的 OpenAI、Gemini 或 Claude 協定，並核對模型 ID 及圖片、影片介面的支援情況；並非所有中轉站或私有協定都能直接使用。BYOK 模型呼叫不加收平台模型費用，也不扣平台生成點數；工作空間服務與上游模型費用仍分別收取。",
        setup: "在模型管道設定中填入 Base URL 和 API Key，依供應商文件設定協定、模型 ID 與所需 Header。先確認文字生圖、圖片轉影片等功能，再開始生成；介面路徑、解析度與首尾影格參數以實際管道為準。尚未支援的管道可提出適配申請，申請不代表已完成相容。",
        safety: "只串接你信任的管道，正式環境使用 HTTPS。自訂請求會經登入後的後端轉送；必要的提示詞、參考素材與憑證會參與請求。不要將 API Key、密碼或含金鑰的 Header 放進公開畫布、截圖或客服申請。",
        keywords: "BYOK, 自帶模型金鑰, 第三方API中轉站, OneAPI, NewAPI, 自訂Header",
    },
    "en-US": {
        title: "Connect your own API channels and third-party relays",
        question: "Can I connect OneAPI, NewAPI and custom headers?",
        answer: "BYOK supports a custom API endpoint, model key and headers. For OneAPI, NewAPI or another relay, select the OpenAI, Gemini or Claude protocol that matches its actual API, then check model IDs and image/video endpoint support. Not every relay or private protocol works automatically. BYOK model calls have no platform model markup or platform generation-credit deduction; workspace access and provider usage are still billed separately.",
        setup: "In model-channel settings, enter the Base URL and API key, then configure the protocol, model IDs and required headers from your provider's documentation. Check the image and video modes you need before generating. Paths, resolutions and first/last-frame inputs depend on the connected channel. An adaptation request for an unsupported channel is not a compatibility guarantee.",
        safety: "Connect only trusted providers and use HTTPS in production. Custom requests are forwarded through the authenticated backend; required prompts, reference assets and credentials take part in the request. Never put API keys, passwords or secret-bearing headers in public canvases, screenshots or support requests.",
        keywords: "BYOK, custom model channels, third-party API relay, OneAPI, NewAPI, custom API headers",
    },
    "ja-JP": {
        title: "自分のAPIと外部のAPI中継サービスを接続する",
        question: "OneAPI、NewAPIやカスタムヘッダーを使えますか？",
        answer: "BYOKではAPIの接続先、モデルのキー、カスタムヘッダーを設定できます。OneAPIやNewAPIなどを使う場合は、実際のAPIに合うOpenAI・Gemini・Claudeの方式を選び、モデルIDと画像・動画APIの対応状況を確認してください。すべての中継サービスや独自仕様に自動対応するわけではありません。BYOKでのモデル利用にはプラットフォームの上乗せ料金や生成クレジットの消費はありませんが、ワークスペースとモデル提供元の利用料金は別途かかります。",
        setup: "モデルの接続設定でBase URLとAPIキーを入力し、提供元のドキュメントに従ってAPIの方式、モデルID、必要なヘッダーを設定します。生成前に、使いたい画像・動画の生成方式に対応しているか確認してください。パス、解像度、開始・終了フレームの指定方法は接続先によって異なります。未対応サービスの接続リクエストは、対応を保証するものではありません。",
        safety: "信頼できる提供元だけに接続し、本番環境ではHTTPSを使用してください。リクエストはログイン認証されたバックエンドを経由し、必要なプロンプト、参考素材、認証情報が送信に使われます。APIキー、パスワード、秘密情報を含むヘッダーを公開キャンバスやスクリーンショット、サポートへの申請に載せないでください。",
        keywords: "BYOK, 自分のAPIキー, API中継サービス, OneAPI, NewAPI, カスタムヘッダー",
    },
    "ko-KR": {
        title: "내 API 채널과 외부 API 중계 서비스 연결하기",
        question: "OneAPI, NewAPI와 사용자 지정 헤더를 연결할 수 있나요?",
        answer: "BYOK에서는 API 주소, 모델 키와 사용자 지정 헤더를 설정할 수 있습니다. OneAPI나 NewAPI 같은 중계 서비스를 쓸 때는 실제 API에 맞는 OpenAI, Gemini 또는 Claude 방식을 선택하고 모델 ID와 이미지·영상 API 지원 여부를 확인하세요. 모든 중계 서비스나 비공개 규격이 자동으로 호환되는 것은 아닙니다. BYOK 모델 호출에는 플랫폼 추가 마진이나 생성 크레딧 차감이 없지만, 작업 공간과 모델 제공업체 이용료는 별도로 청구됩니다.",
        setup: "모델 채널 설정에 Base URL과 API 키를 입력한 뒤 제공업체 문서에 따라 API 방식, 모델 ID와 필요한 헤더를 설정하세요. 생성 전에 원하는 이미지·영상 생성 방식을 지원하는지 확인하세요. 경로, 해상도와 시작·끝 프레임 입력은 연결한 채널에 따라 다릅니다. 미지원 채널의 연동 신청이 호환성 보장을 뜻하지는 않습니다.",
        safety: "신뢰하는 제공업체만 연결하고 운영 환경에서는 HTTPS를 사용하세요. 요청은 로그인 인증된 백엔드를 거쳐 전달되며 필요한 프롬프트, 참고 자료와 인증 정보가 요청에 사용됩니다. API 키, 비밀번호나 비밀 정보가 든 헤더를 공개 캔버스, 스크린샷 또는 지원 신청에 포함하지 마세요.",
        keywords: "BYOK, 내 API 키, API 중계 서비스, OneAPI, NewAPI, 사용자 지정 헤더",
    },
    "es-ES": {
        title: "Conecta tus propias API y servicios de intermediación",
        question: "¿Puedo conectar OneAPI, NewAPI y cabeceras personalizadas?",
        answer: "BYOK permite configurar la dirección de la API, la clave del modelo y cabeceras personalizadas. Con OneAPI, NewAPI u otro intermediario, elige el protocolo OpenAI, Gemini o Claude que corresponda a su API y comprueba los identificadores de modelo y la compatibilidad de las API de imagen y vídeo. No todos los servicios o protocolos privados funcionan automáticamente. Las llamadas BYOK no tienen recargo de plataforma ni consumen créditos de generación de la plataforma; el espacio de trabajo y el uso del proveedor se cobran por separado.",
        setup: "En los ajustes del canal, introduce la Base URL y la clave API. Configura el protocolo, los identificadores de modelo y las cabeceras siguiendo la documentación del proveedor. Comprueba los modos de imagen y vídeo antes de generar. Las rutas, resoluciones y entradas de fotograma inicial y final dependen del canal. Solicitar la adaptación de un servicio no garantiza su compatibilidad.",
        safety: "Conecta solo proveedores de confianza y utiliza HTTPS en producción. Las solicitudes pasan por el servidor con autenticación e incluyen los prompts, las referencias y las credenciales necesarios. No incluyas claves API, contraseñas ni cabeceras con secretos en lienzos públicos, capturas de pantalla o solicitudes de soporte.",
        keywords: "BYOK, claves API propias, intermediario de API, OneAPI, NewAPI, cabeceras personalizadas",
    },
    "pt-BR": {
        title: "Conecte suas APIs e serviços de intermediação",
        question: "Posso conectar OneAPI, NewAPI e cabeçalhos personalizados?",
        answer: "O BYOK permite configurar o endereço da API, a chave do modelo e cabeçalhos personalizados. Ao usar OneAPI, NewAPI ou outro intermediário, selecione o protocolo OpenAI, Gemini ou Claude correspondente à API e confira os IDs dos modelos e o suporte às APIs de imagem e vídeo. Nem todo serviço ou protocolo privado funciona automaticamente. Chamadas BYOK não têm acréscimo da plataforma sobre o custo dos modelos nem descontam créditos de geração da plataforma; o espaço de trabalho e o uso do provedor são cobrados separadamente.",
        setup: "Nas configurações do canal, informe a Base URL e a chave API. Defina o protocolo, os IDs dos modelos e os cabeçalhos conforme a documentação do provedor. Confira os modos de imagem e vídeo antes de gerar. Endereços, resoluções e entradas de quadro inicial e final dependem do canal conectado. Solicitar a adaptação de um canal não garante sua compatibilidade.",
        safety: "Conecte apenas provedores de confiança e use HTTPS em produção. As solicitações passam pelo backend autenticado e utilizam os prompts, as referências e as credenciais necessários. Não coloque chaves API, senhas ou cabeçalhos com segredos em canvases públicos, capturas de tela ou pedidos de suporte.",
        keywords: "BYOK, chaves API próprias, intermediário de API, OneAPI, NewAPI, cabeçalhos personalizados",
    },
};
export function byokRelayFaq(locale: BlogLocale) {
    const { question, answer } = BYOK_RELAY_COPY[locale];
    return { question, answer };
}
