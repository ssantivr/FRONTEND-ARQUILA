import { useSyncExternalStore } from "react";

import type { Project } from "../types/api";

let projects: Project[] = [];
const listeners = new Set<() => void>();

function publish(next: Project[]): void {
    projects = next;

    for (const listener of listeners) {
        listener();
    }
}

/**
 * The projects the app has already received, by id. The command palette searches them, so that
 * typing there asks the server for nothing. A later answer replaces what an earlier one said.
 */
export function rememberProjects(received: Project[]): void {
    const byId = new Map(projects.map((project) => [project.id, project]));

    for (const project of received) {
        byId.set(project.id, project);
    }

    publish([...byId.values()]);
}

export function forgetProject(id: number): void {
    publish(projects.filter((project) => project.id !== id));
}

/** At sign-out: the projects of one account must not show up for the next one. */
export function forgetProjects(): void {
    publish([]);
}

function subscribe(listener: () => void): () => void {
    listeners.add(listener);

    return () => {
        listeners.delete(listener);
    };
}

export function useKnownProjects(): Project[] {
    return useSyncExternalStore(subscribe, () => projects);
}
