import { useEffect, useRef, type ReactNode } from "react";

interface ModalProps {
    title: string;
    actions?: ReactNode;
    onClose: () => void;
    children: ReactNode;
}

export function Modal({ title, actions, onClose, children }: ModalProps) {
    const dialog = useRef<HTMLDialogElement>(null);

    useEffect(() => {
        if (dialog.current && !dialog.current.open) {
            dialog.current.showModal();
        }
    }, []);

    return (
        <dialog
            ref={dialog}
            className="modal"
            aria-label={title}
            onClose={onClose}
            onClick={(event) => {
                if (event.target === dialog.current) {
                    onClose();
                }
            }}
        >
            <header className="modal-header">
                <h2>{title}</h2>
                <div className="modal-actions">
                    {actions}
                    <button type="button" className="button-secondary" onClick={onClose}>
                        Cerrar
                    </button>
                </div>
            </header>
            <div className="modal-body">{children}</div>
        </dialog>
    );
}
