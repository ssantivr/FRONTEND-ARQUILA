const MAX_FRAME_S = 0.1;

export type FrameScheduler = (callback: ((time: number) => void) | null) => void;

export interface RenderLoopOptions {
    /** Runs a callback once per display frame; `renderer.setAnimationLoop` in the engine. */
    schedule: FrameScheduler;
    /** Everything that advances with time. It runs every frame, and calls `invalidate` if needed. */
    step: (time: number, elapsedSeconds: number) => void;
    draw: () => void;
}

/**
 * Render on demand: the loop ticks with the display, but the scene is only drawn when something
 * asked for it. At rest the viewer spends no GPU.
 */
export interface RenderLoop {
    start: () => void;
    stop: () => void;
    /** Asks for a frame on the next tick. */
    invalidate: () => void;
    /** Draws now, in this task; the drawing buffer can only be read right after this. */
    drawNow: () => void;
    /** While paused nothing advances or draws: a still owns the drawing buffer. */
    setPaused: (paused: boolean) => void;
    paused: () => boolean;
}

export function createRenderLoop({ schedule, step, draw }: RenderLoopOptions): RenderLoop {
    let dirty = true;
    let paused = false;
    let lastFrame = 0;

    function drawNow(): void {
        dirty = false;
        draw();
    }

    function tick(time: number): void {
        const elapsed = Math.min((time - lastFrame) / 1000, MAX_FRAME_S);

        lastFrame = time;

        if (paused) {
            return;
        }

        step(time, elapsed);

        if (dirty) {
            drawNow();
        }
    }

    return {
        start: () => schedule(tick),
        stop: () => schedule(null),
        invalidate: () => {
            dirty = true;
        },
        drawNow,
        setPaused: (next) => {
            paused = next;
        },
        paused: () => paused,
    };
}
