import type { DeletedItem, Terrain, TerrainPoint } from "../types/api";
import { terrainsApi, undoApi } from "./api";

const PREFIX = "arquila:deleted-terrains:";
const MAX_REMEMBERED = 10;

interface Remembered {
    id: number;
    name: string;
    points: TerrainPoint[];
}

function read(projectId: number): Remembered[] {
    try {
        const saved: unknown = JSON.parse(
            window.sessionStorage.getItem(`${PREFIX}${projectId}`) ?? "[]",
        );

        return Array.isArray(saved) ? (saved as Remembered[]) : [];
    } catch {
        return [];
    }
}

function write(projectId: number, items: Remembered[]): void {
    try {
        window.sessionStorage.setItem(`${PREFIX}${projectId}`, JSON.stringify(items));
    } catch {
        // Without storage the outline is simply not remembered, as before.
    }
}

/**
 * Keeps the outline of a terrain that is about to be deleted. The API brings a deleted terrain
 * back without its vertices (docs/CAMBIOS_BACKEND.md), so the interface remembers them, for as
 * long as the tab is open, to put them back after an undo.
 */
export function rememberDeletedTerrain(terrain: Terrain): void {
    if (terrain.points.length < 3) {
        return;
    }

    const others = read(terrain.project_id).filter((item) => item.id !== terrain.id);

    write(
        terrain.project_id,
        [{ id: terrain.id, name: terrain.name, points: terrain.points }, ...others].slice(
            0,
            MAX_REMEMBERED,
        ),
    );
}

/**
 * Undoes the last deletion of a project and, when what comes back is a terrain that lost its
 * vertices, sends them again.
 *
 * The restored terrain is looked for by its id and, if the API gave it a new one, by its name
 * among the terrains that have no vertices. If the vertices cannot be sent, the undo itself has
 * still worked: the error is not raised, and the outline stays remembered for another try.
 */
export async function undoLastDeletion(projectId: number): Promise<DeletedItem> {
    const restored = await undoApi.undoLast(projectId);

    if (restored.kind !== "terrain") {
        return restored;
    }

    const remembered = read(projectId);

    if (remembered.length === 0) {
        return restored;
    }

    try {
        const terrains = await terrainsApi.listByProject(projectId);
        const match = remembered
            .map((item) => ({
                item,
                terrain:
                    terrains.find((terrain) => terrain.id === item.id) ??
                    terrains.find(
                        (terrain) => terrain.name === item.name && terrain.points.length === 0,
                    ),
            }))
            .find(({ item, terrain }) => terrain !== undefined && item.name === restored.label);

        if (match?.terrain !== undefined) {
            if (match.terrain.points.length === 0) {
                await terrainsApi.update(match.terrain.id, { points: match.item.points });
            }

            write(
                projectId,
                remembered.filter((item) => item !== match.item),
            );
        }
    } catch {
        // The terrain is back; only its outline is missing, and it can be written again.
    }

    return restored;
}
