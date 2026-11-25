import generationFailure from "./generation-failure.en-US";
const messages = {
    ...generationFailure,
    "agentErrors.details": "Details",
    "agentErrors.supportDetails": "Your existing results are saved. If you still cannot continue, contact your administrator for help.",
    "agentErrors.purchase": "Add credits",
    "agentErrors.prices": "View pricing",
    "agentErrors.login": "Sign in again",
    "agentErrors.required": "Credits required: {amount}",
    "agentErrors.available": "Available balance: {amount}",
    "agentErrors.notFoundTitle": "Agent endpoint or resource not found",
    "agentErrors.notFoundText": "This conversation or resource is unavailable. Refresh the canvas and check your access.",
    "agentErrors.notFoundMeta": "Make sure the backend has loaded the Agent routes and that the canvas, session, and model are still reachable; older processes need an update and restart.",
    "agentErrors.notOpenTitle": "Agent capability not yet available",
    "agentErrors.notOpenText": "This feature is unavailable. Choose an available feature or contact your administrator.",
    "agentErrors.submitAcceptedCleanupFailed": "The run was accepted, but clearing the local submission record failed",
    "agentErrors.submitRejected": "The request was rejected by the server",
    "agentErrors.submitServerError": "The server returned an error; a retry re-checks the original request instead of creating a duplicate",
    "agentErrors.submitUnconfirmed": "No server confirmation received; a retry re-checks the original request instead of creating a duplicate",
} as const;
export default messages;
