import { useState, useCallback, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Check, ChevronDown, Users, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface CompareBarProps {
  participants: string[];
  onSelectionChange: (participantA: string, participantB: string) => void;
  lang: 'de' | 'en';
  onClose?: () => void;
}

export function CompareBar({ onSelectionChange, lang, onClose }: CompareBarProps) {
  const [selectedA, setSelectedA] = useState<string>("");
  const [selectedB, setSelectedB] = useState<string>("");
  const [openA, setOpenA] = useState(false);
  const [openB, setOpenB] = useState(false);

  const t = {
    de: {
      participantA: "Teilnehmer A",
      participantB: "Teilnehmer B",
      search: "Suchen...",
      noParticipants: "Keine Teilnehmer gefunden",
      compare: "Vergleichen",
      clear: "Löschen",
      close: "Schließen",
      active: "Aktiv"
    },
    en: {
      participantA: "Participant A",
      participantB: "Participant B", 
      search: "Search...",
      noParticipants: "No participants found",
      compare: "Compare",
      clear: "Clear",
      close: "Close",
      active: "Active"
    }
  };

  // Fetch available participants
  const { data: availableParticipants } = useQuery({
    queryKey: ['compare-participants'],
    queryFn: async () => {
      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];

        // Get user's groups
        const { data: userGroups } = await supabase
          .from('group_members')
          .select('group_id')
          .eq('user_id', user.id);

        if (!userGroups?.length) return [];

        const groupIds = userGroups.map(g => g.group_id);

        // Get challenges in user's groups
        const { data: challenges } = await supabase
          .from('challenges')
          .select('id')
          .in('group_id', groupIds);

        if (!challenges?.length) return [];

        const challengeIds = challenges.map(c => c.id);

        // Get participants with profiles
        const { data: participants } = await supabase
          .from('challenge_participants')
          .select(`
            user_id,
            profiles!inner(display_name)
          `)
          .in('challenge_id', challengeIds);

        if (!participants?.length) return [];

        // Get unique participants
        const uniqueParticipants = Array.from(
          new Map(
            participants.map(p => [
              p.user_id, 
              (p.profiles as any)?.display_name
            ])
          ).entries()
        ).map(([userId, displayName]) => ({
          userId,
          displayName: displayName || 'Unknown'
        }));

        return uniqueParticipants.filter(p => p.displayName !== 'Unknown');
      } catch (error) {
        console.error('Failed to fetch participants:', error);
        return [];
      }
    }
  });

  const handleSelectionA = useCallback((participant: string) => {
    setSelectedA(participant);
    setOpenA(false);
    if (participant && selectedB && participant !== selectedB) {
      onSelectionChange(participant, selectedB);
    }
  }, [selectedB, onSelectionChange]);

  const handleSelectionB = useCallback((participant: string) => {
    setSelectedB(participant);
    setOpenB(false);
    if (selectedA && participant && selectedA !== participant) {
      onSelectionChange(selectedA, participant);
    }
  }, [selectedA, onSelectionChange]);

  const clearSelection = useCallback(() => {
    setSelectedA("");
    setSelectedB("");
  }, []);

  // Update parent when selection changes
  useEffect(() => {
    if (selectedA && selectedB && selectedA !== selectedB) {
      onSelectionChange(selectedA, selectedB);
    }
  }, [selectedA, selectedB, onSelectionChange]);

  const availableForA = availableParticipants?.filter(p => p.displayName !== selectedB) || [];
  const availableForB = availableParticipants?.filter(p => p.displayName !== selectedA) || [];

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="px-6 py-4"
    >
      <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-blue-50/50 to-indigo-50/50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-xl border border-blue-200/50 dark:border-blue-800/30">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Users className="w-4 h-4" />
          {t[lang].compare}:
        </div>

        {/* Participant A Selector */}
        <Popover open={openA} onOpenChange={setOpenA}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={openA}
              className="w-48 justify-between bg-background/50 border-blue-200 hover:border-blue-300 transition-colors"
            >
              {selectedA || t[lang].participantA}
              <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-0 z-50 bg-background/95 backdrop-blur-sm" align="start">
            <Command>
              <CommandInput placeholder={t[lang].search} />
              <CommandEmpty>{t[lang].noParticipants}</CommandEmpty>
              <CommandGroup>
                <CommandList>
                  {availableForA.map((participant) => (
                    <CommandItem
                      key={participant.userId}
                      value={participant.displayName}
                      onSelect={() => handleSelectionA(participant.displayName)}
                      className="cursor-pointer"
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selectedA === participant.displayName ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {participant.displayName}
                    </CommandItem>
                  ))}
                </CommandList>
              </CommandGroup>
            </Command>
          </PopoverContent>
        </Popover>

        <div className="text-muted-foreground font-medium">vs</div>

        {/* Participant B Selector */}
        <Popover open={openB} onOpenChange={setOpenB}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={openB}
              className="w-48 justify-between bg-background/50 border-blue-200 hover:border-blue-300 transition-colors"
            >
              {selectedB || t[lang].participantB}
              <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-0 z-50 bg-background/95 backdrop-blur-sm" align="start">
            <Command>
              <CommandInput placeholder={t[lang].search} />
              <CommandEmpty>{t[lang].noParticipants}</CommandEmpty>
              <CommandGroup>
                <CommandList>
                  {availableForB.map((participant) => (
                    <CommandItem
                      key={participant.userId}
                      value={participant.displayName}
                      onSelect={() => handleSelectionB(participant.displayName)}
                      className="cursor-pointer"
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selectedB === participant.displayName ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {participant.displayName}
                    </CommandItem>
                  ))}
                </CommandList>
              </CommandGroup>
            </Command>
          </PopoverContent>
        </Popover>

        {/* Clear Button */}
        {(selectedA || selectedB) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearSelection}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
            <span className="ml-1 text-xs">{t[lang].clear}</span>
          </Button>
        )}

        {/* Status Badge */}
        {selectedA && selectedB && (
          <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200 dark:bg-green-950 dark:text-green-200">
            <Check className="w-3 h-3 mr-1" />
            {t[lang].active}
          </Badge>
        )}

        {/* Close Button */}
        <div className="ml-auto">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
            <span className="ml-1 text-xs">{t[lang].close}</span>
          </Button>
        </div>
      </div>
    </motion.div>
  );
}