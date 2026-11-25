import { currentLocaleText } from "@/i18n/current-locale-text";

const keys = {
    resultResponseInvalid: "canvasExtra.localConversion.resultResponseInvalid",
    onlyImages: "canvasExtra.localConversion.onlyImages",
    inputUnreadable: "canvasExtra.localConversion.inputUnreadable",
    imageTooLarge: "canvasExtra.localConversion.imageTooLarge",
    runtimeUnavailable: "canvasExtra.localConversion.runtimeUnavailable",
    responseInvalid: "canvasExtra.localConversion.responseInvalid",
    responseTooLarge: "canvasExtra.localConversion.responseTooLarge",
    resultInvalid: "canvasExtra.localConversion.resultInvalid",
    resultTooLarge: "canvasExtra.localConversion.resultTooLarge",
    statusInvalid: "canvasExtra.localConversion.statusInvalid",
    inputInvalid: "canvasExtra.localConversion.inputInvalid",
} as const;

export function localRuntimeConversionCopy(operation: "pose" | "lineart", key: keyof typeof keys) {
    const name = currentLocaleText(operation === "pose" ? "canvasExtra.localConversion.pose" : "canvasExtra.localConversion.lineart");
    return currentLocaleText(keys[key], { operation: name });
}
