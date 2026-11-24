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
    "Document reading is not configured":
        "La lectura con IA todavía no está configurada en este servidor.",
    "Consent is needed to send the document to an external service":
        "Hace falta tu permiso para enviar el documento a un servicio externo.",
    "The document reader does not support this type of file":
        "El lector con IA no admite este tipo de archivo.",
    "The file content is not a supported document": "El contenido del archivo no es válido.",
    "The document exceeds the 4.3 MB limit for reading":
        "El documento supera el límite de 4,3 MB para leerlo con IA.",
    "A document is already being read": "Ya se está leyendo un documento. Espera a que termine.",
    "The document reader is busy": "La IA está ocupada. Inténtalo en un momento.",
    "The daily limit of the document reader was reached":
        "La IA llegó a su límite de hoy. Inténtalo mañana.",
    "The pages of the document cannot be counted":
        "No se pudieron contar las páginas de este PDF. Prueba con una imagen PNG.",
    "The size of the image cannot be read": "No se pudo leer el tamaño de la imagen.",
    "The image is too large to be read": "La imagen es demasiado grande para leerla.",
    "The text exceeds 200 characters": "El texto supera los 200 caracteres.",
    "The document has more than 10 pages": "El documento tiene más de 10 páginas.",
    "The daily limit of documents was reached":
        "Llegaste al límite diario de documentos. Inténtalo mañana.",
    "The document reader did not answer": "La IA no respondió. Inténtalo más tarde.",
    "Extraction not found": "Esa lectura ya no existe.",
    "This proposal is not waiting for review": "Esa propuesta ya fue revisada.",
    "There is nothing to undo": "No hay nada que deshacer.",
    "It changed after the document was applied":
        "No se puede deshacer porque esos datos cambiaron después.",
    "Failed to fetch": "No se pudo conectar con el servidor.",
    "Unexpected error": "Error inesperado.",
    "The reset link is invalid or has expired":
        "El enlace no es válido o ya caducó. Pide uno nuevo desde «Olvidé mi contraseña».",
};

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

    return message;
}
