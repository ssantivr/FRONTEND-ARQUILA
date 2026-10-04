import type { ProjectFile } from "../types/api";
import { FileViewer } from "./FileViewer";

interface FileAttachmentProps {
    files: ProjectFile[];
    fileId: number | null;
    label: string;
    onChange: (fileId: number | null) => void;
}

export function FileAttachment({ files, fileId, label, onChange }: FileAttachmentProps) {
    const attached = files.find((file) => file.id === fileId);

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
            {attached && <FileViewer file={attached} />}
        </div>
    );
}
