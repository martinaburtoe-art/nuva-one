import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000;
const ABSOLUTE_SESSION_MAX_MS = 12 * 60 * 60 * 1000;
const ACTIVITY_THROTTLE_MS = 30 * 1000;

function getSessionIssuedAt(session: Session): number | null {
  try {
    const payload = JSON.parse(atob(session.access_token.split(".")[1] ?? "")) as {
      iat?: number;
    };
    return typeof payload.iat === "number" ? payload.iat * 1000 : null;
  } catch {
    return null;
  }
}

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let lastActivityAt = Date.now();
    let mounted = true;

    const markActivity = () => {
      const now = Date.now();
      if (now - lastActivityAt >= ACTIVITY_THROTTLE_MS) {
        lastActivityAt = now;
      }
    };

    const events = ["pointerdown", "keydown", "touchstart", "scroll"] as const;
    events.forEach((event) => window.addEventListener(event, markActivity, { passive: true }));

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      if (!mounted) return;
      setSession(s);
      setUser(s?.user ?? null);
      if (!s) lastActivityAt = Date.now();
    });

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setUser(data.session?.user ?? null);
      lastActivityAt = Date.now();
      setLoading(false);
    });

    const timer = window.setInterval(() => {
      if (!mounted || !session) return;
      const now = Date.now();
      const issuedAt = getSessionIssuedAt(session);
      if (
        now - lastActivityAt >= INACTIVITY_TIMEOUT_MS ||
        (issuedAt !== null && now - issuedAt >= ABSOLUTE_SESSION_MAX_MS)
      ) {
        void supabase.auth.signOut();
      }
    }, 60 * 1000);

    return () => {
      mounted = false;
      window.clearInterval(timer);
      events.forEach((event) => window.removeEventListener(event, markActivity));
      sub.subscription.unsubscribe();
    };
  }, [session]);

  return { session, user, loading };
}
