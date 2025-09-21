import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Type definitions
interface Member {
  id: string;
  name: string;
  avatarUrl: string | null;
  role: 'Owner' | 'Admin' | 'Member';
  user_id: string;
}

interface Group {
  id: string;
  name: string;
  description: string | null;
  invite_code: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

// Requirement 1: Fetch group members
export const useGroupMembers = (groupId: string, enabled: boolean = true) => {
  return useQuery<Member[]>({
    queryKey: ['groupMembers', groupId],
    queryFn: async () => {
      // Get group members
      const { data: groupMembers, error: membersError } = await supabase
        .from('group_members')
        .select('user_id, role')
        .eq('group_id', groupId);

      if (membersError) throw membersError;

      if (!groupMembers || groupMembers.length === 0) {
        return [];
      }

      // Get profiles for members
      const userIds = groupMembers.map(m => m.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      // Get group to determine owner
      const { data: group, error: groupError } = await supabase
        .from('groups')
        .select('owner_id')
        .eq('id', groupId)
        .single();

      if (groupError) throw groupError;

      // Combine data
      return groupMembers.map(gm => {
        const profile = profiles?.find(p => p.id === gm.user_id);
        let role: 'Owner' | 'Admin' | 'Member' = 'Member';
        
        if (gm.user_id === group.owner_id) {
          role = 'Owner';
        } else if (gm.role === 'admin') {
          role = 'Admin';
        }

        return {
          id: gm.user_id,
          user_id: gm.user_id,
          name: profile?.display_name || gm.user_id.slice(0, 6),
          avatarUrl: profile?.avatar_url || null,
          role
        };
      });
    },
    enabled: enabled && !!groupId,
  });
};

// Fetch user's groups
export const useUserGroups = () => {
  return useQuery<Group[]>({
    queryKey: ['groups'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('groups')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });
};

// Central hook for group mutations
export const useGroupActions = () => {
  const queryClient = useQueryClient();

  // Requirement 2: Delete group
  const deleteGroup = useMutation({
    mutationFn: async (groupId: string) => {
      const { error } = await supabase
        .from('groups')
        .delete()
        .eq('id', groupId);

      if (error) throw error;
    },
    onSuccess: (data, groupId) => {
      toast.success('Gruppe erfolgreich gelöscht.');
      // Requirement 3: Harmonization
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      queryClient.removeQueries({ queryKey: ['groupMembers', groupId] });
    },
    onError: () => {
      toast.error('Fehler beim Löschen der Gruppe.');
    },
  });

  // Requirement 1: Remove member
  const removeMember = useMutation({
    mutationFn: async ({ groupId, userId }: { groupId: string, userId: string }) => {
      const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('group_id', groupId)
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: (data, { groupId }) => {
      toast.success('Mitglied erfolgreich entfernt.');
      // Requirement 3: Harmonization
      queryClient.invalidateQueries({ queryKey: ['groupMembers', groupId] });
      // Optional: If group list shows member count
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
    onError: () => {
      toast.error('Fehler beim Entfernen des Mitglieds.');
    },
  });

  // Leave group
  const leaveGroup = useMutation({
    mutationFn: async ({ groupId, userId }: { groupId: string, userId: string }) => {
      const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('group_id', groupId)
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Gruppe erfolgreich verlassen.');
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
    onError: () => {
      toast.error('Fehler beim Verlassen der Gruppe.');
    },
  });

  return { deleteGroup, removeMember, leaveGroup };
};

// Get current user
export const useCurrentUser = () => {
  return useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });
};