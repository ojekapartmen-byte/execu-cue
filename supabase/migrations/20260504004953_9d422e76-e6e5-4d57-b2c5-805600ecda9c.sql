
-- Drop permissive public policies on articles
DROP POLICY IF EXISTS "Anyone can create articles" ON public.articles;
DROP POLICY IF EXISTS "Anyone can delete articles" ON public.articles;
DROP POLICY IF EXISTS "Anyone can update articles" ON public.articles;
DROP POLICY IF EXISTS "Anyone can view articles" ON public.articles;

-- Create authenticated-only policies on articles
CREATE POLICY "Authenticated users can view articles" ON public.articles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can create articles" ON public.articles FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update articles" ON public.articles FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete articles" ON public.articles FOR DELETE TO authenticated USING (true);

-- Drop permissive public policies on content_calendar
DROP POLICY IF EXISTS "Anyone can create content calendar" ON public.content_calendar;
DROP POLICY IF EXISTS "Anyone can delete content calendar" ON public.content_calendar;
DROP POLICY IF EXISTS "Anyone can update content calendar" ON public.content_calendar;
DROP POLICY IF EXISTS "Anyone can view content calendar" ON public.content_calendar;

-- Create authenticated-only policies on content_calendar
CREATE POLICY "Authenticated users can view content_calendar" ON public.content_calendar FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can create content_calendar" ON public.content_calendar FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update content_calendar" ON public.content_calendar FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete content_calendar" ON public.content_calendar FOR DELETE TO authenticated USING (true);

-- Drop permissive public policies on article_categories
DROP POLICY IF EXISTS "Anyone can create article categories" ON public.article_categories;
DROP POLICY IF EXISTS "Anyone can delete article categories" ON public.article_categories;
DROP POLICY IF EXISTS "Anyone can update article categories" ON public.article_categories;
DROP POLICY IF EXISTS "Anyone can view article categories" ON public.article_categories;

-- Create authenticated-only policies on article_categories
CREATE POLICY "Authenticated users can view article_categories" ON public.article_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can create article_categories" ON public.article_categories FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update article_categories" ON public.article_categories FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete article_categories" ON public.article_categories FOR DELETE TO authenticated USING (true);
