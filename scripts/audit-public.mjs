import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const root = path.resolve(import.meta.dirname, '..');
const skip = new Set(['.git', 'node_modules', 'dist']);
function walk(dir) {
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
        if (skip.has(entry.name)) return [];
        const p = path.join(dir, entry.name);
        assert(!entry.isSymbolicLink(), `Unexpected symlink: ${path.relative(root, p)}`);
        return entry.isDirectory() ? walk(p) : [p];
    });
}
const files = walk(root);
const prohibited = /(^|\/)(backend|ops|deploy|ecommerce|product-studio|admin)(\/|$)|about-page\.|\.(sqlite|db|pem|key)$|(^|\/)\.env(?:\.|$)/;
const secretPatterns = [
    /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
    /\b(?:ghp|gho|ghs)_[A-Za-z0-9]{30,}\b/,
    /\bgithub_pat_[A-Za-z0-9_]{40,}\b/,
    /\bsk-(?:proj-)?[A-Za-z0-9_-]{32,}\b/,
    /\bAKIA[A-Z0-9]{16}\b/,
    /(?:password|apiKey|accessKeySecret)\s*[:=]\s*["'][A-Za-z0-9+/=_-]{20,}["']/,
    /\/Users\/[^/\s]+\//,
];
const problems = [];
for (const file of files) {
    const rel = path.relative(root, file);
    if (prohibited.test(rel)) problems.push(`${rel}: excluded path`);
    if (/\.(png|jpg|webp|avif|ico)$/.test(rel)) continue;
    const s = fs.readFileSync(file, 'utf8');
    if (secretPatterns.some(pattern => pattern.test(s))) problems.push(`${rel}: possible sensitive value`);
    if (rel.startsWith('src/') && /\b[a-f0-9]{32}\b|\b[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}\b/.test(s)) problems.push(`${rel}: literal project identifier requires review`);
    if (rel.startsWith('src/services/api/') && /["'`]\/admin\//.test(s)) problems.push(`${rel}: admin API action`);
}
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
assert(html.includes('Content-Security-Policy') && html.includes("form-action 'none'"), 'Missing preview CSP');
assert(html.includes('noindex,nofollow'), 'Preview must not be indexed');
const client = fs.readFileSync(path.join(root, 'src/services/api/request.ts'), 'utf8');
assert(client.includes('adapter: demoAxiosAdapter') && client.includes('withCredentials: false'), 'Demo adapter must remain active');
assert(!client.includes('VITE_CANVAS_BACKEND_URL'), 'Production URL fallback is forbidden in the preview');
const routes = fs.readFileSync(path.join(root, 'src/public-entry.tsx'), 'utf8');
assert(!/pages\/(?:ecommerce|admin)|about-page/.test(routes), 'Excluded route was restored');
assert(!fs.existsSync(path.join(root, 'src/content/about.ts')), 'Excluded About content was restored');
const works = JSON.parse(fs.readFileSync(path.join(root, 'src/pages/home/western-opening-works.local.json'), 'utf8')).works;
assert(works.every(work => work.templateUuid.startsWith('demo-') && work.originalAuthorId === null && !work.videoPath), 'Showcase must contain fictional examples only');
const routeIndex = JSON.parse(fs.readFileSync(path.join(root, 'src/lib/public-route-index.generated.json'), 'utf8'));
assert(routeIndex.templates.length === 0 && Object.keys(routeIndex.workPaths).length === 0, 'Real work-route index was restored');
if (problems.length) { console.error(problems.join('\n')); process.exit(1); }
console.log(`Public audit passed: ${files.length} files checked. No excluded paths or credential-pattern matches.`);
console.log('Pattern checks complement manual review; they are not a proof that arbitrary new content is safe.');
