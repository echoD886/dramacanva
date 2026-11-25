const messages = {
    // Opciones de permiso
    "canvasCloudAgentSettings.permission.readOnly": "Solo lectura",
    "canvasCloudAgentSettings.permission.readOnlyDesc": "Solo análisis y sugerencias",
    "canvasCloudAgentSettings.permission.requestApproval": "Solicitar aprobación",
    "canvasCloudAgentSettings.permission.requestApprovalDesc": "Confirmar antes de escribir o generar",
    "canvasCloudAgentSettings.permission.auto": "Automático",
    "canvasCloudAgentSettings.permission.autoDesc": "Ejecuta herramientas autorizadas dentro del presupuesto",
    "canvasCloudAgentSettings.permission.fallback": "Solicitar aprobación",

    // Ámbito de contexto
    "canvasCloudAgentSettings.context.canvas": "Resumen del lienzo guardado",
    "canvasCloudAgentSettings.context.canvasDesc": "Títulos y fragmentos de texto de hasta 80 nodos; sin contenido multimedia ni cambios sin sincronizar",

    // Opciones de razonamiento
    "canvasCloudAgentSettings.reasoning.off": "Desactivado",
    "canvasCloudAgentSettings.reasoning.offDesc": "Ejecutar directamente",
    "canvasCloudAgentSettings.reasoning.auto": "Auto",
    "canvasCloudAgentSettings.reasoning.autoDesc": "Decide según la tarea",
    "canvasCloudAgentSettings.reasoning.deep": "Profundo",
    "canvasCloudAgentSettings.reasoning.deepDesc": "Planifica primero en tareas complejas",

    // Encabezado
    "canvasCloudAgentSettings.homeTitle": "Ajustes del Agent",
    "canvasCloudAgentSettings.backToChat": "Volver a la conversación",
    "canvasCloudAgentSettings.backToSettings": "Volver a los ajustes",
    "canvasCloudAgentSettings.homeHint": "Solo afecta a la próxima ejecución nueva",
    "canvasCloudAgentSettings.enabledBadge": "{count} activadas",
    "canvasCloudAgentSettings.currentAgentBadge": "Agent actual",

    // Inicio de ajustes
    "canvasCloudAgentSettings.section.reasoning": "Modo de razonamiento",
    "canvasCloudAgentSettings.section.model": "Modelo de conversación",
    "canvasCloudAgentSettings.section.permission": "Permiso de ejecución",
    "canvasCloudAgentSettings.section.capabilities": "Capacidades y ámbito",
    "canvasCloudAgentSettings.hint.newRun": "Se aplica a ejecuciones nuevas",
    "canvasCloudAgentSettings.reasoningNote": "El razonamiento solo se usa para descomponer objetivos, detectar vacíos y elegir la siguiente herramienta; el proceso de pensamiento interno nunca se muestra al usuario.",
    "canvasCloudAgentSettings.permissionNote": "Cada paso se aprueba por defecto. El modo automático puede editar contenido del lienzo autorizado; las imágenes y los vídeos siempre crean un borrador primero y pasan por una aprobación independiente antes de generarse.",
    "canvasCloudAgentSettings.selectTextModel": "Seleccionar modelo de texto",
    "canvasCloudAgentSettings.row.context": "Contexto",
    "canvasCloudAgentSettings.row.contextSummary": "{nodes} nodos · {scopes} ámbitos",
    "canvasCloudAgentSettings.row.profile": "Preferencias a largo plazo",
    "canvasCloudAgentSettings.row.skills": "Skills · biblioteca del usuario",
    "canvasCloudAgentSettings.row.skillsSummary": "{installed} instaladas · {enabled} activadas en esta ejecución",
    "canvasCloudAgentSettings.row.mcp": "Herramientas y conexiones",
    "canvasCloudAgentSettings.row.mcpSummary": "Lienzo, archivos de referencia de habilidades, tareas de generación",
    "canvasCloudAgentSettings.row.budget": "Presupuesto",
    "canvasCloudAgentSettings.row.budgetSummary": "Hasta {credits} créditos por ejecución · modelos de precio fijo",
    "canvasCloudAgentSettings.budgetUnset": "sin configurar",

    // Espacio de Skills
    "canvasCloudAgentSettings.skills.tabInstalled": "Instaladas {count}",
    "canvasCloudAgentSettings.skills.tabMarket": "Mercado de skills",
    "canvasCloudAgentSettings.skills.searchMarket": "Buscar en el mercado de skills",
    "canvasCloudAgentSettings.skills.searchInstalled": "Filtrar skills instaladas",
    "canvasCloudAgentSettings.skills.searchAria": "Buscar skills",
    "canvasCloudAgentSettings.skills.marketHint": "Descubre habilidades para tu trabajo actual",
    "canvasCloudAgentSettings.skills.matchCount": "{count} skills coincidentes",
    "canvasCloudAgentSettings.skills.selectAll": "Seleccionar todo lo visible",
    "canvasCloudAgentSettings.skills.deselectAll": "Deseleccionar todo",
    "canvasCloudAgentSettings.skills.loading": "Cargando habilidades…",
    "canvasCloudAgentSettings.skills.noMatch": "Sin coincidencias; prueba otra palabra clave",
    "canvasCloudAgentSettings.skills.loadingMore": "Cargando…",
    "canvasCloudAgentSettings.skills.loadMore": "Cargar más",

    // Espacio de preferencias
    "canvasCloudAgentSettings.profile.title": "Documento de preferencias a largo plazo",
    "canvasCloudAgentSettings.profile.intro": "Define los hábitos de trabajo, el tono y la estructura de salida del Agent a largo plazo. No añade herramientas, nodos, presupuesto ni permisos de aprobación; el contrato de seguridad siempre lo controla el código del servidor.",
    "canvasCloudAgentSettings.profile.tabUser": "Usuario",
    "canvasCloudAgentSettings.profile.tabProject": "Proyecto",
    "canvasCloudAgentSettings.profile.tabCanvas": "Lienzo",
    "canvasCloudAgentSettings.profile.projectUnbound": "Este lienzo no está vinculado a un proyecto; las preferencias del proyecto no están disponibles.",
    "canvasCloudAgentSettings.profile.loading": "Cargando instantánea de preferencias…",
    "canvasCloudAgentSettings.profile.revision": "Revisión {revision}",
    "canvasCloudAgentSettings.profile.unsaved": " · sin guardar",
    "canvasCloudAgentSettings.profile.placeholder": "p. ej.: dar primero la conclusión y luego listar los planos a cambiar; entregar los prompts en chino y en inglés.",
    "canvasCloudAgentSettings.profile.saveHint": "Guardar solo afecta a la próxima ejecución nueva. Un Agent en ejecución conserva su instantánea original.",
    "canvasCloudAgentSettings.profile.save": "Guardar",
    "canvasCloudAgentSettings.profile.retry": "Volver a cargar",
    "canvasCloudAgentSettings.profile.scopeUser": "Preferencias del usuario",
    "canvasCloudAgentSettings.profile.scopeProject": "Preferencias del proyecto",
    "canvasCloudAgentSettings.profile.scopeCanvas": "Preferencias del lienzo actual",
    "canvasCloudAgentSettings.profile.configured": "{count} capas configuradas · solo preferencias de comportamiento",
    "canvasCloudAgentSettings.profile.empty": "Sin configurar · solo preferencias de comportamiento",

    // Fila de skill
    "canvasCloudAgentSettings.skill.enableAria": "Activar {name}",
    "canvasCloudAgentSettings.skill.noDescription": "Sin descripción",
    "canvasCloudAgentSettings.skill.installed": "Instalada",
    "canvasCloudAgentSettings.skill.add": "Añadir",

    // Espacio MCP
    "canvasCloudAgentSettings.mcp.title": "Herramientas integradas del servidor",
    "canvasCloudAgentSettings.mcp.intro": "Se abren según los permisos de esta ejecución; las capacidades reales se confirman con el backend antes de enviar. Las skills aportan conocimiento operativo, nunca permisos de herramienta.",
    "canvasCloudAgentSettings.mcp.scope": "Ámbito de herramientas",
    "canvasCloudAgentSettings.mcp.toolCanvasRead": "Lectura del lienzo guardado",
    "canvasCloudAgentSettings.mcp.toolSkillFiles": "Archivos de referencia de habilidades (versiones fijas)",
    "canvasCloudAgentSettings.mcp.toolNodeWrite": "Escritura de nodos de texto / Markdown",
    "canvasCloudAgentSettings.mcp.toolMediaGenerate": "Generación multimedia del modelo del sistema y consultas de tareas",
    "canvasCloudAgentSettings.mcp.permissionBound": "Limitado por permisos",
    "canvasCloudAgentSettings.mcp.customNote": "El MCP personalizado aún no está abierto. Los permisos de herramienta, las claves y las cuotas de llamada los verifica el backend del Agent; nunca asumas que están activados en el navegador.",

    // Espacio de contexto
    "canvasCloudAgentSettings.context.title": "Qué puede leer el Agent",
    "canvasCloudAgentSettings.context.subtitle": "Solo afecta al ámbito de contexto de esta ejecución nueva",

    // Espacio de presupuesto
    "canvasCloudAgentSettings.budget.title": "Presupuesto de esta ejecución",
    "canvasCloudAgentSettings.budget.intro": "El presupuesto de créditos protege contra el gasto excesivo; 0 en tareas de generación o segundos de vídeo significa sin límite para ese concepto. El bucle del modelo lo gobiernan el presupuesto y el estado de ejecución, no un número fijo de pasos.",
    "canvasCloudAgentSettings.budget.credits": "Límite de créditos",
    "canvasCloudAgentSettings.budget.creditsHint": "Obligatorio y mayor que 0; acumulado entre pasos",
    "canvasCloudAgentSettings.budget.tasks": "Límite de tareas de generación",
    "canvasCloudAgentSettings.budget.tasksHint": "0 = sin límite; el modo solo lectura no genera",
    "canvasCloudAgentSettings.budget.video": "Límite de segundos de vídeo",
    "canvasCloudAgentSettings.budget.videoHint": "0 = sin límite; acumulado por duración de la solicitud",

    // Títulos de sección
    "canvasCloudAgentSettings.sectionTitle.profile": "Preferencias a largo plazo",
    "canvasCloudAgentSettings.sectionTitle.mcp": "MCP y herramientas",
    "canvasCloudAgentSettings.sectionTitle.context": "Contexto",
    "canvasCloudAgentSettings.sectionTitle.budget": "Presupuesto",
    "canvasCloudAgentSettings.sectionSubtitle.profile": "Preferencias de comportamiento a largo plazo de usuario, proyecto y lienzo",
    "canvasCloudAgentSettings.sectionSubtitle.skills": "Busca, instala y selecciona las skills de esta ejecución",
    "canvasCloudAgentSettings.sectionSubtitle.mcp": "Herramientas en la nube y estado de conexión",
    "canvasCloudAgentSettings.sectionSubtitle.context": "Controla lo que el Agent puede leer",
    "canvasCloudAgentSettings.sectionSubtitle.budget": "Controla los créditos y el consumo de generación de esta ejecución",
} as const;
export default messages;
