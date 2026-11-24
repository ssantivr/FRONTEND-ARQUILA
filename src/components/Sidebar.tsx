import { Icon, type IconName } from "./Icon";

export type View =
    | "home"
    | "projects"
    | "terrains"
    | "dashboard"
    | "viewer"
    | "interior"
    | "assistant"
    | "settings";

export interface Module {
    id: View;
    label: string;
    icon: IconName;
    description: string;
}

export const MODULES: Module[] = [
    {
        id: "home",
        label: "Inicio",
        icon: "home",
        description: "Resumen de tus proyectos y terrenos.",
    },
    {
        id: "dashboard",
        label: "Dashboard",
        icon: "dashboard",
        description: "Mira todos tus proyectos y crea nuevos con ayuda de la IA.",
    },
    {
        id: "projects",
        label: "Proyectos",
        icon: "projects",
        description: "Crea proyectos y entra a sus planos, elevaciones y archivos.",
    },
    {
        id: "terrains",
        label: "Terrenos",
        icon: "terrains",
        description: "Todos tus terrenos con su área, medidas, pendiente y suelo.",
    },
    {
        id: "viewer",
        label: "Visualización 3D",
        icon: "viewer",
        description: "Modelo 3D de un proyecto: terrenos, niveles, cuartos y estructura.",
    },
    {
        id: "interior",
        label: "Recorrido interior",
        icon: "interior",
        description:
            "Recorre tu proyecto por dentro, cuarto por cuarto, con lo que se va a hacer en cada uno.",
    },
    {
        id: "assistant",
        label: "Asistente IA",
        icon: "assistant",
        description: "Pregunta sobre un proyecto; responde con sus datos reales.",
    },
    {
        id: "settings",
        label: "Configuración",
        icon: "settings",
        description: "Tu cuenta, la contraseña y el estado de la IA y de la API.",
    },
];

const NAV_GROUPS: { label: string; items: Module[] }[] = [
    {
        label: "ESCRITORIO",
        items: MODULES.filter((item) => item.id === "home" || item.id === "dashboard"),
    },
    {
        label: "PROYECTOS",
        items: MODULES.filter((item) => item.id === "projects" || item.id === "terrains"),
    },
    {
        label: "VISUALIZACIÓN",
        items: MODULES.filter(
            (item) => item.id === "viewer" || item.id === "interior" || item.id === "assistant",
        ),
    },
    {
        label: "CUENTA",
        items: MODULES.filter((item) => item.id === "settings"),
    },
];

interface SidebarProps {
    current: View;
    onNavigate: (view: View) => void;
}

export function Sidebar({ current, onNavigate }: SidebarProps) {
    return (
        <nav className="sidebar" aria-label="Navegación principal">
            {NAV_GROUPS.map((group) => (
                <div className="sidebar-group" key={group.label}>
                    <span className="sidebar-heading">{group.label}</span>
                    <div className="sidebar-group-items">
                        {group.items.map((item) => (
                            <button
                                key={item.id}
                                type="button"
                                className="sidebar-item"
                                aria-current={item.id === current ? "page" : undefined}
                                onClick={() => onNavigate(item.id)}
                            >
                                <Icon name={item.icon} />
                                {item.label}
                            </button>
                        ))}
                    </div>
                </div>
            ))}
            <div className="sidebar-footer">
                <span>ARQUILA STUDIO</span>
                <strong>De la idea al espacio construido.</strong>
                <span className="sidebar-footer-mark" aria-hidden="true">
                    A<span>·</span>
                </span>
            </div>
        </nav>
    );
}
