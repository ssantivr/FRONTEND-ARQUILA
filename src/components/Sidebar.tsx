export type View = "home" | "projects";

const ITEMS: { id: View; label: string }[] = [
    { id: "home", label: "Inicio" },
    { id: "projects", label: "Proyectos" },
];

interface SidebarProps {
    current: View;
    onNavigate: (view: View) => void;
}

export function Sidebar({ current, onNavigate }: SidebarProps) {
    return (
        <nav className="sidebar" aria-label="Navegación principal">
            {ITEMS.map((item) => (
                <button
                    key={item.id}
                    type="button"
                    className="sidebar-item"
                    aria-current={item.id === current ? "page" : undefined}
                    onClick={() => onNavigate(item.id)}
                >
                    {item.label}
                </button>
            ))}
        </nav>
    );
}
