
-- Create status enum for content calendar
CREATE TYPE public.calendar_status AS ENUM ('draft', 'in_progress', 'ready', 'published', 'scheduled');

-- Create content_calendar table
CREATE TABLE public.content_calendar (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  target_keyword TEXT NOT NULL,
  keywords TEXT[] DEFAULT '{}'::TEXT[],
  content_brief TEXT,
  status calendar_status NOT NULL DEFAULT 'draft',
  scheduled_date DATE NOT NULL,
  persona TEXT,
  tone TEXT,
  content_goal TEXT,
  audit_score INTEGER,
  audit_recommendations JSONB,
  article_id UUID REFERENCES public.articles(id) ON DELETE SET NULL,
  frequency TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.content_calendar ENABLE ROW LEVEL SECURITY;

-- Public access policies (matching existing pattern)
CREATE POLICY "Anyone can view calendar items" ON public.content_calendar FOR SELECT USING (true);
CREATE POLICY "Anyone can create calendar items" ON public.content_calendar FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update calendar items" ON public.content_calendar FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete calendar items" ON public.content_calendar FOR DELETE USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_content_calendar_updated_at
  BEFORE UPDATE ON public.content_calendar
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Index for common queries
CREATE INDEX idx_content_calendar_status ON public.content_calendar(status);
CREATE INDEX idx_content_calendar_scheduled ON public.content_calendar(scheduled_date);
