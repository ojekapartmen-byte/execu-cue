-- Enable RLS on article_categories
ALTER TABLE public.article_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view article categories"
ON public.article_categories FOR SELECT
USING (true);

CREATE POLICY "Anyone can create article categories"
ON public.article_categories FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can update article categories"
ON public.article_categories FOR UPDATE
USING (true);

CREATE POLICY "Anyone can delete article categories"
ON public.article_categories FOR DELETE
USING (true);

-- Enable RLS on content_calendar
ALTER TABLE public.content_calendar ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view content calendar"
ON public.content_calendar FOR SELECT
USING (true);

CREATE POLICY "Anyone can create content calendar"
ON public.content_calendar FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can update content calendar"
ON public.content_calendar FOR UPDATE
USING (true);

CREATE POLICY "Anyone can delete content calendar"
ON public.content_calendar FOR DELETE
USING (true);