import React, { useEffect, useRef, useMemo, useState } from 'react';
import { Marp } from '@marp-team/marp-core';

interface PreviewProps {
  markdown: string;
  themeCss?: string;
  scripts?: Array<{ page: number, line: string, notes: string }>;
  onUpdateScript?: (index: number, field: any, value: string | number) => void;
  onSelectLine?: (line: number) => void;
  onDropOnSlide?: (index: number, files: FileList) => void;
}

const SlideRenderer: React.FC<{ html: string; css: string; onSelectLine?: (line: number) => void }> = ({ html, css, onSelectLine }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const shadowRef = useRef<ShadowRoot | null>(null);

  useEffect(() => {
    if (containerRef.current && !shadowRef.current) {
      shadowRef.current = containerRef.current.attachShadow({ mode: 'open' });
    }
  }, []);

  useEffect(() => {
    if (shadowRef.current) {
      shadowRef.current.innerHTML = `
        <style>
          :host { display: block; width: 100%; overflow: hidden; }
          .marpit {
             display: flex; flex-direction: column; align-items: center;
             background-color: transparent;
             width: 100%;
          }
          section {
             margin: 0 !important;
             box-shadow: none !important;
             max-width: 100%;
             transform-origin: top left;
          }
          /* Highlighting */
          [data-source-line]:hover { outline: 2px solid rgba(56, 189, 248, 0.5); cursor: pointer; }
          ${css}
        </style>
        <div class="marpit">${html}</div>
      `;

      const marpitDiv = shadowRef.current.querySelector('div.marpit') as HTMLElement;
      if (marpitDiv && onSelectLine) {
        marpitDiv.addEventListener('click', (e) => {
          const target = e.target as HTMLElement;
          const el = target.closest('[data-source-line]');
          if (el) {
            e.stopPropagation();
            const l = el.getAttribute('data-source-line');
            if (l) onSelectLine(parseInt(l, 10));
          }
        })
      }
    }
  }, [html, css, onSelectLine]);

  return <div ref={containerRef} style={{ width: '100%' }} />;
}

const Preview: React.FC<PreviewProps> = (props) => {
  const { markdown, themeCss, scripts, onUpdateScript, onSelectLine, onDropOnSlide } = props;

  const [showScript, setShowScript] = useState(true);
  const [showNotes, setShowNotes] = useState(true);

  // Memoize Marp instance and setup source map plugin
  const marp = useMemo(() => {
    const instance = new Marp({
      html: true, // Enable HTML
      markdown: {
        breaks: true, // Line breaks
      }
    });

    if (themeCss) {
      try {
        instance.themeSet.add(themeCss);
      } catch (e) {
        console.error('Failed to add custom theme:', e);
      }
    }

    // Custom plugin to inject data-source-line attribute
    instance.markdown.core.ruler.push('source_map_data_line', (state: any) => {
      // Iterate over wrapper-level tokens (usually block tokens)
      state.tokens.forEach((token: any) => {
        if (token.map && token.type.endsWith('_open')) {
          token.attrSet('data-source-line', String(token.map[0]));
        }
      });
    });

    return instance;
  }, [themeCss]);

  const { slidesHtml, css } = useMemo(() => {
    if (!markdown) return { slidesHtml: [], css: '' };
    try {
      const { html, css } = marp.render(markdown);
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const sections = Array.from(doc.querySelectorAll('section'));
      return {
        slidesHtml: sections.map(s => s.outerHTML),
        css
      };
    } catch (e) {
      console.error(e);
      return { slidesHtml: [], css: '' };
    }
  }, [marp, markdown]);

  return (
    <div style={{ padding: '1.5rem', height: '100%', overflowY: 'auto', color: '#334155' }}>
      <div style={{ backgroundColor: '#ffffff', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)', borderRadius: '0.5rem', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
          <thead style={{ backgroundColor: '#f8fafc' }}>
            <tr>
              <th style={{ padding: '1rem', fontSize: '0.875rem', fontWeight: 600, color: '#334155', width: (showScript && showNotes) ? '380px' : 'auto', transition: 'width 0.2s', borderBottom: '1px solid #e2e8f0', borderRight: '1px solid #e2e8f0' }}>Slide</th>
              {scripts && (
                <th
                  style={{ padding: '1rem', fontSize: '0.875rem', fontWeight: 600, color: '#334155', borderBottom: '1px solid #e2e8f0', borderRight: '1px solid #e2e8f0', width: showScript ? '35%' : '60px', cursor: 'pointer', transition: 'width 0.2s' }}
                  onClick={() => setShowScript(!showScript)}
                  title="Toggle Script column"
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    {showScript ? <span>Script (Speech Line)</span> : <span title="Script (Speech Line)">🗣️</span>}
                    <span style={{ color: '#94a3b8', marginLeft: '0.5rem' }}>{showScript ? '▼' : '▶'}</span>
                  </div>
                </th>
              )}
              {scripts && (
                <th
                  style={{ padding: '1rem', fontSize: '0.875rem', fontWeight: 600, color: '#334155', borderBottom: '1px solid #e2e8f0', width: showNotes ? '35%' : '60px', cursor: 'pointer', transition: 'width 0.2s' }}
                  onClick={() => setShowNotes(!showNotes)}
                  title="Toggle Notes column"
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    {showNotes ? <span>Notes</span> : <span title="Notes">📓</span>}
                    <span style={{ color: '#94a3b8', marginLeft: '0.5rem' }}>{showNotes ? '▼' : '▶'}</span>
                  </div>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {slidesHtml.map((html, index) => {
              const scriptItem = scripts?.find(s => s.page === index) || { page: index, line: '', notes: '' };

              return (
                <tr key={index} style={{ borderBottom: index < slidesHtml.length - 1 ? '1px solid #e2e8f0' : 'none' }}>
                  <td
                    style={{ padding: '1rem', verticalAlign: 'top', borderRight: '1px solid #e2e8f0', backgroundColor: '#ffffff', outlineOffset: '-2px', transition: 'outline 0.1s' }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      e.currentTarget.style.outline = '2px dashed #38bdf8';
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      e.currentTarget.style.outline = 'none';
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      e.currentTarget.style.outline = 'none';
                      if (onDropOnSlide && e.dataTransfer.files) {
                        onDropOnSlide(index, e.dataTransfer.files);
                      }
                    }}
                  >
                    <div style={{ width: (showScript && showNotes) ? '360px' : '100%', minWidth: '360px', transition: 'width 0.2s', borderRadius: '0.375rem', overflow: 'hidden', boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)', border: '1px solid #f1f5f9' }}>
                      <SlideRenderer html={html} css={css} onSelectLine={onSelectLine} />
                    </div>
                  </td>
                  {scripts && (
                    <td style={{ padding: showScript ? 0 : '1rem', verticalAlign: 'top', borderRight: '1px solid #e2e8f0', position: 'relative', backgroundColor: showScript ? 'transparent' : '#f8fafc', transition: 'background-color 0.2s' }}>
                      {showScript && (
                        <textarea
                          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%', fontSize: '0.875rem', padding: '1rem', color: '#1e293b', outline: 'none', resize: 'none', background: 'transparent', border: 'none', boxSizing: 'border-box' }}
                          value={scriptItem.line}
                          onChange={(e) => onUpdateScript && onUpdateScript(index, 'line', e.target.value)}
                          placeholder="Enter speech here..."
                          onFocus={(e) => e.target.style.backgroundColor = '#f8fafc'}
                          onBlur={(e) => e.target.style.backgroundColor = 'transparent'}
                        />
                      )}
                    </td>
                  )}
                  {scripts && (
                    <td style={{ padding: showNotes ? 0 : '1rem', verticalAlign: 'top', position: 'relative', backgroundColor: showNotes ? 'transparent' : '#f8fafc', transition: 'background-color 0.2s' }}>
                      {showNotes && (
                        <textarea
                          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%', fontSize: '0.875rem', padding: '1rem', color: '#475569', outline: 'none', resize: 'none', background: 'transparent', border: 'none', boxSizing: 'border-box' }}
                          value={scriptItem.notes}
                          onChange={(e) => onUpdateScript && onUpdateScript(index, 'notes', e.target.value)}
                          placeholder="Internal notes..."
                          onFocus={(e) => e.target.style.backgroundColor = '#f8fafc'}
                          onBlur={(e) => e.target.style.backgroundColor = 'transparent'}
                        />
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {slidesHtml.length === 0 && (
        <div className="text-center text-gray-400 mt-20">No slides to display</div>
      )}
    </div>
  );
};
export default Preview;
