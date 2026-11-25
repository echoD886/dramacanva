import { Button, Typography } from "antd";
import { Link } from "react-router";
import { useI18n } from "@/i18n/use-i18n";
import type { RemoteResource } from "@/services/api/resources";

export function WatermarkNotice({ resource, className = "mt-2" }: { resource?: RemoteResource; className?: string }) {
    const { t } = useI18n();
    if (!resource?.watermarked) return null;
    return (
        <div className={`${className} flex items-center gap-2`}>
            <Typography.Text type="secondary">{t("watermark.notice")}</Typography.Text>
            <Link to="/pricing">
                <Button size="small">{t("watermark.recharge")}</Button>
            </Link>
        </div>
    );
}
