/**
 * Geometry of the ARQUILA mark: a building drawn as a technical sketch in two-point perspective.
 * Three columns and the roof and base lines make the frame; a mid slab, two window mullions and a
 * diagonal brace detail it; construction lines run past the corners, as in a hand-drawn
 * elevation. Shared by the logo, the loader, the favicon and the social image.
 *
 * Everything is a stroke in a 48 × 48 box, drawn in `currentColor`, so the same drawing works
 * white on the dark interface, graphite on paper and in one colour anywhere.
 */

export type Piece = "construction" | "frame" | "detail";

/** How heavy a line is: the frame carries the shape; detail and construction lines are finer. */
export type Weight = "main" | "fine" | "hint";

export interface Stroke {
    piece: Piece;
    weight: Weight;
    d: string;
}

export const LOGO_WIDTH = 48;
export const LOGO_HEIGHT = 48;

/** Drawn in this order: the construction lines first, so the frame is drawn over them. */
export const LOGO_PIECES: Piece[] = ["construction", "frame", "detail"];

export const LOGO_STROKES: Stroke[] = [
    // Lines that run past the corners, and the overshoot of the front column.
    { piece: "construction", weight: "hint", d: "M3 17.9L8 16M40 16L45 17.9" },
    { piece: "construction", weight: "hint", d: "M3 36.8L8 38M40 38L45 36.8" },
    { piece: "construction", weight: "hint", d: "M24 4V10" },
    // Roof line, base and the three columns: the left face, the front corner and the right face.
    { piece: "frame", weight: "main", d: "M8 16L24 10L40 16" },
    { piece: "frame", weight: "main", d: "M8 38L24 42L40 38" },
    { piece: "frame", weight: "main", d: "M8 16V38M24 10V42M40 16V38" },
    // Mid slab, mullions of the left face and the brace of the right face.
    { piece: "detail", weight: "fine", d: "M8 27L24 26L40 27" },
    { piece: "detail", weight: "fine", d: "M13.5 18.5V24.6M18.5 16.6V24.2" },
    { piece: "detail", weight: "fine", d: "M24 26L40 38" },
];

/** Line widths in the units of the 48 box, for a mark drawn at about 24 to 64 px. */
export const STROKE_WIDTH: Record<Weight, number> = { main: 2.2, fine: 1.4, hint: 1.1 };

/** Wider lines for the 16 to 32 px favicon, where hairlines would vanish. */
export const FAVICON_STROKE_WIDTH: Record<Weight, number> = { main: 3.6, fine: 2.6, hint: 2.2 };

/** How strong each weight is drawn: the construction lines stay in the background. */
export const STROKE_OPACITY: Record<Weight, number> = { main: 1, fine: 0.78, hint: 0.5 };
