import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";

interface PasteCaptureProps {
  onProcess: (text: string) => void;
  isProcessing: boolean;
}

export function PasteCapture({ onProcess, isProcessing }: PasteCaptureProps) {
  const [text, setText] = useState("");

  const handleSubmit = () => {
    if (text.trim().length < 10 || isProcessing) return;
    onProcess(text.trim());
  };

  return (
    <div className="space-y-3">
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Füge Text, Artikel, Notizen hier ein..."
        className="min-h-[140px] resize-y text-sm"
        disabled={isProcessing}
      />
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {text.length > 0 ? `${text.length} Zeichen` : "Beliebigen Text einfügen"}
        </span>
        <Button
          onClick={handleSubmit}
          disabled={text.trim().length < 10 || isProcessing}
          className="gap-2"
        >
          {isProcessing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          Verarbeiten
        </Button>
      </div>
    </div>
  );
}
