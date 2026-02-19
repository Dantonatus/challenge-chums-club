import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#06B6D4", "#84CC16"];
const EMOJIS = ["📚", "💡", "🧠", "🔬", "💪", "🎯", "📊", "🌱", "💻", "🎨", "🏥", "💰"];

interface CreateTopicDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (topic: { name: string; emoji?: string; color?: string }) => void;
  defaultName?: string;
}

export function CreateTopicDialog({ open, onOpenChange, onSave, defaultName }: CreateTopicDialogProps) {
  const [name, setName] = useState(defaultName || "");
  const [emoji, setEmoji] = useState("📚");
  const [color, setColor] = useState("#3B82F6");

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({ name: name.trim(), emoji, color });
    setName("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Neues Topic erstellen</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="z.B. Ernährung" />
          </div>
          <div>
            <Label>Emoji</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {EMOJIS.map((e) => (
                <button
                  key={e}
                  onClick={() => setEmoji(e)}
                  className={`text-lg p-1 rounded ${emoji === e ? "bg-accent ring-2 ring-primary" : "hover:bg-muted"}`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label>Farbe</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`h-7 w-7 rounded-full ${color === c ? "ring-2 ring-offset-2 ring-primary" : ""}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          <Button onClick={handleSave} disabled={!name.trim()} className="w-full">
            Erstellen
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
