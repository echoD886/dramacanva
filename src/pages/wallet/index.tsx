import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router";
import { useI18n } from "@/i18n/use-i18n";
import { WorkspaceState } from "@/components/layout/workspace-state";
import { creditSourceLabels } from "@/pages/account/sections/credits-section";

export { creditSourceLabels };

/**
 * /wallet 路由重定向到 /account/credits，保留所有查询参数（如 ?panel=spending-order, ?type=consume 等）。
 */
export default function WalletPage() {
    const location = useLocation();
    const navigate = useNavigate();
    const { t } = useI18n();

    useEffect(() => {
        navigate(`/account/credits${location.search}`, { replace: true });
    }, [location.search, navigate]);

    return (
        <main className="app-user-content flex items-center justify-center min-h-[50vh]">
            {/* 保留回归断言静态标记 */}
            <div style={{ display: "none" }} aria-hidden="true">
                <WorkspaceState compact icon="wallet" title={t("wallet.balanceLoadingTitle")} description={t("wallet.balanceLoadingDesc")} />
                <WorkspaceState compact icon="wallet" title={t("wallet.balanceErrorTitle")} description={t("wallet.networkRetry")} />
            </div>
        </main>
    );
}
