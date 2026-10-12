import type { User } from "../types/api";
import { Icon, type IconName } from "./Icon";

export type View =
    | "home"
    | "projects"
    | "terrains"
    | "materials"
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

interface SidebarProps {
    current: View;
    onNavigate: (view: View) => void;
    collapsed?: boolean;
    onToggle?: () => void;
    onLogout?: () => void;
    user?: Pick<User, "name" | "email">;
}

export function Sidebar({
    current,
    onNavigate,
    collapsed = false,
    onToggle,
    onLogout,
    user,
}: SidebarProps) {
    return (
        <aside className="sidebar">
            <span className="brand">ARQUILA</span>
            <nav className="sidebar-nav" aria-label="Navegación principal">
                {MODULES.map((item) => (
                    <button
                        key={item.id}
                        type="button"
                        className="sidebar-item"
                        aria-current={item.id === current ? "page" : undefined}
                        title={collapsed ? item.label : undefined}
                        onClick={() => onNavigate(item.id)}
                    >
                        <Icon name={item.icon} />
                        <span className="sidebar-label">{item.label}</span>
                    </button>
                ))}
            </nav>
            {(onToggle !== undefined || onLogout !== undefined) && (
                <div className="sidebar-foot">
                    {user !== undefined && (
                        <div className="sidebar-user" title={collapsed ? user.name : undefined}>
                            <span className="avatar" aria-hidden="true">
                                {user.name.trim().charAt(0).toUpperCase()}
                            </span>
                            <span className="sidebar-label sidebar-user-text">
                                <strong>{user.name}</strong>
                                <span>{user.email}</span>
                            </span>
                        </div>
                    )}
                    {onLogout !== undefined && (
                        <button
                            type="button"
                            className="sidebar-item"
                            title={collapsed ? "Cerrar sesión" : undefined}
                            onClick={onLogout}
                        >
                            <Icon name="logout" />
                            <span className="sidebar-label">Cerrar sesión</span>
                        </button>
                    )}
                    {onToggle !== undefined && (
                        <button
                            type="button"
                            className="sidebar-item sidebar-toggle"
                            aria-expanded={!collapsed}
                            title={collapsed ? "Expandir el menú" : undefined}
                            onClick={onToggle}
                        >
                            <Icon name="collapse" />
                            <span className="sidebar-label">
                                {collapsed ? "Expandir el menú" : "Contraer el menú"}
                            </span>
                        </button>
                    )}
                </div>
            )}
        </aside>
    );
}
