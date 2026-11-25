const messages = {
    "pluginUpload.install": "Install plugin package",
    "pluginUpload.help": "Select a DramaCanvas plugin package. It will appear in the plugin center after installation.",
    "pluginUpload.choose": "Click to select a plugin file",
    "pluginUpload.format": "Only .yingce-plugin packages up to 16 MiB are supported",
    "pluginUpload.notice": "Verify the plugin source before uploading. Web entry points run only in their declared isolated runtime, without access to the main page. Secrets are not read from the manifest.",
} as const;
export default messages;
