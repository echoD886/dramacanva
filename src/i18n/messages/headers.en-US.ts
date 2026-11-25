const headers = {
    "headers.title": "Custom request headers",
    "headers.defaultAgent": "{agent} is sent by default. Adding User-Agent will override this default value.",
    "headers.addAgent": "Add User-Agent",
    "headers.valueLabel": "Header {index} value",
    "headers.valuePlaceholder": "Header value",
    "headers.nameLabel": "Header {index} name",
    "headers.namePlaceholder": "Header name",
    "headers.remove": "Delete header",
    "headers.removeLabel": "Delete header {index}",
    "headers.add": "Add header",
    "headers.limit": "You can add up to {count} custom request headers.",
    "headers.invalidName": "Invalid header name. Please use a standard HTTP header name.",
    "headers.managed": "{name} is managed by the system and cannot be customized.",
    "headers.duplicate": "Duplicate header: {name}.",
    "headers.controlCharacter": "The value of {name} contains invalid control characters.",
    "headers.tooLong": "The header name or value is too long.",
    "headers.tooLarge": "The total size of custom request headers cannot exceed 16KB."
} as const;
export default headers;

