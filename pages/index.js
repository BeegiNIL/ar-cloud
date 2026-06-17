import { useState, useEffect } from 'react';
import Head from 'next/head';
import styles from '../styles/Gallery.module.css';

export default function Gallery() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);

  useEffect(() => { fetchProjects(); }, []);

  async function fetchProjects() {
    setLoading(true);
    try {
      const res = await fetch('/api/projects');
      const data = await res.json();
      setProjects(data.projects || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  async function deleteProject(id, name) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    setDeleting(id);
    await fetch(`/api/projects/${id}`, { method: 'DELETE' });
    setProjects(prev => prev.filter(p => p.id !== id));
    setDeleting(null);
  }

  const viewerUrl = '/viewer';
  const creatorUrl = '/creator.html';

  return (
    <>
      <Head>
        <title>AR Studio — Gallery</title>
        <meta name="description" content="Your saved AR projects" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </Head>

      <div className={styles.page}>
        {/* Header */}
        <header className={styles.header}>
          <div className={styles.logo}>
            <span className={styles.logoIcon}>⬡</span>
            AR Studio
          </div>
          <nav className={styles.nav}>
            <a href={creatorUrl} className={styles.navBtn}>+ Create</a>
            <a href={viewerUrl} className={`${styles.navBtn} ${styles.navBtnAccent}`}>
              📱 Universal Viewer
            </a>
          </nav>
        </header>

        <main className={styles.main}>
          {/* Hero */}
          <div className={styles.hero}>
            <h1 className={styles.heroTitle}>Your AR Projects</h1>
            <p className={styles.heroSub}>
              Point your phone camera at any artwork to trigger its AR experience
            </p>
            <a href={viewerUrl} className={styles.heroBtn}>
              Open Universal Viewer →
            </a>
          </div>

          {/* Project Grid */}
          {loading ? (
            <div className={styles.loadWrap}>
              <div className={styles.spinner}></div>
              <p>Loading projects…</p>
            </div>
          ) : projects.length === 0 ? (
            <div className={styles.empty}>
              <div className={styles.emptyIcon}>🎨</div>
              <h2>No projects yet</h2>
              <p>Create your first AR experience in the Creator</p>
              <a href={creatorUrl} className={styles.heroBtn}>Open Creator</a>
            </div>
          ) : (
            <div className={styles.grid}>
              {projects.map(p => (
                <div key={p.id} className={styles.card}>
                  {/* Thumbnail */}
                  <div className={styles.thumb}>
                    {p.thumbnail_url
                      ? <img src={p.thumbnail_url} alt={p.name} />
                      : <div className={styles.thumbPlaceholder}>🖼️</div>
                    }
                    <div className={styles.thumbOverlay}>
                      <span className={styles.modeBadge}>{p.mode?.toUpperCase() || 'AR'}</span>
                    </div>
                  </div>

                  {/* Info */}
                  <div className={styles.cardBody}>
                    <h3 className={styles.cardName}>{p.name || 'Untitled'}</h3>
                    <div className={styles.cardMeta}>
                      <span>🎬 {p.layer_count} layer{p.layer_count !== 1 ? 's' : ''}</span>
                      {p.has_audio && <span>🔊 Audio</span>}
                      <span>📅 {new Date(p.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className={styles.cardActions}>
                    <button
                      className={styles.deleteBtn}
                      onClick={() => deleteProject(p.id, p.name)}
                      disabled={deleting === p.id}
                    >
                      {deleting === p.id ? '…' : '🗑'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>

        {/* Footer */}
        <footer className={styles.footer}>
          <span>AR Studio</span>
          <span>·</span>
          <span>{projects.length} project{projects.length !== 1 ? 's' : ''} saved</span>
        </footer>
      </div>
    </>
  );
}
