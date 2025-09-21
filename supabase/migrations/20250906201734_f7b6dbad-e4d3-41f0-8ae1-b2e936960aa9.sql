-- Add conversation_id column to messages table if it doesn't exist
DO $$ 
BEGIN
    -- Check if conversation_id column already exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'messages' 
        AND column_name = 'conversation_id'
    ) THEN
        -- Add the conversation_id column as nullable
        ALTER TABLE public.messages 
        ADD COLUMN conversation_id uuid;
        
        -- Add foreign key constraint with CASCADE delete
        ALTER TABLE public.messages 
        ADD CONSTRAINT fk_messages_conversation_id 
        FOREIGN KEY (conversation_id) 
        REFERENCES public.conversations(id) 
        ON DELETE CASCADE;
        
        -- Create index for better query performance
        CREATE INDEX idx_messages_conversation_id 
        ON public.messages(conversation_id);
        
        RAISE NOTICE 'Successfully added conversation_id column to messages table';
    ELSE
        RAISE NOTICE 'conversation_id column already exists in messages table';
    END IF;
END $$;