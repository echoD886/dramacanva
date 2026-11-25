const promptMetadata = {
    "promptMetadata.categoryStoryboard": "絵コンテ",
    "promptMetadata.categoryGeneration": "生成",
    "promptMetadata.categoryCharacter": "キャラクター",
    "promptMetadata.storyboard_plan.title": "絵コンテ設計",
    "promptMetadata.storyboard_plan.description": "ストーリー、画風、キャラクター設定を実行可能なカットへと構成します。",
    "promptMetadata.storyboard_repair.title": "絵コンテ修復",
    "promptMetadata.storyboard_repair.description": "モデルから返された絵コンテの構造、フィールド、カットの複雑度を修復します。",
    "promptMetadata.storyboard_first_frame.title": "カットの初期フレーム",
    "promptMetadata.storyboard_first_frame.description": "単一カットの構成を画像モデル用の初期フレームプロンプトに変換します。",
    "promptMetadata.storyboard_video.title": "カット動画",
    "promptMetadata.storyboard_video.description": "単一カットの構成を動画モデル用の簡潔な実行プロンプトに変換します。",
    "promptMetadata.character_extract.title": "キャラクターシート抽出",
    "promptMetadata.character_extract.description": "チャプター本文からカット間の一貫性が必要なキャラクター情報を抽出します。",
    "promptMetadata.character_turnaround.title": "キャラクター三面図",
    "promptMetadata.character_turnaround.description": "現在のキャラクター設定と画風に合わせて、正面・側面・背面の三面図を生成します。",
} as const;
export default promptMetadata;
