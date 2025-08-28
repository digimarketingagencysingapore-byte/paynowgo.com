-- Create the missing display_states_by_key view
-- This view joins display_states with terminals to allow querying by device_key

CREATE OR REPLACE VIEW display_states_by_key AS
SELECT 
  ds.device_id,
  ds.tenant_id,
  ds.state,
  ds.order_id,
  ds.amount,
  ds.reference,
  ds.qr_svg,
  ds.expires_at,
  ds.updated_at,
  t.device_key,
  t.name as terminal_name,
  t.last_seen_at as terminal_last_seen_at
FROM display_states ds
JOIN terminals t ON ds.device_id = t.id;

-- Add comment explaining the view
COMMENT ON VIEW display_states_by_key IS 'View that joins display_states with terminals to allow querying display state by device_key instead of UUID';