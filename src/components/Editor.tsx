import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import Editor from 'react-simple-code-editor';
import * as Prism from 'prismjs';
import 'prismjs/components/prism-markdown';
import 'prismjs/themes/prism-tomorrow.css'; // Dark theme

interface EditorProps {
    value: string;
    onChange: (value: string) => void;
}

export interface CodeEditorHandle {
    goToLine: (lineNumber: number) => void;
    insertAtCursor: (text: string) => void;
}

const CodeEditor = forwardRef<CodeEditorHandle, EditorProps>(({ value, onChange }, ref) => {
    // We need to access the underlying textarea to set selection
    const containerRef = useRef<HTMLDivElement>(null);

    useImperativeHandle(ref, () => ({
        goToLine: (line: number) => {
            if (!containerRef.current) return;

            const textarea = containerRef.current.querySelector('textarea');
            if (!textarea) return;

            const lines = value.split('\n');
            if (line >= lines.length) line = lines.length - 1;
            if (line < 0) line = 0;

            // Calculate character index for the start of the line
            let charIndex = 0;
            for (let i = 0; i < line; i++) {
                // +1 for the newline character
                charIndex += lines[i].length + 1;
            }

            // Focus and set selection
            textarea.focus();
            textarea.setSelectionRange(charIndex, charIndex + lines[line].length);

            // Attempt to scroll to the line
            // Since textarea is inside the editor, we might need to scroll the textarea itself or the container.
            // react-simple-code-editor usually syncs scroll between pre and textarea.

            // Calculate scroll position (approximate based on line height)
            // Standard line height is usually around 1.5em or 21px for 14px font
            const lineHeight = 21; // approximate for 14px * 1.5

            // Scroll the container or textarea
            // textarea.scrollTop = scrollTop; // if textarea scrolls
            // But container overflows?
            // Let's try scrolling the container div content
            // The Editor component from library renders a div that handles scroll?
            // The library's structure is:
            // <div ...> (container with overflow)
            //   <textarea />
            //   <pre />
            // </div>
            // But we wrap it in our own div with overflow: auto.
            // So we should scroll our containerRef.

            // However, Editor component manages its own scrolling sometimes or just expands?
            // Our wrapper defines overflow: auto.
            // So we should scroll containerRef.current.

            if (containerRef.current) {
                // Simple calculation might be off, checking element.scrollHeight / lines.length?
                // Better: textarea.blur(); textarea.focus(); often scrolls into view natively.
                // Let's try scrollIntoView on a dummy element if needed, but textarea selection usually scrolls.
                // If not, manual scroll:
                // containerRef.current.scrollTop = scrollTop;

                // Let's try a more robust way:
                // Use scrollIntoView on the text area? No, that scrolls the whole textarea into view.

                // Let's rely on textarea.setSelectionRange usually scrolling to cursor in modern browsers.
                // If not, we can approximate.

                // A better hack for scrolling to line in a simple textarea:
                // containerRef.current.scrollTop = (containerRef.current.scrollHeight / lines.length) * line;
                // This assumes uniform line height which is true for monospace code.
                const totalLines = lines.length;
                if (totalLines > 0) {
                    const avgLineHeight = containerRef.current.scrollHeight / totalLines;
                    const targetScroll = avgLineHeight * line - containerRef.current.clientHeight / 2;
                    containerRef.current.scrollTo({
                        top: targetScroll,
                        behavior: 'smooth'
                    });
                }
            }
        },
        insertAtCursor: (text: string) => {
            if (!containerRef.current) return;
            const textarea = containerRef.current.querySelector('textarea');
            if (!textarea) return;

            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const currentVal = textarea.value;

            const newValue = currentVal.substring(0, start) + text + currentVal.substring(end);

            // Call onChange to update parent state
            onChange(newValue);

            // Restore selection after update (needs timeout because react rerender)
            setTimeout(() => {
                textarea.focus();
                textarea.setSelectionRange(start + text.length, start + text.length);
            }, 0);
        }
    }));

    return (
        <div
            ref={containerRef}
            style={{
                height: '100%',
                overflow: 'auto',
                backgroundColor: '#1e293b',
                color: 'white',
                fontFamily: '"Fira Code", monospace'
            }}
        >
            <Editor
                value={value}
                onValueChange={onChange}
                highlight={(code) => Prism.highlight(code, Prism.languages.markdown, 'markdown')}
                padding={20}
                style={{
                    fontFamily: '"Fira Code", "Fira Mono", monospace',
                    fontSize: 14,
                    minHeight: '100%',
                }}
                textareaClassName="editor-textarea"
            />
        </div>
    );
});

CodeEditor.displayName = 'CodeEditor';

export default CodeEditor;
