import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { errorMessage } from "../../hooks/useAsync";
import { Dialog } from "./Dialog";
import {
    ModalContext,
    type ConfirmOptions,
    type ModalApi,
    type ResultOptions,
} from "./modalContext";

type Content =
    { kind: "confirm"; options: ConfirmOptions } | { kind: "result"; options: ResultOptions };

type Request = Content & { id: number; settle: (accepted: boolean) => void };

export function ModalProvider({ children }: { children: ReactNode }) {
    const [queue, setQueue] = useState<Request[]>([]);
    const waiting = useRef(new Set<(accepted: boolean) => void>());
    const nextId = useRef(0);

    useEffect(() => {
        const pending = waiting.current;

        // Nobody is left waiting when the provider goes away.
        return () => pending.forEach((settle) => settle(false));
    }, []);

    const api = useMemo<ModalApi>(() => {
        function open(content: Content): Promise<boolean> {
            return new Promise((resolve) => {
                const id = nextId.current++;

                function settle(accepted: boolean) {
                    waiting.current.delete(settle);
                    setQueue((current) => current.filter((request) => request.id !== id));
                    resolve(accepted);
                }

                waiting.current.add(settle);
                setQueue((current) => [...current, { ...content, id, settle }]);
            });
        }

        return {
            confirm: (options) => open({ kind: "confirm", options }),
            result: (options) => open({ kind: "result", options }),
        };
    }, []);

    const current = queue[0];

    return (
        <ModalContext.Provider value={api}>
            {children}
            {current !== undefined && <MessageDialog key={current.id} request={current} />}
        </ModalContext.Provider>
    );
}

function MessageDialog({ request }: { request: Request }) {
    const { kind, options, settle } = request;
    const confirming = kind === "confirm" ? request.options : null;
    const [typed, setTyped] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const firstControl = useRef<HTMLButtonElement>(null);

    const danger = confirming?.tone === "danger";
    const requiredText = confirming?.requireText;
    const acceptLabel =
        kind === "confirm"
            ? (request.options.confirmLabel ?? "Confirmar")
            : request.options.actionLabel;

    useEffect(() => {
        firstControl.current?.focus();
    }, []);

    async function accept() {
        setBusy(true);
        setError(null);

        try {
            await options.action?.();
            settle(true);
        } catch (reason) {
            setError(errorMessage(reason));
            setBusy(false);
        }
    }

    return (
        <Dialog
            title={options.title}
            busy={busy}
            closeOnBackdrop={!danger && typed === ""}
            onClose={() => settle(false)}
        >
            <div className="dialog-content">
                <div className="dialog-text">{options.body}</div>
                {confirming?.impact && confirming.impact.length > 0 && (
                    <ul className="dialog-impact">
                        {confirming.impact.map((line) => (
                            <li key={line}>{line}</li>
                        ))}
                    </ul>
                )}
                {requiredText !== undefined && (
                    <label>
                        Escribe «{requiredText}» para confirmar
                        <input
                            value={typed}
                            maxLength={200}
                            autoComplete="off"
                            disabled={busy}
                            onChange={(event) => setTyped(event.target.value)}
                        />
                    </label>
                )}
                {error && (
                    <p className="message message-error" role="alert">
                        {error}
                    </p>
                )}
                <div className="dialog-buttons">
                    <button
                        ref={firstControl}
                        type="button"
                        className="button-secondary"
                        disabled={busy}
                        onClick={() => settle(false)}
                    >
                        {kind === "confirm" ? "Cancelar" : "Listo"}
                    </button>
                    {acceptLabel !== undefined && (
                        <button
                            type="button"
                            className={danger ? "button-danger" : undefined}
                            disabled={
                                busy ||
                                (requiredText !== undefined && typed.trim() !== requiredText.trim())
                            }
                            onClick={accept}
                        >
                            {busy ? "Procesando…" : error ? "Reintentar" : acceptLabel}
                        </button>
                    )}
                </div>
            </div>
        </Dialog>
    );
}
