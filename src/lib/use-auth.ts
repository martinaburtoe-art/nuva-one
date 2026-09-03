import { useEffect, useRef, useState } from "react";
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
  const sessionRef = useRef<Session | null>(null);
  const lastActivityAtRef = useRef(Date.now());
  const sessionStartedAtRef = useRef<number | null>(null);

  useEffect(() => {
    let mounted = true;

    const markActivity = () => {
      const now = Date.now();
      if (now - lastActivityAtRef.current >= ACTIVITY_THROTTLE_MS) {
        lastActivityAtRef.current = now;
      }
    };

    const events = ["pointerdown", "keydown", "touchstart", "scroll"] as const;
    events.forEach((event) => window.addEventListener(event, markActivity, { passive: true }));

    const applySession = (s: Session | null) => {
      if (!mounted) return;
      sessionRef.current = s;
      setSession(s);
      setUser(s?.user ?? null);
      if (s && sessionStartedAtRef.current === null) {
        sessionStartedAtRef.current = getSessionIssuedAt(s);
      }
      if (!s) {
        sessionStartedAtRef.current = null;
        lastActivityAtRef.current = Date.now();
      }
    };

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => applySession(s));

    supabase.auth.getSession().then(({ data }) => {
      applySession(data.session);
      if (mounted) setLoading(false);
    });

    const timer = window.setInterval(() => {
      const current = sessionRef.current;
      if (!mounted || !current) return;
      const now = Date.now();
      const inactive = now - lastActivityAtRef.current >= INACTIVITY_TIMEOUT_MS;
      const absolute =
        sessionStartedAtRef.current !== null &&
        now - sessionStartedAtRef.current >= ABSOLUTE_SESSION_MAX_MS;
      if (inactive || absolute) void supabase.auth.signOut();
    }, 60 * 1000);

    return () => {
      mounted = false;
      window.clearInterval(timer);
      events.forEach((event) => window.removeEventListener(event, markActivity));
      sub.subscription.unsubscribe();
    };
  }, []);

  return { session, user, loading };
}
