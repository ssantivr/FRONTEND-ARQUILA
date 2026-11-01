import { setThemePreference, useThemePreference, type ThemePreference } from "../state/theme";
import type { User } from "../types/api";
import { GlobalSearch } from "./GlobalSearch";
import { Notifications } from "./Notifications";
import { Avatar } from "./ui/Avatar";
import { Breadcrumbs, type Crumb } from "./ui/Breadcrumbs";
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
    /** Where you are. Empty when the open screen draws its own trail in `onCrumbsSlot`. */
    crumbs: Crumb[];
    user: Pick<User, "name" | "email">;
    onOpenProject: (projectId: number) => void;
    onOpenCommands: () => void;
    onOpenSettings: () => void;
    onLogout: () => void;
    /** Receives the element where the open screen puts its own controls (`TopBarSlotProvider`). */
    onSlot: (element: HTMLElement | null) => void;
    /** Receives the element where a screen that knows more of the path draws its trail. */
    onCrumbsSlot: (element: HTMLElement | null) => void;
    /** Opens the menu with every module; the button is only shown on a phone. */
    onOpenMenu?: () => void;
}

/**
 * The bar over every screen: where you are, the search, what the open screen adds (the save state
 * and the assistant of a project), the notifications, the theme and the account. The title and
 * the main action of a screen are in its head, always there.
 */
export function TopBar({
    crumbs,
    user,
    onOpenProject,
    onOpenCommands,
    onOpenSettings,
    onLogout,
    onSlot,
    onCrumbsSlot,
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
            <div ref={onCrumbsSlot} className={styles.where}>
                {crumbs.length > 0 && <Breadcrumbs items={crumbs} />}
            </div>
            <div className={styles.search}>
                <GlobalSearch onOpenProject={onOpenProject} onOpenCommands={onOpenCommands} />
            </div>
            <div className={styles.actions}>
                <div ref={onSlot} className={styles.slot} />
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
