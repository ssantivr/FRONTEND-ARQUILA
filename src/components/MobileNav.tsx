import { useMediaQuery } from "../hooks/useMediaQuery";
import { setThemePreference, useThemePreference, type ThemePreference } from "../state/theme";
import type { User } from "../types/api";
import { Icon } from "./Icon";
import { MODULES, NavGroups, type View } from "./Sidebar";
import { Avatar } from "./ui/Avatar";
import { Button } from "./ui/Button";
import { Drawer } from "./ui/Drawer";
import { SegmentedControl, type Segment } from "./ui/SegmentedControl";

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
    onOpenSettings: () => void;
    onLogout: () => void;
    user: Pick<User, "name" | "email">;
    /** The menu: every module, the theme and the account, in a drawer from the left. */
    menuOpen: boolean;
    onMenuChange: (open: boolean) => void;
}

/**
 * The navigation of small screens (up to 720 px, where the sidebar is hidden): a bar at the
 * bottom with the four main modules and «Más», which opens the menu. The menu is the sidebar in a
 * drawer, with the theme and the account; the menu button of the top bar opens it too.
 */
export function MobileNav({
    current,
    onNavigate,
    onOpenSettings,
    onLogout,
    user,
    menuOpen,
    onMenuChange,
}: MobileNavProps) {
    const theme = useThemePreference();
    // Drawn only on a phone, so a desktop page and its screen reader have one navigation.
    const phone = useMediaQuery(PHONE_QUERY);
    const inMore = current !== null && !PRIMARY.some((item) => item.id === current);

    function close(then: () => void) {
        onMenuChange(false);
        then();
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
                    aria-expanded={menuOpen}
                    data-active={inMore || undefined}
                    onClick={() => onMenuChange(true)}
                >
                    <Icon name="more" />
                    <span>Más</span>
                </button>
            </nav>
            {menuOpen && (
                <Drawer title="Menú" side="left" onClose={() => onMenuChange(false)}>
                    <NavGroups
                        current={current}
                        onNavigate={(view) => close(() => onNavigate(view))}
                        label="Todos los módulos"
                        tone="surface"
                    />
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
                            <Avatar name={user.name} />
                            <span className={styles.whoText}>
                                <strong>{user.name}</strong>
                                <span>{user.email}</span>
                            </span>
                        </p>
                        <div className={styles.accountActions}>
                            <Button
                                variant="secondary"
                                icon="settings"
                                block
                                onClick={() => close(onOpenSettings)}
                            >
                                Cuenta y configuración
                            </Button>
                            <Button
                                variant="tertiary"
                                icon="logout"
                                block
                                onClick={() => close(onLogout)}
                            >
                                Cerrar sesión
                            </Button>
                        </div>
                    </div>
                </Drawer>
            )}
        </>
    );
}
