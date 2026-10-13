import { forwardRef, useRef, type FormEvent, type FormHTMLAttributes } from "react";

import { fieldError, isFormControl, type FormControl } from "../../utils/validation";
import styles from "./LiveForm.module.css";

const ERROR_CLASS = styles.error;
let nextId = 0;

function messageOf(control: FormControl): HTMLElement | null {
    const next = control.nextElementSibling;

    return next instanceof HTMLElement && next.classList.contains(ERROR_CLASS) ? next : null;
}

/** Writes the error of a field under it, or clears it, and tells assistive technology. */
function show(control: FormControl): boolean {
    const error = fieldError(control);
    let message = messageOf(control);

    if (error === null) {
        message?.remove();
        control.removeAttribute("aria-invalid");
        control.removeAttribute("aria-errormessage");

        return true;
    }

    if (message === null) {
        message = document.createElement("span");
        message.className = ERROR_CLASS;
        message.id = `field-error-${(nextId += 1)}`;
        message.setAttribute("role", "alert");
        control.after(message);
    }

    if (message.textContent !== error) {
        message.textContent = error;
    }

    control.setAttribute("aria-invalid", "true");
    control.setAttribute("aria-errormessage", message.id);

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
 * the twenty forms of the app get it without rewriting any of their fields.
 */
export const LiveForm = forwardRef<HTMLFormElement, FormHTMLAttributes<HTMLFormElement>>(
    function LiveForm({ onSubmit, onBlur, onInput, children, ...rest }, ref) {
        const visited = useRef(new WeakSet<FormControl>());

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
                ref={ref}
                noValidate
                onSubmit={handleSubmit}
                onBlur={(event) => {
                    // Leaving an empty field that was never written in is not yet a mistake.
                    if (isFormControl(event.target) && event.target.value !== "") {
                        visited.current.add(event.target);
                        show(event.target);
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
