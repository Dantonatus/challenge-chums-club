'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { MoreVertical, Trash2, Users, Copy, Loader2 } from 'lucide-react';
import ManageMembersModal from './ManageMembersModal';
import { useGroupActions } from '@/hooks/useGroupManagement';
import { toast } from 'sonner';

interface Group {
  id: string;
  name: string;
  description: string | null;
  invite_code: string;
  owner_id: string;
}

interface GroupCardProps {
  group: Group;
  canManage: boolean; // True if Owner or Admin
  currentUserId?: string;
}

export default function GroupCard({ group, canManage, currentUserId }: GroupCardProps) {
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const { deleteGroup } = useGroupActions();

  const handleCopyCode = () => {
    navigator.clipboard.writeText(group.invite_code);
    toast.success('Invite Code kopiert.');
  };

  const handleDelete = () => {
    deleteGroup.mutate(group.id);
  };

  const isOwner = currentUserId === group.owner_id;

  return (
    <div className="border rounded-lg p-6 shadow-sm bg-card relative flex flex-col h-full" data-testid={`group-card-${group.id}`}>
      <div className="flex-grow">
        <h3 className="text-xl font-semibold pr-8">{group.name}</h3>
        <p className="text-sm text-muted-foreground mb-4">{group.description}</p>

        {/* Requirement 2: Options menu and AlertDialog for deletion */}
        {canManage && (
          <div className="absolute top-4 right-4">
            <AlertDialog>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="Gruppenoptionen" data-testid="button-group-options">
                    <MoreVertical className="h-5 w-5 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {/* Trigger for AlertDialog */}
                  <AlertDialogTrigger asChild>
                    <DropdownMenuItem
                      onSelect={(e) => e.preventDefault()} // Prevents closing dropdown on click
                      className="text-destructive cursor-pointer focus:text-destructive"
                      data-testid="option-delete-group"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Gruppe löschen
                    </DropdownMenuItem>
                  </AlertDialogTrigger>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* AlertDialog Content */}
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Gruppe wirklich löschen?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Sind Sie sicher, dass Sie "{group.name}" löschen möchten? Diese Aktion ist unwiderruflich.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    disabled={deleteGroup.isPending}
                    data-testid="button-confirm-delete"
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {deleteGroup.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Löschen"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}

        {/* Only show invite code to group owners for security */}
        {isOwner && (
          <p className="text-xs text-muted-foreground mb-4">
            Invite code: <code className="font-mono text-xs bg-muted p-1 rounded">{group.invite_code}</code>
          </p>
        )}
      </div>

      <div className="flex gap-4 mt-4">
        <Button variant="outline" className="flex-1" onClick={() => setIsManageModalOpen(true)} data-testid="button-manage-members">
          <Users className="mr-2 h-4 w-4" />
          Mitglieder verwalten
        </Button>
        {isOwner && (
          <Button variant="secondary" onClick={handleCopyCode}>
            <Copy className="mr-2 h-4 w-4" />
            Code kopieren
          </Button>
        )}
      </div>

      {/* Modal */}
      <ManageMembersModal
        isOpen={isManageModalOpen}
        onClose={() => setIsManageModalOpen(false)}
        group={group}
        canManage={canManage}
      />
    </div>
  );
}