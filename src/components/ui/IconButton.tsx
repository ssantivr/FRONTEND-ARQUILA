import type { ButtonHTMLAttributes } from "react";

import { Icon, type IconName } from "../Icon";
import { Tooltip } from "./Tooltip";

import styles from "./IconButton.module.css";

interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
    /** What the button does. It is its accessible name and the text of its tooltip. */
    label: string;
    icon: IconName;
    /** Keys that do the same, shown in the tooltip. */
    shortcut?: string;
    /** `ghost` on toolbars, `outline` alone on a surface, `scene` over the 3D view. */
    tone?: "ghost" | "outline" | "scene";
    size?: "sm" | "md" | "touch";
    /** Why it cannot be used now; it is disabled but reachable, and the tooltip says why. */
    disabledReason?: string;
    tooltipSide?: "top" | "right" | "bottom";
    tooltipAlign?: "center" | "end";
}

/**
 * A button that shows only an icon. It always has a name and a tooltip, so the icon never has to
 * be guessed; `aria-pressed` marks a tool that stays on.
 */
export function IconButton({
    label,
    icon,
    shortcut,
    tone = "ghost",
    size = "md",
    disabledReason,
    tooltipSide = "top",
    tooltipAlign = "center",
    type = "button",
    className,
    disabled,
    onClick,
    ...rest
}: IconButtonProps) {
    const explained = disabledReason !== undefined;

    return (
        <Tooltip
            text={explained ? `${label}: ${disabledReason}` : label}
            shortcut={explained ? undefined : shortcut}
            side={tooltipSide}
            align={tooltipAlign}
            describes={explained}
        >
            <button
                {...rest}
                type={type}
                aria-label={label}
                className={[styles.button, styles[tone], styles[size], className]
                    .filter(Boolean)
                    .join(" ")}
                disabled={!explained && disabled}
                aria-disabled={explained || undefined}
                onClick={explained ? (event) => event.preventDefault() : onClick}
            >
                <Icon name={icon} />
            </button>
        </Tooltip>
    );
}
