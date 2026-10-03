import { filesApi } from "../services/api";
import type { ProjectFile } from "../types/api";

interface FileAttachmentProps {
    files: ProjectFile[];
    fileId: number | null;
    label: string;
    onChange: (fileId: number | null) => void;
}

// Picks which uploaded project file is attached to a plan or elevation.
export function FileAttachment({ files, fileId, label, onChange }: FileAttachmentProps) {
    return (
        <div className="file-attachment">
            <select
                aria-label={label}
                value={fileId ?? ""}
                onChange={(event) =>
                    onChange(event.target.value === "" ? null : Number(event.target.value))
                }
            >
                <option value="">Sin archivo</option>
                {files.map((file) => (
                    <option key={file.id} value={file.id}>
                        {file.filename}
                    </option>
                ))}
            </select>
            {fileId !== null && (
                <a href={filesApi.contentUrl(fileId)} target="_blank" rel="noreferrer">
                    Ver
                </a>
            )}
        </div>
    );
}
