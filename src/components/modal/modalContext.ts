import { createContext, useContext, type ReactNode } from "react";

export interface ConfirmOptions {
    title: string;
    body: ReactNode;
    tone?: "danger" | "default";
    confirmLabel?: string;
    /** What will be lost or changed, one line each. */
    impact?: string[];
    /** The user has to type this text before confirming. */
    requireText?: string;
    /** Runs inside the dialog, which shows its progress and its error. */
    action?: () => Promise<unknown>;
}

export interface ResultOptions {
    title: string;
    body: ReactNode;
    actionLabel?: string;
    action?: () => Promise<unknown>;
}

export interface ModalApi {
    /** True once it was confirmed and its action, if any, finished. */
    confirm: (options: ConfirmOptions) => Promise<boolean>;
    /** True when the user chose the action, for instance "Deshacer". */
    result: (options: ResultOptions) => Promise<boolean>;
}

export const ModalContext = createContext<ModalApi | null>(null);

export function useModal(): ModalApi {
    const modal = useContext(ModalContext);

    if (modal === null) {
        throw new Error("useModal needs a ModalProvider above it");
    }

    return modal;
}
