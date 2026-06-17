// scripts/copy-libs.js
// Runs after npm install — copies MindAR and Three.js to public/libs/
// Uses ES module approach: import maps + type="module" scripts

const fs   = require('fs');
const path = require('path');

const root    = path.join(__dirname, '..');
const libsDir = path.join(root, 'public', 'libs');

if (!fs.existsSync(libsDir)) fs.mkdirSync(libsDir, { recursive: true });

// ── Three.js (both UMD and ES module) ────────────────────────────────────
const threeFiles = [
  { src: 'node_modules/three/build/three.min.js',        dest: 'three.min.js' },
  { src: 'node_modules/three/build/three.module.min.js', dest: 'three.module.min.js' }
];
for (const { src, dest } of threeFiles) {
  const s = path.join(root, src), d = path.join(libsDir, dest);
  if (fs.existsSync(s)) {
    fs.copyFileSync(s, d);
    console.log(`✅ ${dest} (${Math.round(fs.statSync(d).size/1024)} KB)`);
  } else { console.warn(`⚠️  Not found: ${s}`); }
}

// ── CSS3DRenderer (needed by mindar-image-three.prod.js) ─────────────────
const r3Dir = path.join(libsDir, 'renderers');
if (!fs.existsSync(r3Dir)) fs.mkdirSync(r3Dir, { recursive: true });
const css3Src = path.join(root, 'node_modules/three/examples/jsm/renderers/CSS3DRenderer.js');
const css3Dst = path.join(r3Dir, 'CSS3DRenderer.js');
if (fs.existsSync(css3Src)) {
  // Rewrite its internal imports to use import-mapped 'three'
  let code = fs.readFileSync(css3Src, 'utf8');
  fs.writeFileSync(css3Dst, code);
  console.log(`✅ renderers/CSS3DRenderer.js`);
}

// ── MindAR dist (all chunk files) ────────────────────────────────────────
const mindArSrc = path.join(root, 'node_modules/mind-ar/dist');
if (fs.existsSync(mindArSrc)) {
  const files = fs.readdirSync(mindArSrc);
  let count = 0;
  for (const f of files) {
    const s = path.join(mindArSrc, f), d = path.join(libsDir, f);
    fs.copyFileSync(s, d);
    count++;
  }
  console.log(`✅ MindAR dist: ${count} files copied`);
} else { console.warn('⚠️  mind-ar dist not found'); }

console.log('🎉 Libraries ready in public/libs/');
