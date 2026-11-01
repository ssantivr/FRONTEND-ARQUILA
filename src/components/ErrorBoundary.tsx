import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "./ui/Button";

interface ErrorBoundaryProps {
    children: ReactNode;
}

interface ErrorBoundaryState {
    failed: boolean;
}

/** Keeps a crash inside one screen from blanking the whole app, navigation included. */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    state: ErrorBoundaryState = { failed: false };

    static getDerivedStateFromError(): ErrorBoundaryState {
        return { failed: true };
    }

    componentDidCatch(error: Error, info: ErrorInfo): void {
        console.error(error, info.componentStack);
    }

    render(): ReactNode {
        if (!this.state.failed) {
            return this.props.children;
        }

        return (
            <section className="panel">
                <div className="message message-error" role="alert">
                    <span>
                        Esta pantalla tuvo un problema y no se pudo mostrar. El resto de la
                        aplicación sigue funcionando.
                    </span>
                    <Button
                        variant="secondary"

                        onClick={() => this.setState({ failed: false })}
                    >
                        Reintentar
                    </Button>
                </div>
            </section>
        );
    }
}
