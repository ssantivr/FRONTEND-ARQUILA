import { dismissToast, useToasts } from "../state/toasts";

export function Toasts() {
    const toasts = useToasts();

    return (
        <div className="toasts" role="status" aria-live="polite">
            {toasts.map((toast) => (
                <div key={toast.id} className="toast">
                    <span>{toast.text}</span>
                    <button
                        type="button"
                        className="toast-close"
                        aria-label="Cerrar el aviso"
                        onClick={() => dismissToast(toast.id)}
                    >
                        ×
                    </button>
                </div>
            ))}
        </div>
    );
}
