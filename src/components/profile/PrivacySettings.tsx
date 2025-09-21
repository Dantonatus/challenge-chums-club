import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { Loader2, Shield, Eye, Users, Globe, Lock } from "lucide-react";

interface PrivacySettings {
  profile_visibility: 'public' | 'friends_and_groups' | 'groups_only' | 'private';
  activity_visibility: 'public' | 'friends_only' | 'private';
  allow_friend_requests: boolean;
}

interface PrivacySettingsProps {
  currentSettings: PrivacySettings;
  onSettingsUpdate: (settings: PrivacySettings) => void;
}

export const PrivacySettings = ({ currentSettings, onSettingsUpdate }: PrivacySettingsProps) => {
  const [settings, setSettings] = useState<PrivacySettings>(currentSettings);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ privacy_settings: settings })
        .eq('id', (await supabase.auth.getUser()).data.user?.id);

      if (error) throw error;

      // Log privacy change
      await supabase.rpc('log_security_event', {
        event_type: 'privacy_settings_updated',
        metadata_param: {
          new_settings: settings,
          timestamp: new Date().toISOString()
        }
      });

      onSettingsUpdate(settings);
      toast({
        title: "Privacy settings updated",
        description: "Your privacy preferences have been saved.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update privacy settings.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getVisibilityIcon = (level: string) => {
    switch (level) {
      case 'public': return <Globe className="h-4 w-4" />;
      case 'friends_and_groups': return <Users className="h-4 w-4" />;
      case 'groups_only': return <Users className="h-4 w-4" />;
      case 'private': return <Lock className="h-4 w-4" />;
      default: return <Eye className="h-4 w-4" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Privacy Settings
        </CardTitle>
        <CardDescription>
          Control who can see your profile and activities
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <Label className="text-base font-medium">Profile Visibility</Label>
          <RadioGroup
            value={settings.profile_visibility}
            onValueChange={(value: PrivacySettings['profile_visibility']) =>
              setSettings({ ...settings, profile_visibility: value })
            }
            className="space-y-2"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="public" id="profile-public" />
              <Label htmlFor="profile-public" className="flex items-center gap-2 cursor-pointer">
                {getVisibilityIcon('public')}
                Public - Anyone can see your profile
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="friends_and_groups" id="profile-friends-groups" />
              <Label htmlFor="profile-friends-groups" className="flex items-center gap-2 cursor-pointer">
                {getVisibilityIcon('friends_and_groups')}
                Friends & Group Members - Default setting
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="groups_only" id="profile-groups" />
              <Label htmlFor="profile-groups" className="flex items-center gap-2 cursor-pointer">
                {getVisibilityIcon('groups_only')}
                Group Members Only
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="private" id="profile-private" />
              <Label htmlFor="profile-private" className="flex items-center gap-2 cursor-pointer">
                {getVisibilityIcon('private')}
                Private - Only you can see your profile
              </Label>
            </div>
          </RadioGroup>
        </div>

        <div className="space-y-3">
          <Label className="text-base font-medium">Activity Visibility</Label>
          <RadioGroup
            value={settings.activity_visibility}
            onValueChange={(value: PrivacySettings['activity_visibility']) =>
              setSettings({ ...settings, activity_visibility: value })
            }
            className="space-y-2"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="public" id="activity-public" />
              <Label htmlFor="activity-public" className="flex items-center gap-2 cursor-pointer">
                {getVisibilityIcon('public')}
                Public - Anyone can see your activities
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="friends_only" id="activity-friends" />
              <Label htmlFor="activity-friends" className="flex items-center gap-2 cursor-pointer">
                {getVisibilityIcon('friends_only')}
                Friends Only - Default setting
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="private" id="activity-private" />
              <Label htmlFor="activity-private" className="flex items-center gap-2 cursor-pointer">
                {getVisibilityIcon('private')}
                Private - Only you can see your activities
              </Label>
            </div>
          </RadioGroup>
        </div>

        <div className="flex items-center justify-between space-x-2">
          <div className="space-y-1">
            <Label className="text-base font-medium">Allow Friend Requests</Label>
            <p className="text-sm text-muted-foreground">
              Let other users send you friend requests
            </p>
          </div>
          <Switch
            checked={settings.allow_friend_requests}
            onCheckedChange={(checked) =>
              setSettings({ ...settings, allow_friend_requests: checked })
            }
          />
        </div>

        <Button onClick={handleSave} disabled={loading} className="w-full">
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Privacy Settings'
          )}
        </Button>
      </CardContent>
    </Card>
  );
};