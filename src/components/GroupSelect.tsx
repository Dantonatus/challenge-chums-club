import { useEffect, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';

interface Group { id: string; name: string; }

interface Props {
  value?: string | null;
  onChange: (groupId: string | null) => void;
}

export const GroupSelect = ({ value, onChange }: Props) => {
  const [groups, setGroups] = useState<Group[]>([]);

  useEffect(() => {
    supabase.from('groups').select('id,name').then(({ data }) => setGroups(data || []));
  }, []);

  return (
    <Select value={value ?? undefined} onValueChange={(val) => onChange(val || null)}>
      <SelectTrigger className="w-[280px]">
        <SelectValue placeholder="Select a group" />
      </SelectTrigger>
      <SelectContent>
        {groups.map(g => (
          <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
