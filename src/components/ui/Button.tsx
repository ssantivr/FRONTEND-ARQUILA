import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

import { Icon, type IconName } from "../Icon";
import { Kbd } from "./Kbd";
import { Spinner } from "./Spinner";
import { Tooltip } from "./Tooltip";

import styles from "./Button.module.css";

export type ButtonVariant = "primary" | "secondary" | "tertiary" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    /**
     * `primary`: the one main action of a view, a lime fill. `secondary`: bordered.
     * `tertiary`: text only, for actions next to others. `danger`: destructive, red.
     */
    variant?: ButtonVariant;
    size?: ButtonSize;
    /** Shows a spinner and blocks the button while the action it started is still running. */
    loading?: boolean;
    /** Icon before the text. */
    icon?: IconName;
    /** Icon after the text, such as the arrow of a step forward; it moves on hover. */
    iconEnd?: IconName;
    /** Keys that do the same, shown at the end («Ctrl K»). */
    shortcut?: string;
    /** Takes the whole width of its container (forms on a phone). */
    block?: boolean;
    /**
     * Why the action is not available. The button is then disabled but stays reachable with Tab,
     * and the reason is shown on hover and focus and read after its name.
     */
    disabledReason?: string;
    children: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
    {
        variant = "primary",
        size = "md",
        loading = false,
        icon,
        iconEnd,
        shortcut,
        block = false,
        disabledReason,
        type = "button",
        className,
        disabled,
        onClick,
        children,
        ...rest
    }: ButtonProps,
    ref,
) {
    const explained = disabledReason !== undefined;
    const classes = [styles.button, styles[variant], styles[size], block && styles.block, className]
        .filter(Boolean)
        .join(" ");

    const button = (
        <button
            {...rest}
            ref={ref}
            type={type}
            data-variant={variant}
            className={classes}
            disabled={!explained && (disabled === true || loading)}
            aria-disabled={explained || undefined}
            aria-busy={loading || undefined}
            onClick={explained ? (event) => event.preventDefault() : onClick}
        >
            {loading ? <Spinner size="sm" /> : icon !== undefined && <Icon name={icon} />}
            <span className={styles.label}>{children}</span>
            {shortcut !== undefined && <Kbd className={styles.kbd}>{shortcut}</Kbd>}
            {iconEnd !== undefined && <Icon name={iconEnd} className={styles.end} />}
        </button>
    );

    return explained ? <Tooltip text={disabledReason}>{button}</Tooltip> : button;
});
