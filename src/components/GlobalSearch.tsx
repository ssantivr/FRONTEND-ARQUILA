import { useEffect, useId, useRef, useState } from "react";

import { useProjectSearch } from "../hooks/useProjectSearch";
import { StatusBadge } from "./ui/Badge";
import { Icon } from "./Icon";

/** «⌘K» on a Mac and «Ctrl K» everywhere else. */
export const COMMANDS_KEY = /Mac|iPhone|iPad/.test(globalThis.navigator?.platform ?? "")
    ? "⌘K"
    : "Ctrl K";

interface GlobalSearchProps {
    onOpenProject: (projectId: number) => void;
    /** Opens the command palette; without it the field only shows its own shortcut. */
    onOpenCommands?: () => void;
}

/** Finds projects by name from anywhere in the app; the API only searches projects. */
export function GlobalSearch({ onOpenProject, onOpenCommands }: GlobalSearchProps) {
    const [query, setQuery] = useState("");
    const listId = useId();
    const input = useRef<HTMLInputElement>(null);
    const wanted = query.trim();
    const results = useProjectSearch(query);

    useEffect(() => {
        function handleShortcut(event: KeyboardEvent) {
            const typing =
                event.target instanceof HTMLElement &&
                (event.target.isContentEditable ||
                    ["INPUT", "TEXTAREA", "SELECT"].includes(event.target.tagName));

            if (event.key === "/" && !typing && !event.ctrlKey && !event.metaKey) {
                event.preventDefault();
                input.current?.focus();
            }
        }

        window.addEventListener("keydown", handleShortcut);

        return () => window.removeEventListener("keydown", handleShortcut);
    }, []);

    function open(projectId: number) {
        setQuery("");
        onOpenProject(projectId);
    }

    return (
        <div
            className="global-search"
            role="search"
            onKeyDown={(event) => {
                if (event.key === "Escape") {
                    setQuery("");
                }
            }}
        >
            <Icon name="search" />
            <input
                ref={input}
                type="search"
                aria-keyshortcuts="/"
                placeholder="Buscar proyectos"
                aria-label="Buscar proyectos"
                aria-controls={results.state === "idle" ? undefined : listId}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
            />
            {query === "" &&
                (onOpenCommands === undefined ? (
                    <kbd className="global-search-key" aria-hidden="true">
                        /
                    </kbd>
                ) : (
                    <button
                        type="button"
                        className="global-search-key global-search-commands"
                        aria-label="Abrir la paleta de comandos"
                        aria-keyshortcuts="Control+K Meta+K"
                        title="Paleta de comandos: pantallas, proyectos y acciones"
                        onClick={onOpenCommands}
                    >
                        {COMMANDS_KEY}
                    </button>
                ))}
            {results.state !== "idle" && (
                <div id={listId} className="global-search-results">
                    {results.state === "loading" && (
                        <p className="message" role="status">
                            Buscando…
                        </p>
                    )}
                    {results.state === "error" && (
                        <p className="message message-error" role="alert">
                            {results.message}
                        </p>
                    )}
                    {results.state === "ready" && results.projects.length === 0 && (
                        <p className="message" role="status">
                            Ningún proyecto coincide con «{wanted}».
                        </p>
                    )}
                    {results.state === "ready" &&
                        results.projects.map((project) => (
                            <button
                                key={project.id}
                                type="button"
                                className="global-search-item"
                                onClick={() => open(project.id)}
                            >
                                <span>
                                    <span className="card-title">{project.name}</span>
                                    <span className="card-subtitle">
                                        {project.location ?? "Sin ubicación"}
                                    </span>
                                </span>
                                <StatusBadge status={project.status} />
                            </button>
                        ))}
                </div>
            )}
        </div>
    );
}
