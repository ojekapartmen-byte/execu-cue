

## Plan: Add Apply Buttons to ALL Audit Items + Apply All Automation

### Problem
Currently, "Terapkan Rekomendasi" and "Lihat Hasil Editan" buttons only appear when BOTH `currentContent` and `suggestedContent` exist. Many audit items with recommendations lack these fields, so users cannot apply fixes.

### Changes

#### 1. `src/components/SeoAuditResult.tsx`
- **Move action buttons outside** the `(item.currentContent || item.suggestedContent)` conditional block so they appear for ALL items that have `suggestedContent` (even without `currentContent`)
- **Add "Terapkan Semua Rekomendasi" (Apply All)** button at the top of the Detailed Audit Results card, which iterates through all categories/items and applies every available `suggestedContent` replacement in one click
- Show the "Lihat Hasil Editan" button globally at the top when any items have been applied
- Add `onApplyAll` callback prop

#### 2. `src/pages/SeoAudit.tsx`
- Add `handleApplyAll` function that loops through all audit result categories and items, applying every `suggestedContent` replacement sequentially to the content
- Pass it down to `SeoAuditResult` as `onApplyAll`
- Update tracking to mark all items as applied

#### 3. Backend (Edge Function)
- No changes needed — the AI already generates `currentContent` and `suggestedContent` fields. The frontend just needs to show buttons for all items that have `suggestedContent`.

### Technical Details
- Items with only `suggestedContent` (no `currentContent`): the "Terapkan" button will append/insert the suggested content
- Items with both fields: string replacement as currently implemented
- "Apply All" iterates `result.categories` → `items`, calling `handleApplyRecommendation` for each item with available suggested content
- All applied items tracked in the `appliedItems` Set for UI state

