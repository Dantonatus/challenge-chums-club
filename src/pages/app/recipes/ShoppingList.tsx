import { useState } from 'react';
import { Check, Plus, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { RecipeEmptyState } from '@/components/recipes/RecipeEmptyState';
import {
  useShoppingList,
  useAddToShoppingList,
  useToggleShoppingItem,
  useDeleteShoppingItem,
  useClearCheckedItems,
} from '@/hooks/useShoppingList';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export default function RecipesShoppingList() {
  const { data: items, isLoading } = useShoppingList();
  const addItem = useAddToShoppingList();
  const toggleItem = useToggleShoppingItem();
  const deleteItem = useDeleteShoppingItem();
  const clearChecked = useClearCheckedItems();

  const [newItem, setNewItem] = useState('');

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.trim()) return;
    addItem.mutate({ item_name: newItem.trim() });
    setNewItem('');
  };

  // Group by category
  const grouped = (items || []).reduce((acc, item) => {
    const cat = item.category || 'Other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {} as Record<string, typeof items>);

  const checkedCount = items?.filter(i => i.checked).length || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Shopping List</h1>
          <p className="text-muted-foreground">
            {items?.length || 0} items
          </p>
        </div>
        {checkedCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => clearChecked.mutate()}
          >
            <X className="mr-1 h-3 w-3" />
            Clear checked ({checkedCount})
          </Button>
        )}
      </div>

      {/* Add item */}
      <form onSubmit={handleAddItem} className="flex gap-2">
        <Input
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          placeholder="Add an item..."
          className="flex-1"
        />
        <Button type="submit" disabled={!newItem.trim()}>
          <Plus className="mr-1 h-4 w-4" />
          Add
        </Button>
      </form>

      {/* List */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      ) : !items?.length ? (
        <RecipeEmptyState type="shopping" />
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([category, categoryItems]) => (
            <div key={category}>
              <h3 className="mb-2 text-sm font-medium text-muted-foreground">
                {category}
              </h3>
              <div className="rounded-xl border divide-y">
                {categoryItems?.map((item) => (
                  <div
                    key={item.id}
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 transition-colors',
                      item.checked && 'bg-muted/50'
                    )}
                  >
                    <Checkbox
                      checked={item.checked}
                      onCheckedChange={(checked) =>
                        toggleItem.mutate({ id: item.id, checked: !!checked })
                      }
                    />
                    <span
                      className={cn(
                        'flex-1',
                        item.checked && 'line-through text-muted-foreground'
                      )}
                    >
                      {item.item_name}
                      {item.amount && item.unit && (
                        <span className="ml-2 text-sm text-muted-foreground">
                          ({item.amount} {item.unit})
                        </span>
                      )}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100"
                      onClick={() => deleteItem.mutate(item.id)}
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
