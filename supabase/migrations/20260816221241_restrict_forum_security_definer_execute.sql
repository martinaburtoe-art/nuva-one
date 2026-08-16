revoke execute on function public.forum_sync_reply_count() from public;
revoke execute on function public.forum_sync_reply_count() from anon;
revoke execute on function public.forum_sync_reply_count() from authenticated;

revoke execute on function public.increment_forum_topic_views(uuid) from public;
revoke execute on function public.increment_forum_topic_views(uuid) from anon;
grant execute on function public.increment_forum_topic_views(uuid) to authenticated;
