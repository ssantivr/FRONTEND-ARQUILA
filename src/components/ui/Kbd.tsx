import styles from "./Kbd.module.css";

/**
 * A key or a combination, shown next to the action it triggers («Ctrl K», «Supr»). Each key is
 * drawn as a cap; the combination stays one piece of text for screen readers.
 */
export function Kbd({ children, className }: { children: string; className?: string }) {
    const keys = children.split(/\s*\+\s*|\s+/).filter(Boolean);

    return (
        <kbd className={[styles.combo, className].filter(Boolean).join(" ")}>
            {keys.map((key, index) => (
                <kbd key={`${index}-${key}`} className={styles.key}>
                    {key}
                </kbd>
            ))}
        </kbd>
    );
}
