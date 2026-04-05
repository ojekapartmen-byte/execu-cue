
## Plan: End-to-End SEO Content Marketing OS

### Phase 1: Database & Backend (This Message)

#### 1. Create `content_calendar` Supabase Table
- Fields: `title`, `target_keyword`, `keywords` (array), `content_brief`, `status` (enum: draft/in_progress/ready/published), `scheduled_date`, `persona`, `tone`, `content_goal`, `audit_score`, `audit_recommendations` (jsonb), `article_id` (FK to articles), `frequency`
- RLS: public access (matching existing pattern)

#### 2. New Edge Function: `generate-calendar`
- Receives selected keywords, persona, content goal, frequency, tone
- Uses Lovable AI to generate a 1-month content calendar with titles, briefs, and scheduling
- Returns structured calendar items

### Phase 2: Frontend Pages

#### 3. Enhanced Keyword Research (`/keyword-research`)
- Add 4 tabs: **Competitor Research** (URL input, mock extraction), **Targeted Keyword** (existing seed keyword), **Google Trends** (mock trending), **User Intent & PAA** (AI-driven)
- Add "Add to Strategy" button on each keyword result → stores selected keywords in state/localStorage

#### 4. Content Calendar Page (`/content-calendar`)
- Receives selected keywords from Research
- Input form: Persona, Content Goal, Frequency, Tone of Voice
- AI generates 1-month calendar
- Table/Board view with: Date, Title, Target Keyword, Brief, Status
- CRUD operations on calendar items via Supabase

#### 5. Deep Integration Buttons
- **"Create Article"** button in calendar → passes title/keywords/brief to `/create-article`
- **"Run Audit"** button → triggers SEO audit, saves score back to calendar item
- **"Sync & Publish"** button → mock publish if audit score > 80

### Phase 3: Dashboard & Navigation

#### 6. Updated Landing Page Dashboard
- Linear workflow: Research → Strategy (Calendar) → Production (Article) → Audit → Distribution
- Visual flow indicators showing the pipeline
- Keep existing Navy/Gold/White aesthetic

### Implementation Order
1. Migration for `content_calendar` table
2. `generate-calendar` edge function
3. Enhanced KeywordResearch page with 4 tabs + "Add to Strategy"
4. ContentCalendar page with AI generation + table view
5. Integration buttons (Create Article, Run Audit, Publish)
6. Updated dashboard navigation

### Technical Notes
- Selected keywords stored in localStorage for cross-page transfer
- Calendar items linked to articles via `article_id` FK
- Audit results saved as JSONB on calendar items
- All UI in existing design system (semantic tokens)
