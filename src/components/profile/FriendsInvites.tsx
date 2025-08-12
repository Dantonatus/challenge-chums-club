import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import QRCode from "qrcode.react";

interface FriendsInvitesProps {
  userId: string;
  t: any;
}

export const FriendsInvites = ({ userId, t }: FriendsInvitesProps) => {
  const qc = useQueryClient();
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");

  // Pending friend requests where the current user is the recipient
  const pendingQuery = useQuery({
    enabled: !!userId,
    queryKey: ["friends", "pending", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_friends")
        .select("id, user_id, friend_user_id, status, created_at")
        .eq("friend_user_id", userId)
        .eq("status", "pending");
      if (error) throw error;
      return data || [];
    },
  });

  // Accepted friends list for search/index
  const acceptedQuery = useQuery({
    enabled: !!userId,
    queryKey: ["friends", "accepted", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_friends")
        .select("id, user_id, friend_user_id, status")
        .eq("status", "accepted")
        .or(`user_id.eq.${userId},friend_user_id.eq.${userId}`);
      if (error) throw error;
      return data || [];
    },
  });

  const friendIds = useMemo(() => {
    const set = new Set<string>();
    (acceptedQuery.data || []).forEach((f) => {
      set.add(f.user_id === userId ? f.friend_user_id : f.user_id);
    });
    return Array.from(set);
  }, [acceptedQuery.data, userId]);

  const profilesQuery = useQuery({
    enabled: friendIds.length > 0,
    queryKey: ["friends", "profiles", friendIds.join(",")],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url")
        .in("id", friendIds);
      if (error) throw error;
      return data || [];
    },
  });

  // Groups owned or member of (for invite link/QR)
  const myGroupsOwned = useQuery({
    enabled: !!userId,
    queryKey: ["friends", "groups-owned", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("groups")
        .select("id,name,invite_code")
        .eq("owner_id", userId);
      if (error) throw error;
      return data || [];
    },
  });

  const myGroupMemberships = useQuery({
    enabled: !!userId,
    queryKey: ["friends", "groups-member", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("group_members")
        .select("group_id")
        .eq("user_id", userId);
      if (error) throw error;
      return data || [];
    },
  });

  const groupsFromMembership = useQuery({
    enabled: (myGroupMemberships.data || []).length > 0,
    queryKey: ["friends", "groups-by-ids", (myGroupMemberships.data || []).map((m) => m.group_id).join(",")],
    queryFn: async () => {
      const ids = (myGroupMemberships.data || []).map((m) => m.group_id);
      const { data, error } = await supabase
        .from("groups")
        .select("id,name,invite_code")
        .in("id", ids);
      if (error) throw error;
      return data || [];
    },
  });

  const allGroups = useMemo(() => {
    const owned = myGroupsOwned.data || [];
    const members = groupsFromMembership.data || [];
    const map = new Map<string, any>();
    [...owned, ...members].forEach((g) => map.set(g.id, g));
    return Array.from(map.values());
  }, [myGroupsOwned.data, groupsFromMembership.data]);

  const accept = async (id: string) => {
    // Optimistic UI: remove locally
    const prev = pendingQuery.data || [];
    qc.setQueryData(["friends", "pending", userId], prev.filter((r: any) => r.id !== id));
    const { error } = await supabase.from("user_friends").update({ status: "accepted" }).eq("id", id);
    if (error) {
      qc.setQueryData(["friends", "pending", userId], prev);
      toast({ title: t.friends?.error || "Fehler", description: error.message, variant: "destructive" as any });
    } else {
      qc.invalidateQueries({ queryKey: ["friends", "accepted", userId] });
      toast({ title: t.friends?.accepted || "Anfrage akzeptiert" });
    }
  };

  const decline = async (id: string) => {
    const prev = pendingQuery.data || [];
    qc.setQueryData(["friends", "pending", userId], prev.filter((r: any) => r.id !== id));
    const { error } = await supabase.from("user_friends").update({ status: "declined" }).eq("id", id);
    if (error) {
      qc.setQueryData(["friends", "pending", userId], prev);
      toast({ title: t.friends?.error || "Fehler", description: error.message, variant: "destructive" as any });
    } else {
      toast({ title: t.friends?.declined || "Anfrage abgelehnt" });
    }
  };

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const selectedGroup = allGroups.find((g) => g.id === selectedGroupId);
  const inviteUrl = selectedGroup ? `${origin}/app/groups?invite=${encodeURIComponent(selectedGroup.invite_code)}` : "";

  return (
    <Card className="animate-fade-in">
      <CardHeader>
        <CardTitle>{t.friends?.title || "Freunde & Einladungen"}</CardTitle>
        <CardDescription>{t.friends?.desc || "Anfragen verwalten und Gruppenlinks teilen"}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Pending requests */}
        <div>
          <h3 className="text-sm font-medium mb-2">{t.friends?.pending || "Ausstehende Anfragen"}</h3>
          <div className="space-y-2">
            {(pendingQuery.data || []).length === 0 ? (
              <p className="text-sm text-muted-foreground">{t.friends?.noPending || "Keine offenen Anfragen"}</p>
            ) : (
              (pendingQuery.data || []).map((req: any) => (
                <div key={req.id} className="flex items-center justify-between rounded-md border p-2 hover-scale">
                  <div className="text-sm">{t.friends?.requestFrom || "Anfrage von"}: <span className="font-medium">{req.user_id}</span></div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="secondary" aria-label={t.friends?.accept || "Akzeptieren"} onClick={() => accept(req.id)}>
                      {t.friends?.accept || "Akzeptieren"}
                    </Button>
                    <Button size="sm" variant="outline" aria-label={t.friends?.decline || "Ablehnen"} onClick={() => decline(req.id)}>
                      {t.friends?.decline || "Ablehnen"}
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <Separator />

        {/* Invite via link/QR */}
        <div>
          <h3 className="text-sm font-medium mb-2">{t.friends?.inviteTitle || "Per Link/QR einladen"}</h3>
          <div className="grid gap-2 md:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="group-select" className="text-sm text-muted-foreground">
                {t.friends?.selectGroup || "Gruppe auswählen"}
              </label>
              <select
                id="group-select"
                aria-label={t.friends?.selectGroup || "Gruppe auswählen"}
                className="h-10 rounded-md border bg-background px-3"
                value={selectedGroupId}
                onChange={(e) => setSelectedGroupId(e.target.value)}
              >
                <option value="">{t.friends?.choose || "Bitte wählen"}</option>
                {allGroups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
              {selectedGroup && (
                <div className="space-y-2">
                  <Input readOnly value={inviteUrl} aria-label="Invite URL" onFocus={(e) => e.currentTarget.select()} />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        await navigator.clipboard.writeText(inviteUrl);
                        toast({ title: t.friends?.copied || "Link kopiert" });
                      }}
                    >
                      {t.friends?.copy || "Kopieren"}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        const shareData = { title: selectedGroup.name, text: t.friends?.inviteShareText || "Komm in meine Gruppe!", url: inviteUrl } as any;
                        if (navigator.share) navigator.share(shareData).catch(() => {});
                        else navigator.clipboard.writeText(inviteUrl);
                      }}
                    >
                      {t.friends?.share || "Teilen"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center justify-center p-3">
              {selectedGroup ? (
                <QRCode value={inviteUrl} size={128} includeMargin />
              ) : (
                <div className="text-sm text-muted-foreground">{t.friends?.qrHint || "QR wird nach Auswahl angezeigt"}</div>
              )}
            </div>
          </div>
        </div>

        <Separator />

        {/* Friends search */}
        <div>
          <h3 className="text-sm font-medium mb-2">{t.friends?.searchTitle || "Freunde durchsuchen"}</h3>
          <FriendsSearchList profiles={(profilesQuery.data || [])} t={t} />
        </div>
      </CardContent>
    </Card>
  );
};

function FriendsSearchList({ profiles, t }: { profiles: any[]; t: any }) {
  const [q, setQ] = useState("");
  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return profiles;
    return profiles.filter((p) => (p.display_name || "").toLowerCase().includes(needle) || (p.id || "").includes(needle));
  }, [profiles, q]);

  return (
    <div className="space-y-2">
      <Input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={t.friends?.searchPlaceholder || "Name oder ID"}
        aria-label={t.friends?.searchTitle || "Freunde durchsuchen"}
      />
      <ul className="max-h-48 overflow-auto rounded-md border divide-y">
        {list.length === 0 ? (
          <li className="p-2 text-sm text-muted-foreground">{t.friends?.noResults || "Keine Treffer"}</li>
        ) : (
          list.map((p) => (
            <li key={p.id} className="p-2 text-sm flex items-center justify-between">
              <span className="truncate mr-2">{p.display_name || p.id}</span>
              <span className="text-xs text-muted-foreground">{p.id.slice(0, 6)}…</span>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
