import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from "three";

type Painter = (context: CanvasRenderingContext2D, size: number, random: () => number) => void;

function seeded(seed: number): () => number {
    let state = seed;

    return () => {
        state = (state * 16807) % 2147483647;

        return state / 2147483647;
    };
}

/** A small tileable texture painted once; `tile` is the side it covers, in metres. */
function paint(size: number, tile: number, seed: number, painter: Painter): CanvasTexture {
    const canvas = document.createElement("canvas");

    canvas.width = size;
    canvas.height = size;
    painter(canvas.getContext("2d") as CanvasRenderingContext2D, size, seeded(seed));

    const texture = new CanvasTexture(canvas);

    texture.colorSpace = SRGBColorSpace;
    texture.wrapS = RepeatWrapping;
    texture.wrapT = RepeatWrapping;
    texture.repeat.setScalar(1 / tile);

    return texture;
}

function speckle(
    context: CanvasRenderingContext2D,
    size: number,
    random: () => number,
    amount: number,
    alpha: number,
): void {
    for (let index = 0; index < amount; index += 1) {
        const shade = Math.floor(random() * 255);

        context.fillStyle = `rgba(${shade}, ${shade}, ${shade}, ${alpha})`;
        context.fillRect(random() * size, random() * size, 1 + random() * 2, 1 + random() * 2);
    }
}

/** Planks running along the horizontal axis, each with its own tone and grain. */
export function woodTexture(base: [number, number, number], tile: number): CanvasTexture {
    return paint(256, tile, 11, (context, size, random) => {
        const planks = 6;
        const plank = size / planks;

        for (let row = 0; row < planks; row += 1) {
            const tone = 0.82 + random() * 0.3;

            context.fillStyle = `rgb(${base.map((channel) => Math.round(channel * tone)).join(",")})`;
            context.fillRect(0, row * plank, size, plank);

            for (let line = 0; line < 14; line += 1) {
                context.fillStyle = `rgba(0, 0, 0, ${0.04 + random() * 0.08})`;
                context.fillRect(0, row * plank + random() * plank, size, 1);
            }

            context.fillStyle = "rgba(0, 0, 0, 0.45)";
            context.fillRect(0, row * plank, size, 1);
            context.fillRect(random() * size, row * plank, 1, plank);
        }
    });
}

export function concreteTexture(tile: number): CanvasTexture {
    return paint(256, tile, 23, (context, size, random) => {
        context.fillStyle = "rgb(118, 120, 124)";
        context.fillRect(0, 0, size, size);

        for (let blotch = 0; blotch < 40; blotch += 1) {
            const shade = 95 + Math.floor(random() * 45);

            context.fillStyle = `rgba(${shade}, ${shade}, ${shade + 3}, 0.18)`;
            context.beginPath();
            context.arc(random() * size, random() * size, 12 + random() * 40, 0, Math.PI * 2);
            context.fill();
        }

        speckle(context, size, random, 2600, 0.12);
    });
}

export function fabricTexture(tile: number): CanvasTexture {
    return paint(128, tile, 37, (context, size, random) => {
        context.fillStyle = "rgb(200, 200, 200)";
        context.fillRect(0, 0, size, size);

        for (let thread = 0; thread < size; thread += 2) {
            context.fillStyle = `rgba(0, 0, 0, ${0.05 + random() * 0.1})`;
            context.fillRect(thread, 0, 1, size);
            context.fillRect(0, thread, size, 1);
        }
    });
}

/** The lit and dark windows of a tower at dusk; every building of the skyline shares it. */
export function cityWindowsTexture(): CanvasTexture {
    return paint(256, 1, 53, (context, size, random) => {
        const columns = 20;
        const rows = 48;
        const cellWidth = size / columns;
        const cellHeight = size / rows;

        context.fillStyle = "rgb(10, 12, 22)";
        context.fillRect(0, 0, size, size);

        for (let row = 0; row < rows; row += 1) {
            for (let column = 0; column < columns; column += 1) {
                const lit = random();

                if (lit < 0.3) {
                    context.fillStyle =
                        lit < 0.21
                            ? "rgb(255, 190, 110)"
                            : lit < 0.27
                              ? "rgb(140, 200, 255)"
                              : "rgb(255, 80, 165)";
                    context.fillRect(
                        column * cellWidth + cellWidth * 0.25,
                        row * cellHeight + cellHeight * 0.25,
                        cellWidth * 0.5,
                        cellHeight * 0.5,
                    );
                }
            }
        }
    });
}
