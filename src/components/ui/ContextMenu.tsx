import {
    useEffect,
    useRef,
    useState,
    type KeyboardEvent,
    type MouseEvent,
    type ReactNode,
} from "react";

import { MenuItems, type MenuItem } from "./Menu";

import styles from "./Menu.module.css";

interface ContextMenuProps {
    /** Name of the menu («Acciones de Cocina»). */
    label: string;
    items: MenuItem[];
    /** The element the menu belongs to. It must be focusable to open it from the keyboard. */
    children: ReactNode;
}

const MARGIN = 8;
const WIDTH = 240;

/**
 * The actions of an element at the pointer: right click, or Shift+F10 and the menu key from the
 * keyboard. The arrows move between the actions, Escape and Tab close it, and the focus goes back
 * to the element it opened from.
 */
export function ContextMenu({ label, items, children }: ContextMenuProps) {
    const [at, setAt] = useState<{ x: number; y: number } | null>(null);
    const list = useRef<HTMLDivElement>(null);
    const origin = useRef<HTMLElement | null>(null);

    function open(x: number, y: number, from: HTMLElement) {
        origin.current = from;
        setAt({
            x: Math.min(x, window.innerWidth - WIDTH - MARGIN),
            y: Math.min(y, window.innerHeight - MARGIN - items.length * 44),
        });
    }

    function close(restore = true) {
        setAt(null);

        if (restore) {
            origin.current?.focus();
        }
    }

    useEffect(() => {
        if (at === null) {
            return;
        }

        list.current?.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus();

        function outside(event: PointerEvent) {
            if (!list.current?.contains(event.target as Node)) {
                setAt(null);
            }
        }

        document.addEventListener("pointerdown", outside);

        return () => document.removeEventListener("pointerdown", outside);
    }, [at]);

    function onListKey(event: KeyboardEvent<HTMLDivElement>) {
        const buttons = [
            ...(list.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)") ?? []),
        ];
        const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
        const target =
            event.key === "ArrowDown"
                ? (index + 1) % buttons.length
                : event.key === "ArrowUp"
                  ? (index - 1 + buttons.length) % buttons.length
                  : event.key === "Home"
                    ? 0
                    : event.key === "End"
                      ? buttons.length - 1
                      : null;

        if (event.key === "Escape") {
            event.preventDefault();
            event.stopPropagation();
            close();
        } else if (event.key === "Tab") {
            close(false);
        } else if (target !== null) {
            event.preventDefault();
            buttons[target]?.focus();
        }
    }

    return (
        <>
            <div
                className={styles.slot}
                onContextMenu={(event: MouseEvent<HTMLDivElement>) => {
                    event.preventDefault();
                    open(event.clientX, event.clientY, event.target as HTMLElement);
                }}
                onKeyDown={(event) => {
                    if ((event.shiftKey && event.key === "F10") || event.key === "ContextMenu") {
                        event.preventDefault();

                        const box = (event.target as HTMLElement).getBoundingClientRect();

                        open(box.left + MARGIN, box.bottom, event.target as HTMLElement);
                    }
                }}
            >
                {children}
            </div>
            {at !== null && (
                <div
                    ref={list}
                    role="menu"
                    aria-label={label}
                    className={`${styles.list} ${styles.floating}`}
                    style={{ left: at.x, top: at.y }}
                    onKeyDown={onListKey}
                >
                    <MenuItems items={items} role="menuitem" onDone={() => close()} />
                </div>
            )}
        </>
    );
}
