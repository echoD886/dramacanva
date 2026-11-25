import { currentLocaleText as upstreamText } from "@/i18n/current-locale-text";
import { useI18n as upstreamUseI18n } from "@/i18n/use-i18n";
import { Button, Form, Input, Select } from "antd";

import { AppModal } from "@/components/ui/product/app-modal";
import type { CreationInspiration } from "@/lib/inspirations/catalog";
import { normalizeDraft, type InspirationDraft } from "@/stores/use-inspiration-store";

export type InspirationCategoryChoice = { label: string; value: string };

/** 编辑器只收集用户能填的字段；id、来源、署名由本地库自己管。 */
type FormValues = {
    title: string;
    description?: string;
    image: string;
    mode: CreationInspiration["mode"];
    category?: string;
    tags?: string;
    ratio?: string;
    prompt: string;
    promptZh?: string;
};

function toFormValues(item: CreationInspiration | null): FormValues {
    return {
        title: item?.title ?? "",
        description: item?.description ?? "",
        image: item?.image ?? "",
        mode: item?.mode ?? "image",
        category: item?.category ?? "",
        tags: item?.tags?.join(upstreamText("canvasExtra.operations.separator")) ?? "",
        ratio: item?.ratio ?? "",
        prompt: item?.prompt ?? "",
        promptZh: item?.promptZh ?? "",
    };
}

export function InspirationEditorModal({
    open,
    item,
    categoryOptions,
    onClose,
    onSubmit,
}: {
    open: boolean;
    item: CreationInspiration | null;
    categoryOptions: InspirationCategoryChoice[];
    onClose: () => void;
    onSubmit: (draft: InspirationDraft) => void;
}) {
    upstreamUseI18n();
    const [form] = Form.useForm<FormValues>();

    const handleOk = async () => {
        const values = await form.validateFields().catch(() => null);
        if (!values) return;
        const tags = (values.tags ?? "")
            .split(/[，,]/)
            .map((tag) => tag.trim())
            .filter(Boolean);
        // 走 store 里同一套收敛规则，表单不做第二套校验。
        const draft = normalizeDraft({
            title: values.title,
            description: values.description ?? "",
            image: values.image,
            mode: values.mode,
            prompt: values.prompt,
            promptZh: values.promptZh,
            category: values.category,
            ratio: values.ratio,
            ...(tags.length ? { tags } : {}),
        });
        onSubmit(draft);
        form.resetFields();
        onClose();
    };

    return (
        <AppModal
            open={open}
            title={item ? upstreamText("upstream.v165.message441") : upstreamText("upstream.v165.message420")}
            width={720}
            onCancel={() => {
                form.resetFields();
                onClose();
            }}
            afterOpenChange={(visible) => {
                if (visible) form.setFieldsValue(toFormValues(item));
            }}
            footer={
                <div className="flex justify-end gap-2">
                    <Button
                        onClick={() => {
                            form.resetFields();
                            onClose();
                        }}
                    >
                        {upstreamText("channels.cancel")}
                    </Button>
                    <Button type="primary" onClick={() => void handleOk()}>
                        {item ? upstreamText("common.save") : upstreamText("assets.factCreated")}
                    </Button>
                </div>
            }
        >
            <Form form={form} layout="vertical" initialValues={toFormValues(item)} preserve={false}>
                {/* 字段较多，不限高的话底部按钮会被顶出视口，提交就点不到了。 */}
                <div className="max-h-[64vh] overflow-y-auto pr-1">
                    <Form.Item name="title" label={upstreamText("assets.labelTitle")} rules={[{ required: true, message: upstreamText("upstream.v165.message442") }]}>
                        <Input placeholder={upstreamText("upstream.v165.message443")} maxLength={80} />
                    </Form.Item>
                    <Form.Item name="description" label={upstreamText("upstream.v165.message444")}>
                        <Input placeholder={upstreamText("upstream.v165.message445")} maxLength={120} />
                    </Form.Item>
                    <Form.Item name="image" label={upstreamText("upstream.v165.message446")} rules={[{ required: true, message: upstreamText("upstream.v165.message447") }]}>
                        <Input placeholder={upstreamText("upstream.v165.message448")} />
                    </Form.Item>
                    <div className="grid gap-x-4 sm:grid-cols-3">
                        <Form.Item name="mode" label={upstreamText("upstream.v165.message449")} rules={[{ required: true }]}>
                            <Select
                                options={[
                                    { label: upstreamText("adminAnalytics.footImages"), value: "image" },
                                    { label: upstreamText("adminAnalytics.footVideos"), value: "video" },
                                    { label: upstreamText("adminAnalytics.capText"), value: "text" },
                                ]}
                            />
                        </Form.Item>
                        <Form.Item name="category" label={upstreamText("assets.factCategory")}>
                            <Select allowClear showSearch placeholder={upstreamText("upstream.v165.message450")} options={categoryOptions} />
                        </Form.Item>
                        <Form.Item name="ratio" label={upstreamText("adminSettings.capabilities.options.ratio")}>
                            <Input placeholder={upstreamText("upstream.v165.message451")} maxLength={12} />
                        </Form.Item>
                    </div>
                    <Form.Item name="tags" label={upstreamText("assets.labelTags")} extra={upstreamText("upstream.v165.message452")}>
                        <Input placeholder={upstreamText("upstream.v165.message453")} maxLength={120} />
                    </Form.Item>
                    <Form.Item name="prompt" label={upstreamText("upstream.v165.message454")} rules={[{ required: true, message: upstreamText("upstream.v165.message455") }]}>
                        <Input.TextArea rows={6} placeholder={upstreamText("upstream.v165.message456")} />
                    </Form.Item>
                    <Form.Item name="promptZh" label={upstreamText("upstream.v165.message457")} extra={upstreamText("upstream.v165.message458")}>
                        <Input.TextArea rows={4} placeholder={upstreamText("upstream.v165.message459")} />
                    </Form.Item>
                </div>
            </Form>
        </AppModal>
    );
}
