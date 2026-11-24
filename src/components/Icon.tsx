export type IconName =
    | "home"
    | "projects"
    | "terrains"
    | "dashboard"
    | "viewer"
    | "interior"
    | "assistant"
    | "settings"
    | "sparkles"
    | "upload"
    | "trash";

const PATHS: Record<IconName, string> = {
    home: "M3 11l9-8 9 8M5 10v10h14V10",
    projects: "M3 6h6l2 2h10v11H3z",
    terrains: "M3 19l6-10 4 6 2-3 6 7z",
    dashboard: "M4 4h7v8H4zM13 4h7v5h-7zM13 11h7v9h-7zM4 14h7v6H4z",
    viewer: "M12 3l8 4.5v9L12 21l-8-4.5v-9zM12 12l8-4.5M12 12v9M12 12L4 7.5",
    interior: "M4 20V9l8-6 8 6v11M4 20h16M9 20v-5h6v5M9 11h6",
    assistant: "M4 5h16v11H9l-5 4z",
    settings: "M4 7h10M18 7h2M4 17h2M10 17h10M16 4v6M8 14v6",
    sparkles:
        "M10 3l1.8 4.7L16.5 9.5l-4.7 1.8L10 16l-1.8-4.7L3.5 9.5l4.7-1.8zM18 14l.9 2.1L21 17l-2.1.9L18 20l-.9-2.1L15 17l2.1-.9z",
    upload: "M12 15V4M7 9l5-5 5 5M4 15v5h16v-5",
    trash: "M4 7h16M10 7V4h4v3M6 7l1 13h10l1-13M10 11v5M14 11v5",
};

export function Icon({ name }: { name: IconName }) {
    return (
        <svg
            className="icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <path d={PATHS[name]} />
        </svg>
    );
}
