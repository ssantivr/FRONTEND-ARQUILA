import { useState, type FocusEvent, type KeyboardEvent, type PointerEvent } from "react";

import { useMediaQuery } from "../hooks/useMediaQuery";
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

/** Arrow keys move between the modules, as in a list; Tab still visits them one by one. */
function moveFocus(event: KeyboardEvent<HTMLElement>) {
    const step = event.key === "ArrowDown" ? 1 : event.key === "ArrowUp" ? -1 : 0;
    const items = [...event.currentTarget.querySelectorAll<HTMLButtonElement>(".sidebar-item")];
    const at = items.indexOf(document.activeElement as HTMLButtonElement);

    if (at === -1 || (step === 0 && event.key !== "Home" && event.key !== "End")) {
        return;
    }

    event.preventDefault();
    const next =
        event.key === "Home"
            ? 0
            : event.key === "End"
              ? items.length - 1
              : (at + step + items.length) % items.length;

    items[next]?.focus();
}

export function Sidebar({
    current,
    onNavigate,
    collapsed = false,
    onToggle,
    onLogout,
    user,
}: SidebarProps) {
    // With the menu collapsed only icons are left: the name of the one under the pointer or the
    // focus is shown beside it. It is drawn fixed, so the scrolling list does not clip it.
    const [tip, setTip] = useState<{ text: string; top: number } | null>(null);
    // Between 721 and 1024 px the menu shows only its icons even when it is not collapsed.
    const narrow = useMediaQuery("(min-width: 721px) and (max-width: 1024px)");
    const iconsOnly = collapsed || narrow;

    function showTip(event: FocusEvent<HTMLElement> | PointerEvent<HTMLElement>) {
        const item = (event.target as HTMLElement).closest<HTMLElement>("[data-tip]");

        if (!iconsOnly || item === null) {
            return;
        }

        const box = item.getBoundingClientRect();

        setTip({ text: item.dataset.tip ?? "", top: box.top + box.height / 2 });
    }

    return (
        <aside
            className="sidebar"
            onPointerOver={showTip}
            onFocus={showTip}
            onPointerLeave={() => setTip(null)}
            onBlur={() => setTip(null)}
            onKeyDown={(event) => {
                if (event.key === "Escape") {
                    setTip(null);
                }
            }}
        >
            <span className="brand">ARQUILA</span>
            <nav className="sidebar-nav" aria-label="Navegación principal" onKeyDown={moveFocus}>
                {GROUPS.map((group) => (
                    <div key={group.id} className="sidebar-section">
                        <p className="sidebar-group sidebar-label">{group.label}</p>
                        {MODULES.filter((item) => item.group === group.id).map((item) => (
                            <button
                                key={item.id}
                                type="button"
                                className="sidebar-item"
                                aria-current={item.id === current ? "page" : undefined}
                                data-tip={item.label}
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
                        <div className="sidebar-user" data-tip={user.name}>
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
                            data-tip="Cerrar sesión"
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
                            data-tip="Expandir el menú"
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
            {iconsOnly && tip !== null && (
                <span className="sidebar-tip" aria-hidden="true" style={{ top: tip.top }}>
                    {tip.text}
                </span>
            )}
        </aside>
    );
}
