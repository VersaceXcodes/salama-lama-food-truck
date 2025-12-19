-- Migration: Add homepage_sections table for Homepage Category Sections feature
-- This table stores configuration for which categories to show on the landing page

-- Create the homepage_sections table
CREATE TABLE IF NOT EXISTS homepage_sections (
    section_id TEXT PRIMARY KEY,
    category_id TEXT NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER NOT NULL DEFAULT 0,
    item_limit INTEGER NOT NULL DEFAULT 6,
    display_mode TEXT NOT NULL DEFAULT 'auto_popular',  -- 'auto_popular', 'auto_newest', 'manual'
    selected_item_ids JSONB,  -- Array of item_ids when display_mode is 'manual'
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (category_id) REFERENCES categories(category_id) ON DELETE CASCADE
);

-- Create unique constraint on category_id (one section per category)
CREATE UNIQUE INDEX IF NOT EXISTS idx_homepage_sections_category_id ON homepage_sections(category_id);

-- Create index for ordering
CREATE INDEX IF NOT EXISTS idx_homepage_sections_sort_order ON homepage_sections(sort_order);

-- Create index for enabled sections
CREATE INDEX IF NOT EXISTS idx_homepage_sections_enabled ON homepage_sections(enabled);

-- Seed initial homepage sections using existing categories
-- This adds Hot Drinks and Pastries as default homepage sections
INSERT INTO homepage_sections (section_id, category_id, enabled, sort_order, item_limit, display_mode, selected_item_ids, created_at, updated_at)
SELECT 
    'hpsec_' || substr(md5(random()::text), 1, 16),
    category_id,
    true,
    CASE 
        WHEN name = 'Hot Drinks' THEN 1
        WHEN name = 'Pastries' THEN 2
        WHEN name = 'Sandwiches' THEN 3
        ELSE sort_order + 10
    END,
    6,
    'auto_popular',
    NULL,
    NOW()::TEXT,
    NOW()::TEXT
FROM categories
WHERE name IN ('Hot Drinks', 'Pastries', 'Sandwiches')
ON CONFLICT (category_id) DO NOTHING;
