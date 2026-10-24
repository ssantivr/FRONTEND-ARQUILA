import { useState, type FocusEvent, type KeyboardEvent, type PointerEvent } from "react";

import { useMediaQuery } from "../hooks/useMediaQuery";
import type { User } from "../types/api";
import { Icon, type IconName } from "./Icon";
import { Avatar } from "./ui/Avatar";
import { LogoMark } from "./ui/Logo";

import styles from "./Sidebar.module.css";

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

export type GroupId = "work" | "design" | "view" | "account";

export const GROUPS: { id: GroupId; label: string }[] = [
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

/** Arrow keys move between the modules, as in a list; Tab still visits them one by one. */
function moveFocus(event: KeyboardEvent<HTMLElement>) {
    const step = event.key === "ArrowDown" ? 1 : event.key === "ArrowUp" ? -1 : 0;
    const items = [...event.currentTarget.querySelectorAll<HTMLButtonElement>("[data-nav-item]")];
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

interface NavGroupsProps {
    current: View | null;
    onNavigate: (view: View) => void;
    label: string;
    /** `band` on the forest sidebar; `surface` on a panel of the theme, such as the phone menu. */
    tone?: "band" | "surface";
    iconsOnly?: boolean;
}

/** Every module, in its group. The sidebar and the menu of a phone draw the same list. */
export function NavGroups({
    current,
    onNavigate,
    label,
    tone = "band",
    iconsOnly = false,
}: NavGroupsProps) {
    return (
        <nav
            className={[styles.nav, styles[tone], iconsOnly && styles.iconsOnly]
                .filter(Boolean)
                .join(" ")}
            aria-label={label}
            onKeyDown={moveFocus}
        >
            {GROUPS.map((group) => (
                <div key={group.id} className={styles.group}>
                    <p className={styles.groupLabel}>{group.label}</p>
                    {MODULES.filter((item) => item.group === group.id).map((item) => (
                        <button
                            key={item.id}
                            type="button"
                            data-nav-item
                            className={styles.item}
                            aria-current={item.id === current ? "page" : undefined}
                            data-name={item.label}
                            onClick={() => onNavigate(item.id)}
                        >
                            <Icon name={item.icon} />
                            <span className={styles.label}>{item.label}</span>
                        </button>
                    ))}
                </div>
            ))}
        </nav>
    );
}

interface SidebarProps {
    current: View | null;
    onNavigate: (view: View) => void;
    collapsed?: boolean;
    onToggle?: () => void;
    onLogout?: () => void;
    user?: Pick<User, "name" | "email">;
}

/**
 * The navigation of wide screens, on the forest band in both themes: the mark, the modules by
 * group and, at the foot, the account, sign-out and the toggle that leaves only the icons. On a
 * phone it is not drawn: `MobileNav` and its menu take its place.
 */
export function Sidebar({
    current,
    onNavigate,
    collapsed = false,
    onToggle,
    onLogout,
    user,
}: SidebarProps) {
    // With only icons left, the name of the one under the pointer or the focus is shown beside
    // it. It is drawn fixed, so the scrolling list does not clip it.
    const [tip, setTip] = useState<{ text: string; top: number; left: number } | null>(null);
    // Between 721 and 1024 px the menu shows only its icons even when it is not collapsed.
    const narrow = useMediaQuery("(min-width: 721px) and (max-width: 1024px)");
    const iconsOnly = collapsed || narrow;

    function showTip(event: FocusEvent<HTMLElement> | PointerEvent<HTMLElement>) {
        const item = (event.target as HTMLElement).closest<HTMLElement>("[data-name]");

        if (!iconsOnly || item === null) {
            return;
        }

        const box = item.getBoundingClientRect();

        setTip({ text: item.dataset.name ?? "", top: box.top + box.height / 2, left: box.right });
    }

    return (
        <aside
            className={iconsOnly ? `${styles.sidebar} ${styles.iconsOnly}` : styles.sidebar}
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
            <span className={styles.brand}>
                <LogoMark size={24} />
                <span className={styles.label}>ARQUILA</span>
            </span>
            <NavGroups
                current={current}
                onNavigate={onNavigate}
                label="Navegación principal"
                iconsOnly={iconsOnly}
            />
            {(onToggle !== undefined || onLogout !== undefined || user !== undefined) && (
                <div className={styles.foot}>
                    {user !== undefined && (
                        <div className={styles.user} data-name={user.name}>
                            <Avatar name={user.name} tone="onDark" />
                            <span className={styles.userText}>
                                <strong>{user.name}</strong>
                                <span>{user.email}</span>
                            </span>
                        </div>
                    )}
                    {onLogout !== undefined && (
                        <button
                            type="button"
                            className={styles.item}
                            data-name="Cerrar sesión"
                            onClick={onLogout}
                        >
                            <Icon name="logout" />
                            <span className={styles.label}>Cerrar sesión</span>
                        </button>
                    )}
                    {onToggle !== undefined && (
                        <button
                            type="button"
                            className={`${styles.item} ${styles.toggle}`}
                            aria-expanded={!collapsed}
                            data-name="Expandir el menú"
                            onClick={onToggle}
                        >
                            <Icon name="collapse" />
                            <span className={styles.label}>
                                {collapsed ? "Expandir el menú" : "Contraer el menú"}
                            </span>
                        </button>
                    )}
                </div>
            )}
            {iconsOnly && tip !== null && (
                <span
                    className={styles.tip}
                    data-sidebar-tip
                    aria-hidden="true"
                    style={{ top: tip.top, left: tip.left }}
                >
                    {tip.text}
                </span>
            )}
        </aside>
    );
}
