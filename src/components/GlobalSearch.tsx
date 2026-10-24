import { useEffect, useId, useRef, useState } from "react";

import { useProjectSearch } from "../hooks/useProjectSearch";
import { StatusBadge } from "./ui/Badge";
import { Icon } from "./Icon";
import { COMMANDS_KEY } from "./viewer/shortcuts";

import styles from "./GlobalSearch.module.css";

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
                    ["INPUT", "TEXTAREA", "SELECT"].includes(event.target.tagName) ||
                    event.target.closest("[role='dialog']") !== null);

            if (event.key === "/" && !typing && !event.ctrlKey && !event.metaKey && !event.altKey) {
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
            className={styles.search}
            role="search"
            onKeyDown={(event) => {
                if (event.key === "Escape") {
                    setQuery("");
                }
            }}
        >
            <Icon name="search" className={styles.lead} />
            <input
                className={styles.input}
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
                    <kbd className={styles.key} aria-hidden="true">
                        /
                    </kbd>
                ) : (
                    <button
                        type="button"
                        className={`${styles.key} ${styles.commands}`}
                        aria-label={`${COMMANDS_KEY}: abrir la paleta de comandos`}
                        aria-keyshortcuts="Control+K Meta+K"
                        title="Paleta de comandos: pantallas, proyectos y acciones"
                        onClick={onOpenCommands}
                    >
                        {COMMANDS_KEY}
                    </button>
                ))}
            {results.state !== "idle" && (
                <div id={listId} className={styles.results}>
                    {results.state === "loading" && (
                        <p className={styles.message} role="status">
                            Buscando…
                        </p>
                    )}
                    {results.state === "error" && (
                        <p className={`${styles.message} ${styles.error}`} role="alert">
                            {results.message}
                        </p>
                    )}
                    {results.state === "ready" && results.projects.length === 0 && (
                        <p className={styles.message} role="status">
                            Ningún proyecto coincide con «{wanted}».
                        </p>
                    )}
                    {results.state === "ready" &&
                        results.projects.map((project) => (
                            <button
                                key={project.id}
                                type="button"
                                className={styles.item}
                                onClick={() => open(project.id)}
                            >
                                <span className={styles.itemText}>
                                    <span className={styles.itemName}>{project.name}</span>
                                    {project.location !== null && (
                                        <span className={styles.itemPlace}>{project.location}</span>
                                    )}
                                </span>
                                <StatusBadge status={project.status} />
                            </button>
                        ))}
                </div>
            )}
        </div>
    );
}
