import type { ButtonHTMLAttributes, ReactNode } from "react";

export type ButtonVariant = "primary" | "secondary" | "tertiary" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    /** Shows a spinner and blocks the button while the action it started is still running. */
    loading?: boolean;
    children: ReactNode;
}

const VARIANT_CLASS: Record<ButtonVariant, string> = {
    primary: "",
    secondary: "button-secondary",
    tertiary: "button-tertiary",
    danger: "button-danger",
};

export function Button({
    variant = "primary",
    loading = false,
    type = "button",
    className,
    disabled,
    children,
    ...rest
}: ButtonProps) {
    const classes = [VARIANT_CLASS[variant], className].filter(Boolean).join(" ");

    return (
        <button
            {...rest}
            type={type}
            className={classes === "" ? undefined : classes}
            disabled={disabled === true || loading}
            aria-busy={loading || undefined}
        >
            {loading && <span className="spinner" aria-hidden="true" />}
            {children}
        </button>
    );
}
