import { buildsApi } from "../../services/builds";
import type { Build } from "../../types/build";
import { MAX_BUILD_PROMPT_LENGTH } from "../../utils/limits";
import type { ModalApi } from "../modal/modalContext";

export const MAX_DESCRIPTION_LENGTH = MAX_BUILD_PROMPT_LENGTH;

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
    const result = [
        origin,
        plural(build.plan_ids.length || build.levels.length, "nivel", "niveles"),
    ];

    if (Object.keys(build.terrain).length > 0) {
        result.push("Datos del terreno");
    }

    if (build.recommendations.length > 0) {
        result.push(plural(build.recommendations.length, "recomendación", "recomendaciones"));
    }

    if (build.status === "applied") {
        result[1] = plural(build.plan_ids.length, "nivel creado", "niveles creados");
        return result;
    }

    return [
        ...result,
        plural(rooms, "ambiente", "ambientes"),
        plural(components, "elemento estructural", "elementos estructurales"),
    ];
}

export async function offerUndo(modal: ModalApi, build: Build): Promise<boolean> {
    const recommendations =
        build.recommendations.length > 0
            ? ` También se guardaron ${plural(build.recommendations.length, "recomendación", "recomendaciones")}.`
            : "";

    return modal.result({
        title: "Proyecto armado con IA",
        body: `Se aplicaron ${plural(build.plan_ids.length, "nivel", "niveles")} y los datos revisados del proyecto y terreno.${recommendations}`,
        actionLabel: "Deshacer",
        action: () => buildsApi.undo(build.id),
    });
}
