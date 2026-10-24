import styles from "./Avatar.module.css";

interface AvatarProps {
    name: string;
    size?: "sm" | "md";
    /** `onDark` on the forest band of the sidebar. */
    tone?: "auto" | "onDark";
}

/**
 * The initial of a person. Decorative: the name is always written next to it or in a label.
 * The letter is painted by CSS from `data-initial` instead of being text: axe takes the text of
 * an element as visible even under aria-hidden, and a «U» before «Usuario demo» left the account
 * menu's visible text out of its accessible name (label-content-name-mismatch).
 */
export function Avatar({ name, size = "md", tone = "auto" }: AvatarProps) {
    return (
        <span
            className={[styles.avatar, styles[size], tone === "onDark" && styles.onDark]
                .filter(Boolean)
                .join(" ")}
            aria-hidden="true"
            data-initial={name.trim().charAt(0).toUpperCase() || "·"}
        />
    );
}
