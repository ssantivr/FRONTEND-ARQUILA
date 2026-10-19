/**
 * Geometry of the ARQUILA mark: the four bars of the plan mark (floor, wall, lintel and post)
 * raised into volumes and drawn in isometric. Shared by the logo, the loader and the favicon.
 */

export type Piece = "wall" | "lintel" | "post" | "floor";

interface Box {
    piece: Piece;
    x: [number, number];
    y: [number, number];
    z: [number, number];
}

/**
 * Boxes in plan units (the plan mark is 30 × 30). They do not overlap, and they are listed from
 * back to front, so drawing them in this order hides what is behind without a depth buffer.
 */
const BOXES: Box[] = [
    { piece: "wall", x: [0, 7], y: [0, 23], z: [0, 24] },
    { piece: "lintel", x: [13, 30], y: [0, 7], z: [16, 24] },
    { piece: "post", x: [23, 30], y: [7, 16], z: [0, 16] },
    { piece: "floor", x: [0, 30], y: [23, 30], z: [0, 6] },
];

const COS = Math.cos(Math.PI / 6);
const SIN = 0.5;

function project(x: number, y: number, z: number): [number, number] {
    return [(x - y) * COS, (x + y) * SIN - z];
}

export interface Face {
    piece: Piece;
    side: "top" | "left" | "right";
    points: [number, number][];
}

function facesOf({ piece, x: [x0, x1], y: [y0, y1], z: [z0, z1] }: Box): Face[] {
    return [
        {
            piece,
            side: "left",
            points: [
                project(x0, y1, z0),
                project(x1, y1, z0),
                project(x1, y1, z1),
                project(x0, y1, z1),
            ],
        },
        {
            piece,
            side: "right",
            points: [
                project(x1, y0, z0),
                project(x1, y1, z0),
                project(x1, y1, z1),
                project(x1, y0, z1),
            ],
        },
        {
            piece,
            side: "top",
            points: [
                project(x0, y0, z1),
                project(x1, y0, z1),
                project(x1, y1, z1),
                project(x0, y1, z1),
            ],
        },
    ];
}

const RAW = BOXES.flatMap(facesOf);
const xs = RAW.flatMap((face) => face.points.map(([x]) => x));
const ys = RAW.flatMap((face) => face.points.map(([, y]) => y));
const MIN_X = Math.min(...xs);
const MIN_Y = Math.min(...ys);

export const LOGO_WIDTH = Math.max(...xs) - MIN_X;
export const LOGO_HEIGHT = Math.max(...ys) - MIN_Y;

/** The faces, moved so the drawing starts at 0,0, with their outline as an SVG path. */
export const LOGO_FACES = RAW.map((face) => ({
    ...face,
    d: `M${face.points
        .map(([x, y]) => `${(x - MIN_X).toFixed(2)} ${(y - MIN_Y).toFixed(2)}`)
        .join("L")}Z`,
}));

export const LOGO_PIECES: Piece[] = BOXES.map((box) => box.piece);
