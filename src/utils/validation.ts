export type FormControl = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

function decimalsOf(step: string): number {
    return step.includes(".") ? step.split(".")[1].length : 0;
}

/**
 * What is wrong with a field, in plain Spanish, or `null` when its value is fine.
 *
 * The rules are the ones already written on the control (`required`, `min`, `max`, `minLength`,
 * `type="email"`…): the browser checks them and this turns its verdict into a sentence that
 * says what to do. A rule of the screen itself is set with `setCustomValidity` and read as is.
 */
export function fieldError(control: FormControl): string | null {
    const validity = control.validity;

    if (validity.valid) {
        return null;
    }

    if (validity.customError) {
        return control.validationMessage;
    }

    if (validity.valueMissing) {
        return control instanceof HTMLSelectElement
            ? "Elige una opción."
            : "Este dato es obligatorio.";
    }

    if (validity.badInput) {
        return "Escribe un número, por ejemplo 12,5.";
    }

    if (validity.typeMismatch) {
        return control.type === "email"
            ? "Escribe el correo completo, como nombre@ejemplo.com."
            : "Escribe una dirección completa, que empiece por https://.";
    }

    if (!(control instanceof HTMLSelectElement)) {
        if (validity.tooShort) {
            return `Escribe al menos ${control.minLength} caracteres.`;
        }

        if (validity.tooLong) {
            return `Escribe como máximo ${control.maxLength} caracteres.`;
        }
    }

    if (control instanceof HTMLInputElement) {
        if (validity.rangeUnderflow) {
            return `El valor más bajo que se admite es ${control.min.replace(".", ",")}.`;
        }

        if (validity.rangeOverflow) {
            return `El valor más alto que se admite es ${control.max.replace(".", ",")}.`;
        }

        if (validity.stepMismatch) {
            const decimals = decimalsOf(control.step);

            return decimals === 0
                ? "Escribe un número entero."
                : `Usa como máximo ${decimals} decimales.`;
        }

        if (validity.patternMismatch) {
            return control.title === "" ? "Revisa el formato de este dato." : control.title;
        }
    }

    return "Revisa este dato.";
}

/** True for the controls of a form that hold a value the user writes or chooses. */
export function isFormControl(target: EventTarget | null): target is FormControl {
    return (
        (target instanceof HTMLInputElement &&
            !["submit", "button", "reset", "hidden"].includes(target.type)) ||
        target instanceof HTMLSelectElement ||
        target instanceof HTMLTextAreaElement
    );
}
