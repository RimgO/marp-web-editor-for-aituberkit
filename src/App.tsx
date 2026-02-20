import { useState, useRef, useEffect } from 'react';
import CodeEditor, { type CodeEditorHandle } from './components/Editor';
import Preview from './components/Preview';

const initialMarkdown = `
# Slide 1: Welcome to Marp Editor

- Create beautiful slides with Markdown
- Live preview in real-time
- Supports themes and custom styles

---

<!-- theme: default -->
<!-- paginate: true -->

# Slide 2: Features

![bg right:40%](https://picsum.photos/id/1015/800/600)

## Powerful Features

1. **GitHub Flavored Markdown**
2. **Direct HTML support**
3. **Emoji support** :rocket:
4. **Math support** $ax^2+bx+c=0$

---

# Slide 3: Code Example

\`\`\`javascript
const greeting = "Hello, Marp!";
console.log(greeting);
\`\`\`

> "Simplicity is the ultimate sophistication." - Leonardo da Vinci
`.trim();

function App() {
  const [markdown, setMarkdown] = useState(initialMarkdown);
  const [themeCss, setThemeCss] = useState('');
  const [projectPath, setProjectPath] = useState('slides/demo');

  // Split-pane sizing
  const [editorWidth, setEditorWidth] = useState(40);
  const [isDragging, setIsDragging] = useState(false);

  // Editor mode
  const [editorMode, setEditorMode] = useState<'markdown' | 'scripts'>('markdown');

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const newWidth = (e.clientX / window.innerWidth) * 100;
      // Define min max widths (10% to 90%)
      if (newWidth > 10 && newWidth < 90) {
        setEditorWidth(newWidth);
      }
    };
    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const editorRef = useRef<CodeEditorHandle>(null);

  // Script interface
  interface ScriptItem {
    page: number;
    line: string;
    notes: string;
  }

  const [scripts, setScripts] = useState<ScriptItem[]>([]);

  const loadProject = async () => {
    try {
      // Robust path normalization: handle absolute paths from local filesystem
      let path = projectPath;

      // If absolute path from Mac is pasted, strip the root repo part
      if (path.includes('/ai-slides-scenario-editor/public/')) {
        path = path.split('/ai-slides-scenario-editor/public/')[1];
      } else if (path.includes('/ai-slides-scenario-editor/')) {
        path = path.split('/ai-slides-scenario-editor/')[1];
      }

      // If a specific file was pasted, get its parent directory
      if (path.endsWith('.md') || path.endsWith('.json') || path.endsWith('.css')) {
        const lastSlash = path.lastIndexOf('/');
        if (lastSlash !== -1) {
          path = path.substring(0, lastSlash);
        } else {
          path = '';
        }
      }

      // Remove leading/trailing slashes
      path = path.replace(/^\/+|\/+$/g, '');

      // Remove 'public/' prefix if present
      if (path.startsWith('public/')) {
        path = path.substring(7);
      }

      // Load slides.md
      const slidesRes = await fetch(`/${path}/slides.md?t=${Date.now()}`);
      if (!slidesRes.ok) throw new Error('Failed to load slides.md');
      const slidesText = await slidesRes.text();
      setMarkdown(slidesText);

      // Try to load theme.css (optional)
      try {
        const themeRes = await fetch(`/${path}/theme.css?t=${Date.now()}`);
        if (themeRes.ok) {
          const themeText = await themeRes.text();
          setThemeCss(themeText);
        } else {
          setThemeCss('');
        }
      } catch (e) {
        console.log('No theme.css found or failed to load');
        setThemeCss('');
      }

      // Load scripts.json
      try {
        const scriptsRes = await fetch(`/${path}/scripts.json?t=${Date.now()}`);
        if (scriptsRes.ok) {
          const scriptsJson = await scriptsRes.json();
          // Ensure it's an array
          if (Array.isArray(scriptsJson)) {
            setScripts(scriptsJson);
          } else {
            console.warn('scripts.json is not an array');
            setScripts([]);
          }
        } else {
          console.log('No scripts.json found');
          setScripts([]);
        }
      } catch (e) {
        console.log('Failed to load scripts.json', e);
        setScripts([]);
      }

    } catch (error) {
      console.error('Failed to load project:', error);
      alert('Failed to load project files. Please check the path.');
    }
  };

  const handleUpdateScript = async (index: number, field: keyof ScriptItem, value: string | number) => {
    const newScripts = [...scripts];

    // Find script item by page index, or create if missing
    let scriptIdx = newScripts.findIndex(s => s.page === index);
    if (scriptIdx === -1) {
      // If adding new item, we might need to fill gaps or just push
      // But standard array behavior is fine if we just filter by page
      newScripts.push({ page: index, line: '', notes: '' });
      scriptIdx = newScripts.length - 1;
    }

    newScripts[scriptIdx] = {
      ...newScripts[scriptIdx],
      [field]: value
    };

    // Sort by page to be safe
    newScripts.sort((a, b) => a.page - b.page);

    setScripts(newScripts);

    // Save to server
    try {
      // Reconstruct full path for saving
      let pathStr = projectPath;
      if (pathStr.includes('/ai-slides-scenario-editor/public/')) {
        pathStr = pathStr.split('/ai-slides-scenario-editor/public/')[1];
      } else if (pathStr.includes('/ai-slides-scenario-editor/')) {
        pathStr = pathStr.split('/ai-slides-scenario-editor/')[1];
      }

      // If a specific file was pasted, get its parent directory
      if (pathStr.endsWith('.md') || pathStr.endsWith('.json') || pathStr.endsWith('.css')) {
        const lastSlash = pathStr.lastIndexOf('/');
        if (lastSlash !== -1) {
          pathStr = pathStr.substring(0, lastSlash);
        } else {
          pathStr = '';
        }
      }

      pathStr = pathStr.replace(/^\/+|\/+$/g, '');

      // Heuristic: if path starts with "public/", keep it. If not, prepend "public/".
      // Since `fetch('/slides/demo/...')` works, it means "slides/demo" is inside "public".
      let savePath = pathStr;
      if (!savePath.startsWith('public/')) {
        savePath = 'public/' + savePath;
      }

      await fetch('/api/save-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: `${savePath}/scripts.json`,
          content: JSON.stringify(newScripts, null, 2)
        })
      });
    } catch (e) {
      console.error('Failed to save scripts:', e);
    }
  };

  const handleLineSelect = (line: number) => {
    if (editorRef.current && editorRef.current.goToLine) {
      editorRef.current.goToLine(line);
    }
  };

  const handleDropOnSlide = async (index: number, files: FileList) => {
    if (!files || files.length === 0) return;

    const formData = new FormData();
    Array.from(files).forEach(file => {
      formData.append('files', file);
    });

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'X-Project-Path': projectPath
        },
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        let imageMarkdown = '\n';
        data.files.forEach((f: any) => {
          // Wrap the URL in angle brackets < > to safely handle spaces, parentheses, and Japanese characters
          // without making the markdown source ugly with URL encoding (e.g. %E3...)
          imageMarkdown += `![Image](<${f.url}>)\n`;
        });

        // Split markdown by the typical Marp separator
        const parts = markdown.split(/\n---\s*\n/);
        if (index >= 0 && index < parts.length) {
          parts[index] += imageMarkdown;
          setMarkdown(parts.join('\n---\n'));
        } else {
          setMarkdown(prev => prev + `\n---\n${imageMarkdown}`);
        }
      }
    } catch (err) {
      console.error('Failed to upload image:', err);
    }
  };

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header glass-panel">
        <h1 className="app-title bg-gradient-to-r from-sky-400 to-blue-600 bg-clip-text text-transparent">
          Marp Editor for AITuberKit
        </h1>
        <div className="header-actions">
          <div className="flex items-center gap-2 mr-4">
            <input
              type="text"
              className="px-2 py-1 rounded border border-gray-300 text-sm"
              placeholder="slides/demo"
              value={projectPath}
              onChange={(e) => setProjectPath(e.target.value)}
            />
            <button className="btn" onClick={loadProject}>
              Load
            </button>
          </div>
          <button
            className="btn"
            onClick={async () => {
              const { Marp } = await import('@marp-team/marp-core');
              const marp = new Marp({ html: true, markdown: { breaks: true } });
              if (themeCss) marp.themeSet.add(themeCss);
              const { html, css } = marp.render(markdown);

              // Embed local images as base64
              const htmlRegex = /src="(\/[^"]+)"|url\((?:&quot;|"|')?(\/[^"'\)]+)(?:&quot;|"|')?\)/g;
              const cssRegex = /url\((?:&quot;|"|')?(\/[^"'\)]+)(?:&quot;|"|')?\)/g;

              const urlsToFetch = new Set<string>();
              for (const match of html.matchAll(htmlRegex)) {
                if (match[1]) urlsToFetch.add(match[1]);
                if (match[2]) urlsToFetch.add(match[2]);
              }
              for (const match of css.matchAll(cssRegex)) {
                if (match[1]) urlsToFetch.add(match[1]);
              }

              const urlMap = new Map<string, string>();
              for (const url of Array.from(urlsToFetch)) {
                try {
                  const res = await fetch(url.replace(/&amp;/g, '&'));
                  if (res.ok) {
                    const blob = await res.blob();
                    const dataUrl = await new Promise<string>((resolve) => {
                      const reader = new FileReader();
                      reader.onloadend = () => resolve(reader.result as string);
                      reader.readAsDataURL(blob);
                    });
                    urlMap.set(url, dataUrl);
                  }
                } catch (e) {
                  console.error('Failed to fetch image for export:', url, e);
                }
              }

              const finalHtml = html.replace(htmlRegex, (fullMatch, url1, url2) => {
                const targetUrl = url1 || url2;
                if (targetUrl && urlMap.has(targetUrl)) {
                  if (url1) return `src="${urlMap.get(targetUrl)}"`;
                  if (url2) return `url(&quot;${urlMap.get(targetUrl)}&quot;)`;
                }
                return fullMatch;
              });

              const finalCss = css.replace(cssRegex, (fullMatch, url1) => {
                if (url1 && urlMap.has(url1)) {
                  return `url("${urlMap.get(url1)}")`;
                }
                return fullMatch;
              });

              const blob = new Blob([`
<!DOCTYPE html>
<html>
<head>
<title>Marp Presentation</title>
<style>
  ${finalCss}
</style>
</head>
<body>
  ${finalHtml}
</body>
</html>
               `.trim()], { type: 'text/html' });

              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'presentation.html';
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            Export HTML
          </button>
          <button className="btn" onClick={() => {
            setMarkdown(initialMarkdown);
            setThemeCss('');
          }}>
            Reset
          </button>
        </div>
      </header>

      {/* Main Content - Split View */}
      <main className="main-content" style={{ gap: 0, cursor: isDragging ? 'col-resize' : 'default', userSelect: isDragging ? 'none' : 'auto' }}>
        {/* Editor Pane */}
        <div className="pane editor-pane glass-panel" style={{ flex: `0 0 ${editorWidth}%` }}>
          <div className="pane-header" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                style={{
                  background: editorMode === 'markdown' ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
                  color: editorMode === 'markdown' ? '#38bdf8' : '#94a3b8',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
                onClick={() => setEditorMode('markdown')}
              >
                Markdown
              </button>
              <button
                style={{
                  background: editorMode === 'scripts' ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
                  color: editorMode === 'scripts' ? '#38bdf8' : '#94a3b8',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
                onClick={() => setEditorMode('scripts')}
              >
                Scripts JSON
              </button>
            </div>
            {editorMode === 'markdown' && <span>{markdown.length} chars</span>}
          </div>
          <div className="pane-content editor-wrapper">
            {editorMode === 'markdown' ? (
              <CodeEditor ref={editorRef} value={markdown} onChange={setMarkdown} />
            ) : (
              <textarea
                value={JSON.stringify(scripts, null, 2)}
                onChange={(e) => {
                  try {
                    const parsed = JSON.parse(e.target.value);
                    if (Array.isArray(parsed)) {
                      setScripts(parsed);
                      // Auto-save logic here if possible, but typing JSON can be invalid midway.
                      // Debounce would be better, but we leave it to manual save or focus out for now.
                    }
                  } catch (err) {
                    // Ignore parse errors while typing
                  }
                }}
                style={{
                  width: '100%',
                  height: '100%',
                  backgroundColor: '#1e293b',
                  color: 'white',
                  fontFamily: '"Fira Code", monospace',
                  padding: '1rem',
                  border: 'none',
                  outline: 'none',
                  resize: 'none'
                }}
                spellCheck={false}
              />
            )}
          </div>
        </div>

        {/* Resizer */}
        <div
          onMouseDown={handleMouseDown}
          style={{
            width: '0.75rem',
            cursor: 'col-resize',
            backgroundColor: isDragging ? 'rgba(56, 189, 248, 0.5)' : 'transparent',
            zIndex: 10,
            transition: 'background-color 0.2s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 0.125rem'
          }}
          onMouseEnter={(e) => { if (!isDragging) e.currentTarget.style.backgroundColor = 'rgba(56, 189, 248, 0.3)'; }}
          onMouseLeave={(e) => { if (!isDragging) e.currentTarget.style.backgroundColor = 'transparent'; }}
        >
          <div style={{ width: '2px', height: '24px', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: '1px' }} />
        </div>

        {/* Preview Pane */}
        <div className="pane preview-pane glass-panel" style={{ flex: '1 1 0%' }}>
          <div className="pane-header">
            <span>PREVIEW</span>
            <span>Scale: Auto</span>
          </div>
          <div className="pane-content">
            <Preview
              markdown={markdown}
              themeCss={themeCss}
              scripts={scripts}
              onUpdateScript={handleUpdateScript}
              onSelectLine={handleLineSelect}
              onDropOnSlide={handleDropOnSlide}
            />

          </div>
        </div>
      </main>

    </div>
  );
}

export default App;
