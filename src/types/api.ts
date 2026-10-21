export type ProjectStatus = "draft" | "active" | "archived";
export type Orientation = "north" | "south" | "east" | "west";
export type RecommendationSource = "ai" | "user" | "system";
export type RecommendationPriority = "high" | "medium" | "low";
export type DeletedItemKind = "terrain" | "material" | "plan" | "elevation" | "room" | "component";

export interface DeletedItem {
    kind: DeletedItemKind;
    label: string;
}

export interface Recommendation {
    id: number;
    project_id: number;
    category: string;
    content: string;
    source: RecommendationSource;
    priority: RecommendationPriority;
    created_at: string;
}

export interface RecommendationCreate {
    category: string;
    content: string;
    priority?: RecommendationPriority;
}

export interface RecommendationFilters {
    category?: string;
    source?: RecommendationSource;
}

export interface Plan {
    id: number;
    project_id: number;
    file_id: number | null;
    title: string;
    level: string | null;
    scale: string | null;
    created_at: string;
}

export interface PlanCreate {
    file_id?: number | null;
    title: string;
    level?: string | null;
    scale?: string | null;
}

export type PlanUpdate = Partial<PlanCreate>;

export interface StructureTerrain {
    id: number;
    name: string;
    outline: TerrainPoint[];
    /**
     * Slope along the depth of the lot, in percent. The structure route does not send it yet
     * (docs/CAMBIOS_BACKEND.md); `structureApi.get` fills it in from the list of terrains.
     */
    slope_percent?: number | null;
}

export interface Room {
    id: number;
    project_id: number;
    plan_id: number;
    name: string;
    x_m: number;
    y_m: number;
    width_m: number;
    depth_m: number;
    height_m: number;
    created_at: string;
}

export interface RoomCreate {
    plan_id: number;
    name: string;
    x_m: number;
    y_m: number;
    width_m: number;
    depth_m: number;
    height_m?: number;
}

export type RoomUpdate = Partial<RoomCreate>;

export type SurfaceMaterialId =
    "concrete" | "brick" | "plaster" | "glass" | "steel" | "wood" | "stone";

export interface StructureRoom {
    kind: "room" | "volume";
    id: number;
    plan_id: number;
    plan_title: string;
    name: string;
    level: string | null;
    x_m: number;
    y_m: number;
    base_m: number;
    width_m: number;
    depth_m: number;
    height_m: number;
    surface: SurfaceMaterialId | null;
}

export type ComponentKind = "column" | "beam" | "wall";

export interface StructuralComponent {
    id: number;
    project_id: number;
    plan_id: number;
    kind: ComponentKind;
    name: string;
    x_m: number;
    y_m: number;
    width_m: number;
    depth_m: number;
    height_m: number;
    created_at: string;
}

export interface ComponentCreate {
    plan_id: number;
    kind: ComponentKind;
    name: string;
    x_m: number;
    y_m: number;
    width_m: number;
    depth_m: number;
    height_m: number;
}

export type ComponentUpdate = Partial<ComponentCreate>;

export interface StructureComponent extends Omit<StructureRoom, "kind"> {
    kind: ComponentKind;
}

export type StructureElement = StructureRoom | StructureComponent;

export type RoofKind = "gable" | "flat";

export interface Structure {
    project_id: number;
    roof: RoofKind;
    terrains: StructureTerrain[];
    rooms: StructureRoom[];
    components: StructureComponent[];
}

export interface Elevation {
    id: number;
    project_id: number;
    file_id: number | null;
    title: string;
    orientation: Orientation;
    created_at: string;
}

export interface ElevationCreate {
    file_id?: number | null;
    title: string;
    orientation: Orientation;
}

export type ElevationUpdate = Partial<ElevationCreate>;

export interface User {
    id: number;
    name: string;
    email: string;
    created_at: string;
}

export interface RegisterRequest {
    name: string;
    email: string;
    password: string;
}

export interface LoginRequest {
    email: string;
    password: string;
}

export interface Project {
    id: number;
    owner_id: number;
    name: string;
    description: string | null;
    location: string | null;
    status: ProjectStatus;
    created_at: string;
    updated_at: string;
    /** 0 to 100. Optional: an API older than the contract of 20 October does not send it. */
    progress?: number;
    archived_at?: string | null;
    /** An image of the project's files chosen as its cover, read from `GET /files/{id}/content`. */
    cover_file_id?: number | null;
}

export interface ProjectTemplate {
    id: string;
    name: string;
    kind: string;
    description: string;
    levels: number;
    lot_area_m2: number;
    built_area_m2: number;
}

export interface ProjectCreate {
    name: string;
    description?: string | null;
    location?: string | null;
    status?: ProjectStatus;
}

export type ProjectUpdate = Partial<ProjectCreate> & {
    progress?: number;
    cover_file_id?: number | null;
};

export type ProjectSort = "id" | "name" | "created_at" | "updated_at" | "status" | "progress";

/** The parameters of `GET /projects` that turn its answer into a page (contract of 20 October). */
export interface ProjectQuery {
    page: number;
    page_size: number;
    /** Searches the name, description and place. */
    q?: string;
    status?: ProjectStatus;
    archived?: boolean;
    sort?: ProjectSort;
    order?: "asc" | "desc";
}

export interface ProjectPage {
    items: Project[];
    total: number;
    page: number;
    page_size: number;
}

export type TaskStatus = "todo" | "in_progress" | "done";

export interface Task {
    id: number;
    project_id: number;
    title: string;
    description: string | null;
    status: TaskStatus;
    assignee_id: number | null;
    due_date: string | null;
    progress: number;
    created_by: number | null;
    created_at: string;
    updated_at: string;
}

export interface TaskCreate {
    title: string;
    description?: string | null;
    status?: TaskStatus;
    assignee_id?: number | null;
    due_date?: string | null;
    progress?: number;
}

export type TaskUpdate = Partial<TaskCreate>;

export interface Version {
    id: number;
    project_id: number;
    version_number: number;
    label: string | null;
    created_by: number | null;
    created_at: string;
    /** How many of each kind of content the copy holds, such as `{"plans": 2}`. */
    contents: Record<string, number>;
}

export interface VersionDetail extends Version {
    snapshot: Record<string, unknown>;
}

export interface Activity {
    id: number;
    project_id: number;
    user_id: number | null;
    action: string;
    entity_type: string | null;
    entity_id: number | null;
    detail: { label?: string; fields?: string[]; [key: string]: unknown };
    created_at: string;
}

export interface ActivityPage {
    items: Activity[];
    total: number;
    page: number;
    page_size: number;
}

export interface ProjectFilters {
    status?: ProjectStatus;
    search?: string;
}

export interface TerrainPoint {
    x_m: number;
    y_m: number;
}

export interface Terrain {
    id: number;
    project_id: number;
    name: string;
    area_m2: number;
    width_m: number | null;
    length_m: number | null;
    points: TerrainPoint[];
    slope_percent: number | null;
    soil_type: string | null;
    latitude: number | null;
    longitude: number | null;
    created_at: string;
}

export interface TerrainCreate {
    name: string;
    area_m2: number;
    width_m?: number | null;
    length_m?: number | null;
    points?: TerrainPoint[] | null;
    slope_percent?: number | null;
    soil_type?: string | null;
    latitude?: number | null;
    longitude?: number | null;
}

export type TerrainUpdate = Partial<TerrainCreate>;

export interface Material {
    id: number;
    project_id: number;
    name: string;
    category: string | null;
    unit: string;
    quantity: number;
    unit_cost: number;
    created_at: string;
}

export interface MaterialCreate {
    name: string;
    category?: string | null;
    unit: string;
    quantity?: number;
    unit_cost?: number;
}

export type MaterialUpdate = Partial<MaterialCreate>;

export interface ProjectFile {
    id: number;
    project_id: number;
    filename: string;
    mime_type: string;
    size_bytes: number;
    created_at: string;
}

export interface Conversation {
    id: number;
    project_id: number;
    title: string | null;
    created_at: string;
}

export interface AssistantStatus {
    provider: "ollama" | "rules";
    model: string | null;
}

export interface ConversationMessage {
    id: number;
    conversation_id: number;
    role: "user" | "assistant" | "system";
    content: string;
    source: "ai" | "rules" | null;
    created_at: string;
}

export interface ConversationDetail extends Conversation {
    messages: ConversationMessage[];
}

export interface Summary {
    projects: number;
    draft_projects: number;
    active_projects: number;
    archived_projects: number;
    terrains: number;
    total_area_m2: number;
    materials_total_cost: number;
    // Added to the API on 20 October; an older one leaves them out, and then they are not shown.
    in_progress_projects?: number;
    completed_projects?: number;
    materials?: number;
    plans?: number;
}

export interface Notification {
    id: number;
    title: string;
    body: string | null;
    read_at: string | null;
    created_at: string;
}

export type SpatialLayer = "structure" | "installations" | "finishes";
export type WorkStatus = "existing" | "planned" | "demolition";
export type RenovationStatus = "planned" | "in_progress" | "completed" | "cancelled";

export interface SpatialElement {
    id: number;
    project_id: number;
    room_id: number | null;
    layer: SpatialLayer;
    kind: string;
    name: string;
    work_status: WorkStatus;
    min_x_m: number;
    min_y_m: number;
    min_z_m: number;
    max_x_m: number;
    max_y_m: number;
    max_z_m: number;
    mesh_ref: string | null;
    config: Record<string, unknown>;
    source: string;
    external_id: string | null;
    created_at: string;
}

export interface SpatialData {
    project_id: number;
    counts: Record<SpatialLayer, number>;
    elements: SpatialElement[];
}

export interface WalkthroughStep {
    id: number;
    project_id: number;
    room_id: number | null;
    position: number;
    title: string;
    description: string | null;
    duration_ms: number;
    view_config: Record<string, unknown>;
    created_at: string;
}

export interface RenovationLog {
    id: number;
    project_id: number;
    room_id: number | null;
    spatial_element_id: number | null;
    created_by: number | null;
    layer: SpatialLayer;
    title: string;
    description: string | null;
    status: RenovationStatus;
    planned_start: string | null;
    planned_end: string | null;
    completed_at: string | null;
    estimated_cost: number | null;
    created_at: string;
    updated_at: string;
}

export interface RenovationLogCreate {
    project_id: number;
    room_id: number | null;
    layer: SpatialLayer;
    title: string;
    planned_start?: string;
    planned_end?: string;
}

export interface Walkthrough {
    project_id: number;
    steps: WalkthroughStep[];
    renovation_logs: RenovationLog[];
}

export interface RoomSpatial {
    id: number;
    project_id: number;
    plan_id: number;
    unit_id: number | null;
    name: string;
    category: string;
    mesh_ref: string | null;
}
