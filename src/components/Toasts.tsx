import {
    TOAST_EXIT_MS,
    TOAST_LIFETIME_MS,
    leaveToast,
    pauseToast,
    resumeToast,
    useToasts,
} from "../state/toasts";
import { Toast, ToastRegion } from "./ui/Toast";

// The bar empties in exactly the time the toast stays before it starts to leave.
const LIFE_MS = TOAST_LIFETIME_MS - TOAST_EXIT_MS;

/** The toasts of `showToast`, at the bottom right of every screen. */
export function Toasts() {
    const toasts = useToasts();

    return (
        <ToastRegion>
            {toasts.map((toast) => (
                <Toast
                    key={toast.id}
                    text={toast.text}
                    tone={toast.tone}
                    leaving={toast.leaving}
                    lifeMs={LIFE_MS}
                    onClose={() => leaveToast(toast.id)}
                    onHold={(cause) => pauseToast(toast.id, cause)}
                    onRelease={(cause) => resumeToast(toast.id, cause)}
                />
            ))}
        </ToastRegion>
    );
}
