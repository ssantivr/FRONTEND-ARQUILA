import { forwardRef, useEffect, useRef, type FormEvent, type FormHTMLAttributes } from "react";

import { fieldError, isFormControl, type FormControl } from "../../utils/validation";
import styles from "./LiveForm.module.css";

const ERROR_CLASS = styles.error;
let nextId = 0;

/** The value each marked field had when its message was written. */
const judged = new WeakMap<FormControl, string>();

function messageOf(control: FormControl): HTMLElement | null {
    const next = control.nextElementSibling;

    return next instanceof HTMLElement && next.classList.contains(ERROR_CLASS) ? next : null;
}

function describedBy(control: FormControl, id: string, add: boolean): void {
    const ids = (control.getAttribute("aria-describedby") ?? "")
        .split(/\s+/)
        .filter((item) => item !== "" && item !== id);

    if (add) {
        ids.push(id);
    }

    if (ids.length === 0) {
        control.removeAttribute("aria-describedby");
    } else {
        control.setAttribute("aria-describedby", ids.join(" "));
    }
}

/** Takes the message and the marks of a field away. */
function clear(control: FormControl): void {
    const message = messageOf(control);

    if (message !== null) {
        describedBy(control, message.id, false);
        message.remove();
    }

    control.removeAttribute("aria-invalid");
    control.removeAttribute("aria-errormessage");
    judged.delete(control);
}

/** Writes the error of a field under it, or clears it, and tells assistive technology. */
function show(control: FormControl): boolean {
    const error = fieldError(control);

    if (error === null) {
        clear(control);

        return true;
    }

    let message = messageOf(control);

    if (message === null) {
        message = document.createElement("span");
        message.className = ERROR_CLASS;
        message.id = `field-error-${(nextId += 1)}`;
        message.setAttribute("role", "alert");
        control.after(message);
        // A field that has just been found wrong shakes once; the class goes with the shake, so
        // showing the field again later does not replay it.
        control.classList.add("motion-shake");
        control.addEventListener("animationend", () => control.classList.remove("motion-shake"), {
            once: true,
        });
    }

    if (message.textContent !== error) {
        message.textContent = error;
    }

    control.setAttribute("aria-invalid", "true");
    // Both: `aria-errormessage` says it is the error, and `aria-describedby` is what screen
    // readers actually read today.
    control.setAttribute("aria-errormessage", message.id);
    describedBy(control, message.id, true);
    judged.set(control, control.value);

    return false;
}

/**
 * A `<form>` that validates each field as it is used, instead of all at once on sending.
 *
 * A field is checked when the user leaves it, and from then on with every key, so the message
 * goes away the moment the value is right. Sending checks every field and, if one is wrong,
 * stops and takes the cursor to the first. The rules are the attributes of each control
 * (`required`, `min`, `type`…), read by `fieldError`.
 *
 * The message is a node added right after the control, by hand and not through React: that way
 * the fourteen forms of the app get it without rewriting any of their fields. Because React does
 * not know about it, the form looks after it: when the screen changes the value of a marked
 * field by itself (the form is cancelled, another row is loaded to edit), the message was about
 * a value that is no longer there, and it is removed.
 */
export const LiveForm = forwardRef<HTMLFormElement, FormHTMLAttributes<HTMLFormElement>>(
    function LiveForm({ onSubmit, onBlur, onInput, children, ...rest }, ref) {
        const visited = useRef(new WeakSet<FormControl>());
        const form = useRef<HTMLFormElement | null>(null);

        // After every draw: a marked field whose value changed without the user typing it.
        useEffect(() => {
            for (const control of form.current?.elements ?? []) {
                if (
                    isFormControl(control) &&
                    judged.has(control) &&
                    judged.get(control) !== control.value
                ) {
                    clear(control);
                    visited.current.delete(control);
                }
            }
        });

        function handleSubmit(event: FormEvent<HTMLFormElement>) {
            const controls = [...event.currentTarget.elements].filter(isFormControl);
            const invalid = controls.filter((control) => {
                visited.current.add(control);

                return !show(control);
            });

            if (invalid.length > 0) {
                event.preventDefault();
                invalid[0].focus();

                return;
            }

            // A form that was sent starts over: its fields are not marked until used again.
            visited.current = new WeakSet();
            onSubmit?.(event);
        }

        return (
            <form
                {...rest}
                ref={(node) => {
                    form.current = node;

                    if (typeof ref === "function") {
                        ref(node);
                    } else if (ref !== null) {
                        ref.current = node;
                    }
                }}
                noValidate
                onSubmit={handleSubmit}
                onBlur={(event) => {
                    const target = event.target;
                    // Going to a button of the same form (send, cancel) is not leaving the
                    // field to move on: a message appearing now would shift that button from
                    // under the pointer, and sending checks every field anyway.
                    const toButton =
                        event.relatedTarget instanceof HTMLButtonElement &&
                        event.currentTarget.contains(event.relatedTarget);
                    // A checkbox or a radio always has a value; what counts for them, and for
                    // a field left empty, is whether the user has typed or chosen anything.
                    const used =
                        target instanceof HTMLInputElement &&
                        (target.type === "checkbox" || target.type === "radio")
                            ? visited.current.has(target)
                            : isFormControl(target) && target.value !== "";

                    if (isFormControl(target) && used && !toButton) {
                        visited.current.add(target);
                        show(target);
                    }

                    onBlur?.(event);
                }}
                onInput={(event) => {
                    if (isFormControl(event.target) && visited.current.has(event.target)) {
                        show(event.target);
                    }

                    onInput?.(event);
                }}
            >
                {children}
            </form>
        );
    },
);
