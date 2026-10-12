import { useEffect, useRef } from "react";

interface MenuItem {
    label: string;
    onSelect: () => void;
    danger?: boolean;
    disabled?: boolean;
}

interface MenuProps {
    /** Accessible name of the trigger, for example "Acciones de Casa Andina". */
    label: string;
    items: MenuItem[];
}

/** Context menu on a native `<details>`: it opens with the keyboard and closes on Escape or outside clicks. */
export function Menu({ label, items }: MenuProps) {
    const details = useRef<HTMLDetailsElement>(null);

    useEffect(() => {
        function close(event: Event) {
            const outside =
                event instanceof KeyboardEvent
                    ? event.key === "Escape"
                    : !details.current?.contains(event.target as Node);

            if (outside && details.current?.open === true) {
                details.current.open = false;
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
        <details ref={details} className="menu">
            <summary aria-label={label} title={label}>
                <span aria-hidden="true">⋯</span>
            </summary>
            <div className="menu-items" role="group" aria-label={label}>
                {items.map((item) => (
                    <button
                        key={item.label}
                        type="button"
                        className={
                            item.danger === true ? "menu-item menu-item-danger" : "menu-item"
                        }
                        disabled={item.disabled}
                        onClick={() => {
                            if (details.current !== null) {
                                details.current.open = false;
                            }

                            item.onSelect();
                        }}
                    >
                        {item.label}
                    </button>
                ))}
            </div>
        </details>
    );
}
