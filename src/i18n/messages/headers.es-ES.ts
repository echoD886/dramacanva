const headers = {
    "headers.title": "Encabezados de solicitud personalizados",
    "headers.defaultAgent": "Se envía {agent} de forma predeterminada; al añadir User-Agent se sobrescribirá el valor predeterminado.",
    "headers.addAgent": "Añadir User-Agent",
    "headers.valueLabel": "Valor del encabezado {index}",
    "headers.valuePlaceholder": "Valor del encabezado",
    "headers.nameLabel": "Nombre del encabezado {index}",
    "headers.namePlaceholder": "Nombre del encabezado",
    "headers.remove": "Eliminar encabezado",
    "headers.removeLabel": "Eliminar encabezado {index}",
    "headers.add": "Añadir encabezado",
    "headers.limit": "Se admiten un máximo de {count} encabezados de solicitud personalizados.",
    "headers.invalidName": "Nombre de encabezado no válido. Introduce un nombre de encabezado HTTP estándar.",
    "headers.managed": "{name} está gestionado por el sistema y no se puede personalizar.",
    "headers.duplicate": "El encabezado no se puede duplicar: {name}",
    "headers.controlCharacter": "El valor de {name} contiene caracteres de control no válidos.",
    "headers.tooLong": "El nombre o el valor de un encabezado individual es demasiado largo.",
    "headers.tooLarge": "El tamaño total de los encabezados personalizados no puede superar los 16KB."
} as const;
export default headers;

