import { vi } from "vitest";

/**
 * For a test that makes a component throw on purpose. React 18 in development throws the error
 * again inside an event of jsdom, which prints it with its whole stack unless the event is
 * cancelled, and then describes it on console.error. Only that error is kept quiet: any other
 * one still reaches the output, so a real failure is not lost. Call the returned function at
 * the end of the test.
 */
export function silenceExpectedError(message: string): () => void {
    const expected = (value: unknown) =>
        (value instanceof Error && value.message === message) ||
        (typeof value === "string" &&
            (value.includes(message) || value.includes("The above error occurred")));
    const onError = (event: ErrorEvent) => {
        if (expected(event.error)) {
            event.preventDefault();
        }
    };
    const original = console.error;
    const spy = vi.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
        if (!args.some(expected)) {
            original(...args);
        }
    });

    window.addEventListener("error", onError);

    return () => {
        window.removeEventListener("error", onError);
        spy.mockRestore();
    };
}
