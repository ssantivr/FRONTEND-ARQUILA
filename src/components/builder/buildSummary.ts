import { buildsApi } from "../../services/builds";
import type { Build } from "../../types/build";
import { MAX_TEXT_LENGTH } from "../../utils/limits";
import type { ModalApi } from "../modal/modalContext";

/** Like every free text a user types (R07). */
export const MAX_DESCRIPTION_LENGTH = MAX_TEXT_LENGTH;

export function askConsent(modal: ModalApi): Promise<boolean> {
    return modal.confirm({
        title: "Enviar a la IA",
        body: "Para armar la propuesta, el texto o el documento se envía a un servicio externo de inteligencia artificial.",
        impact: [
            "No envíes datos personales que no puedas compartir.",
            "Nada se crea hasta que revises y confirmes la propuesta.",
        ],
        confirmLabel: "Enviar",
    });
}

export function megabytes(bytes: number): string {
    return (bytes / 1_000_000).toLocaleString("es", { maximumFractionDigits: 1 });
}

function plural(count: number, one: string, many: string): string {
    return `${count} ${count === 1 ? one : many}`;
}

export function summarizeBuild(build: Build): string[] {
    const rooms = build.levels.reduce((total, level) => total + level.rooms.length, 0);
    const components = build.levels.reduce((total, level) => total + level.components.length, 0);

    const origin = build.origin === "description" ? "Desde la descripción" : "Desde un documento";

    if (build.status === "applied") {
        return [origin, `${plural(build.plan_ids.length, "nivel creado", "niveles creados")}`];
    }

    return [
        origin,
        plural(build.levels.length, "nivel", "niveles"),
        plural(rooms, "ambiente", "ambientes"),
        plural(components, "elemento estructural", "elementos estructurales"),
    ];
}

export async function offerUndo(modal: ModalApi, build: Build): Promise<boolean> {
    return modal.result({
        title: "Proyecto armado con IA",
        body: `Se crearon ${plural(build.plan_ids.length, "nivel", "niveles")} con sus ambientes y elementos.`,
        actionLabel: "Deshacer",
        action: () => buildsApi.undo(build.id),
    });
}
