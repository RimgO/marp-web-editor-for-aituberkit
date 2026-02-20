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
      // Normalize path (remove leading/trailing slashes and public prefix)
      let path = projectPath.replace(/^\/+|\/+$/g, '');
      if (path.startsWith('public/')) {
        path = path.substring(7);
      }

      // Load slides.md
      const slidesRes = await fetch(`/${path}/slides.md`);
      if (!slidesRes.ok) throw new Error('Failed to load slides.md');
      const slidesText = await slidesRes.text();
      setMarkdown(slidesText);

      // Try to load theme.css (optional)
      try {
        const themeRes = await fetch(`/${path}/theme.css`);
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
        const scriptsRes = await fetch(`/${path}/scripts.json`);
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
      let pathStr = projectPath.replace(/^\/+|\/+$/g, '');
      // If user typed "slides/demo", we assume it's under public if accessible via /slides/demo
      // But the save API needs a file path relative to project root.
      // If the file is literally in /Users/.../public/slides/demo, we should pass "public/slides/demo/scripts.json"

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
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        let imageMarkdown = '\n';
        data.files.forEach((f: any) => {
          imageMarkdown += `![Image](${f.url})\n`;
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
          Marp Web Editor
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

              const blob = new Blob([`
<!DOCTYPE html>
<html>
<head>
<title>Marp Presentation</title>
<style>
  ${css}
</style>
</head>
<body>
  ${html}
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
          <div className="pane-header">
            <span>MARKDOWN</span>
            <span>{markdown.length} chars</span>
          </div>
          <div className="pane-content editor-wrapper">
            <CodeEditor ref={editorRef} value={markdown} onChange={setMarkdown} />
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
