import { useEffect, useId, useRef, useState } from "react";

import { errorMessage } from "../hooks/useAsync";
import { projectsApi } from "../services/api";
import type { Project } from "../types/api";
import { StatusBadge } from "./Badge";
import { Icon } from "./Icon";

const SEARCH_DELAY_MS = 250;
const MAX_RESULTS = 6;

type Results =
    | { state: "idle" }
    | { state: "loading" }
    | { state: "ready"; projects: Project[] }
    | { state: "error"; message: string };

interface GlobalSearchProps {
    onOpenProject: (projectId: number) => void;
}

/** Finds projects by name from anywhere in the app; the API only searches projects. */
export function GlobalSearch({ onOpenProject }: GlobalSearchProps) {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<Results>({ state: "idle" });
    const listId = useId();
    const input = useRef<HTMLInputElement>(null);
    const wanted = query.trim();

    useEffect(() => {
        if (wanted === "") {
            setResults({ state: "idle" });

            return;
        }

        let cancelled = false;

        setResults({ state: "loading" });

        const timer = window.setTimeout(() => {
            projectsApi
                .list({ search: wanted })
                .then((projects) => {
                    if (!cancelled) {
                        setResults({ state: "ready", projects: projects.slice(0, MAX_RESULTS) });
                    }
                })
                .catch((reason: unknown) => {
                    if (!cancelled) {
                        setResults({ state: "error", message: errorMessage(reason) });
                    }
                });
        }, SEARCH_DELAY_MS);

        return () => {
            cancelled = true;
            window.clearTimeout(timer);
        };
    }, [wanted]);

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
            {query === "" && (
                <kbd className="global-search-key" aria-hidden="true">
                    /
                </kbd>
            )}
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
