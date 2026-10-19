/** Sample answers of the API. Typed here so the browser tests can use the plain script. */
export interface SampleProject {
    id: number;
    owner_id: number;
    name: string;
    description: string | null;
    location: string | null;
    status: string;
    created_at: string;
    updated_at: string;
}

export const user: { id: number; name: string; email: string; created_at: string };
export const projects: SampleProject[];
export const summary: Record<string, number>;
export function answer(path: string, query?: URLSearchParams): unknown;
