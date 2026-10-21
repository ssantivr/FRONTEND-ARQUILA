import { EmptyState } from "./ui/EmptyState";

interface UnavailableProps {
    /** What is missing, as the screen names it: «Las tareas», «El historial». */
    what: string;
    /** Whether `what` is plural, for the verb. */
    plural?: boolean;
}

/**
 * The API in use does not have the route (an older deployment): said plainly, with nothing to
 * retry and nothing made up in its place.
 */
export function Unavailable({ what, plural = true }: UnavailableProps) {
    return (
        <EmptyState
            size="compact"
            title="No disponible"
            text={`${what} no ${plural ? "están disponibles" : "está disponible"} en la versión de la API que estás usando. ${plural ? "Aparecerán" : "Aparecerá"} aquí cuando el servidor se actualice.`}
        />
    );
}
