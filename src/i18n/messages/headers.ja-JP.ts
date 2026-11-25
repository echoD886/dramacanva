const headers = {
    "headers.title": "カスタムリクエストヘッダー",
    "headers.defaultAgent": "デフォルトで {agent} を送信します。User-Agent を追加するとデフォルト値が上書きされます。",
    "headers.addAgent": "User-Agent を追加",
    "headers.valueLabel": "リクエストヘッダー {index} の値",
    "headers.valuePlaceholder": "ヘッダーの値",
    "headers.nameLabel": "リクエストヘッダー {index} の名前",
    "headers.namePlaceholder": "ヘッダー名",
    "headers.remove": "リクエストヘッダーを削除",
    "headers.removeLabel": "リクエストヘッダー {index} を削除",
    "headers.add": "リクエストヘッダーを追加",
    "headers.limit": "カスタムリクエストヘッダーは最大 {count} 件まで設定できます。",
    "headers.invalidName": "ヘッダー名が無効です。標準的な HTTP ヘッダー名を使用してください。",
    "headers.managed": "{name} はシステムによって管理されているため、カスタマイズできません。",
    "headers.duplicate": "リクエストヘッダーが重複しています：{name}",
    "headers.controlCharacter": "{name} の値に無効な制御文字が含まれています。",
    "headers.tooLong": "ヘッダー名または値が長すぎます。",
    "headers.tooLarge": "カスタムリクエストヘッダーの合計サイズは 16KB を超えることはできません。"
} as const;
export default headers;

