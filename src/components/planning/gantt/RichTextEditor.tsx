import { useRef, useEffect, useCallback } from 'react';
import { Bold, Italic, Underline, List, ListOrdered } from 'lucide-react';
import { Toggle } from '@/components/ui/toggle';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

export function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (editorRef.current && !initializedRef.current) {
      editorRef.current.innerHTML = value || '';
      initializedRef.current = true;
    }
  }, [value]);

  // Reset when value changes externally (e.g. switching tasks)
  useEffect(() => {
    initializedRef.current = false;
    if (editorRef.current) {
      editorRef.current.innerHTML = value || '';
      initializedRef.current = true;
    }
  }, [value]);

  const handleInput = useCallback(() => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      onChange(html === '<br>' ? '' : html);
    }
  }, [onChange]);

  const exec = useCallback((command: string, val?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, val);
    handleInput();
  }, [handleInput]);

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-0.5 border border-border rounded-t-md bg-muted/30 px-1 py-0.5">
        <Toggle size="sm" className="h-7 w-7 p-0" onPressedChange={() => exec('bold')} aria-label="Fett">
          <Bold className="h-3.5 w-3.5" />
        </Toggle>
        <Toggle size="sm" className="h-7 w-7 p-0" onPressedChange={() => exec('italic')} aria-label="Kursiv">
          <Italic className="h-3.5 w-3.5" />
        </Toggle>
        <Toggle size="sm" className="h-7 w-7 p-0" onPressedChange={() => exec('underline')} aria-label="Unterstrichen">
          <Underline className="h-3.5 w-3.5" />
        </Toggle>
        <div className="w-px h-5 bg-border mx-1" />
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
        className="min-h-[200px] max-h-[400px] overflow-y-auto border border-border border-t-0 rounded-b-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 bg-background prose prose-sm max-w-none [&_ul]:list-disc [&_ul]:ml-4 [&_ol]:list-decimal [&_ol]:ml-4"
        data-placeholder={placeholder || 'Beschreibung...'}
        style={{ 
          minHeight: 200,
        }}
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
