import { describe, expect, it } from "vitest";

import { MESSAGES, translateError } from "./errors";

/** Every message of the backend that the screens show in Spanish, and what they show. */
const BACKEND_MESSAGES: [string, string][] = [
    ["Project not found", "Proyecto no encontrado."],
    ["Terrain not found", "Terreno no encontrado."],
    ["Material not found", "Material no encontrado."],
    ["Plan not found", "Plano no encontrado."],
    ["Plan not found in this project", "Ese plano no pertenece a este proyecto."],
    ["Room not found", "Cuarto no encontrado."],
    ["Template not found", "Ese ejemplo no existe."],
    ["Component not found", "Componente no encontrado."],
    ["Element not found", "Ese elemento ya no existe."],
    ["Elevation not found", "Elevación no encontrada."],
    ["Recommendation not found", "Recomendación no encontrada."],
    ["Conversation not found", "Conversación no encontrada."],
    ["File not found", "Archivo no encontrado."],
    ["File not found in this project", "Ese archivo no pertenece a este proyecto."],
    ["File content is missing from storage", "El contenido del archivo ya no está disponible."],
    ["Nothing to undo", "No hay nada que deshacer."],
    ["Owner already has a project with this name", "Ya tienes un proyecto con ese nombre."],
    [
        "Project already has a material with this name",
        "El proyecto ya tiene un material con ese nombre.",
    ],
    [
        "The change conflicts with existing data",
        "El cambio entra en conflicto con datos que ya existen.",
    ],
    ["Nothing to redo", "No hay nada que rehacer."],
    ["Email is already registered", "Ese correo ya está registrado."],
    ["Invalid email or password", "Correo o contraseña incorrectos."],
    ["Not authenticated", "Tu sesión terminó. Vuelve a iniciar sesión."],
    [
        "Too many failed attempts, try again in a minute",
        "Demasiados intentos fallidos. Espera un minuto e inténtalo de nuevo.",
    ],
    [
        "Only PDF, PNG, JPEG and WebP files are supported",
        "Solo se admiten archivos PDF, PNG, JPEG y WebP.",
    ],
    ["Failed to fetch", "No se pudo conectar con el servidor."],
    ["Unexpected error", "Error inesperado."],
    [
        "The reset link is invalid or has expired",
        "El enlace no es válido o ya caducó. Pide uno nuevo desde «Olvidé mi contraseña».",
    ],
    ["Version not found", "Versión no encontrada."],
    ["Task not found", "Tarea no encontrada."],
    ["Notification not found", "Aviso no encontrado."],
    ["Walkthrough point not found", "Punto del recorrido no encontrado."],
    [
        "The cover must be a PNG, JPEG or WebP image",
        "La portada debe ser una imagen PNG, JPEG o WebP.",
    ],
    [
        "The avatar must be a PNG, JPEG or WebP image",
        "El avatar debe ser una imagen PNG, JPEG o WebP.",
    ],
    [
        "A task that is done must have a progress of 100",
        "Una tarea terminada tiene que estar al 100 %.",
    ],
    [
        "A task can only be assigned to the owner of the project",
        "Una tarea solo se puede asignar al dueño del proyecto.",
    ],
    ["The current password is incorrect", "La contraseña actual no es correcta."],
    [
        "The new password must be different from the current one",
        "La contraseña nueva tiene que ser distinta de la actual.",
    ],
    [
        "Too many failed attempts, try again later",
        "Demasiados intentos fallidos. Inténtalo de nuevo más tarde.",
    ],
    ["Not Found", "Esta función no está disponible en la versión de la API que estás usando."],
    [
        "Method Not Allowed",
        "Esta función no está disponible en la versión de la API que estás usando.",
    ],
];

describe("translateError", () => {
    it.each(BACKEND_MESSAGES)("translates «%s»", (message, spanish) => {
        expect(translateError(message)).toBe(spanish);
    });

    it("has a row in the table for every message that errors.ts translates", () => {
        expect(BACKEND_MESSAGES.map(([message]) => message).sort()).toEqual(
            Object.keys(MESSAGES).sort(),
        );
    });

    it("leaves a message it does not know as it came, so nothing is hidden", () => {
        expect(translateError("Something went wrong in a way nobody planned")).toBe(
            "Something went wrong in a way nobody planned",
        );
        expect(translateError("")).toBe("");
    });

    it("translates known backend messages", () => {
        expect(translateError("Project already has a material with this name")).toBe(
            "El proyecto ya tiene un material con ese nombre.",
        );
        expect(translateError("Invalid email or password")).toBe(
            "Correo o contraseña incorrectos.",
        );
    });

    it("translates messages that carry a value", () => {
        expect(translateError('Cannot restore "Clay brick": it conflicts with existing data')).toBe(
            "No se puede restaurar «Clay brick»: ya existe un registro que entra en conflicto.",
        );
        expect(translateError('Cannot restore "Cocina": its plan no longer exists')).toBe(
            "No se puede restaurar «Cocina»: su plano ya no existe.",
        );
        expect(translateError("File exceeds the 20 MB limit")).toBe(
            "El archivo supera el límite de 20 MB.",
        );
    });

    it("leaves unknown messages untouched", () => {
        expect(translateError("area_m2: Input should be greater than 0")).toBe(
            "area_m2: Input should be greater than 0",
        );
    });

    it("translates the messages of the routes of 20 October", () => {
        expect(translateError("Task not found")).toBe("Tarea no encontrada.");
        expect(translateError("A task that is done must have a progress of 100")).toBe(
            "Una tarea terminada tiene que estar al 100 %.",
        );
        expect(translateError("Not Found")).toMatch(/no está disponible/);
    });

    it("translates the issues of a 422 of validation, field by field", () => {
        expect(
            translateError(
                "title: String should have at most 160 characters; progress: Input should be less than or equal to 100",
            ),
        ).toBe("Título: admite como máximo 160 caracteres · Avance: tiene que ser como máximo 100");
        expect(translateError("label: Field required")).toBe("Etiqueta: es obligatorio");
    });

    it("names a field by its last part, with dots, without them and nested", () => {
        expect(translateError("title: Field required")).toBe("Título: es obligatorio");
        expect(translateError("body.title: Field required")).toBe("Título: es obligatorio");
        expect(translateError("items.0.title: Field required")).toBe("Título: es obligatorio");
        expect(translateError("items.0.area_m2: Field required")).toBe(
            "items.0.area_m2: es obligatorio",
        );
    });

    it.each([
        [
            "title: String should have at least 3 characters",
            "Título: necesita al menos 3 caracteres",
        ],
        [
            "progress: Input should be greater than or equal to 0",
            "Avance: tiene que ser al menos 0",
        ],
        [
            "due_date: Input should be a valid date or datetime, input is too short",
            "Fecha límite: tiene que ser una fecha válida",
        ],
        [
            "page: Input should be a valid integer, unable to parse string as an integer",
            "Página: tiene que ser un número entero",
        ],
        [
            "page_size: Input should be a valid number, unable to parse string as a number",
            "Tamaño de página: tiene que ser un número",
        ],
        [
            "status: Input should be 'todo', 'in_progress' or 'done'",
            "Estado: tiene un valor que no es válido",
        ],
        [
            "surface: Input should be 'concrete' or 'brick'",
            "Superficie: tiene un valor que no es válido",
        ],
    ])("translates the Pydantic issue «%s»", (message, spanish) => {
        expect(translateError(message)).toBe(spanish);
    });

    it("translates a value error with the messages it already knows", () => {
        expect(
            translateError(
                "password: Value error, The new password must be different from the current one",
            ),
        ).toBe("password: La contraseña nueva tiene que ser distinta de la actual.");
    });

    it("keeps the name of a field it does not know", () => {
        expect(translateError("area_m2: Field required")).toBe("area_m2: es obligatorio");
    });

    it("translates an issue without a field, as http.ts writes it for the whole body", () => {
        expect(translateError("title: Field required; Field required")).toBe(
            "Título: es obligatorio · es obligatorio",
        );
    });

    it("keeps an issue it does not know next to one it translates", () => {
        expect(
            translateError("label: Field required; area_m2: Input should be greater than 0"),
        ).toBe("Etiqueta: es obligatorio · area_m2: Input should be greater than 0");
    });
});
