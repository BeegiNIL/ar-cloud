-- Run this in your Supabase SQL Editor (supabase.com → your project → SQL Editor)
-- This creates the projects table used by the AR Cloud Server

CREATE TABLE IF NOT EXISTS projects (
  id            UUID PRIMARY KEY,
  name          TEXT NOT NULL DEFAULT 'Untitled',
  mode          TEXT NOT NULL DEFAULT 'motion',  -- 'ar' or 'motion'
  layer_count   INTEGER DEFAULT 0,
  has_audio     BOOLEAN DEFAULT FALSE,
  thumbnail_url TEXT,
  config_json   JSONB NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Allow public read access (projects are public)
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read" ON projects
  FOR SELECT USING (true);

CREATE POLICY "Server insert" ON projects
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Server delete" ON projects
  FOR DELETE USING (true);
