import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Save, X } from "lucide-react";
import { motion } from "framer-motion";
import { saveView, SaveViewRequest } from "@/lib/views";
import { weekRangeLabel } from "@/lib/date";
import { useToast } from "@/hooks/use-toast";

interface SaveViewModalProps {
  open: boolean;
  onClose: () => void;
  currentFilters: {
    participants: string[];
    challengeTypes: string[];
    groups: string[];
  };
  currentDateRange: {
    start: Date;
    end: Date;
  };
  lang: 'de' | 'en';
  onViewSaved?: () => void;
}

export function SaveViewModal({ 
  open, 
  onClose, 
  currentFilters, 
  currentDateRange, 
  lang,
  onViewSaved 
}: SaveViewModalProps) {
  const [name, setName] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const t = {
    de: {
      title: "Ansicht speichern",
      nameLabel: "Name der Ansicht",
      namePlaceholder: "Meine Ansicht",
      defaultCheckbox: "Als Standard-Ansicht festlegen",
      save: "Speichern",
      cancel: "Abbrechen",
      saving: "Speichern...",
      success: "Ansicht erfolgreich gespeichert",
      error: "Fehler beim Speichern der Ansicht",
      nameRequired: "Name ist erforderlich"
    },
    en: {
      title: "Save View",
      nameLabel: "View Name",
      namePlaceholder: "My View",
      defaultCheckbox: "Set as default view",
      save: "Save",
      cancel: "Cancel",
      saving: "Saving...",
      success: "View saved successfully",
      error: "Failed to save view",
      nameRequired: "Name is required"
    }
  };

  // Generate default name based on current settings
  useEffect(() => {
    if (open && !name) {
      const rangeLabel = weekRangeLabel(currentDateRange.start, currentDateRange.end, lang);
      const defaultName = lang === 'de' ? `Übersicht ${rangeLabel}` : `Summary ${rangeLabel}`;
      setName(defaultName);
    }
  }, [open, currentDateRange, lang, name]);

  const handleSave = async () => {
    if (!name.trim()) {
      toast({
        title: t[lang].error,
        description: t[lang].nameRequired,
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);
    try {
      const viewData: SaveViewRequest = {
        name: name.trim(),
        filters: currentFilters,
        dateRange: currentDateRange,
        isDefault
      };

      await saveView(viewData);
      
      toast({
        title: t[lang].success,
        description: `"${name}" ${lang === 'de' ? 'wurde gespeichert' : 'has been saved'}`,
      });

      onViewSaved?.();
      onClose();
      
      // Reset form
      setName("");
      setIsDefault(false);
    } catch (error) {
      console.error('Failed to save view:', error);
      toast({
        title: t[lang].error,
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isSaving) {
      handleSave();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent 
        className="sm:max-w-md bg-background/95 backdrop-blur-sm border-0 shadow-2xl"
        onKeyDown={handleKeyDown}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
        >
          <DialogHeader className="space-y-3">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Save className="w-5 h-5 text-primary" />
              {t[lang].title}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-6">
            <div className="space-y-2">
              <Label htmlFor="view-name" className="text-sm font-medium">
                {t[lang].nameLabel}
              </Label>
              <Input
                id="view-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t[lang].namePlaceholder}
                className="w-full transition-all duration-200 focus:ring-2 focus:ring-primary/20"
                autoFocus
                disabled={isSaving}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="default-view"
                checked={isDefault}
                onCheckedChange={(checked) => setIsDefault(checked as boolean)}
                disabled={isSaving}
                className="transition-all duration-200"
              />
              <Label 
                htmlFor="default-view" 
                className="text-sm text-muted-foreground cursor-pointer"
              >
                {t[lang].defaultCheckbox}
              </Label>
            </div>

            {/* Preview of current settings */}
            <div className="p-3 bg-muted/30 rounded-lg border border-border/50">
              <p className="text-xs text-muted-foreground mb-2">
                {lang === 'de' ? 'Aktuelle Einstellungen:' : 'Current settings:'}
              </p>
              <div className="space-y-1 text-xs">
                <p>
                  <span className="font-medium">
                    {lang === 'de' ? 'Zeitraum:' : 'Date range:'} 
                  </span>{' '}
                  {weekRangeLabel(currentDateRange.start, currentDateRange.end, lang)}
                </p>
                {currentFilters.participants.length > 0 && (
                  <p>
                    <span className="font-medium">
                      {lang === 'de' ? 'Teilnehmer:' : 'Participants:'} 
                    </span>{' '}
                    {currentFilters.participants.join(', ')}
                  </p>
                )}
                {currentFilters.challengeTypes.length > 0 && (
                  <p>
                    <span className="font-medium">
                      {lang === 'de' ? 'Challenge-Typen:' : 'Challenge types:'} 
                    </span>{' '}
                    {currentFilters.challengeTypes.join(', ')}
                  </p>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isSaving}
              className="transition-all duration-200 hover:bg-muted"
            >
              <X className="w-4 h-4 mr-2" />
              {t[lang].cancel}
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving || !name.trim()}
              className="transition-all duration-200 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
            >
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? t[lang].saving : t[lang].save}
            </Button>
          </DialogFooter>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}