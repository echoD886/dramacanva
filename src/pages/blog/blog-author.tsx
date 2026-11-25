import { useState, type CSSProperties } from "react";
import type { BlogAuthorInfo } from "@/content/blog-ui";
import { BrandLogo } from "@/components/brand/brand-logo";

export function AuthorAvatar({ author }: { author: BlogAuthorInfo }) {
    const [failed, setFailed] = useState<string>();
    return (
        <span className="isa-blog-author-avatar" style={{ "--blog-avatar-accent": `var(${author.colorToken})` } as CSSProperties} aria-hidden="true" data-author={author.id}>
            {author.id === "admin-team" ? (
                <BrandLogo className="isa-blog-author-logo" />
            ) : author.avatarSrc && failed !== author.avatarSrc ? (
                <img src={author.avatarSrc} alt="" width={28} height={28} onError={() => setFailed(author.avatarSrc)} />
            ) : (
                author.initials
            )}
        </span>
    );
}
