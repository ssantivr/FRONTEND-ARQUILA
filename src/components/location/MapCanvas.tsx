import * as L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState } from "react";

import type { Position } from "./place";

// D-MAP: OpenStreetMap tiles only in local development; elsewhere the provider comes from env.
// Their usage policy: https://operations.osmfoundation.org/policies/tiles/
const TILE_URL: string =
    import.meta.env.VITE_MAP_TILE_URL ||
    (import.meta.env.DEV ? "https://tile.openstreetmap.org/{z}/{x}/{y}.png" : "");
const ATTRIBUTION: string =
    import.meta.env.VITE_MAP_ATTRIBUTION ||
    '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>';

interface MapCanvasProps {
    position: Position | null;
    /** Where to look while nothing is marked. */
    near: Position | null;
    onPick: (position: Position) => void;
    onZoom: (zoom: number) => void;
}

export default function MapCanvas({ position, near, onPick, onZoom }: MapCanvasProps) {
    const container = useRef<HTMLDivElement>(null);
    const map = useRef<L.Map | null>(null);
    const marker = useRef<L.Marker | null>(null);
    const handlers = useRef({ onPick, onZoom });
    const start = useRef(position ?? near);
    const [tilesFailed, setTilesFailed] = useState(TILE_URL === "");

    useEffect(() => {
        handlers.current = { onPick, onZoom };
    }, [onPick, onZoom]);

    useEffect(() => {
        if (container.current === null) {
            return;
        }

        const from = start.current;
        const created = L.map(container.current, { minZoom: 1, maxZoom: 19 }).setView(
            from ? [from.latitude, from.longitude] : [0, 0],
            Math.min(from?.zoom ?? 2, 19),
        );
        if (TILE_URL !== "") {
            const tiles = L.tileLayer(TILE_URL, {
                maxZoom: 19,
                attribution: ATTRIBUTION,
                // The page sends no referrer, and the tile server requires one.
                referrerPolicy: "strict-origin-when-cross-origin",
            }).addTo(created);

            tiles.on("tileerror", () => setTilesFailed(true));
            tiles.on("tileload", () => setTilesFailed(false));
        }

        created.on("click", (event: L.LeafletMouseEvent) => {
            const point = event.latlng.wrap();

            handlers.current.onPick({
                latitude: Number(point.lat.toFixed(6)),
                longitude: Number(point.lng.toFixed(6)),
                zoom: Math.max(1, created.getZoom()),
            });
        });
        created.on("zoomend", () => handlers.current.onZoom(Math.max(1, created.getZoom())));

        // The dialog gets its size after the map is created.
        const resized = new ResizeObserver(() => created.invalidateSize());
        resized.observe(container.current);
        map.current = created;

        return () => {
            resized.disconnect();
            created.remove();
            map.current = null;
            marker.current = null;
        };
    }, []);

    const latitude = position?.latitude;
    const longitude = position?.longitude;

    useEffect(() => {
        const current = map.current;

        if (current === null) {
            return;
        }

        if (latitude === undefined || longitude === undefined) {
            marker.current?.remove();
            marker.current = null;
            return;
        }

        if (marker.current === null) {
            const pin = L.marker([latitude, longitude], {
                draggable: true,
                title: "Ubicación elegida",
                icon: L.divIcon({ className: "map-pin", iconSize: [24, 24], iconAnchor: [12, 24] }),
            }).addTo(current);

            pin.on("dragend", () => {
                const point = pin.getLatLng().wrap();

                handlers.current.onPick({
                    latitude: Number(point.lat.toFixed(6)),
                    longitude: Number(point.lng.toFixed(6)),
                    zoom: Math.max(1, current.getZoom()),
                });
            });
            marker.current = pin;
        } else {
            marker.current.setLatLng([latitude, longitude]);
        }

        if (!current.getBounds().contains([latitude, longitude])) {
            current.setView([latitude, longitude], Math.max(current.getZoom(), 13));
        }
    }, [latitude, longitude]);

    return (
        <>
            <div
                ref={container}
                className="map-canvas"
                role="region"
                aria-label="Mapa para elegir la ubicación"
            />
            {tilesFailed && (
                <p className="message" role="status">
                    {TILE_URL === ""
                        ? "Este servidor todavía no tiene un proveedor de mapas. Escribe la latitud y la longitud."
                        : "El mapa no cargó bien. Puedes escribir la latitud y la longitud a mano."}
                </p>
            )}
        </>
    );
}
