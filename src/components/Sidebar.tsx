import { Icon, type IconName } from "./Icon";

export type View =
    "home" | "projects" | "terrains" | "materials" | "viewer" | "assistant" | "settings";

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
        description: "Resumen de tus proyectos, terrenos y costos.",
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
        id: "materials",
        label: "Materiales",
        icon: "materials",
        description: "Materiales de todos los proyectos y su costo por categoría.",
    },
    {
        id: "viewer",
        label: "Visualización 3D",
        icon: "viewer",
        description: "Modelo 3D de un proyecto: terrenos, niveles, cuartos y estructura.",
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

interface SidebarProps {
    current: View;
    onNavigate: (view: View) => void;
}

export function Sidebar({ current, onNavigate }: SidebarProps) {
    return (
        <nav className="sidebar" aria-label="Navegación principal">
            {MODULES.map((item) => (
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
        </nav>
    );
}
