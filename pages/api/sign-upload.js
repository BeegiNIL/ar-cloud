// pages/api/sign-upload.js
// Generates a short-lived signed URL so the browser can upload
// files directly to Supabase Storage without exposing the service key.

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { path: filePath } = req.body;
  if (!filePath) return res.status(400).json({ error: 'Missing path' });

  try {
    const { data, error } = await supabase.storage
      .from('ar-assets')
      .createSignedUploadUrl(filePath);

    if (error) throw error;

    // Also get the future public URL
    const { data: pubData } = supabase.storage
      .from('ar-assets')
      .getPublicUrl(filePath);

    res.json({ signedUrl: data.signedUrl, publicUrl: pubData.publicUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
