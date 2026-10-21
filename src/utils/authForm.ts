/**
 * The rules of the sign-in, sign-up and new-password forms, the same as the backend's
 * (`BACKEND-ARQUILA/app/schemas.py`), so a form that passes here is not refused there. Each check
 * returns what to do, in plain Spanish, or `null` when the value is fine.
 */

export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 128;
export const MAX_NAME_LENGTH = 120;
export const MAX_EMAIL_LENGTH = 255;

// `RegisterRequest.email` in the backend: something, an at sign, something, a dot, something.
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function checkName(value: string): string | null {
    const name = value.trim();

    if (name === "") {
        return "Escribe tu nombre.";
    }

    return name.length > MAX_NAME_LENGTH
        ? `Escribe como máximo ${MAX_NAME_LENGTH} caracteres.`
        : null;
}

export function checkEmail(value: string): string | null {
    const email = value.trim();

    if (email === "") {
        return "Escribe tu correo.";
    }

    if (email.length > MAX_EMAIL_LENGTH) {
        return `Escribe como máximo ${MAX_EMAIL_LENGTH} caracteres.`;
    }

    return EMAIL.test(email) ? null : "Escribe el correo completo, como nombre@ejemplo.com.";
}

/**
 * `newPassword` for a password being chosen (sign-up, reset), which needs eight characters; to
 * sign in, any password the account already has is accepted as typed.
 */
export function checkPassword(value: string, newPassword: boolean): string | null {
    if (value === "") {
        return newPassword ? "Elige una contraseña." : "Escribe tu contraseña.";
    }

    if (newPassword && value.length < MIN_PASSWORD_LENGTH) {
        return `Usa al menos ${MIN_PASSWORD_LENGTH} caracteres.`;
    }

    return value.length > MAX_PASSWORD_LENGTH
        ? `Escribe como máximo ${MAX_PASSWORD_LENGTH} caracteres.`
        : null;
}

export function checkRepeated(value: string, password: string): string | null {
    if (value === "") {
        return "Escribe la contraseña otra vez.";
    }

    return value === password ? null : "Las dos contraseñas no coinciden.";
}
