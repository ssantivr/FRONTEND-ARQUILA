export interface Position {
    latitude: number;
    longitude: number;
    zoom: number;
}

export interface Place {
    label: string;
    position: Position | null;
}

export const DEFAULT_ZOOM = 15;

/** A coordinate typed by hand. Undefined when it is not a number inside the range. */
export function parseCoordinate(text: string, limit: 90 | 180): number | undefined {
    const normalized = text.trim().replace(",", ".");

    if (!/^-?\d+(\.\d+)?$/.test(normalized)) {
        return undefined;
    }

    const value = Number(normalized);

    return Math.abs(value) <= limit ? Number(value.toFixed(6)) : undefined;
}

export function positionOf(item: {
    latitude?: number | null;
    longitude?: number | null;
    location_zoom?: number | null;
}): Position | null {
    if (
        item.latitude === null ||
        item.latitude === undefined ||
        item.longitude === null ||
        item.longitude === undefined
    ) {
        return null;
    }

    return {
        latitude: item.latitude,
        longitude: item.longitude,
        zoom: item.location_zoom ?? DEFAULT_ZOOM,
    };
}
