import { currentLocaleText as t } from "@/i18n/current-locale-text";
import { useI18n } from "@/i18n/use-i18n";
import { Modal } from "antd";
import { DirectorDescriptionForm } from "./director-description-form";
import type { CanvasNodeData } from "@/types/canvas";
import type { DirectorScene } from "@/types/director";

import { DIRECTOR_TEMPLATES, type DirectorTemplateId } from "@/lib/canvas/director/director-templates";

/**
 * 新建预演台镜头前的一句话推导与显式模板选择。
 *
 * 为什么必须显式选：过去新建场景无条件塞一个默认演员，
 * 产品镜头和空场景用户第一件事就是把它删掉。这里让开局内容由用户决定。
 * AI 推导先报价确认；免费空场景仍显式选择，且它真的没有演员。
 */
export function CanvasDirectorTemplateModal({
    open,
    onClose,
    onSelect,
    canvasId,
    nodes = [],
    onGenerated,
}: {
    open: boolean;
    onClose: () => void;
    onSelect: (templateId: DirectorTemplateId) => void;
    canvasId?: string;
    nodes?: CanvasNodeData[];
    onGenerated?: (scene: DirectorScene) => void;
}) {
    useI18n();
    return (
        <Modal open={open} onCancel={onClose} footer={null} width={560} title={t("canvasExtra.directorTpl.title")} destroyOnHidden>
            {onGenerated && (
                <DirectorDescriptionForm
                    canvasId={canvasId}
                    nodes={nodes}
                    onGenerated={(scene) => {
                        onGenerated(scene);
                        onClose();
                    }}
                />
            )}
            <div className="director-template-grid">
                {DIRECTOR_TEMPLATES.map((template) => (
                    <button
                        key={template.id}
                        type="button"
                        className="director-template-card"
                        onClick={() => {
                            onSelect(template.id);
                            onClose();
                        }}
                    >
                        <span className="director-template-card-name">{template.name}</span>
                        <span className="director-template-card-summary">{template.summary}</span>
                        <span className="director-template-card-description">{template.description}</span>
                    </button>
                ))}
            </div>
        </Modal>
    );
}
