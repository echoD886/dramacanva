import type { BlogLocale } from "../../content/blog-locales";
import { PUBLIC_PAGE_TERMS } from "../../lib/public-product-copy";

type PanelCopy = {
    open: string;
    close: string;
    settings: string;
    unknown: string;
    notice: string;
    model: string;
    motion: string;
    keyframes: string;
    ratio: string;
    lens: string;
    import: string;
    guides: string;
    story: string;
    help: string;
    pricing: string;
};
const labels = {
    "zh-CN": [
        "工作流详情",
        "关闭",
        "原始生成设置",
        "尚未核实",
        "公开案例资料未核实原始模型、运动参数、首尾帧设置和镜头焦段。不会根据案例编号猜测这些数据；导入后请检查实际保存的节点设置与当前渠道能力。",
        "模型",
        "运动参数",
        "首尾帧设置",
        "画幅比例",
        "镜头焦段",
        "打开可编辑画布",
        "相关创作指南",
        "剧本与分镜指南",
        "帮助与故障排查",
    ],
    "zh-HK": [
        "工作流程詳情",
        "關閉",
        "原始生成設定",
        "尚未核實",
        "公開案例資料未核實原始模型、運動參數、首尾幀設定及鏡頭焦距。不會按案例編號猜測資料；匯入後請檢查實際儲存的節點設定及現有渠道功能。",
        "模型",
        "運動參數",
        "首尾幀設定",
        "畫面比例",
        "鏡頭焦距",
        "開啟可編輯畫布",
        "相關創作指南",
        "劇本與分鏡指南",
        "支援與疑難排解",
    ],
    "zh-TW": [
        "工作流程詳情",
        "關閉",
        "原始生成設定",
        "尚未確認",
        "公開案例資料未確認原始模型、運動參數、首尾影格設定及鏡頭焦距。不會依案例編號猜測資料；匯入後請檢查實際儲存的節點設定與目前管道支援的功能。",
        "模型",
        "運動參數",
        "首尾影格設定",
        "畫面比例",
        "鏡頭焦距",
        "開啟可編輯畫布",
        "相關創作指南",
        "劇本與分鏡指南",
        "支援與問題排解",
    ],
    "en-US": [
        "Workflow details",
        "Close",
        "Original generation settings",
        "Not verified",
        "The public case metadata does not verify the original model, motion parameters, keyframes or focal length. These values are not inferred from a case ID. After importing, check the saved node settings and your current provider capabilities.",
        "Model",
        "Motion parameters",
        "Keyframe settings",
        "Aspect ratio",
        "Focal length",
        "Open editable canvas",
        "Related creation guides",
        "Script and storyboard guide",
        "Help and troubleshooting",
    ],
    "ja-JP": [
        "ワークフローの詳細",
        "閉じる",
        "元の生成設定",
        "未確認",
        "公開事例の情報だけでは、元のモデル、動作パラメーター、開始・終了フレーム、焦点距離を確認できません。事例IDから推測せず、取り込み後に保存済みのノード設定と接続先の対応機能を確認してください。",
        "モデル",
        "動作パラメーター",
        "開始・終了フレーム",
        "画面比率",
        "焦点距離",
        "編集可能なキャンバスを開く",
        "関連する制作ガイド",
        "脚本・絵コンテガイド",
        "ヘルプ・トラブル対処",
    ],
    "ko-KR": [
        "워크플로우 상세",
        "닫기",
        "원본 생성 설정",
        "확인되지 않음",
        "공개 사례 정보만으로 원본 모델, 움직임 매개변수, 키프레임이나 초점 거리를 확인할 수 없습니다. 사례 ID로 값을 추측하지 않습니다. 가져온 뒤 저장된 노드 설정과 현재 제공업체의 지원 기능을 확인하세요.",
        "모델",
        "움직임 매개변수",
        "키프레임 설정",
        "화면 비율",
        "초점 거리",
        "편집 가능한 캔버스 열기",
        "관련 제작 가이드",
        "대본 및 콘티 가이드",
        "도움말 및 문제 해결",
    ],
    "es-ES": [
        "Detalles del flujo",
        "Cerrar",
        "Ajustes de generación originales",
        "Sin verificar",
        "Los datos públicos del caso no permiten verificar el modelo original, los parámetros de movimiento, los fotogramas clave ni la distancia focal. No deducimos esos valores del identificador del caso. Tras importarlo, revisa los ajustes guardados y las funciones de tu proveedor.",
        "Modelo",
        "Parámetros de movimiento",
        "Fotogramas clave",
        "Relación de aspecto",
        "Distancia focal",
        "Abrir lienzo editable",
        "Guías de creación relacionadas",
        "Guía de guion y storyboard",
        "Ayuda y solución de problemas",
    ],
    "pt-BR": [
        "Detalhes do fluxo",
        "Fechar",
        "Configurações originais de geração",
        "Não verificado",
        "Os dados públicos do caso não confirmam o modelo original, os parâmetros de movimento, os quadros-chave nem a distância focal. Não inferimos esses valores pelo identificador do caso. Após importar, confira as configurações salvas e os recursos do seu provedor.",
        "Modelo",
        "Parâmetros de movimento",
        "Quadros-chave",
        "Proporção",
        "Distância focal",
        "Abrir canvas editável",
        "Guias de criação relacionados",
        "Guia de roteiro e storyboard",
        "Ajuda e solução de problemas",
    ],
} satisfies Record<BlogLocale, readonly [string, string, string, string, string, string, string, string, string, string, string, string, string, string]>;

export const SHOWCASE_PANEL_COPY = Object.fromEntries(
    Object.entries(labels).map(([locale, values]) => {
        const [open, close, settings, unknown, notice, model, motion, keyframes, ratio, lens, importLabel, guides, story, help] = values;
        return [locale, { open, close, settings, unknown, notice, model, motion, keyframes, ratio, lens, import: importLabel, guides, story, help, pricing: PUBLIC_PAGE_TERMS[locale as BlogLocale].pricingLink }];
    }),
) as Record<BlogLocale, PanelCopy>;
