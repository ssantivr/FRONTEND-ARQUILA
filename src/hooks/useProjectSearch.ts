import { useEffect, useState } from "react";

import { projectsApi } from "../services/api";
import type { Project } from "../types/api";
import { errorMessage } from "./useAsync";

const SEARCH_DELAY_MS = 250;
const MAX_RESULTS = 6;

export type ProjectSearch =
    | { state: "idle" }
    | { state: "loading" }
    | { state: "ready"; projects: Project[] }
    | { state: "error"; message: string };

/**
 * Looks projects up by name while the user types. It waits a moment after the last key, so a
 * word does not send one request per letter, and it drops the answer of a query already replaced.
 */
export function useProjectSearch(query: string): ProjectSearch {
    const [results, setResults] = useState<ProjectSearch>({ state: "idle" });
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

    return results;
}
