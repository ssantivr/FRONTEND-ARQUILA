import { Component, type ReactNode } from "react";

/** Without the map, the coordinates can still be typed. */
export class MapBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
    state = { failed: false };

    static getDerivedStateFromError() {
        return { failed: true };
    }

    render() {
        if (this.state.failed) {
            return (
                <p className="message" role="status">
                    No se pudo abrir el mapa. Escribe la latitud y la longitud a mano.
                </p>
            );
        }

        return this.props.children;
    }
}
