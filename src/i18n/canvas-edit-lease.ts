import { useAppLocale } from "./app-locale";
import { productionTraditionalText } from "./production-tools";

const copy = {
    "zh-CN": {
        pending: "正在获取编辑权限。输入保留在本地，尚未保存到云端。",
        conflict: "其他窗口正在编辑此节点。输入已保留；仍要编辑会等待对方结束后保存。同一字段有冲突时使用你的草稿，双方版本均保留。",
        error: "暂时无法确认编辑权限或合并云端版本。输入已保留。仍要编辑会重试，并在同字段冲突时使用你的草稿、保留双方版本。也可放弃此节点的修改。",
        continue: "仍要编辑", discard: "放弃此节点的修改",
    },
    "en-US": {
        pending: "Acquiring editing access. Your input stays local until it can be saved to the cloud.",
        conflict: "Another window is editing this node. Your input is kept. Continue editing waits for it to finish, then uses your draft for conflicting fields and keeps both versions.",
        error: "Editing access or the cloud merge could not be confirmed. Continue editing retries and uses your draft for conflicting fields, keeping both versions. You can also discard this node's changes.",
        continue: "Continue editing", discard: "Discard this node's changes",
    },
    "ja-JP": {
        pending: "編集権限を取得中です。入力はローカルに保持され、クラウドにはまだ保存されていません。",
        conflict: "別のウィンドウで編集中です。入力は保持されています。続けると相手の終了後に保存し、競合する項目は自分の下書きを優先して両方の版を保持します。",
        error: "編集権限の確認またはクラウドとの統合に失敗しました。続けると再試行し、競合する項目は自分の下書きを優先して両方の版を保持します。このノードの変更を破棄することもできます。",
        continue: "編集を続ける", discard: "このノードの変更を破棄",
    },
    "ko-KR": {
        pending: "편집 권한을 확인 중입니다. 입력은 로컬에 유지되며 아직 클라우드에 저장되지 않았습니다.",
        conflict: "다른 창에서 편집 중입니다. 입력은 보관됩니다. 계속하면 상대방이 마친 뒤 저장하며, 충돌한 항목은 내 초안을 사용하고 두 버전 모두 보관합니다.",
        error: "편집 권한 확인 또는 클라우드 병합에 실패했습니다. 계속하면 다시 시도하며 충돌한 항목은 내 초안을 사용하고 두 버전 모두 보관합니다. 이 노드의 변경을 취소할 수도 있습니다.",
        continue: "계속 편집", discard: "이 노드의 변경 취소",
    },
    "es-ES": {
        pending: "Obteniendo permiso de edición. Tu texto se conserva localmente hasta poder guardarlo en la nube.",
        conflict: "Otra ventana está editando este nodo. Tu texto se conserva. Continuar espera a que termine y usa tu borrador en los campos en conflicto, conservando ambas versiones.",
        error: "No se pudo confirmar el permiso o combinar la nube. Continuar reintenta y usa tu borrador en los campos en conflicto, conservando ambas versiones. También puedes descartar los cambios de este nodo.",
        continue: "Continuar editando", discard: "Descartar cambios de este nodo",
    },
    "pt-BR": {
        pending: "Obtendo permissão de edição. Seu texto fica local até poder ser salvo na nuvem.",
        conflict: "Outra janela está editando este nó. Seu texto foi mantido. Continuar aguarda a outra sessão e usa seu rascunho nos campos em conflito, preservando ambas as versões.",
        error: "Não foi possível confirmar a permissão ou mesclar a nuvem. Continuar tenta novamente e usa seu rascunho nos campos em conflito, preservando ambas as versões. Você também pode descartar as alterações deste nó.",
        continue: "Continuar editando", discard: "Descartar alterações deste nó",
    },
};
export function canvasEditLeaseText(locale: string) {
    if (locale === "zh-HK" || locale === "zh-TW") return Object.fromEntries(Object.entries(copy["zh-CN"]).map(([key, value]) => [key, productionTraditionalText(value, locale)])) as typeof copy["en-US"];
    return copy[locale as keyof typeof copy] || copy["en-US"];
}
export function useCanvasEditLeaseText() {
    return canvasEditLeaseText(useAppLocale());
}
