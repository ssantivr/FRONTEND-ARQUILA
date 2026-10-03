export type ProjectStatus = "draft" | "active" | "archived";
export type Orientation = "north" | "south" | "east" | "west";
export type RecommendationSource = "ai" | "user" | "system";
export type DeletedItemKind = "terrain" | "material" | "plan" | "elevation";

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
    created_at: string;
}

export interface RecommendationCreate {
    category: string;
    content: string;
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
}

export interface ProjectCreate {
    name: string;
    description?: string | null;
    location?: string | null;
    status?: ProjectStatus;
}

export type ProjectUpdate = Partial<ProjectCreate>;

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

export interface ConversationMessage {
    id: number;
    conversation_id: number;
    role: "user" | "assistant" | "system";
    content: string;
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
}
