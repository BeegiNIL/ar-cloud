// pages/api/projects/[id].js
// GET    /api/projects/:id  → get full project config
// DELETE /api/projects/:id  → delete project + all storage files

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { id } = req.query;

  // ── GET single project ────────────────────────────────────────────────────
  if (req.method === 'GET') {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !data) return res.status(404).json({ error: 'Not found' });
      res.json({ project: data });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
    return;
  }

  // ── DELETE project ────────────────────────────────────────────────────────
  if (req.method === 'DELETE') {
    try {
      // Remove all storage files for this project
      const { data: files } = await supabase.storage
        .from('ar-assets')
        .list(`projects/${id}`);

      if (files && files.length > 0) {
        const paths = files.map(f => `projects/${id}/${f.name}`);
        await supabase.storage.from('ar-assets').remove(paths);
      }

      // Remove DB record
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id);

      if (error) throw error;
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
    return;
  }

  res.status(405).end();
}
