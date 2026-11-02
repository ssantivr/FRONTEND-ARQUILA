import { describe, expect, it, vi } from "vitest";

import { createRenderLoop } from "./renderLoop";

function loopWith(step: (time: number, elapsed: number) => void = () => undefined) {
    let tick: ((time: number) => void) | null = null;
    const draw = vi.fn();
    const loop = createRenderLoop({
        schedule: (callback) => {
            tick = callback;
        },
        step,
        draw,
    });

    loop.start();

    return {
        loop,
        draw,
        frame: (time: number) => tick?.(time),
        running: () => tick !== null,
    };
}

describe("renderLoop", () => {
    it("draws the first frame and then only what was asked for", () => {
        const { loop, draw, frame } = loopWith();

        frame(16);
        frame(32);
        frame(48);
        expect(draw).toHaveBeenCalledTimes(1);

        loop.invalidate();
        frame(64);
        frame(80);
        expect(draw).toHaveBeenCalledTimes(2);
    });

    it("draws in the same frame when a step asks for it", () => {
        let moving = false;
        const { loop, draw, frame } = loopWith(() => {
            if (moving) {
                loop.invalidate();
            }
        });

        frame(16);
        moving = true;
        frame(32);

        expect(draw).toHaveBeenCalledTimes(2);
    });

    it("hands each step the time since the last frame, with a ceiling after a long gap", () => {
        const elapsed: number[] = [];
        const { frame } = loopWith((_time, seconds) => elapsed.push(seconds));

        frame(1000);
        frame(1050);
        frame(9000);

        expect(elapsed).toEqual([0.1, 0.05, 0.1]);
    });

    it("neither advances nor draws while paused", () => {
        const step = vi.fn();
        const { loop, draw, frame } = loopWith(step);

        loop.setPaused(true);
        loop.invalidate();
        frame(16);
        expect(step).not.toHaveBeenCalled();
        expect(draw).not.toHaveBeenCalled();

        loop.setPaused(false);
        frame(32);
        expect(draw).toHaveBeenCalledTimes(1);
    });

    it("clears the pending frame when it draws at once", () => {
        const { loop, draw, frame } = loopWith();

        loop.invalidate();
        loop.drawNow();
        frame(16);

        expect(draw).toHaveBeenCalledTimes(1);
    });

    it("stops asking for frames", () => {
        const { loop, running } = loopWith();

        expect(running()).toBe(true);
        loop.stop();
        expect(running()).toBe(false);
    });
});
