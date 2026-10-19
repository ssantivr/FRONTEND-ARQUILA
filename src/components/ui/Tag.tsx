import type { ReactNode } from "react";

import { Icon, type IconName } from "../Icon";

import styles from "./Tag.module.css";

export type TagTone = "neutral" | "accent" | "success" | "warning" | "danger" | "info";

interface TagProps {
    tone?: TagTone;
    icon?: IconName;
    /** `label` is the small capitals of a technical sheet; `plain` is sentence case. */
    look?: "label" | "plain";
    title?: string;
    className?: string;
    children: ReactNode;
}

/**
 * A short mark beside a value or a title: a state, a category or the origin of a figure. The
 * colour always comes with a word, and with an icon for states.
 */
export function Tag({
    tone = "neutral",
    icon,
    look = "plain",
    title,
    className,
    children,
}: TagProps) {
    return (
        <span
            className={[styles.tag, styles[tone], styles[look], className]
                .filter(Boolean)
                .join(" ")}
            title={title}
        >
            {icon !== undefined && <Icon name={icon} />}
            {children}
        </span>
    );
}

/**
 * The mark of a figure the interface calculated (areas, dimensions, the sun) instead of reading
 * it from the API. Its title says so, and screen readers hear it after the value.
 */
export function DerivedTag({ detail }: { detail?: string }) {
    return (
        <span
            className={`${styles.tag} ${styles.derived} ${styles.label}`}
            title={detail ?? "Calculado por la interfaz a partir de los datos del proyecto."}
        >
            Derivado
        </span>
    );
}
