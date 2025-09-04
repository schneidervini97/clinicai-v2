-- Enable Supabase Realtime for WhatsApp Chat Tables
-- Run this SQL in Supabase Dashboard → SQL Editor

-- Add WhatsApp tables to the realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE whatsapp_connections;
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- Verify the tables have been added to the publication
SELECT 
    schemaname,
    tablename
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
AND schemaname = 'public'
ORDER BY tablename;

-- Expected output should include:
-- conversations
-- messages  
-- whatsapp_connections