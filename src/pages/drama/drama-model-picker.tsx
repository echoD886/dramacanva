import { useQuery } from "@tanstack/react-query";
import { Select } from "antd";
import { reviewText, useReviewLocale } from "@/i18n/drama-messages";
import { dramaChoiceKey } from "@/lib/drama/model-choice";
import { getDramaModels, type DramaCapability, type DramaModelChoice } from "@/services/api/drama";
export function useDramaModelCatalog() {
    return useQuery({ queryKey: ["drama-models"], queryFn: getDramaModels, staleTime: 60_000 });
}
export function DramaModelPicker({
    capability,
    value,
    onChange,
    placeholder,
    size = "md",
    showPrice = true,
    className = "",
}: {
    capability: DramaCapability;
    value?: DramaModelChoice;
    onChange: (choice: DramaModelChoice) => void;
    placeholder?: string;
    size?: "sm" | "md";
    showPrice?: boolean;
    className?: string;
}) {
    useReviewLocale();
    const query = useDramaModelCatalog();
    const options = query.data?.options[capability] || [];
    return (
        <Select
            className={`drama-model-picker w-full ${className}`}
            size={size === "sm" ? "small" : "middle"}
            aria-label={placeholder || reviewText("选择模型")}
            placeholder={placeholder || reviewText("选择模型")}
            loading={query.isLoading}
            value={dramaChoiceKey(value) || undefined}
            options={options.map((option) => ({ value: dramaChoiceKey(option.choice), label: `${option.label}${showPrice && option.priceLabel ? ` · ${option.priceLabel}` : ""}` }))}
            onChange={(key) => {
                const option = options.find((item) => dramaChoiceKey(item.choice) === key);
                if (option) onChange(option.choice);
            }}
        />
    );
}
