import { useState } from "react";
import { Check, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const PREDEFINED_COLORS = [
  { name: "Tiefes Rubinrot", value: "#D32F2F" },
  { name: "Strahlendes Goldgelb", value: "#FBC02D" },
  { name: "Sattes Smaragdgrün", value: "#388E3C" },
  { name: "Königliches Violett", value: "#7B1FA2" },
  { name: "Intensives Herbstorange", value: "#F57C00" },
  { name: "Kühles Tief-Türkis", value: "#0097A7" },
  { name: "Kraftvolles Magenta", value: "#C2185B" },
  { name: "Sanftes Olivgold", value: "#AFB42B" },
  { name: "Dunkles Schokoladenbraun", value: "#5D4037" },
  { name: "Kühles Stahlgrau-Blau", value: "#455A64" },
];

interface ColorPickerProps {
  selectedColor?: string;
  onColorSelect: (color: string) => void;
  onSave: () => void;
  loading?: boolean;
}

export function ColorPicker({ selectedColor, onColorSelect, onSave, loading }: ColorPickerProps) {
  const [previewColor, setPreviewColor] = useState(selectedColor);

  const handleColorClick = (color: string) => {
    setPreviewColor(color);
    onColorSelect(color);
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(word => word[0]).join('').slice(0, 2).toUpperCase();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="h-5 w-5" />
          Deine Farbe
        </CardTitle>
        <CardDescription>
          Wähle eine Farbe, die dich in Charts und Übersichten repräsentiert
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Color Preview */}
        <div className="flex items-center gap-4 p-4 rounded-lg border bg-muted/50">
          <div 
            className="w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold shadow-lg transition-all duration-200"
            style={{ backgroundColor: previewColor || selectedColor || PREDEFINED_COLORS[0].value }}
          >
            {getInitials("Max Mustermann")}
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">Vorschau</p>
            <p className="text-xs text-muted-foreground">
              So erscheinst du in Charts und Listen
            </p>
          </div>
        </div>

        {/* Color Grid */}
        <div className="grid grid-cols-5 gap-3">
          {PREDEFINED_COLORS.map((color) => (
            <button
              key={color.value}
              onClick={() => handleColorClick(color.value)}
              className={cn(
                "relative w-12 h-12 rounded-lg border-2 transition-all duration-200 hover:scale-105 hover:shadow-lg",
                (previewColor || selectedColor) === color.value 
                  ? "border-primary ring-2 ring-primary/20" 
                  : "border-border hover:border-primary/50"
              )}
              style={{ backgroundColor: color.value }}
              title={color.name}
            >
              {(previewColor || selectedColor) === color.value && (
                <Check className="w-4 h-4 text-white absolute inset-0 m-auto drop-shadow-sm" />
              )}
            </button>
          ))}
        </div>

        {/* Color Names */}
        <div className="text-xs text-muted-foreground">
          <p className="font-medium mb-2">Verfügbare Farben:</p>
          <div className="grid grid-cols-2 gap-1">
            {PREDEFINED_COLORS.map((color) => (
              <div key={color.value} className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full border"
                  style={{ backgroundColor: color.value }}
                />
                <span className="truncate">{color.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Save Button */}
        <Button 
          onClick={onSave} 
          disabled={loading || !previewColor}
          className="w-full"
          size="sm"
        >
          {loading ? "Speichere..." : "Farbe speichern"}
        </Button>
      </CardContent>
    </Card>
  );
}