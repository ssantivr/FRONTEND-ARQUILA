import { Component, type ErrorInfo, type ReactNode } from "react";

import { Icon } from "../Icon";
import styles from "./ViewerBoundary.module.css";

interface ViewerProblemProps {
    title: string;
    text: string;
    onRetry: () => void;
}

/** What takes the place of the 3D scene when it cannot be drawn, with a way to bring it back. */
export function ViewerProblem({ title, text, onRetry }: ViewerProblemProps) {
    return (
        <div className={styles.problem} role="alert">
            <Icon name="alert" />
            <p className={styles.title}>{title}</p>
            <p className={styles.text}>{text}</p>
            <button type="button" onClick={onRetry}>
                Volver a cargar el modelo
            </button>
        </div>
    );
}

interface ViewerBoundaryProps {
    /** Nothing is shown in place of a failed preview: the cover behind it stays visible. */
    silent?: boolean;
    onRetry: () => void;
    children: ReactNode;
}

/**
 * Error boundary of the 3D viewer alone. A crash while drawing the model leaves the rest of the
 * project (tabs, rooms, forms) working, and the scene can be rebuilt without reloading the page.
 */
export class ViewerBoundary extends Component<ViewerBoundaryProps, { failed: boolean }> {
    state = { failed: false };

    static getDerivedStateFromError(): { failed: boolean } {
        return { failed: true };
    }

    componentDidCatch(error: Error, info: ErrorInfo): void {
        console.error(error, info.componentStack);
    }

    render(): ReactNode {
        if (!this.state.failed) {
            return this.props.children;
        }

        if (this.props.silent === true) {
            return null;
        }

        return (
            <ViewerProblem
                title="El modelo 3D no se pudo dibujar"
                text="Tus datos están a salvo y el resto del proyecto sigue disponible."
                onRetry={this.props.onRetry}
            />
        );
    }
}
