import type { ReactNode } from "react";

import { Dialog } from "./modal/Dialog";

interface ModalProps {
    title: string;
    actions?: ReactNode;
    onClose: () => void;
    children: ReactNode;
}

export function Modal({ title, actions, onClose, children }: ModalProps) {
    return (
        <Dialog
            title={title}
            size="viewer"
            closeOnBackdrop
            headerActions={actions}
            onClose={onClose}
        >
            {children}
        </Dialog>
    );
}
