import { useEffect, useRef, type ReactNode } from "react";

import { Icon, type IconName } from "../Icon";
import { Kbd } from "./Kbd";

import styles from "./Menu.module.css";

export interface MenuItem {
    label: string;
    onSelect: () => void;
    icon?: IconName;
    /** Keys that do the same, shown at the end of the item. */
    shortcut?: string;
    danger?: boolean;
    disabled?: boolean;
    /** Why a disabled item cannot be chosen; shown under its label. */
    reason?: string;
    /** Draws a separator before this item, to start a new group. */
    separated?: boolean;
}

interface MenuProps {
    /** Accessible name of the trigger, for example "Acciones de Casa Andina". */
    label: string;
    items: MenuItem[];
    /** What the trigger shows; «⋯» by default. The label stays its accessible name. */
    trigger?: ReactNode;
    /** Content above the items, such as who is signed in. */
    header?: ReactNode;
    /** Edge of the trigger the list lines up with. */
    align?: "start" | "end";
}

/** The items of a menu, shared by the dropdown and the context menu. */
export function MenuItems({
    items,
    onDone,
    role,
}: {
    items: MenuItem[];
    onDone: () => void;
    role?: "menuitem";
}) {
    return (
        <>
            {items.map((item) => (
                <div key={item.label} className={styles.slot}>
                    {item.separated === true && <hr className={styles.separator} />}
                    <button
                        type="button"
                        role={role}
                        className={
                            item.danger === true ? `${styles.item} ${styles.danger}` : styles.item
                        }
                        disabled={item.disabled}
                        onClick={() => {
                            onDone();
                            item.onSelect();
                        }}
                    >
                        {item.icon !== undefined ? (
                            <Icon name={item.icon} />
                        ) : (
                            <span className={styles.noIcon} aria-hidden="true" />
                        )}
                        <span className={styles.text}>
                            <span>{item.label}</span>
                            {item.disabled === true && item.reason !== undefined && (
                                <span className={styles.reason}>{item.reason}</span>
                            )}
                        </span>
                        {item.shortcut !== undefined && <Kbd>{item.shortcut}</Kbd>}
                    </button>
                </div>
            ))}
        </>
    );
}

/** A dropdown on a native `<details>`: it opens with the keyboard and closes on Escape or outside clicks. */
export function Menu({ label, items, trigger, header, align = "end" }: MenuProps) {
    const details = useRef<HTMLDetailsElement>(null);

    useEffect(() => {
        function close(event: Event) {
            const outside =
                event instanceof KeyboardEvent
                    ? event.key === "Escape"
                    : !details.current?.contains(event.target as Node);

            if (outside && details.current?.open === true) {
                details.current.open = false;

                if (event instanceof KeyboardEvent) {
                    details.current.querySelector("summary")?.focus();
                }
            }
        }

        document.addEventListener("click", close);
        document.addEventListener("keydown", close);

        return () => {
            document.removeEventListener("click", close);
            document.removeEventListener("keydown", close);
        };
    }, []);

    return (
        // `menu` is the hook that screens not yet rebuilt use to place it (removed in R9).
        <details ref={details} className={`menu ${styles.menu}`}>
            <summary className={styles.trigger} aria-label={label} title={label}>
                {trigger ?? <Icon name="more" />}
            </summary>
            <div className={`${styles.list} ${styles[align]}`} role="group" aria-label={label}>
                {header}
                <MenuItems
                    items={items}
                    onDone={() => {
                        if (details.current !== null) {
                            details.current.open = false;
                        }
                    }}
                />
            </div>
        </details>
    );
}
