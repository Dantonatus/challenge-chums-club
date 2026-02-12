import { useRef, useEffect, useCallback } from 'react';
import { Bold, Italic, Underline, List, ListOrdered } from 'lucide-react';
import { Toggle } from '@/components/ui/toggle';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

const FONTS = [
  { label: 'Sans-serif', value: 'sans-serif' },
  { label: 'Serif', value: 'serif' },
  { label: 'Monospace', value: 'monospace' },
  { label: 'Arial', value: 'Arial' },
  { label: 'Georgia', value: 'Georgia' },
  { label: 'Verdana', value: 'Verdana' },
];

const SIZES = [
  { label: 'Klein', value: '1' },
  { label: 'Normal', value: '3' },
  { label: 'Groß', value: '5' },
  { label: 'Sehr groß', value: '7' },
];

export function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const lastExternalValue = useRef(value);
  const isInternalChange = useRef(false);

  // Sync innerHTML only on true external changes (e.g. task switch)
  useEffect(() => {
    if (isInternalChange.current) {
      isInternalChange.current = false;
      return;
    }
    if (editorRef.current && value !== lastExternalValue.current) {
      editorRef.current.innerHTML = value || '';
      lastExternalValue.current = value;
    }
  }, [value]);

  // Initial load
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.innerHTML = value || '';
      lastExternalValue.current = value;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleInput = useCallback(() => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      const cleaned = html === '<br>' ? '' : html;
      isInternalChange.current = true;
      lastExternalValue.current = cleaned;
      onChange(cleaned);
    }
  }, [onChange]);

  const exec = useCallback((command: string, val?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, val);
    handleInput();
  }, [handleInput]);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
    handleInput();
  }, [handleInput]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      exec(e.shiftKey ? 'outdent' : 'indent');
    }
  }, [exec]);

  const selectStyle = "h-7 rounded border border-border bg-muted/30 text-xs px-1 outline-none focus:ring-1 focus:ring-ring cursor-pointer";

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1 flex-wrap border border-border rounded-t-md bg-muted/30 px-1 py-0.5">
        {/* Font family */}
        <select
          className={selectStyle}
          defaultValue="sans-serif"
          onChange={(e) => exec('fontName', e.target.value)}
          aria-label="Schriftart"
        >
          {FONTS.map(f => (
            <option key={f.value} value={f.value} style={{ fontFamily: f.value }}>{f.label}</option>
          ))}
        </select>

        {/* Font size */}
        <select
          className={selectStyle}
          defaultValue="3"
          onChange={(e) => exec('fontSize', e.target.value)}
          aria-label="Schriftgröße"
        >
          {SIZES.map(s => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>

        <div className="w-px h-5 bg-border mx-0.5" />

        <Toggle size="sm" className="h-7 w-7 p-0" onPressedChange={() => exec('bold')} aria-label="Fett">
          <Bold className="h-3.5 w-3.5" />
        </Toggle>
        <Toggle size="sm" className="h-7 w-7 p-0" onPressedChange={() => exec('italic')} aria-label="Kursiv">
          <Italic className="h-3.5 w-3.5" />
        </Toggle>
        <Toggle size="sm" className="h-7 w-7 p-0" onPressedChange={() => exec('underline')} aria-label="Unterstrichen">
          <Underline className="h-3.5 w-3.5" />
        </Toggle>

        <div className="w-px h-5 bg-border mx-0.5" />

        <Toggle size="sm" className="h-7 w-7 p-0" onPressedChange={() => exec('insertUnorderedList')} aria-label="Aufzählung">
          <List className="h-3.5 w-3.5" />
        </Toggle>
        <Toggle size="sm" className="h-7 w-7 p-0" onPressedChange={() => exec('insertOrderedList')} aria-label="Nummerierte Liste">
          <ListOrdered className="h-3.5 w-3.5" />
        </Toggle>
      </div>
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onPaste={handlePaste}
        onKeyDown={handleKeyDown}
        className="min-h-[200px] max-h-[400px] overflow-y-auto border border-border border-t-0 rounded-b-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 bg-background prose prose-sm max-w-none [&_ul]:list-disc [&_ul]:ml-4 [&_ol]:list-decimal [&_ol]:ml-4"
        data-placeholder={placeholder || 'Beschreibung...'}
        style={{ minHeight: 200 }}
      />
      <style>{`
        [contenteditable]:empty:before {
          content: attr(data-placeholder);
          color: hsl(var(--muted-foreground));
          pointer-events: none;
        }
      `}</style>
    </div>
  );
}
