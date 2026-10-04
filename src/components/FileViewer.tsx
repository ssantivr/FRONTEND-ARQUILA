import { useState } from "react";

import { filesApi } from "../services/api";
import type { ProjectFile } from "../types/api";
import { Modal } from "./Modal";

export function isImage(file: ProjectFile): boolean {
    return file.mime_type.startsWith("image/");
}

export function FileViewer({ file }: { file: ProjectFile }) {
    const [open, setOpen] = useState(false);
    const url = filesApi.contentUrl(file.id);

    return (
        <>
            <button
                type="button"
                className="button-secondary"
                aria-label={`Ver ${file.filename}`}
                onClick={() => setOpen(true)}
            >
                Ver
            </button>
            {open && (
                <Modal
                    title={file.filename}
                    onClose={() => setOpen(false)}
                    actions={
                        <a href={url} target="_blank" rel="noreferrer">
                            Abrir en otra pestaña
                        </a>
                    }
                >
                    {isImage(file) ? (
                        <img className="viewer-image" src={url} alt={file.filename} />
                    ) : (
                        <iframe className="viewer-frame" src={url} title={file.filename} />
                    )}
                </Modal>
            )}
        </>
    );
}
