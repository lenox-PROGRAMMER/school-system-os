import { useState, useEffect } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface UserProfile {
  id: string;
  user_id: string | null;
  full_name: string | null;
  role: "admin" | "student" | "lecturer";
  email: string;
  created_at: string;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      // First try to find profile by user_id
      let { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      // If no profile found by user_id, try to find by email and link it
      if (!data && !error) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email) {
          const { data: profileByEmail, error: emailError } = await supabase
            .from("profiles")
            .select("*")
            .eq("email", user.email)
            .maybeSingle();

          if (profileByEmail && !emailError) {
            // Link the profile to the user
            const { error: updateError } = await supabase
              .from("profiles")
              .update({ user_id: userId })
              .eq("email", user.email);

            if (!updateError) {
              data = { ...profileByEmail, user_id: userId };
            }
          }
        }
      }

      if (error) {
        console.error("Error fetching profile:", error);
      } else if (data) {
        setProfile(data as UserProfile);
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setLoading(false);
    }
  };

  return {
    user,
    profile,
    loading,
    isAdmin: profile?.role === "admin",
    isStudent: profile?.role === "student",
    isLecturer: profile?.role === "lecturer",
  };
}