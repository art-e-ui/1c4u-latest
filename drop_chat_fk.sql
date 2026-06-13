-- Drop foreign key constraint on customer_id in reseller_customer_chat_sessions
-- to allow guest and unregistered/anonymous customers to start support chats.
ALTER TABLE public.reseller_customer_chat_sessions 
DROP CONSTRAINT IF EXISTS reseller_customer_chat_sessions_customer_id_fkey;
