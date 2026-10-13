import type { User } from "../types/api";
import { Icon, type IconName } from "./Icon";

export type View =
    | "home"
    | "projects"
    | "terrains"
    | "materials"
    | "plans"
    | "viewer"
    | "lighting"
    | "interior"
    | "render"
    | "tasks"
    | "assistant"
    | "settings";

export interface Module {
    id: View;
    label: string;
    icon: IconName;
    description: string;
    group: GroupId;
}

type GroupId = "work" | "design" | "view" | "account";

const GROUPS: { id: GroupId; label: string }[] = [
    { id: "work", label: "Trabajo" },
    { id: "design", label: "Diseño" },
    { id: "view", label: "Visualización" },
    { id: "account", label: "Gestión y cuenta" },
];

export const MODULES: Module[] = [
    {
        id: "home",
        group: "work",
        label: "Inicio",
        icon: "home",
        description: "Resumen de tus proyectos, terrenos y costos.",
    },
    {
        id: "projects",
        group: "work",
        label: "Proyectos",
        icon: "projects",
        description: "Crea proyectos y entra a sus planos, elevaciones y archivos.",
    },
    {
        id: "terrains",
        group: "work",
        label: "Terrenos",
        icon: "terrains",
        description: "Todos tus terrenos con su área, medidas, pendiente y suelo.",
    },
    {
        id: "materials",
        group: "work",
        label: "Biblioteca de materiales",
        icon: "materials",
        description: "Materiales de todos los proyectos, su costo y las superficies del modelo.",
    },
    {
        id: "plans",
        group: "design",
        label: "Planos 2D",
        icon: "plans",
        description: "Plantas con cotas, fachadas, corte e implantación de un proyecto.",
    },
    {
        id: "viewer",
        group: "design",
        label: "Editor y modelos 3D",
        icon: "viewer",
        description: "Modelo 3D de un proyecto: terrenos, niveles, cuartos y estructura.",
    },
    {
        id: "lighting",
        group: "view",
        label: "Iluminación y clima",
        icon: "lighting",
        description: "Hora, sol, cielo, nubes y exposición, vistos sobre el modelo.",
    },
    {
        id: "interior",
        group: "view",
        label: "Recorridos virtuales",
        icon: "interior",
        description:
            "Recorre tu proyecto por dentro, cuarto por cuarto, con lo que se va a hacer en cada uno.",
    },
    {
        id: "render",
        group: "view",
        label: "Renderizado",
        icon: "render",
        description: "Genera y descarga una imagen del modelo con la luz elegida.",
    },
    {
        id: "tasks",
        group: "account",
        label: "Gestión de tareas",
        icon: "tasks",
        description: "Las obras de todos tus proyectos por estado, con su avance real.",
    },
    {
        id: "assistant",
        group: "account",
        label: "Asistente IA",
        icon: "assistant",
        description: "Pregunta sobre un proyecto; responde con sus datos reales.",
    },
    {
        id: "settings",
        group: "account",
        label: "Configuración",
        icon: "settings",
        description: "Tu cuenta, la contraseña y el estado de la IA y de la API.",
    },
];

interface SidebarProps {
    current: View | null;
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
                {GROUPS.map((group) => (
                    <div key={group.id} className="sidebar-section">
                        <p className="sidebar-group sidebar-label">{group.label}</p>
                        {MODULES.filter((item) => item.group === group.id).map((item) => (
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
                    </div>
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
