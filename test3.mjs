const projectPath = "/Users/rimgo/ai-slides-scenario-editor/public/slides/community-ai-tips-minimal/";
let path = projectPath;

if (path.includes('/ai-slides-scenario-editor/public/')) {
    path = path.split('/ai-slides-scenario-editor/public/')[1];
} else if (path.includes('/ai-slides-scenario-editor/')) {
    path = path.split('/ai-slides-scenario-editor/')[1];
}

console.log('After split:', path);
path = path.replace(/^\/+|\/+$/g, '');

if (path.endsWith('.md') || path.endsWith('.json') || path.endsWith('.css')) {
    const lastSlash = path.lastIndexOf('/');
    if (lastSlash !== -1) {
        path = path.substring(0, lastSlash);
    } else {
        path = '';
    }
}
console.log('After parent extract:', path);

if (path.startsWith('public/')) {
    path = path.substring(7);
}
console.log('Final fetch URL target:', `/${path}/scripts.json`);
