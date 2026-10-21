const MESSAGES: Record<string, string> = {
    "Project not found": "Proyecto no encontrado.",
    "Terrain not found": "Terreno no encontrado.",
    "Material not found": "Material no encontrado.",
    "Plan not found": "Plano no encontrado.",
    "Plan not found in this project": "Ese plano no pertenece a este proyecto.",
    "Room not found": "Cuarto no encontrado.",
    "Template not found": "Ese ejemplo no existe.",
    "Component not found": "Componente no encontrado.",
    "Element not found": "Ese elemento ya no existe.",
    "Elevation not found": "Elevación no encontrada.",
    "Recommendation not found": "Recomendación no encontrada.",
    "Conversation not found": "Conversación no encontrada.",
    "File not found": "Archivo no encontrado.",
    "File not found in this project": "Ese archivo no pertenece a este proyecto.",
    "File content is missing from storage": "El contenido del archivo ya no está disponible.",
    "Nothing to undo": "No hay nada que deshacer.",
    "Owner already has a project with this name": "Ya tienes un proyecto con ese nombre.",
    "Project already has a material with this name":
        "El proyecto ya tiene un material con ese nombre.",
    "The change conflicts with existing data":
        "El cambio entra en conflicto con datos que ya existen.",
    "Nothing to redo": "No hay nada que rehacer.",
    "Email is already registered": "Ese correo ya está registrado.",
    "Invalid email or password": "Correo o contraseña incorrectos.",
    "Not authenticated": "Tu sesión terminó. Vuelve a iniciar sesión.",
    "Too many failed attempts, try again in a minute":
        "Demasiados intentos fallidos. Espera un minuto e inténtalo de nuevo.",
    "Only PDF, PNG, JPEG and WebP files are supported":
        "Solo se admiten archivos PDF, PNG, JPEG y WebP.",
    "Failed to fetch": "No se pudo conectar con el servidor.",
    "Unexpected error": "Error inesperado.",
    "The reset link is invalid or has expired":
        "El enlace no es válido o ya caducó. Pide uno nuevo desde «Olvidé mi contraseña».",
    // The routes of the contract of 20 October (BACKEND-ARQUILA/docs/API_CONTRATO.md).
    "Version not found": "Versión no encontrada.",
    "Task not found": "Tarea no encontrada.",
    "Notification not found": "Aviso no encontrado.",
    "Walkthrough point not found": "Punto del recorrido no encontrado.",
    "The cover must be a PNG, JPEG or WebP image":
        "La portada debe ser una imagen PNG, JPEG o WebP.",
    "The avatar must be a PNG, JPEG or WebP image":
        "El avatar debe ser una imagen PNG, JPEG o WebP.",
    "A task that is done must have a progress of 100":
        "Una tarea terminada tiene que estar al 100 %.",
    "A task can only be assigned to the owner of the project":
        "Una tarea solo se puede asignar al dueño del proyecto.",
    "The current password is incorrect": "La contraseña actual no es correcta.",
    "The new password must be different from the current one":
        "La contraseña nueva tiene que ser distinta de la actual.",
    "Too many failed attempts, try again later":
        "Demasiados intentos fallidos. Inténtalo de nuevo más tarde.",
    // What FastAPI answers for a route or method the API in use does not have.
    "Not Found": "Esta función no está disponible en la versión de la API que estás usando.",
    "Method Not Allowed":
        "Esta función no está disponible en la versión de la API que estás usando.",
};

/** The fields a 422 of validation names, as the forms call them. */
const FIELDS: Record<string, string> = {
    name: "Nombre",
    title: "Título",
    label: "Etiqueta",
    description: "Descripción",
    location: "Ubicación",
    status: "Estado",
    progress: "Avance",
    due_date: "Fecha límite",
    page: "Página",
    page_size: "Tamaño de página",
    q: "Búsqueda",
    surface: "Superficie",
};

/** The messages of Pydantic a form can meet, with the value they carry. */
const VALIDATION: [RegExp, (...values: string[]) => string][] = [
    [/^Field required$/, () => "es obligatorio"],
    [/^String should have at least (\d+) characters?$/, (n) => `necesita al menos ${n} caracteres`],
    [/^String should have at most (\d+) characters?$/, (n) => `admite como máximo ${n} caracteres`],
    [/^Input should be greater than or equal to (.+)$/, (n) => `tiene que ser al menos ${n}`],
    [/^Input should be less than or equal to (.+)$/, (n) => `tiene que ser como máximo ${n}`],
    [/^Input should be a valid date.*$/, () => "tiene que ser una fecha válida"],
    [/^Input should be a valid integer.*$/, () => "tiene que ser un número entero"],
    [/^Input should be a valid number.*$/, () => "tiene que ser un número"],
    [/^Input should be (('[^']+'(, | or )?)+)$/, () => "tiene un valor que no es válido"],
    [/^Value error, (.+)$/, (text) => translateError(text)],
];

/**
 * One issue of a 422 as `request` writes it («title: String should have…»), in Spanish; an issue
 * it does not know is left as it came, so nothing is hidden.
 */
function translateIssue(issue: string): string {
    const [, field, text] = /^([\w.]+): (.+)$/.exec(issue) ?? [null, null, issue];

    for (const [pattern, say] of VALIDATION) {
        const found = pattern.exec(text);

        if (found !== null) {
            const said = say(...found.slice(1));
            const name = field === null ? null : (FIELDS[field.split(".").pop() ?? ""] ?? field);

            return name === null ? said : `${name}: ${said}`;
        }
    }

    return issue;
}

const RESTORE_CONFLICT = /^Cannot restore "(.*)": it conflicts with existing data$/;
const RESTORE_WITHOUT_PLAN = /^Cannot restore "(.*)": its plan no longer exists$/;
const FILE_TOO_LARGE = /^File exceeds the (\d+) MB limit$/;

export function translateError(message: string): string {
    const known = MESSAGES[message];

    if (known !== undefined) {
        return known;
    }

    const conflict = RESTORE_CONFLICT.exec(message);

    if (conflict) {
        return `No se puede restaurar «${conflict[1]}»: ya existe un registro que entra en conflicto.`;
    }

    const withoutPlan = RESTORE_WITHOUT_PLAN.exec(message);

    if (withoutPlan) {
        return `No se puede restaurar «${withoutPlan[1]}»: su plano ya no existe.`;
    }

    const tooLarge = FILE_TOO_LARGE.exec(message);

    if (tooLarge) {
        return `El archivo supera el límite de ${tooLarge[1]} MB.`;
    }

    // A 422 of validation comes as «field: message; field: message».
    if (/^[\w.]+: /.test(message)) {
        const issues = message.split("; ").map(translateIssue);

        if (issues.join("; ") !== message) {
            return issues.join(" · ");
        }
    }

    return message;
}
