import { setThemePreference, useThemePreference, type ThemePreference } from "../state/theme";
import type { User } from "../types/api";
import { GlobalSearch } from "./GlobalSearch";
import { Icon } from "./Icon";
import { Menu } from "./ui/Menu";
import { SegmentedControl, type Segment } from "./ui/SegmentedControl";

import styles from "./TopBar.module.css";

export const THEME_OPTIONS: readonly Segment<ThemePreference>[] = [
    { value: "light", label: "Tema claro", icon: "sun" },
    { value: "dark", label: "Tema oscuro", icon: "moon" },
    { value: "auto", label: "Tema automático (según el sistema)", icon: "themeAuto" },
];

interface TopBarProps {
    /** Small line above the title: «ARQUILA», or «Proyecto» inside one. */
    eyebrow: string;
    title: string;
    user: Pick<User, "name" | "email">;
    onOpenProject: (projectId: number) => void;
    onOpenCommands: () => void;
    onCreateProject: () => void;
    /** On the projects screen «Nuevo proyecto» gives up the lime: the screen has its own. */
    createIsSecondary: boolean;
    onOpenSettings: () => void;
    onLogout: () => void;
    /** Receives the element where the open screen puts its own controls (`TopBarSlotProvider`). */
    onSlot: (element: HTMLElement | null) => void;
}

/**
 * The bar over every screen: where you are, the search, what the open screen adds (the save state
 * and the assistant of a project), the main action, the theme and the account.
 * There are no notifications: the API has none to show.
 */
export function TopBar({
    eyebrow,
    title,
    user,
    onOpenProject,
    onOpenCommands,
    onCreateProject,
    createIsSecondary,
    onOpenSettings,
    onLogout,
    onSlot,
}: TopBarProps) {
    const theme = useThemePreference();
    const initial = user.name.trim().charAt(0).toUpperCase();

    return (
        <header className={`header ${styles.bar}`}>
            <div className={styles.where}>
                <p className="header-eyebrow">{eyebrow}</p>
                <h1>{title}</h1>
            </div>
            <div className={styles.search}>
                <GlobalSearch onOpenProject={onOpenProject} onOpenCommands={onOpenCommands} />
            </div>
            <div className={styles.actions}>
                <div ref={onSlot} className={styles.slot} />
                <button
                    type="button"
                    className={
                        createIsSecondary
                            ? `button-secondary icon-button ${styles.create}`
                            : `button-lime icon-button ${styles.create}`
                    }
                    onClick={onCreateProject}
                >
                    <Icon name="plus" />
                    <span className={styles.createLabel}>Nuevo proyecto</span>
                </button>
                <div className={styles.theme}>
                    <SegmentedControl
                        label="Tema"
                        iconOnly
                        size="sm"
                        options={THEME_OPTIONS}
                        value={theme}
                        onChange={setThemePreference}
                    />
                </div>
                <div className={styles.account}>
                    <Menu
                        label={`${user.name}: cuenta y sesión`}
                        trigger={
                            <>
                                <span className="avatar" aria-hidden="true">
                                    {initial}
                                </span>
                                <span className={styles.userName}>{user.name}</span>
                            </>
                        }
                        header={
                            <p className={styles.who}>
                                <strong>{user.name}</strong>
                                <span>{user.email}</span>
                            </p>
                        }
                        items={[
                            { label: "Cuenta y configuración", onSelect: onOpenSettings },
                            { label: "Cerrar sesión", danger: true, onSelect: onLogout },
                        ]}
                    />
                </div>
            </div>
        </header>
    );
}
