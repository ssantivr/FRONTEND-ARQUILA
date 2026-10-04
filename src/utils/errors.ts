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
};

const RESTORE_CONFLICT = /^Cannot restore "(.*)": it conflicts with existing data$/;
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

    const tooLarge = FILE_TOO_LARGE.exec(message);

    if (tooLarge) {
        return `El archivo supera el límite de ${tooLarge[1]} MB.`;
    }

    return message;
}
