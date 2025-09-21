'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Loader2, UserX } from 'lucide-react';
import { useGroupMembers, useGroupActions, useCurrentUser } from '@/hooks/useGroupManagement';

interface Group {
  id: string;
  name: string;
  description: string | null;
  invite_code: string;
  owner_id: string;
}

interface Member {
  id: string;
  name: string;
  avatarUrl: string | null;
  role: 'Owner' | 'Admin' | 'Member';
  user_id: string;
}

interface ManageMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  group: Group;
  canManage: boolean;
}

export default function ManageMembersModal({ isOpen, onClose, group, canManage }: ManageMembersModalProps) {
  const { data: members, isLoading, error } = useGroupMembers(group.id, isOpen);
  const { removeMember, leaveGroup } = useGroupActions();
  const { data: currentUser } = useCurrentUser();

  // State for AlertDialog for member removal
  const [memberToRemove, setMemberToRemove] = useState<Member | null>(null);
  const [isRemoving, setIsRemoving] = useState(false); // Own state for pending, since mutation is global

  const handleOpenConfirm = (member: Member) => {
    setMemberToRemove(member);
  };

  const handleConfirmRemove = async () => {
    if (!memberToRemove) return;
    setIsRemoving(true);
    try {
      const isSelf = currentUser && memberToRemove.id === currentUser.id;
      if (isSelf) {
        await leaveGroup.mutateAsync({ groupId: group.id, userId: memberToRemove.id });
        onClose(); // Close modal when leaving group
      } else {
        await removeMember.mutateAsync({ groupId: group.id, userId: memberToRemove.id });
      }
      setMemberToRemove(null);
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[450px]" data-testid="manage-members-modal">
          <DialogHeader>
            <DialogTitle>Mitglieder verwalten: {group.name}</DialogTitle>
          </DialogHeader>

          <div className="mt-4 max-h-96 overflow-y-auto">
            {isLoading && <div className="flex justify-center p-4"><Loader2 className="animate-spin" /></div>}
            {error && <p className="text-destructive text-center">Fehler beim Laden der Mitglieder.</p>}

            {members && members.length > 0 && (
              <div className="space-y-3">
                {members.map(member => {
                  const isSelf = currentUser && member.id === currentUser.id;
                  // Permission logic (assumption: Owner cannot be removed)
                  const showRemoveButton = canManage && !isSelf && member.role !== 'Owner';
                  const showLeaveButton = isSelf && member.role !== 'Owner';

                  return (
                    <div key={member.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border" data-testid={`member-item-${member.id}`}>
                      <div className="flex items-center gap-4">
                        {/* Requirement 1a: Profile picture and name */}
                        <Avatar>
                          <AvatarImage src={member.avatarUrl || undefined} alt={`${member.name}'s Avatar`} />
                          <AvatarFallback>{member.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{member.name} {isSelf && "(Du)"}</p>
                          <p className="text-xs text-muted-foreground">{member.role}</p>
                        </div>
                      </div>

                      {/* Requirement 1b: Remove/Leave Button */}
                      {(showRemoveButton || showLeaveButton) && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenConfirm(member)}
                          aria-label={isSelf ? `Gruppe verlassen` : `Entferne ${member.name}`}
                          className="text-destructive hover:text-destructive/80"
                          data-testid={`button-remove-member-${member.id}`}
                        >
                          <UserX className="h-5 w-5" />
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {members && members.length === 0 && (
              <div className="text-sm text-muted-foreground text-center">Keine Mitglieder gefunden.</div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Separate AlertDialog instance for member removal */}
      <AlertDialog open={!!memberToRemove} onOpenChange={() => setMemberToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {memberToRemove && currentUser && memberToRemove.id === currentUser.id 
                ? 'Gruppe verlassen?' 
                : 'Mitglied entfernen?'
              }
            </AlertDialogTitle>
            <AlertDialogDescription>
              {memberToRemove && currentUser && memberToRemove.id === currentUser.id
                ? `Möchten Sie die Gruppe "${group.name}" wirklich verlassen?`
                : `Soll ${memberToRemove?.name} wirklich aus der Gruppe entfernt werden?`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRemoving}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmRemove}
              disabled={isRemoving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isRemoving ? <Loader2 className="h-4 w-4 animate-spin" /> : 
                (memberToRemove && currentUser && memberToRemove.id === currentUser.id ? "Verlassen" : "Entfernen")
              }
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}