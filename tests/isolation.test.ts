import { describe, expect, test } from 'bun:test';
import { demoResponse, demoAxiosAdapter, DemoUnavailableError } from '../src/demo/transport';

describe('public transport isolation', () => {
    test('returns an empty local project page', () => {
        expect(demoResponse('GET', '/api/projects?page=1')).toMatchObject({ projects: [], total: 0 });
    });
    test('cannot sign in, generate, upload or pay', () => {
        for (const path of ['/auth/login', '/tasks', '/resources', '/payments/checkout']) {
            expect(() => demoResponse('POST', path)).toThrow(DemoUnavailableError);
        }
    });
    test('unknown reads fail rather than producing fake success', () => {
        expect(() => demoResponse('GET', '/projects/private-project')).toThrow(DemoUnavailableError);
        expect(() => demoResponse('GET', '/admin/users')).toThrow(DemoUnavailableError);
    });
    test('the Axios adapter resolves without any transport', async () => {
        const result = await demoAxiosAdapter({ method: 'GET', url: '/model-catalog' });
        expect(result.data).toEqual({ code: 0, data: { source: 'frontend', models: [] }, msg: '' });
    });
    test('cancelled requests stay cancelled', async () => {
        const controller = new AbortController(); controller.abort();
        await expect(demoAxiosAdapter({ method: 'GET', url: '/projects', signal: controller.signal })).rejects.toMatchObject({ name: 'AbortError' });
    });
});
