const messages = {
    "generationErrors.moderation": "Content review failed. Platform credits were not charged or have been returned to your balance. Edit the prompt before generating again.",
    "generationErrors.failed": "Generation failed. Try again later.",
    "generationErrors.network": "Network error.",
    "generationErrors.busy": "The service is busy. Try again later.",
    "generationErrors.auth": "Generation service authentication failed. Check the channel configuration.",
    "generationErrors.address": "The generation service address is unavailable. Check the channel configuration.",
    "generationErrors.spawn": "Could not start the official Dreamina CLI. The task has not been submitted.",
    "generationErrors.exit": "The official Dreamina CLI did not accept this submission. The task was not retried automatically.",
    "generationErrors.timeout": "Timed out waiting for the official Dreamina CLI to confirm submission. No automatic retry was made to avoid duplicate charges.",
    "generationErrors.receipt": "The official Dreamina CLI returned no task receipt. No automatic retry was made to avoid duplicate charges.",
    "generationErrors.unknown": "Submission is awaiting confirmation. No automatic retry was made to avoid duplicate charges.",
    "generationErrors.storageDisabled": "The object storage account is disabled. Check or replace the object storage configuration.",
    "generationErrors.storageUpload": "Failed to upload reference assets to object storage. Check the storage configuration and try again.",
    "generationErrors.audioReferenceRequired": "Connect reference audio to use voice references",
    "generationErrors.audioReferenceUnsupported": "This audio protocol does not support voice references",
    "generationErrors.audioVoiceBindingChanged": "Character or audio connections have changed. Check the voice bindings.",
} as const;
export default messages;
