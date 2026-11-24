import { Suspense, lazy, useState } from "react";

import { Dialog } from "../modal/Dialog";
import { TextField } from "../TextField";
import { MapBoundary } from "./MapBoundary";
import { DEFAULT_ZOOM, parseCoordinate, type Place, type Position } from "./place";

const MapCanvas = lazy(() => import("./MapCanvas"));

interface LocationPickerModalProps {
    value: Place;
    /** Where the map opens when nothing is marked, for instance the project of a terrain. */
    near?: Position | null;
    withLabel?: boolean;
    onSave: (place: Place) => void;
    onClose: () => void;
}

export function LocationPickerModal({
    value,
    near = null,
    withLabel = true,
    onSave,
    onClose,
}: LocationPickerModalProps) {
    const [label, setLabel] = useState(value.label);
    const [latitude, setLatitude] = useState(value.position?.latitude.toString() ?? "");
    const [longitude, setLongitude] = useState(value.position?.longitude.toString() ?? "");
    const [zoom, setZoom] = useState(value.position?.zoom ?? DEFAULT_ZOOM);
    const [notice, setNotice] = useState<string | null>(null);

    const parsedLatitude = parseCoordinate(latitude, 90);
    const parsedLongitude = parseCoordinate(longitude, 180);
    const empty = latitude.trim() === "" && longitude.trim() === "";
    const position =
        parsedLatitude !== undefined && parsedLongitude !== undefined
            ? { latitude: parsedLatitude, longitude: parsedLongitude, zoom }
            : null;
    const valid = empty || position !== null;

    function pick(next: Position) {
        setLatitude(String(next.latitude));
        setLongitude(String(next.longitude));
        setZoom(next.zoom);
        setNotice(null);
    }

    function useMyLocation() {
        if (!("geolocation" in navigator)) {
            setNotice("Este navegador no puede dar tu ubicación.");
            return;
        }

        setNotice("Buscando tu ubicación…");
        navigator.geolocation.getCurrentPosition(
            ({ coords }) =>
                pick({
                    latitude: Number(coords.latitude.toFixed(6)),
                    longitude: Number(coords.longitude.toFixed(6)),
                    zoom: DEFAULT_ZOOM,
                }),
            () => setNotice("No se pudo obtener tu ubicación. Márcala en el mapa."),
            { timeout: 10000 },
        );
    }

    return (
        <Dialog title="Elegir ubicación" size="large" onClose={onClose}>
            <div className="dialog-content">
                {withLabel && (
                    <TextField label="Nombre del lugar" value={label} onChange={setLabel} />
                )}
                <MapBoundary>
                    <Suspense fallback={<p className="message">Cargando el mapa…</p>}>
                        <MapCanvas position={position} near={near} onPick={pick} onZoom={setZoom} />
                    </Suspense>
                </MapBoundary>
                <p className="message">
                    Haz clic en el mapa o arrastra el marcador. También puedes escribir las
                    coordenadas.
                </p>
                <div className="coordinate-row">
                    <label>
                        Latitud
                        <input
                            value={latitude}
                            inputMode="decimal"
                            maxLength={20}
                            aria-invalid={!empty && parsedLatitude === undefined}
                            onChange={(event) => setLatitude(event.target.value)}
                        />
                    </label>
                    <label>
                        Longitud
                        <input
                            value={longitude}
                            inputMode="decimal"
                            maxLength={20}
                            aria-invalid={!empty && parsedLongitude === undefined}
                            onChange={(event) => setLongitude(event.target.value)}
                        />
                    </label>
                </div>
                {!valid && (
                    <p className="message message-error" role="alert">
                        La latitud va de -90 a 90 y la longitud de -180 a 180. Escribe las dos.
                    </p>
                )}
                {notice && (
                    <p className="message" role="status">
                        {notice}
                    </p>
                )}
                <div className="dialog-buttons">
                    <button type="button" className="button-secondary" onClick={useMyLocation}>
                        Usar mi ubicación
                    </button>
                    <button
                        type="button"
                        className="button-secondary"
                        disabled={empty}
                        onClick={() => {
                            setLatitude("");
                            setLongitude("");
                        }}
                    >
                        Quitar marcador
                    </button>
                    <button type="button" className="button-secondary" onClick={onClose}>
                        Cancelar
                    </button>
                    <button
                        type="button"
                        disabled={!valid}
                        onClick={() => {
                            onSave({ label: label.trim(), position });
                            onClose();
                        }}
                    >
                        Guardar ubicación
                    </button>
                </div>
            </div>
        </Dialog>
    );
}
