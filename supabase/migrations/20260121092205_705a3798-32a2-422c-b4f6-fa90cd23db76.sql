-- Add parent_id and sort_order columns to projects table for subprojects support
ALTER TABLE projects 
  ADD COLUMN parent_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  ADD COLUMN sort_order integer DEFAULT 0;

-- Index for hierarchical queries
CREATE INDEX idx_projects_parent_id ON projects(parent_id);
CREATE INDEX idx_projects_user_parent ON projects(user_id, parent_id);

-- Comment for documentation
COMMENT ON COLUMN projects.parent_id IS 'Reference to parent project for hierarchical subprojects';
COMMENT ON COLUMN projects.sort_order IS 'Order of project within its parent or root level';