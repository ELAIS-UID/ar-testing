-- Add title column to existing notes table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'notes' AND column_name = 'title'
  ) THEN
    ALTER TABLE notes ADD COLUMN title TEXT NOT NULL DEFAULT 'Notepad';
  END IF;
END $$;

-- Make content nullable if it isn't already
ALTER TABLE notes ALTER COLUMN content DROP NOT NULL;
