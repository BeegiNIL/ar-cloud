// pages/api/projects/index.js
// GET  /api/projects  → list all projects (summary)
// POST /api/projects  → save a new project (receives JSON with URLs)

import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export const config = {
  api: { bodyParser: { sizeLimit: '10mb' } }
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // ── GET all projects ──────────────────────────────────────────────────────
  if (req.method === 'GET') {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, mode, layer_count, has_audio, thumbnail_url, created_at, config_json')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Return a version hash so the viewer can detect changes
      const version = data.map(p => p.id).join(',');
      res.json({ projects: data, version });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
    return;
  }

  // ── POST save project ─────────────────────────────────────────────────────
  if (req.method === 'POST') {
    const { config: cfg, triggerImageUrl, videoUrls, audioUrl, _projectId } = req.body;
    if (!cfg) return res.status(400).json({ error: 'Missing config' });

    const projectId = _projectId || uuidv4();

    try {
      // Attach cloud URLs into config layers
      const layers = (cfg.layers || []).map((layer, i) => ({
        ...layer,
        videoUrl: videoUrls?.[i] || null
      }));

      const fullConfig = {
        ...cfg,
        layers,
        triggerImageUrl,    // used by universal viewer to recompile targets
        audio: audioUrl ? { ...cfg.audio, audioUrl } : cfg.audio
      };

      const { error: dbErr } = await supabase
        .from('projects')
        .insert({
          id: projectId,
          name: cfg.project?.name || 'Untitled',
          mode: cfg.mode || 'ar',
          layer_count: layers.length,
          has_audio: !!audioUrl,
          thumbnail_url: triggerImageUrl || null,
          config_json: fullConfig
        });

      if (dbErr) throw new Error(dbErr.message);

      res.json({
        ok: true,
        projectId,
        viewerUrl: `${process.env.NEXT_PUBLIC_BASE_URL || ''}/viewer?id=${projectId}`,
        universalViewerUrl: `${process.env.NEXT_PUBLIC_BASE_URL || ''}/viewer`
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
    return;
  }

  res.status(405).end();
}
