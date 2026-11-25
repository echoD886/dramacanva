const messages = {
    "generationErrors.moderation": "El contenido no superó la revisión. Los créditos de la plataforma no se cobraron o se devolvieron. Modifica el prompt antes de volver a generar.",
    "generationErrors.failed": "La generación falló. Inténtalo más tarde.",
    "generationErrors.network": "Error de red.",
    "generationErrors.busy": "El servicio está ocupado. Inténtalo más tarde.",
    "generationErrors.auth": "Falló la autenticación del servicio de generación. Revisa la configuración del canal.",
    "generationErrors.address": "La dirección del servicio de generación no está disponible. Revisa la configuración del canal.",
    "generationErrors.spawn": "No se pudo iniciar la CLI oficial de Dreamina. La tarea aún no se ha enviado.",
    "generationErrors.exit": "La CLI oficial de Dreamina no aceptó este envío. La tarea no se reintentó automáticamente.",
    "generationErrors.timeout": "Se agotó el tiempo de espera de confirmación de la CLI oficial de Dreamina. No se reintentó automáticamente para evitar cargos duplicados.",
    "generationErrors.receipt": "La CLI oficial de Dreamina no devolvió un comprobante de la tarea. No se reintentó automáticamente para evitar cargos duplicados.",
    "generationErrors.unknown": "El resultado del envío está pendiente de confirmación. No se reintentó automáticamente para evitar cargos duplicados.",
    "generationErrors.storageDisabled": "La cuenta de almacenamiento de objetos está deshabilitada. Revisa o cambia su configuración.",
    "generationErrors.storageUpload": "No se pudieron subir los recursos de referencia al almacenamiento de objetos. Revisa la configuración e inténtalo de nuevo.",
    "generationErrors.audioReferenceRequired": "Conecta un audio de referencia",
    "generationErrors.audioReferenceUnsupported": "Este protocolo no admite voces de referencia",
    "generationErrors.audioVoiceBindingChanged": "Han cambiado las conexiones de personajes o audio. Revisa las voces asignadas.",
} as const;
export default messages;
