const messages = {
    "generationErrors.moderation": "コンテンツ審査を通過しませんでした。今回のプラットフォームクレジットは未課金、または返還済みです。プロンプトを修正して再生成してください。",
    "generationErrors.failed": "生成に失敗しました。しばらくしてから再試行してください。",
    "generationErrors.network": "ネットワークエラー。",
    "generationErrors.busy": "サービスが混雑しています。しばらくしてから再試行してください。",
    "generationErrors.auth": "生成サービスの認証に失敗しました。チャネル設定を確認してください。",
    "generationErrors.address": "生成サービスのアドレスを利用できません。チャネル設定を確認してください。",
    "generationErrors.spawn": "公式Dreamina CLIを起動できません。タスクはまだ送信されていません。",
    "generationErrors.exit": "公式Dreamina CLIが今回の送信を受け付けませんでした。タスクの自動再試行は行われていません。",
    "generationErrors.timeout": "公式Dreamina CLIによる送信確認がタイムアウトしました。二重課金を避けるため、自動再試行は行われていません。",
    "generationErrors.receipt": "公式Dreamina CLIからタスクの受領情報が返されませんでした。二重課金を避けるため、自動再試行は行われていません。",
    "generationErrors.unknown": "送信結果の確認待ちです。二重課金を避けるため、自動再試行は行われていません。",
    "generationErrors.storageDisabled": "オブジェクトストレージのアカウントが無効です。設定を確認するか変更してください。",
    "generationErrors.storageUpload": "参照素材をオブジェクトストレージにアップロードできませんでした。設定を確認して再試行してください。",
    "generationErrors.audioReferenceRequired": "参照音声を接続してください",
    "generationErrors.audioReferenceUnsupported": "この音声プロトコルは参照音声に対応していません",
    "generationErrors.audioVoiceBindingChanged": "キャラクターまたは音声の接続が変わりました。声の対応を確認してください。",
} as const;
export default messages;
