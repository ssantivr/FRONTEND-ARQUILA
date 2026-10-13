import {
    Archive,
    Box,
    Camera,
    Check,
    ChevronRight,
    CircleHelp,
    Columns2,
    Columns3,
    Command,
    Crosshair,
    Cuboid,
    DraftingCompass,
    Eye,
    EyeOff,
    Folder,
    House,
    ImageDown,
    Info,
    Keyboard,
    Layers,
    LayoutGrid,
    ListChecks,
    LogOut,
    MessageSquare,
    Minus,
    Moon,
    Mountain,
    PanelLeftClose,
    Pencil,
    Plus,
    Redo2,
    Rows3,
    Scan,
    Search,
    Slice,
    SlidersHorizontal,
    Sofa,
    Sun,
    Sunrise,
    TriangleAlert,
    Undo2,
    X,
    createLucideIcon,
    type LucideIcon,
} from "lucide-react";

/**
 * The three orthogonal views have no glyph in the set, so they are drawn here and built with the
 * set's own factory: they get the same stroke, caps and size as every other icon.
 */
const ViewFront = createLucideIcon("view-front", [
    ["path", { d: "M5 4h14v15H5z", key: "body" }],
    ["path", { d: "M3 19h18", key: "ground" }],
    ["path", { d: "M9 19v-6h6v6", key: "door" }],
]);
const ViewSide = createLucideIcon("view-side", [
    ["path", { d: "M8 4h8v15H8z", key: "body" }],
    ["path", { d: "M3 19h18", key: "ground" }],
    ["path", { d: "M11 8h2", key: "window" }],
]);
const ViewTop = createLucideIcon("view-top", [
    ["path", { d: "M4 4h16v16H4z", key: "outline" }],
    ["path", { d: "M4 12h16", key: "wall" }],
    ["path", { d: "M12 4v8", key: "partition" }],
]);

const ICONS = {
    home: House,
    projects: Folder,
    terrains: Mountain,
    materials: Layers,
    viewer: Box,
    interior: Sofa,
    assistant: MessageSquare,
    settings: SlidersHorizontal,
    collapse: PanelLeftClose,
    logout: LogOut,
    sun: Sun,
    moon: Moon,
    plus: Plus,
    eye: Eye,
    eyeOff: EyeOff,
    search: Search,
    check: Check,
    edit: Pencil,
    archive: Archive,
    grid: LayoutGrid,
    rows: Rows3,
    minus: Minus,
    viewFront: ViewFront,
    viewSide: ViewSide,
    viewTop: ViewTop,
    parallel: Cuboid,
    panels: Columns3,
    help: CircleHelp,
    plans: DraftingCompass,
    lighting: Sunrise,
    render: Camera,
    tasks: ListChecks,
    focus: Crosshair,
    isolate: Scan,
    cut: Slice,
    download: ImageDown,
    keyboard: Keyboard,
    command: Command,
    chevronRight: ChevronRight,
    close: X,
    compare: Columns2,
    alert: TriangleAlert,
    info: Info,
    undo: Undo2,
    redo: Redo2,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof ICONS;

/** Every icon of the app comes from one set (lucide), with one stroke; `.icon` sets the size. */
export function Icon({ name }: { name: IconName }) {
    const Glyph = ICONS[name];

    return <Glyph className="icon" strokeWidth={1.5} aria-hidden="true" />;
}
