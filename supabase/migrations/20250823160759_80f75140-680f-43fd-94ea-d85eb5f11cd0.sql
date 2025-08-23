-- Security Fix 1: Restrict profile visibility to friends/group members only
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;

CREATE POLICY "Profiles are viewable by friends and group members"
ON public.profiles
FOR SELECT
USING (
    id = auth.uid() OR -- Users can always see their own profile
    EXISTS ( -- Users can see friends' profiles
        SELECT 1 FROM user_friends uf 
        WHERE ((uf.user_id = auth.uid() AND uf.friend_user_id = id) 
               OR (uf.friend_user_id = auth.uid() AND uf.user_id = id))
               AND uf.status = 'accepted'
    ) OR
    EXISTS ( -- Users can see group members' profiles
        SELECT 1 FROM group_members gm1
        JOIN group_members gm2 ON gm1.group_id = gm2.group_id
        WHERE gm1.user_id = auth.uid() AND gm2.user_id = id
    )
);