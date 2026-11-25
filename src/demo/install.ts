import { demoResponse, DemoUnavailableError } from './transport';
const originalFetch = window.fetch.bind(window);
window.fetch = async (input, init) => {
    const url = new URL(input instanceof Request ? input.url : String(input), location.href);
    if (url.pathname.startsWith('/api/') && url.origin === location.origin) {
        try {
            const data = demoResponse(init?.method || (input instanceof Request ? input.method : 'GET'), url.href);
            return Response.json({ code: 0, data, msg: '' });
        } catch (error) {
            return Response.json({ code: 501, data: null, msg: String((error as Error).message) }, { status: 501 });
        }
    }
    if (!['blob:', 'data:'].includes(url.protocol) && url.origin !== location.origin) throw new DemoUnavailableError(url.pathname);
    return originalFetch(input, { ...init, credentials: 'omit' });
};
// Preserve media boxes without distributing the original media library.
document.addEventListener('error', event => {
    const img = event.target;
    if (img instanceof HTMLImageElement && !img.src.endsWith('/demo/placeholder.svg')) {
        img.removeAttribute('srcset');
        img.src = '/demo/placeholder.svg';
    }
}, true);
