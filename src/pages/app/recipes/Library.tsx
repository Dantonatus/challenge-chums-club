import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RecipeCard } from '@/components/recipes/RecipeCard';
import { RecipeEmptyState } from '@/components/recipes/RecipeEmptyState';
import { useRecipes, useToggleFavorite } from '@/hooks/useRecipes';
import { Skeleton } from '@/components/ui/skeleton';
import { CUISINE_OPTIONS, COMMON_TAGS, type RecipeFilters } from '@/lib/recipes/types';
import { cn } from '@/lib/utils';

export default function RecipesLibrary() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<RecipeFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  const { data: recipes, isLoading } = useRecipes(filters);
  const toggleFavorite = useToggleFavorite();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setFilters(prev => ({ ...prev, search: searchValue }));
  };

  const handleTagToggle = (tag: string) => {
    setFilters(prev => {
      const currentTags = prev.tags || [];
      const newTags = currentTags.includes(tag)
        ? currentTags.filter(t => t !== tag)
        : [...currentTags, tag];
      return { ...prev, tags: newTags.length ? newTags : undefined };
    });
  };

  const clearFilters = () => {
    setFilters({});
    setSearchValue('');
  };

  const hasActiveFilters = Object.keys(filters).some(k => filters[k as keyof RecipeFilters]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Recipe Library</h1>
          <p className="text-muted-foreground">
            {recipes?.length || 0} recipes saved
          </p>
        </div>
        <Button onClick={() => navigate('/app/recipes/create')}>
          Create with AI
        </Button>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="Search recipes..."
            className="pl-10"
          />
        </div>
        <Button
          type="button"
          variant={showFilters ? 'secondary' : 'outline'}
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter className="mr-2 h-4 w-4" />
          Filters
        </Button>
      </form>

      {/* Filter panel */}
      {showFilters && (
        <div className="rounded-xl border bg-card p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">Filter recipes</h3>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="mr-1 h-3 w-3" /> Clear all
              </Button>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-sm text-muted-foreground">Cuisine</label>
              <Select
                value={filters.cuisine || ''}
                onValueChange={(v) => setFilters(prev => ({ ...prev, cuisine: v || undefined }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Any cuisine" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Any cuisine</SelectItem>
                  {CUISINE_OPTIONS.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm text-muted-foreground">Difficulty</label>
              <Select
                value={filters.difficulty || ''}
                onValueChange={(v) => setFilters(prev => ({ ...prev, difficulty: v as any || undefined }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Any difficulty" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Any difficulty</SelectItem>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm text-muted-foreground">Max Time</label>
              <Select
                value={filters.maxTime?.toString() || ''}
                onValueChange={(v) => setFilters(prev => ({ ...prev, maxTime: v ? parseInt(v) : undefined }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Any time" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Any time</SelectItem>
                  <SelectItem value="15">Under 15 min</SelectItem>
                  <SelectItem value="30">Under 30 min</SelectItem>
                  <SelectItem value="60">Under 1 hour</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="mb-1.5 block text-sm text-muted-foreground">Tags</label>
            <div className="flex flex-wrap gap-2">
              {COMMON_TAGS.map((tag) => (
                <Badge
                  key={tag}
                  variant={filters.tags?.includes(tag) ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => handleTagToggle(tag)}
                >
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Recipe grid */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-2xl" />
          ))}
        </div>
      ) : !recipes?.length ? (
        <RecipeEmptyState type="library" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {recipes.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              onClick={() => navigate(`/app/recipes/${recipe.id}`)}
              onFavoriteClick={(e) => {
                e.stopPropagation();
                toggleFavorite.mutate({ recipeId: recipe.id, isFavorite: !!recipe.is_favorite });
              }}
              isFavorite={recipe.is_favorite}
            />
          ))}
        </div>
      )}
    </div>
  );
}
