import { useState } from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface FilterBarProps {
  participants: Array<{ user_id: string; display_name: string }>;
  groups: Array<{ id: string; name: string }>;
  selectedParticipants: string[];
  selectedChallengeTypes: string[];
  selectedGroups: string[];
  onParticipantsChange: (participants: string[]) => void;
  onChallengeTypesChange: (types: string[]) => void;
  onGroupsChange: (groups: string[]) => void;
  onClearAll: () => void;
  lang: 'de' | 'en';
}

export const FilterBar = ({
  participants,
  groups,
  selectedParticipants,
  selectedChallengeTypes,
  selectedGroups,
  onParticipantsChange,
  onChallengeTypesChange,
  onGroupsChange,
  onClearAll,
  lang
}: FilterBarProps) => {
  const [participantsOpen, setParticipantsOpen] = useState(false);
  const [groupsOpen, setGroupsOpen] = useState(false);

  const t = {
    de: {
      filters: "Filter",
      participants: "Teilnehmer",
      challengeType: "Challenge-Typ",
      groups: "Gruppen",
      all: "Alle",
      habit: "Habit",
      kpi: "KPI",
      clearAll: "Alle löschen",
      searchParticipants: "Teilnehmer suchen...",
      searchGroups: "Gruppen suchen...",
      noParticipants: "Keine Teilnehmer gefunden",
      noGroups: "Keine Gruppen gefunden",
      selected: "ausgewählt"
    },
    en: {
      filters: "Filters",
      participants: "Participants",
      challengeType: "Challenge Type",
      groups: "Groups",
      all: "All",
      habit: "Habit",
      kpi: "KPI",
      clearAll: "Clear All",
      searchParticipants: "Search participants...",
      searchGroups: "Search groups...",
      noParticipants: "No participants found",
      noGroups: "No groups found",
      selected: "selected"
    }
  };

  const challengeTypeOptions = [
    { value: "all", label: t[lang].all },
    { value: "habit", label: t[lang].habit },
    { value: "kpi", label: t[lang].kpi }
  ];

  const handleParticipantToggle = (participantId: string) => {
    const updated = selectedParticipants.includes(participantId)
      ? selectedParticipants.filter(id => id !== participantId)
      : [...selectedParticipants, participantId];
    onParticipantsChange(updated);
  };

  const handleGroupToggle = (groupId: string) => {
    const updated = selectedGroups.includes(groupId)
      ? selectedGroups.filter(id => id !== groupId)
      : [...selectedGroups, groupId];
    onGroupsChange(updated);
  };

  const handleChallengeTypeChange = (value: string) => {
    if (value === "all") {
      onChallengeTypesChange([]);
    } else {
      onChallengeTypesChange([value]);
    }
  };

  const removeParticipant = (participantId: string) => {
    onParticipantsChange(selectedParticipants.filter(id => id !== participantId));
  };

  const removeGroup = (groupId: string) => {
    onGroupsChange(selectedGroups.filter(id => id !== groupId));
  };

  const hasActiveFilters = selectedParticipants.length > 0 || selectedChallengeTypes.length > 0 || selectedGroups.length > 0;

  return (
    <div className="space-y-4 p-4 bg-card rounded-lg border">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{t[lang].filters}</h3>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={onClearAll}>
            <X className="h-4 w-4 mr-1" />
            {t[lang].clearAll}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Participants Filter */}
        <div className="space-y-2">
          <label className="text-sm font-medium">{t[lang].participants}</label>
          <Popover open={participantsOpen} onOpenChange={setParticipantsOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-between"
                aria-expanded={participantsOpen}
              >
                {selectedParticipants.length === 0 ? (
                  t[lang].all
                ) : (
                  `${selectedParticipants.length} ${t[lang].selected}`
                )}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0" align="start">
              <Command>
                <CommandInput placeholder={t[lang].searchParticipants} />
                <CommandList>
                  <CommandEmpty>{t[lang].noParticipants}</CommandEmpty>
                  <CommandGroup>
                    {participants.map((participant) => (
                      <CommandItem
                        key={participant.user_id}
                        onSelect={() => handleParticipantToggle(participant.user_id)}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            selectedParticipants.includes(participant.user_id)
                              ? "opacity-100"
                              : "opacity-0"
                          )}
                        />
                        {participant.display_name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {/* Challenge Type Filter */}
        <div className="space-y-2">
          <label className="text-sm font-medium">{t[lang].challengeType}</label>
          <Select
            value={selectedChallengeTypes.length === 0 ? "all" : selectedChallengeTypes[0]}
            onValueChange={handleChallengeTypeChange}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {challengeTypeOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Groups Filter */}
        <div className="space-y-2">
          <label className="text-sm font-medium">{t[lang].groups}</label>
          <Popover open={groupsOpen} onOpenChange={setGroupsOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-between"
                aria-expanded={groupsOpen}
              >
                {selectedGroups.length === 0 ? (
                  t[lang].all
                ) : (
                  `${selectedGroups.length} ${t[lang].selected}`
                )}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0" align="start">
              <Command>
                <CommandInput placeholder={t[lang].searchGroups} />
                <CommandList>
                  <CommandEmpty>{t[lang].noGroups}</CommandEmpty>
                  <CommandGroup>
                    {groups.map((group) => (
                      <CommandItem
                        key={group.id}
                        onSelect={() => handleGroupToggle(group.id)}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            selectedGroups.includes(group.id)
                              ? "opacity-100"
                              : "opacity-0"
                          )}
                        />
                        {group.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2">
          {selectedParticipants.map(participantId => {
            const participant = participants.find(p => p.user_id === participantId);
            return participant ? (
              <Badge key={participantId} variant="secondary" className="gap-1">
                {participant.display_name}
                <X 
                  className="h-3 w-3 cursor-pointer hover:text-destructive" 
                  onClick={() => removeParticipant(participantId)}
                />
              </Badge>
            ) : null;
          })}
          
          {selectedChallengeTypes.map(type => (
            <Badge key={type} variant="secondary" className="gap-1">
              {type === 'habit' ? t[lang].habit : t[lang].kpi}
              <X 
                className="h-3 w-3 cursor-pointer hover:text-destructive" 
                onClick={() => onChallengeTypesChange([])}
              />
            </Badge>
          ))}

          {selectedGroups.map(groupId => {
            const group = groups.find(g => g.id === groupId);
            return group ? (
              <Badge key={groupId} variant="secondary" className="gap-1">
                {group.name}
                <X 
                  className="h-3 w-3 cursor-pointer hover:text-destructive" 
                  onClick={() => removeGroup(groupId)}
                />
              </Badge>
            ) : null;
          })}
        </div>
      )}
    </div>
  );
};