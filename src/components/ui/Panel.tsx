import type { ReactNode } from "react";

import styles from "./Panel.module.css";

interface PanelProps {
    title: string;
    /** A short line under the title: what the panel shows or where its data comes from. */
    description?: string;
    /** Small capitals above the title, like the label of a sheet («Terreno», «Lámina 02»). */
    eyebrow?: string;
    actions?: ReactNode;
    /** `flush` removes the inner padding, for tables and drawings that reach the edges. */
    padding?: "regular" | "flush";
    children: ReactNode;
}

/** A solid panel with a fine border: a titled block of a screen. */
export function Panel({
    title,
    description,
    eyebrow,
    actions,
    padding = "regular",
    children,
}: PanelProps) {
    return (
        // `panel` is the hook that screens not yet rebuilt use to lay out its content (R9 removes it).
        <section className={`panel ${styles.panel} ${styles[padding]}`}>
            <header className={styles.header}>
                <div className={styles.heading}>
                    {eyebrow !== undefined && <span className={styles.eyebrow}>{eyebrow}</span>}
                    <h2 className={styles.title}>{title}</h2>
                    {description !== undefined && (
                        <p className={styles.description}>{description}</p>
                    )}
                </div>
                {actions !== undefined && <div className={styles.actions}>{actions}</div>}
            </header>
            {children}
        </section>
    );
}
