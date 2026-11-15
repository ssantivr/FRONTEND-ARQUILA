/** The module names the API stores in the change history (R18). Contract: H4 in
 *  docs/DECISIONS.md, the same list as `SOURCE_MODULES` in
 *  BACKEND-ARQUILA/app/services/activity_log.py. */
export const SOURCE_MODULES = [
    "home",
    "projects",
    "settings",
    "summary",
    "viewer",
    "terrain",
    "plans",
    "elevations",
    "lighting",
    "analysis",
    "files",
    "versions",
    "materials",
    "compare",
    "tasks",
    "render",
    "history",
    "assistant",
] as const;

export type SourceModule = (typeof SOURCE_MODULES)[number];

/** Optional filters of `GET /projects/{id}/activity`; `from` is included and `to` excluded, both
 *  ISO 8601 instants with their offset. */
export interface ActivityFilters {
    origin?: "user" | "ai" | "system";
    sourceModule?: SourceModule;
    from?: string;
    to?: string;
}
