import { setThemePreference, useThemePreference, type ThemePreference } from "../state/theme";
import type { User } from "../types/api";
import { GlobalSearch } from "./GlobalSearch";
import { Notifications } from "./Notifications";
import { Avatar } from "./ui/Avatar";
import { Button } from "./ui/Button";
import { IconButton } from "./ui/IconButton";
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
    /** Opens the menu with every module; the button is only shown on a phone. */
    onOpenMenu?: () => void;
}

/**
 * The bar over every screen: where you are, the search, what the open screen adds (the save state
 * and the assistant of a project), the main action, the notifications, the theme and the account.
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
    onOpenMenu,
}: TopBarProps) {
    const theme = useThemePreference();

    return (
        <header className={styles.bar}>
            {onOpenMenu !== undefined && (
                <span className={styles.menuButton}>
                    <IconButton
                        label="Abrir el menú"
                        icon="menu"
                        size="touch"
                        tooltipSide="bottom"
                        onClick={onOpenMenu}
                    />
                </span>
            )}
            <div className={styles.where}>
                <p className={styles.eyebrow}>{eyebrow}</p>
                <h1 className={styles.title}>{title}</h1>
            </div>
            <div className={styles.search}>
                <GlobalSearch onOpenProject={onOpenProject} onOpenCommands={onOpenCommands} />
            </div>
            <div className={styles.actions}>
                <div ref={onSlot} className={styles.slot} />
                <Button
                    variant={createIsSecondary ? "secondary" : "primary"}
                    icon="plus"
                    className={styles.create}
                    onClick={onCreateProject}
                >
                    <span className={styles.createLabel}>Nuevo proyecto</span>
                </Button>
                <Notifications />
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
                            <span className={styles.accountTrigger}>
                                <Avatar name={user.name} />
                                <span className={styles.userName}>{user.name}</span>
                            </span>
                        }
                        header={
                            <p className={styles.who}>
                                <strong>{user.name}</strong>
                                <span>{user.email}</span>
                            </p>
                        }
                        items={[
                            {
                                label: "Cuenta y configuración",
                                icon: "settings",
                                onSelect: onOpenSettings,
                            },
                            {
                                label: "Cerrar sesión",
                                icon: "logout",
                                danger: true,
                                separated: true,
                                onSelect: onLogout,
                            },
                        ]}
                    />
                </div>
            </div>
        </header>
    );
}
