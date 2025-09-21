
-- Create function to get notifications
CREATE OR REPLACE FUNCTION public.get_notifications()
RETURNS TABLE (
  id UUID,
  type TEXT,
  title TEXT,
  message TEXT,
  created_at TIMESTAMPTZ,
  read BOOLEAN,
  priority TEXT,
  action_url TEXT,
  entity_id TEXT,
  user_id UUID
) 
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT n.id, n.type, n.title, n.message, n.created_at, n.read, n.priority, n.action_url, n.entity_id, n.user_id
  FROM public.notifications n
  WHERE n.user_id = auth.uid() OR n.user_id IS NULL
  ORDER BY n.created_at DESC;
END;
$$;

-- Create function to update notification read status
CREATE OR REPLACE FUNCTION public.update_notification_read_status(
  notification_id UUID,
  is_read BOOLEAN
)
RETURNS BOOLEAN
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  affected_rows INTEGER;
BEGIN
  UPDATE public.notifications
  SET read = is_read
  WHERE id = notification_id
  AND (user_id = auth.uid() OR user_id IS NULL);
  
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  RETURN affected_rows > 0;
END;
$$;
