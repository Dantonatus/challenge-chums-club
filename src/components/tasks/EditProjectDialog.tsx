import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useUpdateProject } from '@/hooks/useProjects';
import { useProjectsFlat } from '@/hooks/useProjectTree';
import type { Project } from '@/lib/tasks/types';

const formSchema = z.object({
  name: z.string().min(1, 'Projektname ist erforderlich'),
  description: z.string().optional(),
  color: z.string().default('#6366f1'),
  parent_id: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

const PRESET_COLORS = [
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#14b8a6', // teal
  '#0ea5e9', // sky
];

interface EditProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project | null;
}

export function EditProjectDialog({ open, onOpenChange, project }: EditProjectDialogProps) {
  const updateProject = useUpdateProject();
  const { data: allProjects } = useProjectsFlat();
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]);

  // Filter parent options - exclude self and descendants to prevent circular refs
  const getDescendantIds = (p: Project, all: Project[]): string[] => {
    const children = all.filter(c => c.parent_id === p.id);
    return [p.id, ...children.flatMap(c => getDescendantIds(c, all))];
  };

  const excludedIds = project ? getDescendantIds(project, allProjects || []) : [];
  const parentOptions = (allProjects || []).filter(
    p => !p.parent_id && !excludedIds.includes(p.id)
  );

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
      color: PRESET_COLORS[0],
      parent_id: 'none',
    },
  });

  // Reset form when project changes
  useEffect(() => {
    if (project) {
      form.reset({
        name: project.name,
        description: project.description || '',
        color: project.color,
        parent_id: project.parent_id || 'none',
      });
      setSelectedColor(project.color);
    }
  }, [project, form]);

  const onSubmit = async (data: FormData) => {
    if (!project) return;

    await updateProject.mutateAsync({
      id: project.id,
      name: data.name,
      description: data.description,
      color: selectedColor,
      parent_id: data.parent_id === 'none' ? undefined : data.parent_id,
    });
    onOpenChange(false);
  };

  if (!project) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Projekt bearbeiten</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Projektname" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Beschreibung (optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Worum geht es in diesem Projekt?"
                      className="resize-none"
                      rows={3}
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Parent project selection */}
            <FormField
              control={form.control}
              name="parent_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Übergeordnetes Projekt</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Kein übergeordnetes Projekt" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">Kein übergeordnetes Projekt</SelectItem>
                      {parentOptions.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          <div className="flex items-center gap-2">
                            <div
                              className="h-2 w-2 rounded-full shrink-0"
                              style={{ backgroundColor: p.color }}
                            />
                            {p.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <label className="text-sm font-medium">Farbe</label>
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setSelectedColor(color)}
                    className={`h-8 w-8 rounded-full transition-all ${
                      selectedColor === color
                        ? 'ring-2 ring-offset-2 ring-primary'
                        : 'hover:scale-110'
                    }`}
                    style={{ backgroundColor: color }}
                    aria-label={`Farbe ${color} wählen`}
                  />
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Abbrechen
              </Button>
              <Button type="submit" disabled={updateProject.isPending}>
                {updateProject.isPending ? 'Speichern...' : 'Speichern'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
