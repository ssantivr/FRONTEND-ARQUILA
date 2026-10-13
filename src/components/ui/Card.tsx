import type { HTMLAttributes, ReactNode } from "react";

import styles from "./Card.module.css";

interface CardProps extends HTMLAttributes<HTMLElement> {
    /** `article` for a self-contained item of a list, `section` for a block of the page. */
    as?: "div" | "article" | "section";
    /** A raised card sits one tone above the panel it is placed on. */
    raised?: boolean;
    padding?: "none" | "compact" | "regular";
    children: ReactNode;
}

/** A surface with the card radius, border and resting shadow of the design system. */
export function Card({
    as: Tag = "div",
    raised = false,
    padding = "regular",
    className,
    children,
    ...rest
}: CardProps) {
    const classes = [styles.card, styles[padding], raised && styles.raised, className]
        .filter(Boolean)
        .join(" ");

    return (
        <Tag {...rest} className={classes}>
            {children}
        </Tag>
    );
}
