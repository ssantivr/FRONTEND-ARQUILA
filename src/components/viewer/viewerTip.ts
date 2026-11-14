import { describeMeasurement, formatDistance, type Measurement } from "../../utils/measure";

export interface TipState {
    /** Why the last action was refused, shown first. */
    reason: string | null;
    measuring: boolean;
    measurement: Measurement | null;
    /** In the interior view or with a room isolated, Esc steps back. */
    steppedIn: boolean;
    roomSelected: boolean;
    somethingSelected: boolean;
}

/** The hint of the status bar: what the user can do next, or what was just measured. */
export function viewerTip(state: TipState): string {
    if (state.reason !== null) {
        return state.reason;
    }

    if (state.measuring) {
        return state.measurement === null
            ? "Haz clic en dos puntos del modelo para medir · Esc termina"
            : `${formatDistance(state.measurement.distanceM)} · ${describeMeasurement(state.measurement)}`;
    }

    if (state.steppedIn) {
        return "Esc vuelve un paso atrás";
    }

    if (state.roomSelected) {
        return "I aísla el cuarto · F lo enfoca";
    }

    return state.somethingSelected
        ? "F enfoca lo seleccionado · Esc lo suelta"
        : "Clic para seleccionar · 1 a 4 cambian la vista · ? muestra los atajos";
}
