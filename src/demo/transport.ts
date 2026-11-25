/** Local fixtures only. No credentials or requests leave this application. */
export class DemoUnavailableError extends Error {
    constructor(public readonly endpoint: string) {
        super('This action needs a backend. The open-source preview does not generate media, sign in, or process payments.');
        this.name = 'DemoUnavailableError';
    }
}
export function demoResponse(method: string, input: string): unknown {
    const url = new URL(input, 'https://demo.invalid');
    const p = url.pathname.replace(/^\/api(?=\/)/, '');
    if (method.toUpperCase() !== 'GET') throw new DemoUnavailableError(p);
    const emptyPage = { items: [], projects: [], assets: [], total: 0, totalCount: 0, page: 1, pageSize: 24, hasMore: false, nextCursor: '' };
    switch (p) {
        case '/auth/session': return { user: null, authenticated: false };
        case '/features': return { features: { ecommerceEnabled: false, customChannelsEnabled: false } };
        case '/public/appearance': return { appearance: { brandName: 'DramaCanvas', logoUrl: '/brand/logo.png', darkLogoUrl: '/brand/logo.png' } };
        case '/model-catalog': return { source: 'frontend', models: [] };
        case '/models': return { models: [] };
        case '/public/model-prices': return { prices: [] };
        case '/projects': case '/canvas-projects': case '/assets': return emptyPage;
        case '/skills': case '/skills/added': return { skills: [], categories: [], total: 0, totalCount: 0 };
        case '/ai-video-templates': return { ...emptyPage, templates: [], categories: [], facets: [], filters: [], totalCount: 0 };
        case '/announcements': case '/changelogs': return { items: [], announcements: [], changelogs: [] };
        case '/referrals/availability': return { enabled: false };
        default: throw new DemoUnavailableError(p);
    }
}
export async function demoAxiosAdapter(config: any) {
    if (config.signal?.aborted) throw new DOMException('Request cancelled', 'AbortError');
    return { data: { code: 0, data: demoResponse(config.method || 'GET', config.url || '/'), msg: '' }, status: 200, statusText: 'OK', headers: {}, config };
}
