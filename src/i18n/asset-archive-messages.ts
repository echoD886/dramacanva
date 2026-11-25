import { currentLocaleText } from "./current-locale-text";
import type { MessageKey, MessageValues } from "./messages";
import type {
    AssetArchiveErrorReason,
    AssetArchiveEvidence,
    AssetArchiveRetainReason,
    AssetArchiveSuccessReason,
    AssetSectionResult,
    AssetSourceCode,
} from "../types/asset-archive";

const ARCHIVE_ERROR_REASON_KEYS: Record<AssetArchiveErrorReason, MessageKey> = {
    "invalid-location": "archiveError.invalidLocation",
    "dual-primary-location": "archiveError.dualPrimaryLocation",
    "invalid-batch": "archiveError.invalidBatch",
    "duplicate-asset": "archiveError.duplicateAsset",
    "expected-location-required": "archiveError.expectedLocationRequired",
    "asset-not-found": "archiveError.assetNotFound",
    "target-not-found": "archiveError.targetNotFound",
    "target-forbidden": "archiveError.targetForbidden",
    "location-conflict": "archiveError.locationConflict",
    "evidence-changed": "archiveError.evidenceChanged",
    "asset-archived": "archiveError.assetArchived",
    "offline": "archiveError.offline",
    "sync-required": "archiveError.syncRequired",
    "media-unavailable": "archiveError.mediaUnavailable",
    "media-registration-failed": "archiveError.mediaRegistrationFailed",
    "storage-failed": "archiveError.storageFailed",
    "internal-error": "archiveError.internalError",
    "invalid-category": "archiveError.invalidCategory",
    "classification-conflict": "archiveError.classificationConflict",
};

const ARCHIVE_RETAIN_REASON_KEYS: Record<AssetArchiveRetainReason, MessageKey> = {
    "existing-location": "archiveWizard.retain.existingLocation",
    "recycle-bin": "archiveWizard.retain.recycleBin",
    "conflicting-evidence": "archiveWizard.retain.conflictingEvidence",
    "target-missing": "archiveWizard.retain.targetMissing",
    "target-forbidden": "archiveWizard.retain.targetForbidden",
    "multiple-references": "archiveWizard.retain.multipleReferences",
    "no-evidence": "archiveWizard.retain.noEvidence",
};

const ARCHIVE_EVIDENCE_KEYS: Record<AssetArchiveEvidence, MessageKey> = {
    "metadata-canvas": "archiveWizard.evidence.metadataCanvas",
    "task-context": "archiveWizard.evidence.taskContext",
    "production-task-link": "archiveWizard.evidence.productionTaskLink",
    "unique-reference": "archiveWizard.evidence.uniqueReference",
};

const ARCHIVE_SUCCESS_REASON_KEYS: Record<AssetArchiveSuccessReason, MessageKey> = {
    "moved": "archiveResult.moved",
    "already-at-target": "archiveResult.alreadyAtTarget",
    "target-missing-unfiled": "archiveResult.targetMissingUnfiled",
};

const ASSET_SECTION_KEYS: Record<AssetSectionResult | "all", MessageKey> = {
    all: "assets.section.all",
    character: "assets.section.character",
    environment: "assets.section.environment",
    prop: "assets.section.prop",
    shot: "assets.section.shot",
    audio: "assets.section.audio",
    other: "assets.section.other",
    pending: "assets.section.pending",
};

const ASSET_SOURCE_CODE_KEYS: Record<AssetSourceCode, MessageKey> = {
    unknown: "assets.source.unknown",
    manual: "assets.source.manual",
    "canvas-manual": "assets.source.canvasManual",
    "canvas-upload": "assets.source.canvasUpload",
    "canvas-generation": "assets.source.canvasGeneration",
    "generation-task": "assets.source.generationTask",
    "create-page": "assets.source.createPage",
    "create-upload": "assets.source.createUpload",
    "short-drama-workflow": "assets.source.shortDramaWorkflow",
    "short-drama-chapter-storyboard": "assets.source.shortDramaChapterStoryboard",
    "art-critique": "assets.source.artCritique",
    "cloud-agent": "assets.source.cloudAgent",
    "tasks-page": "assets.source.tasksPage",
    "eagle-import": "assets.source.eagleImport",
    "external-import": "assets.source.externalImport",
    "editor-upload": "assets.source.editorUpload",
    "project-upload": "assets.source.projectUpload",
    "deleted-canvas": "assets.source.deletedCanvas",
};

export function archiveErrorReasonKey(reason: unknown): MessageKey {
    if (typeof reason === "string" && Object.hasOwn(ARCHIVE_ERROR_REASON_KEYS, reason)) {
        return ARCHIVE_ERROR_REASON_KEYS[reason as AssetArchiveErrorReason];
    }
    return "archiveError.generic";
}

export function archiveErrorActionKey(reason: unknown): MessageKey {
    switch (reason) {
        case "location-conflict":
        case "classification-conflict":
        case "sync-required":
            return "archiveAction.refresh";
        case "offline":
        case "storage-failed":
        case "internal-error":
        case "media-registration-failed":
            return "archiveAction.retry";
        case "target-not-found":
        case "target-forbidden":
        case "invalid-location":
        case "invalid-category":
        case "dual-primary-location":
            return "archiveAction.reselect";
        case "evidence-changed":
            return "archiveAction.backToUnfiled";
        case "asset-archived":
            return "archiveAction.viewInRecycleBin";
        default:
            return "archiveAction.retry";
    }
}

export function archiveRetainReasonKey(reason: unknown): MessageKey {
    if (typeof reason === "string" && Object.hasOwn(ARCHIVE_RETAIN_REASON_KEYS, reason)) {
        return ARCHIVE_RETAIN_REASON_KEYS[reason as AssetArchiveRetainReason];
    }
    return "archiveWizard.retain.noEvidence";
}

export function archiveEvidenceKey(evidence: unknown): MessageKey {
    if (typeof evidence === "string" && Object.hasOwn(ARCHIVE_EVIDENCE_KEYS, evidence)) {
        return ARCHIVE_EVIDENCE_KEYS[evidence as AssetArchiveEvidence];
    }
    return "archiveWizard.evidence.uniqueReference";
}

export function archiveSuccessReasonKey(reason: unknown): MessageKey {
    if (typeof reason === "string" && Object.hasOwn(ARCHIVE_SUCCESS_REASON_KEYS, reason)) {
        return ARCHIVE_SUCCESS_REASON_KEYS[reason as AssetArchiveSuccessReason];
    }
    return "archiveResult.moved";
}

export function assetSectionKey(section: unknown): MessageKey {
    if (typeof section === "string" && Object.hasOwn(ASSET_SECTION_KEYS, section)) {
        return ASSET_SECTION_KEYS[section as keyof typeof ASSET_SECTION_KEYS];
    }
    return "assets.section.other";
}

export function assetSourceCodeKey(sourceCode: unknown): MessageKey {
    if (typeof sourceCode === "string" && Object.hasOwn(ASSET_SOURCE_CODE_KEYS, sourceCode)) {
        return ASSET_SOURCE_CODE_KEYS[sourceCode as AssetSourceCode];
    }
    return "assets.source.unknown";
}

export function translateArchiveError(
    reason: unknown,
    t: (key: MessageKey, values?: MessageValues) => string = currentLocaleText,
): string {
    return t(archiveErrorReasonKey(reason));
}

export function translateArchiveRetainReason(
    reason: unknown,
    t: (key: MessageKey, values?: MessageValues) => string = currentLocaleText,
): string {
    return t(archiveRetainReasonKey(reason));
}

export function translateArchiveEvidence(
    evidence: unknown,
    t: (key: MessageKey, values?: MessageValues) => string = currentLocaleText,
): string {
    return t(archiveEvidenceKey(evidence));
}

export function translateAssetSection(
    section: unknown,
    t: (key: MessageKey, values?: MessageValues) => string = currentLocaleText,
): string {
    return t(assetSectionKey(section));
}

export function translateAssetSourceCode(
    sourceCode: unknown,
    t: (key: MessageKey, values?: MessageValues) => string = currentLocaleText,
): string {
    return t(assetSourceCodeKey(sourceCode));
}

export function translateArchiveErrorAction(
    reason: unknown,
    t: (key: MessageKey, values?: MessageValues) => string = currentLocaleText,
): string {
    return t(archiveErrorActionKey(reason));
}
