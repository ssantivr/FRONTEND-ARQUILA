import type { Terrain } from "../types/api";
import { formatNumber } from "../utils/format";

import styles from "./TerrainSituation.module.css";

const WIDTH = 320;
const HEIGHT = 200;
const MARGIN = 24;
const EARTH_RADIUS_KM = 6371;

type Located = Terrain & { latitude: number; longitude: number };

export function hasCoordinates(terrain: Terrain): terrain is Located {
    return terrain.latitude !== null && terrain.longitude !== null;
}

/** Distance along the surface of the Earth, in kilometres (haversine). */
export function distanceKm(a: Located, b: Located): number {
    const rad = Math.PI / 180;
    const dLat = (b.latitude - a.latitude) * rad;
    const dLon = (b.longitude - a.longitude) * rad;
    const h =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(a.latitude * rad) * Math.cos(b.latitude * rad) * Math.sin(dLon / 2) ** 2;

    return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

interface TerrainSituationProps {
    terrains: Terrain[];
    selectedId: number | null;
    onSelect: (terrainId: number) => void;
}

/**
 * Where the terrains are relative to one another, from their recorded coordinates: north up,
 * east to the right, with the distance across. It is not a map: the app loads no map tiles (its
 * security policy allows only its own images), so there are no streets nor relief. Drawn only
 * with two or more terrains that have coordinates; with one, the detail links to OpenStreetMap.
 */
export function TerrainSituation({ terrains, selectedId, onSelect }: TerrainSituationProps) {
    const located = terrains.filter(hasCoordinates);

    if (located.length < 2) {
        return null;
    }

    // An equirectangular projection around the middle latitude: right for the few kilometres
    // between the lots of one practice.
    const middle = located.reduce((sum, item) => sum + item.latitude, 0) / located.length;
    const squeeze = Math.cos((middle * Math.PI) / 180);
    const xs = located.map((item) => item.longitude * squeeze);
    const ys = located.map((item) => item.latitude);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const span = Math.max(Math.max(...xs) - minX, Math.max(...ys) - minY, 1e-9);
    const scale = Math.min(WIDTH - MARGIN * 2, HEIGHT - MARGIN * 2) / span;
    const widest = Math.max(
        ...located.flatMap((a, index) => located.slice(index + 1).map((b) => distanceKm(a, b))),
    );

    return (
        <figure className={styles.situation}>
            <svg
                className={styles.drawing}
                viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
                role="group"
                aria-label="Situación relativa de los terrenos con coordenadas"
            >
                <g className={styles.north} aria-hidden="true">
                    <path d={`M ${WIDTH - 18} 30 L ${WIDTH - 12} 14 L ${WIDTH - 6} 30 Z`} />
                    <text x={WIDTH - 12} y={42}>
                        N
                    </text>
                </g>
                {located.map((terrain, index) => {
                    const x = MARGIN + (xs[index] - minX) * scale;
                    const y = HEIGHT - MARGIN - (ys[index] - minY) * scale;
                    const chosen = terrain.id === selectedId;

                    return (
                        <g
                            key={terrain.id}
                            className={chosen ? `${styles.point} ${styles.chosen}` : styles.point}
                            role="button"
                            tabIndex={0}
                            aria-pressed={chosen}
                            aria-label={`${terrain.name}: ${terrain.latitude}, ${terrain.longitude}`}
                            onClick={() => onSelect(terrain.id)}
                            onKeyDown={(event) => {
                                if (event.key === "Enter" || event.key === " ") {
                                    event.preventDefault();
                                    onSelect(terrain.id);
                                }
                            }}
                        >
                            <circle cx={x} cy={y} r={chosen ? 7 : 5} />
                            <text x={x + 9} y={y + 4}>
                                {terrain.name}
                            </text>
                        </g>
                    );
                })}
            </svg>
            <figcaption className={styles.caption}>
                {located.length} de {terrains.length} terrenos con coordenadas · los más alejados
                están a {formatNumber(Math.round(widest * 100) / 100)} km. Posiciones según las
                coordenadas registradas, sin cartografía.
            </figcaption>
        </figure>
    );
}
