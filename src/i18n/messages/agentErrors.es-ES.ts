import generationFailure from "./generation-failure.es-ES";
const messages = {
    ...generationFailure,
    "agentErrors.details": "Detalles",
    "agentErrors.supportDetails": "Tus resultados se conservan. Si aún no puedes continuar, pide ayuda a tu administrador.",
    "agentErrors.purchase": "Añadir créditos",
    "agentErrors.prices": "Ver precios",
    "agentErrors.login": "Volver a iniciar sesión",
    "agentErrors.required": "Créditos necesarios: {amount}",
    "agentErrors.available": "Saldo disponible: {amount}",
    "agentErrors.notFoundTitle": "No se encontró el endpoint o recurso del Agent",
    "agentErrors.notFoundText": "Esta conversación o recurso no está disponible. Actualiza el lienzo y comprueba tu acceso.",
    "agentErrors.notFoundMeta": "Confirma que el backend haya cargado las rutas del Agent y que el lienzo, la sesión y el modelo sigan accesibles; los procesos antiguos necesitan actualizarse y reiniciarse.",
    "agentErrors.notOpenTitle": "Capacidad del Agent aún no disponible",
    "agentErrors.notOpenText": "Esta función no está disponible. Elige otra o contacta con tu administrador.",
    "agentErrors.submitAcceptedCleanupFailed": "La ejecución fue aceptada, pero falló la limpieza del registro de envío local",
    "agentErrors.submitRejected": "La solicitud fue rechazada por el servidor",
    "agentErrors.submitServerError": "El servidor devolvió un error; al reintentar se verifica la solicitud original sin crear duplicados",
    "agentErrors.submitUnconfirmed": "Sin confirmación del servidor; al reintentar se verifica la solicitud original sin crear duplicados",
} as const;
export default messages;
