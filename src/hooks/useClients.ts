import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Client, ClientFormData, CLIENT_COLORS } from '@/lib/planning/types';
import { useToast } from '@/hooks/use-toast';

export function useClients() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['clients'],
    queryFn: async (): Promise<Client[]> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return data as Client[];
    },
  });

  const createClient = useMutation({
    mutationFn: async (formData: ClientFormData): Promise<Client> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get existing clients to pick a unique color
      const existingColors = query.data?.map(c => c.color) || [];
      const availableColor = CLIENT_COLORS.find(c => !existingColors.includes(c)) || CLIENT_COLORS[0];

      const { data, error } = await supabase
        .from('clients')
        .insert({
          user_id: user.id,
          name: formData.name,
          color: formData.color || availableColor,
          contact_email: formData.contact_email || null,
          notes: formData.notes || null,
          start_date: formData.start_date || null,
          end_date: formData.end_date || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Client;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast({ title: 'Kunde erstellt' });
    },
    onError: (error) => {
      toast({ title: 'Fehler', description: error.message, variant: 'destructive' });
    },
  });

  const updateClient = useMutation({
    mutationFn: async ({ id, ...formData }: Partial<ClientFormData> & { id: string }): Promise<Client> => {
      const { data, error } = await supabase
        .from('clients')
        .update({
          name: formData.name,
          color: formData.color,
          contact_email: formData.contact_email,
          notes: formData.notes,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Client;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast({ title: 'Kunde aktualisiert' });
    },
    onError: (error) => {
      toast({ title: 'Fehler', description: error.message, variant: 'destructive' });
    },
  });

  const deleteClient = useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase
        .from('clients')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['milestones'] });
      toast({ title: 'Kunde gelöscht' });
    },
    onError: (error) => {
      toast({ title: 'Fehler', description: error.message, variant: 'destructive' });
    },
  });

  // Find or create client by name (for AI input)
  const findOrCreateClient = async (name: string): Promise<Client> => {
    const existing = query.data?.find(
      c => c.name.toLowerCase() === name.toLowerCase()
    );
    if (existing) return existing;
    return createClient.mutateAsync({ name, color: '' });
  };

  return {
    clients: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    createClient,
    updateClient,
    deleteClient,
    findOrCreateClient,
  };
}
