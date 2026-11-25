type ExportConversation = { title: string; messages: Array<{ role: string; content: string; resultUrls?: string[]; status?: string }> };
export function creationConversationMarkdown(conversation: ExportConversation) {
    const sections = [`# ${conversation.title.replace(/[\r\n]+/g, " ").trim() || "创作对话"}`];
    for (const message of conversation.messages) {
        const links = (message.resultUrls || []).filter((url) => /^https?:\/\//i.test(url)).map((url) => `<${url.replace(/[<>\r\n]/g, "")}>`);
        sections.push(`## ${message.role === "user" ? "用户" : "助手"}\n\n${message.content}${links.length ? "\n\n" + links.join("\n\n") : ""}${message.status === "pending" || message.status === "streaming" ? "\n\n（生成尚未完成）" : ""}`);
    }
    return sections.join("\n\n") + "\n";
}
export function creationExportFilename(title: string) {
    return (
        (title
            .replace(/[\\/:*?"<>|\x00-\x1f]/g, "_")
            .trim()
            .slice(0, 80) || "创作对话") + ".md"
    );
}
