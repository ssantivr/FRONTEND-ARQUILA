import { useLayoutEffect, useRef } from "react";

interface TabItem<Id extends string> {
    id: Id;
    label: string;
}

interface TabsProps<Id extends string> {
    label: string;
    items: readonly TabItem<Id>[];
    current: Id;
    onChange: (id: Id) => void;
}

/**
 * Section switcher. The open section is marked with `aria-current`, not only with colour, and
 * an underline slides to it: its position and width are measured from the open tab and handed
 * to the stylesheet as two custom properties.
 */
export function Tabs<Id extends string>({ label, items, current, onChange }: TabsProps<Id>) {
    const nav = useRef<HTMLElement>(null);

    useLayoutEffect(() => {
        const element = nav.current;

        if (element === null) {
            return;
        }

        function place() {
            const open = element?.querySelector<HTMLElement>('[aria-current="page"]');

            if (element && open) {
                element.style.setProperty("--tab-left", `${open.offsetLeft}px`);
                element.style.setProperty("--tab-width", `${open.offsetWidth}px`);

                // On a narrow screen the row scrolls sideways: keep the open tab in view.
                const end = open.offsetLeft + open.offsetWidth;

                if (open.offsetLeft < element.scrollLeft) {
                    element.scrollLeft = open.offsetLeft;
                } else if (end > element.scrollLeft + element.clientWidth) {
                    element.scrollLeft = end - element.clientWidth;
                }
            }
        }

        place();

        // The tabs change width when the font finishes loading or the window is resized.
        if (typeof ResizeObserver === "undefined") {
            return;
        }

        const observer = new ResizeObserver(place);

        observer.observe(element);

        return () => observer.disconnect();
    }, [current, items]);

    return (
        <nav ref={nav} className="tabs" aria-label={label}>
            {items.map((item) => (
                <button
                    key={item.id}
                    type="button"
                    className="tab"
                    aria-current={item.id === current ? "page" : undefined}
                    onClick={() => onChange(item.id)}
                >
                    {item.label}
                </button>
            ))}
        </nav>
    );
}
