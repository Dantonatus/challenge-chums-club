import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Project } from '@/lib/tasks/types';

// Build tree from flat list
function buildProjectTree(projects: Project[]): Project[] {
  const map = new Map<string, Project & { children: Project[] }>();
  const roots: Project[] = [];

  // First pass: create map entries with empty children arrays
  projects.forEach(p => map.set(p.id, { ...p, children: [] }));

  // Second pass: build tree structure
  projects.forEach(p => {
    const node = map.get(p.id)!;
    if (p.parent_id && map.has(p.parent_id)) {
      map.get(p.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  });

  // Sort children by sort_order
  const sortChildren = (nodes: Project[]) => {
    nodes.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    nodes.forEach(n => {
      if (n.children && n.children.length > 0) {
        sortChildren(n.children);
      }
    });
  };
  sortChildren(roots);

  return roots;
}

// Get all descendant IDs of a project
export function getDescendantIds(project: Project): string[] {
  const ids: string[] = [];
  const traverse = (p: Project) => {
    if (p.children) {
      p.children.forEach(child => {
        ids.push(child.id);
        traverse(child);
      });
    }
  };
  traverse(project);
  return ids;
}

// Find project by ID in tree
export function findProjectInTree(projects: Project[], id: string): Project | null {
  for (const p of projects) {
    if (p.id === id) return p;
    if (p.children) {
      const found = findProjectInTree(p.children, id);
      if (found) return found;
    }
  }
  return null;
}

// Get breadcrumb path to project
export function getProjectPath(projects: Project[], targetId: string): Project[] {
  const path: Project[] = [];
  
  const findPath = (nodes: Project[], target: string): boolean => {
    for (const node of nodes) {
      if (node.id === target) {
        path.push(node);
        return true;
      }
      if (node.children && node.children.length > 0) {
        if (findPath(node.children, target)) {
          path.unshift(node);
          return true;
        }
      }
    }
    return false;
  };
  
  findPath(projects, targetId);
  return path;
}

export function useProjectTree() {
  return useQuery({
    queryKey: ['projects', 'tree'],
    queryFn: async () => {
      const { data: projects, error } = await supabase
        .from('projects')
        .select('*')
        .neq('status', 'archived')
        .order('sort_order', { ascending: true });

      if (error) throw error;

      // Get task counts for each project
      const projectsWithCounts = await Promise.all(
        (projects || []).map(async (project) => {
          const { count: taskCount } = await supabase
            .from('tasks')
            .select('*', { count: 'exact', head: true })
            .eq('project_id', project.id)
            .neq('status', 'archived');

          const { count: completedCount } = await supabase
            .from('tasks')
            .select('*', { count: 'exact', head: true })
            .eq('project_id', project.id)
            .eq('status', 'done');

          return {
            ...project,
            task_count: taskCount || 0,
            completed_count: completedCount || 0,
          } as Project;
        })
      );

      return buildProjectTree(projectsWithCounts);
    },
  });
}

// Flat list of all projects for dropdowns
export function useProjectsFlat() {
  return useQuery({
    queryKey: ['projects', 'flat'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .neq('status', 'archived')
        .order('name', { ascending: true });

      if (error) throw error;
      return data as Project[];
    },
  });
}
