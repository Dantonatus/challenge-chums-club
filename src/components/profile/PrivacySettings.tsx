import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Shield, Eye, Users, Lock, Save } from "lucide-react";

interface PrivacySettings {
  profile_visibility: 'public' | 'friends_and_groups' | 'groups_only' | 'private';
  activity_visibility: 'friends_only' | 'groups_only' | 'private';
  allow_friend_requests: boolean;
}

export const PrivacySettings = () => {
  const [settings, setSettings] = useState<PrivacySettings>({
    profile_visibility: 'friends_and_groups',
    activity_visibility: 'friends_only',
    allow_friend_requests: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from('profiles')
          .select('privacy_settings')
          .eq('id', user.id)
          .single();

        if (error) throw error;

        if (data?.privacy_settings) {
          setSettings(data.privacy_settings);
        }
      } catch (error) {
        console.error('Error loading privacy settings:', error);
        toast({
          title: "Fehler",
          description: "Datenschutz-Einstellungen konnten nicht geladen werden.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('profiles')
        .update({ privacy_settings: settings })
        .eq('id', user.id);

      if (error) throw error;

      // Log security event
      try {
        await supabase.rpc('log_security_event', {
          event_type: 'privacy_settings_updated',
          metadata_param: {
            new_settings: settings,
            timestamp: new Date().toISOString()
          }
        });
      } catch (logError) {
        console.warn('Failed to log privacy settings change:', logError);
      }

      toast({
        title: "Gespeichert",
        description: "Deine Datenschutz-Einstellungen wurden aktualisiert.",
      });
    } catch (error) {
      console.error('Error saving privacy settings:', error);
      toast({
        title: "Fehler",
        description: "Einstellungen konnten nicht gespeichert werden.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Datenschutz-Einstellungen
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          Datenschutz-Einstellungen
        </CardTitle>
        <CardDescription>
          Kontrolliere, wer deine Informationen sehen kann
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Profil-Sichtbarkeit
            </Label>
            <Select
              value={settings.profile_visibility}
              onValueChange={(value: PrivacySettings['profile_visibility']) =>
                setSettings(prev => ({ ...prev, profile_visibility: value }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">
                  Öffentlich - Jeder kann mein Profil sehen
                </SelectItem>
                <SelectItem value="friends_and_groups">
                  Freunde & Gruppen - Nur Freunde und Gruppenmitglieder
                </SelectItem>
                <SelectItem value="groups_only">
                  Nur Gruppen - Nur Mitglieder meiner Gruppen
                </SelectItem>
                <SelectItem value="private">
                  Privat - Nur ich kann mein Profil sehen
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Aktivitäts-Sichtbarkeit
            </Label>
            <Select
              value={settings.activity_visibility}
              onValueChange={(value: PrivacySettings['activity_visibility']) =>
                setSettings(prev => ({ ...prev, activity_visibility: value }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="friends_only">
                  Nur Freunde - Nur Freunde sehen meine Aktivitäten
                </SelectItem>
                <SelectItem value="groups_only">
                  Nur Gruppen - Nur Gruppenmitglieder sehen meine Aktivitäten
                </SelectItem>
                <SelectItem value="private">
                  Privat - Niemand sieht meine Aktivitäten
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="flex items-center gap-2">
                <Lock className="h-4 w-4" />
                Freundschaftsanfragen erlauben
              </Label>
              <p className="text-sm text-muted-foreground">
                Andere Nutzer können dir Freundschaftsanfragen senden
              </p>
            </div>
            <Switch
              checked={settings.allow_friend_requests}
              onCheckedChange={(checked) =>
                setSettings(prev => ({ ...prev, allow_friend_requests: checked }))
              }
            />
          </div>
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? (
            <>Wird gespeichert...</>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Einstellungen speichern
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};