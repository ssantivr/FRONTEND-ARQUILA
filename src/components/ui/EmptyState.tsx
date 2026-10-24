import type { ReactNode } from "react";

import { BlueprintGrid, CornerMarks } from "./Blueprint";
import { Button } from "./Button";

import styles from "./EmptyState.module.css";

/** The line drawing of an empty state: what is missing, drawn as an architect would. */
export type EmptyArt = "plan" | "section" | "volume" | "site";

interface EmptyStateProps {
    /** Short headline; the text below it explains what to do. */
    title?: string;
    /** `h2` when the empty state is the whole screen and its title names it. */
    titleAs?: "p" | "h2";
    text: string;
    /** Optional next step, such as the button that creates the first item. */
    action?: ReactNode;
    art?: EmptyArt;
    /** `compact` inside a panel or a table; `regular` fills a screen. */
    size?: "compact" | "regular";
}

function Art({ art }: { art: EmptyArt }) {
    switch (art) {
        case "plan":
            // A floor plan: two rooms, a door with its swing and a window.
            return (
                <>
                    <path className={styles.wall} d="M14 14h92v62H14z" />
                    <path className={styles.wall} d="M62 14v26M62 54v22" />
                    <path className={styles.thin} d="M62 40a14 14 0 0 1 14 14" />
                    <path className={styles.thin} d="M62 40h14" />
                    <path className={styles.window} d="M28 14h20M28 12h20M28 16h20" />
                    <path className={styles.dim} d="M14 86h92M14 83v6M106 83v6" />
                </>
            );
        case "section":
            // A section: ground with hatching, slab, walls and a flat roof with parapet.
            return (
                <>
                    <path className={styles.ground} d="M6 70h108" />
                    <path
                        className={styles.hatch}
                        d="M10 76l6-6M22 76l6-6M34 76l6-6M46 76l6-6M58 76l6-6M70 76l6-6M82 76l6-6M94 76l6-6M106 76l6-6"
                    />
                    <path className={styles.wall} d="M26 70V26h68v44" />
                    <path className={styles.wall} d="M22 26h76M22 22v4M98 22v4" />
                    <path className={styles.thin} d="M26 48h68" />
                    <path className={styles.window} d="M40 34h14v10H40zM66 54h14v16" />
                    <path className={styles.dim} d="M106 26v44M103 26h6M103 70h6" />
                </>
            );
        case "volume":
            // An isometric volume in wireframe, with its hidden edges dashed.
            return (
                <>
                    <path className={styles.wall} d="M60 12l38 20v34L60 86 22 66V32z" />
                    <path className={styles.wall} d="M22 32l38 20 38-20M60 52v34" />
                    <path className={styles.hidden} d="M60 12v20M22 66l38-14 38 14" />
                    <path className={styles.dim} d="M14 70l38 20M12 66l4 8M50 86l4 8" />
                </>
            );
        case "site":
            // A lot: its boundary, contour lines and the north arrow.
            return (
                <>
                    <path className={styles.wall} d="M18 22l70-8 16 58-80 10z" />
                    <path className={styles.thin} d="M26 40c20-8 44-10 70-4M24 58c26-8 52-8 76-2" />
                    <path className={styles.window} d="M96 8v14M92 16l4-8 4 8" />
                    <path className={styles.dim} d="M24 90l80-10" />
                </>
            );
    }
}

export function EmptyState({
    title,
    titleAs: Title = "p",
    text,
    action,
    art = "plan",
    size = "regular",
}: EmptyStateProps) {
    return (
        // `empty-state` is the hook that screens not yet rebuilt use to place it (removed in R9).
        <div className={`empty-state ${styles.empty} ${styles[size]}`}>
            <span className={styles.figure} aria-hidden="true">
                <BlueprintGrid cell={8} />
                <CornerMarks inset={0} />
                <svg className={styles.art} viewBox="0 0 120 96" focusable="false">
                    <Art art={art} />
                </svg>
            </span>
            {title !== undefined && <Title className={styles.title}>{title}</Title>}
            <p className={styles.text}>{text}</p>
            {action !== undefined && <div className={styles.action}>{action}</div>}
        </div>
    );
}

/**
 * The next step of an empty list whose form sits in the same panel: it takes the cursor to the
 * first field of that form, scrolling to it if it is out of view.
 */
export function FocusFormButton({ children }: { children: ReactNode }) {
    return (
        <Button
            variant="secondary"
            onClick={(event) => {
                const field = event.currentTarget
                    .closest(".panel")
                    ?.querySelector<HTMLElement>("form :is(input, select, textarea)");

                field?.scrollIntoView?.({ block: "center" });
                field?.focus();
            }}
        >
            {children}
        </Button>
    );
}
