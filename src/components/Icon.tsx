export type IconName =
    "home" | "projects" | "terrains" | "materials" | "viewer" | "assistant" | "settings";

const PATHS: Record<IconName, string> = {
    home: "M3 11l9-8 9 8M5 10v10h14V10",
    projects: "M3 6h6l2 2h10v11H3z",
    terrains: "M3 19l6-10 4 6 2-3 6 7z",
    materials: "M12 3l9 5-9 5-9-5zM3 13l9 5 9-5",
    viewer: "M12 3l8 4.5v9L12 21l-8-4.5v-9zM12 12l8-4.5M12 12v9M12 12L4 7.5",
    assistant: "M4 5h16v11H9l-5 4z",
    settings: "M4 7h10M18 7h2M4 17h2M10 17h10M16 4v6M8 14v6",
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
