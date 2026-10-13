export type IconName =
    | "home"
    | "projects"
    | "terrains"
    | "materials"
    | "viewer"
    | "interior"
    | "assistant"
    | "settings"
    | "collapse"
    | "logout"
    | "sun"
    | "moon"
    | "plus"
    | "eye"
    | "eyeOff"
    | "search"
    | "check"
    | "edit"
    | "archive"
    | "grid"
    | "rows"
    | "minus"
    | "viewFront"
    | "viewSide"
    | "viewTop"
    | "parallel"
    | "panels"
    | "help";

const PATHS: Record<IconName, string> = {
    home: "M3 11l9-8 9 8M5 10v10h14V10",
    projects: "M3 6h6l2 2h10v11H3z",
    terrains: "M3 19l6-10 4 6 2-3 6 7z",
    materials: "M12 3l9 5-9 5-9-5zM3 13l9 5 9-5",
    viewer: "M12 3l8 4.5v9L12 21l-8-4.5v-9zM12 12l8-4.5M12 12v9M12 12L4 7.5",
    interior: "M4 20V9l8-6 8 6v11M4 20h16M9 20v-5h6v5M9 11h6",
    assistant: "M4 5h16v11H9l-5 4z",
    settings: "M4 7h10M18 7h2M4 17h2M10 17h10M16 4v6M8 14v6",
    collapse: "M14 6l-6 6 6 6M19 5v14",
    logout: "M10 4H5v16h5M15 8l4 4-4 4M19 12H9",
    sun: "M12 8a4 4 0 100 8 4 4 0 000-8zM12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2",
    moon: "M20 14.5A8 8 0 019.5 4 8 8 0 1020 14.5z",
    plus: "M12 5v14M5 12h14",
    eye: "M2 12s4-6 10-6 10 6 10 6-4 6-10 6S2 12 2 12zM12 9.5a2.5 2.5 0 100 5 2.5 2.5 0 000-5z",
    eyeOff: "M2 12s4-6 10-6 10 6 10 6-4 6-10 6S2 12 2 12zM4 4l16 16",
    search: "M11 4a7 7 0 100 14 7 7 0 000-14zM16 16l5 5",
    check: "M5 12.5l4.5 4.5L19 7",
    edit: "M4 20l4-1L19 8l-3-3L5 16zM14 7l3 3",
    archive: "M3 5h18v4H3zM5 9v10h14V9M10 13h4",
    grid: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",
    rows: "M4 6h16M4 12h16M4 18h16",
    minus: "M5 12h14",
    viewFront: "M5 4h14v15H5zM3 19h18M9 19v-6h6v6",
    viewSide: "M8 4h8v15H8zM3 19h18M11 8h2",
    viewTop: "M4 4h16v16H4zM4 12h16M12 4v8",
    parallel: "M4 7l8-3 8 3v10l-8 3-8-3zM12 4v16",
    panels: "M3 5h18v14H3zM8 5v14M16 5v14",
    help: "M12 21a9 9 0 100-18 9 9 0 000 18zM9.5 9.5a2.5 2.5 0 114.2 1.8c-.9.8-1.7 1.2-1.7 2.4M12 17h.01",
};

export function Icon({ name }: { name: IconName }) {
    return (
        <svg
            className="icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <path d={PATHS[name]} />
        </svg>
    );
}
