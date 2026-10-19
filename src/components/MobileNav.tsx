import { useState } from "react";

import { setThemePreference, useThemePreference } from "../state/theme";
import type { User } from "../types/api";
import { Icon } from "./Icon";
import { MODULES, type View } from "./Sidebar";
import { Drawer } from "./ui/Drawer";
import { SegmentedControl, type Segment } from "./ui/SegmentedControl";
import { useMediaQuery } from "../hooks/useMediaQuery";
import type { ThemePreference } from "../state/theme";

import styles from "./MobileNav.module.css";

/** What a phone is mostly used for: checking projects, reviewing plans, following tasks. */
const PRIMARY: { id: View; label: string }[] = [
    { id: "home", label: "Inicio" },
    { id: "projects", label: "Proyectos" },
    { id: "plans", label: "Planos" },
    { id: "tasks", label: "Tareas" },
];

const THEMES: readonly Segment<ThemePreference>[] = [
    { value: "light", label: "Claro", icon: "sun" },
    { value: "dark", label: "Oscuro", icon: "moon" },
    { value: "auto", label: "Automático", icon: "themeAuto" },
];

/** Where the sidebar gives way to this bar; the same width as in the style sheets. */
export const PHONE_QUERY = "(max-width: 720px)";

interface MobileNavProps {
    current: View | null;
    onNavigate: (view: View) => void;
    onLogout: () => void;
    user: Pick<User, "name" | "email">;
}

/**
 * The navigation of small screens (up to 720 px, where the sidebar is hidden): a bar at the
 * bottom with the four main modules and «Más», which opens the other modules, the theme and the
 * account in a sheet from below.
 */
export function MobileNav({ current, onNavigate, onLogout, user }: MobileNavProps) {
    const [open, setOpen] = useState(false);
    const theme = useThemePreference();
    // Drawn only on a phone, so a desktop page and its screen reader have one navigation.
    const phone = useMediaQuery(PHONE_QUERY);
    const inMore = current !== null && !PRIMARY.some((item) => item.id === current);

    function go(view: View) {
        setOpen(false);
        onNavigate(view);
    }

    if (!phone) {
        return null;
    }

    return (
        <>
            <nav className={styles.bar} aria-label="Navegación principal (móvil)">
                {PRIMARY.map((item) => {
                    const module = MODULES.find((entry) => entry.id === item.id);

                    return (
                        <button
                            key={item.id}
                            type="button"
                            className={styles.item}
                            aria-current={item.id === current ? "page" : undefined}
                            onClick={() => onNavigate(item.id)}
                        >
                            {module !== undefined && <Icon name={module.icon} />}
                            <span>{item.label}</span>
                        </button>
                    );
                })}
                <button
                    type="button"
                    className={styles.item}
                    aria-haspopup="dialog"
                    aria-expanded={open}
                    data-active={inMore || undefined}
                    onClick={() => setOpen(true)}
                >
                    <Icon name="more" />
                    <span>Más</span>
                </button>
            </nav>
            {open && (
                <Drawer title="Más" side="bottom" onClose={() => setOpen(false)}>
                    <nav className={styles.more} aria-label="Otros módulos">
                        {MODULES.filter(
                            (module) => !PRIMARY.some((item) => item.id === module.id),
                        ).map((module) => (
                            <button
                                key={module.id}
                                type="button"
                                className={styles.moreItem}
                                aria-current={module.id === current ? "page" : undefined}
                                onClick={() => go(module.id)}
                            >
                                <Icon name={module.icon} />
                                <span>{module.label}</span>
                            </button>
                        ))}
                    </nav>
                    <div className={styles.section}>
                        <span className={styles.sectionLabel} aria-hidden="true">
                            Tema
                        </span>
                        <SegmentedControl
                            label="Tema"
                            options={THEMES}
                            value={theme}
                            onChange={setThemePreference}
                        />
                    </div>
                    <div className={styles.section}>
                        <p className={styles.who}>
                            <strong>{user.name}</strong>
                            <span>{user.email}</span>
                        </p>
                        <button
                            type="button"
                            className="button-secondary icon-button"
                            onClick={() => {
                                setOpen(false);
                                onLogout();
                            }}
                        >
                            <Icon name="logout" />
                            Cerrar sesión
                        </button>
                    </div>
                </Drawer>
            )}
        </>
    );
}
