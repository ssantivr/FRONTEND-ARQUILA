import { useRef, useState, type ChangeEvent } from "react";

import { filesApi } from "../services/api";
import type { ProjectFile } from "../types/api";
import type { SectionProps } from "../types/ui";
import { formatFileSize } from "../utils/format";
import { Panel } from "./Panel";

const TYPE_LABELS: Record<string, string> = {
    "application/pdf": "PDF",
    "image/png": "PNG",
    "image/jpeg": "JPEG",
    "image/webp": "WebP",
};

interface FilesPanelProps extends SectionProps {
    files: ProjectFile[];
    onChanged: () => void;
}

export function FilesPanel({ projectId, run, files, onChanged }: FilesPanelProps) {
    const input = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);

    async function handleSelect(event: ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];

        if (!file) {
            return;
        }

        setUploading(true);
        await run(() => filesApi.upload(projectId, file), onChanged);
        setUploading(false);

        if (input.current) {
            input.current.value = "";
        }
    }

    return (
        <Panel title="Archivos">
            {files.length === 0 ? (
                <p className="message">Este proyecto no tiene archivos.</p>
            ) : (
                <table>
                    <thead>
                        <tr>
                            <th>Nombre</th>
                            <th>Tipo</th>
                            <th className="numeric">Tamaño</th>
                            <th />
                        </tr>
                    </thead>
                    <tbody>
                        {files.map((file) => (
                            <tr key={file.id}>
                                <td data-label="Nombre">
                                    <a
                                        href={filesApi.contentUrl(file.id)}
                                        target="_blank"
                                        rel="noreferrer"
                                    >
                                        {file.filename}
                                    </a>
                                </td>
                                <td data-label="Tipo">{TYPE_LABELS[file.mime_type] ?? file.mime_type}</td>
                                <td data-label="Tamaño" className="numeric">{formatFileSize(file.size_bytes)}</td>
                                <td className="numeric">
                                    <button
                                        type="button"
                                        className="button-danger"
                                        aria-label={`Eliminar archivo ${file.filename}`}
                                        onClick={() => {
                                            if (
                                                window.confirm(
                                                    `¿Eliminar "${file.filename}"? No se puede deshacer.`,
                                                )
                                            ) {
                                                run(() => filesApi.remove(file.id), onChanged);
                                            }
                                        }}
                                    >
                                        Eliminar
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
            <div className="form-row">
                <label>
                    Subir archivo (PDF, PNG, JPEG o WebP; máximo 20 MB)
                    <input
                        ref={input}
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg,.webp"
                        disabled={uploading}
                        onChange={handleSelect}
                    />
                </label>
            </div>
        </Panel>
    );
}
