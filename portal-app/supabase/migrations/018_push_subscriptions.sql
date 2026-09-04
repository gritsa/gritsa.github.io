-- Web push subscriptions. One row per (user, browser/device) subscription. The send-push Edge
-- Function reads this table via the service role key (same pattern as document-proxy and
-- send-notification), so it needs no RLS policy of its own — only the owning user can read/write
-- their own rows through the normal client, which keeps push endpoints (sensitive — anyone who
-- has one can send arbitrary pushes to that browser) from being exposed to any other role.

CREATE TABLE public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  endpoint TEXT NOT NULL,
  subscription JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, endpoint)
);

CREATE INDEX idx_push_subscriptions_user_id ON public.push_subscriptions(user_id);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own push subscriptions"
  ON public.push_subscriptions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
