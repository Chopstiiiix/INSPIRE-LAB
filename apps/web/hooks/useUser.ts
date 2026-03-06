"use client";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";

export function useUser() {
  const [user, setUser] = useState<any>(null);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  return user;
}
