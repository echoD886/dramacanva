import generationFailure from "./generation-failure.ja-JP";
const messages = {
    ...generationFailure,
    "agentErrors.details": "詳細",
    "agentErrors.supportDetails": "既存の結果は保存されます。続行できない場合は、管理者にお問い合わせください。",
    "agentErrors.purchase": "クレジットをチャージ",
    "agentErrors.prices": "料金を見る",
    "agentErrors.login": "再ログイン",
    "agentErrors.required": "必要クレジット：{amount}",
    "agentErrors.available": "利用可能残高：{amount}",
    "agentErrors.notFoundTitle": "Agent のエンドポイントまたはリソースが見つかりません",
    "agentErrors.notFoundText": "この会話またはリソースは利用できません。キャンバスを更新し、アクセス権を確認してください。",
    "agentErrors.notFoundMeta": "バックエンドに Agent ルートが読み込まれているか、キャンバス・セッション・モデルにアクセスできるか確認してください。古いプロセスは更新と再起動が必要です。",
    "agentErrors.notOpenTitle": "この Agent 機能はまだ利用できません",
    "agentErrors.notOpenText": "この機能は利用できません。別の機能を選ぶか管理者にお問い合わせください。",
    "agentErrors.submitAcceptedCleanupFailed": "実行は受け付けられましたが、ローカルの送信記録の削除に失敗しました",
    "agentErrors.submitRejected": "リクエストはサーバーに拒否されました",
    "agentErrors.submitServerError": "サーバーがエラーを返しました。再試行時は元のリクエストを確認し、重複して作成しません",
    "agentErrors.submitUnconfirmed": "サーバーの確認応答がありません。再試行時は元のリクエストを確認し、重複して作成しません",
} as const;
export default messages;
