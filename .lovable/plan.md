

## Plan: Riset Keyword Potential Page

### Approach
Build a keyword research tool using **free APIs already available** in the project:

1. **Google Autocomplete/Suggest API** (completely free, no API key) -- to get real keyword suggestions from Google
2. **Lovable AI Gateway** (already configured with `LOVABLE_API_KEY`) -- to analyze keyword potential, estimate search intent, competition level, and generate LSI variations
3. **Firecrawl** (already connected) -- to scrape SERP results for competitor analysis on specific keywords

### Features
- Input a seed keyword and get Google autocomplete suggestions
- AI-powered analysis: search intent, estimated competition, content opportunity score
- Related keyword clusters with long-tail variations
- SERP competitor preview (top results for the keyword via Firecrawl)
- Export keyword list to CSV

### Changes

#### 1. New Edge Function: `supabase/functions/keyword-research/index.ts`
- Calls Google Suggest API (`https://suggestqueries.google.com/complete/search`) to get real autocomplete data
- Calls Firecrawl to scrape Google SERP for the keyword (top 10 results metadata)
- Sends all data to Lovable AI Gateway (Gemini) to produce:
  - Search intent classification (informational/transactional/navigational)
  - Estimated competition level (low/medium/high)
  - Content opportunity score
  - Keyword clusters grouped by topic
  - Long-tail keyword suggestions with estimated potential

#### 2. New Page: `src/pages/KeywordResearch.tsx`
- Input field for seed keyword + language selector (ID/EN)
- Results displayed in tabs:
  - **Keyword Suggestions**: Google autocomplete + AI-generated variations with potential scores
  - **SERP Analysis**: Top competing pages with title, URL, and content gaps
  - **Keyword Clusters**: Grouped related keywords for content planning
- Export to CSV button
- Loading states and error handling

#### 3. Update `src/App.tsx`
- Add route `/keyword-research`

#### 4. Update `src/pages/LandingPage.tsx`
- Add "Riset Keyword Potential" card to the menu grid (3-column layout)

#### 5. Update `supabase/config.toml`
- Register `keyword-research` function with `verify_jwt = false`

### Technical Details
- Google Suggest API endpoint: `https://suggestqueries.google.com/complete/search?client=firefox&q={keyword}&hl={lang}` -- returns JSON array, free, no auth
- Firecrawl scrapes Google search results page for competitor data
- AI analyzes combined data to score keywords and classify intent
- No additional API keys or connectors needed

