// ── AR Cloud Server ──────────────────────────────────────────────────────────
// Express API + Supabase backend for storing and serving AR projects
// ─────────────────────────────────────────────────────────────────────────────

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Supabase client ──────────────────────────────────────────────────────────
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY  // use service key (server-side only)
);

const BUCKET = 'ar-assets';

// ── Middleware ───────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Multer: store uploads in memory so we can pipe them to Supabase Storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 500 * 1024 * 1024 } // 500 MB per file
});

// ── Serve static files (creator.html / viewer.html) ─────────────────────────
// In Docker: creator.html and viewer.html are copied to /app alongside index.js
app.use(express.static(path.join(__dirname)));

// ── Health check ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

// ── LIST all projects ─────────────────────────────────────────────────────────
// GET /api/projects
app.get('/api/projects', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('projects')
      .select('id, name, mode, layer_count, has_audio, created_at, thumbnail_url')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ projects: data });
  } catch (err) {
    console.error('List projects error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── GET single project ────────────────────────────────────────────────────────
// GET /api/projects/:id
app.get('/api/projects/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error || !data) return res.status(404).json({ error: 'Project not found' });
    res.json({ project: data });
  } catch (err) {
    console.error('Get project error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── SAVE new project ──────────────────────────────────────────────────────────
// POST /api/projects
// Form fields:
//   config        (JSON string) - the full AR config
//   triggerImage  (file)        - the trigger image file (optional, for thumbnail)
//   video_0, video_1 ...        - video files for each layer (in order)
//   audio                       - audio file (optional)
app.post('/api/projects',
  upload.fields([
    { name: 'triggerImage', maxCount: 1 },
    { name: 'audio', maxCount: 1 },
    // Accept up to 20 video layers
    ...Array.from({ length: 20 }, (_, i) => ({ name: `video_${i}`, maxCount: 1 }))
  ]),
  async (req, res) => {
    const projectId = uuidv4();

    try {
      // Parse config JSON
      if (!req.body.config) return res.status(400).json({ error: 'Missing config' });
      const config = JSON.parse(req.body.config);

      const folder = `projects/${projectId}`;
      const videoUrls = {}; // layer index → public URL

      // ── Upload videos ────────────────────────────────────────────────────
      for (let i = 0; i < 20; i++) {
        const key = `video_${i}`;
        const files = req.files[key];
        if (!files || files.length === 0) break;

        const file = files[0];
        const ext = path.extname(file.originalname) || '.mp4';
        const storagePath = `${folder}/video_${i}${ext}`;

        const { error: upErr } = await supabase.storage
          .from(BUCKET)
          .upload(storagePath, file.buffer, {
            contentType: file.mimetype,
            upsert: true
          });

        if (upErr) throw new Error(`Video ${i} upload failed: ${upErr.message}`);

        const { data: urlData } = supabase.storage
          .from(BUCKET)
          .getPublicUrl(storagePath);

        videoUrls[i] = urlData.publicUrl;
      }

      // ── Upload audio ──────────────────────────────────────────────────────
      let audioUrl = null;
      if (req.files.audio && req.files.audio[0]) {
        const audioFile = req.files.audio[0];
        const ext = path.extname(audioFile.originalname) || '.mp3';
        const storagePath = `${folder}/audio${ext}`;

        const { error: upErr } = await supabase.storage
          .from(BUCKET)
          .upload(storagePath, audioFile.buffer, {
            contentType: audioFile.mimetype,
            upsert: true
          });

        if (upErr) throw new Error(`Audio upload failed: ${upErr.message}`);

        const { data: urlData } = supabase.storage
          .from(BUCKET)
          .getPublicUrl(storagePath);

        audioUrl = urlData.publicUrl;
      }

      // ── Upload trigger image thumbnail ────────────────────────────────────
      let thumbnailUrl = null;
      if (req.files.triggerImage && req.files.triggerImage[0]) {
        const imgFile = req.files.triggerImage[0];
        const ext = path.extname(imgFile.originalname) || '.jpg';
        const storagePath = `${folder}/trigger${ext}`;

        const { error: upErr } = await supabase.storage
          .from(BUCKET)
          .upload(storagePath, imgFile.buffer, {
            contentType: imgFile.mimetype,
            upsert: true
          });

        if (!upErr) {
          const { data: urlData } = supabase.storage
            .from(BUCKET)
            .getPublicUrl(storagePath);
          thumbnailUrl = urlData.publicUrl;
        }
      }

      // ── Attach video URLs into config layers ──────────────────────────────
      config.layers = config.layers.map((layer, i) => ({
        ...layer,
        videoUrl: videoUrls[i] || null
      }));

      if (audioUrl) {
        config.audio = { ...config.audio, audioUrl };
      }

      // ── Insert into database ──────────────────────────────────────────────
      const { error: dbErr } = await supabase
        .from('projects')
        .insert({
          id: projectId,
          name: config.project?.name || 'Untitled',
          mode: config.mode || 'motion',
          layer_count: config.layers.length,
          has_audio: !!audioUrl,
          thumbnail_url: thumbnailUrl,
          config_json: config   // full config stored as JSONB
        });

      if (dbErr) throw new Error(`Database insert failed: ${dbErr.message}`);

      res.json({
        ok: true,
        projectId,
        viewerUrl: `/viewer.html?id=${projectId}`
      });

    } catch (err) {
      console.error('Save project error:', err);
      // Attempt cleanup of any uploaded files
      try {
        await supabase.storage.from(BUCKET).remove([`projects/${projectId}`]);
      } catch (_) {}
      res.status(500).json({ error: err.message });
    }
  }
);

// ── DELETE project ────────────────────────────────────────────────────────────
// DELETE /api/projects/:id
app.delete('/api/projects/:id', async (req, res) => {
  try {
    const projectId = req.params.id;

    // List and delete all files in the project folder
    const { data: files } = await supabase.storage
      .from(BUCKET)
      .list(`projects/${projectId}`);

    if (files && files.length > 0) {
      const paths = files.map(f => `projects/${projectId}/${f.name}`);
      await supabase.storage.from(BUCKET).remove(paths);
    }

    // Delete database record
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId);

    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    console.error('Delete project error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── Start server ──────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 AR Cloud Server running on port ${PORT}`);
  console.log(`   Local:   http://localhost:${PORT}`);
  console.log(`   Viewer:  http://localhost:${PORT}/viewer.html`);
  console.log(`   Creator: http://localhost:${PORT}/creator.html\n`);
});
