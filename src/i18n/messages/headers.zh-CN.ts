const headers = {
    "headers.title": "自定义请求头",
    "headers.defaultAgent": "默认发送 {agent}；添加 User-Agent 后会覆盖默认值。",
    "headers.addAgent": "添加 User-Agent",
    "headers.valueLabel": "请求头 {index} 值",
    "headers.valuePlaceholder": "Header 值",
    "headers.nameLabel": "请求头 {index} 名称",
    "headers.namePlaceholder": "Header 名称",
    "headers.remove": "删除请求头",
    "headers.removeLabel": "删除请求头 {index}",
    "headers.add": "添加请求头",
    "headers.limit": "自定义请求头最多支持 {count} 项",
    "headers.invalidName": "请求头名称无效，请使用标准 HTTP Header 名称",
    "headers.managed": "{name} 由系统管理，不允许自定义",
    "headers.duplicate": "请求头不能重复：{name}",
    "headers.controlCharacter": "{name} 的值包含非法控制字符",
    "headers.tooLong": "单个请求头名称或值过长",
    "headers.tooLarge": "自定义请求头总大小不能超过 16KB"
} as const;
export default headers;

