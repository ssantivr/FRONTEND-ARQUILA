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

/** Section switcher. The open section is marked with `aria-current`, not only with colour. */
export function Tabs<Id extends string>({ label, items, current, onChange }: TabsProps<Id>) {
    return (
        <nav className="tabs" aria-label={label}>
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
