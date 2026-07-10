-- Device tokens for Firebase Cloud Messaging (FCM) push notifications.
-- Populated by the mobile app (via Capacitor's Push Notifications plugin)
-- once a user grants permission; used by the server to target pushes like
-- "low stock" or "new sale" alerts to that business's team members.
CREATE TABLE public.device_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  fcm_token text NOT NULL UNIQUE,
  platform text NOT NULL DEFAULT 'android' CHECK (platform IN ('android', 'ios', 'web')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.device_tokens ENABLE ROW LEVEL SECURITY;

-- Each person manages only their own device tokens.
CREATE POLICY "Users manage own device tokens" ON public.device_tokens
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE INDEX idx_device_tokens_business_id ON public.device_tokens(business_id);

CREATE TRIGGER touch_device_tokens
  BEFORE UPDATE ON public.device_tokens
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
