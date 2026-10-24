import styles from "./Avatar.module.css";

interface AvatarProps {
    name: string;
    size?: "sm" | "md";
    /** `onDark` on the forest band of the sidebar. */
    tone?: "auto" | "onDark";
}

/** The initial of a person. Decorative: the name is always written next to it or in a label. */
export function Avatar({ name, size = "md", tone = "auto" }: AvatarProps) {
    return (
        <span
            className={[styles.avatar, styles[size], tone === "onDark" && styles.onDark]
                .filter(Boolean)
                .join(" ")}
            aria-hidden="true"
        >
            {name.trim().charAt(0).toUpperCase() || "·"}
        </span>
    );
}
