import { useEffect, useState } from 'react';
import { Monitor, Smartphone } from 'lucide-react';
import type { Project } from './content';
import manifest from './data/site-previews.json';

export function projectPreviews(id: string) {
  const slugs = id === 'the-tcg-plug' ? ['tcg-nl', 'tcg-shop'] : [id];
  return slugs.flatMap(slug => manifest.projects.filter(asset => asset.slug === slug));
}

export default function LiveProjectPreview({ project }: { project: Project }) {
  const previews = projectPreviews(project.id);
  const [site, setSite] = useState(0);
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [interactive, setInteractive] = useState(true);
  const [loading, setLoading] = useState(true);
  const preview = previews[site] || previews[0];
  const live = !!preview?.embedAllowed && interactive;
  useEffect(() => {
    if (!live || !loading) return;
    const timer = setTimeout(() => { setInteractive(false); setLoading(false); }, 12000);
    return () => clearTimeout(timer);
  }, [live, loading, preview?.url, device]);
  if (!preview) return null;
  return <section className="live-project-preview" aria-label={`${project.title} website preview`}>
    <div className="preview-topbar"><div className="preview-address"><Monitor size={15} /><span>{new URL(preview.url).hostname}</span></div><a href={preview.url} target="_blank" rel="noreferrer">Open live site</a></div>
    <div className="preview-controls">{previews.length > 1 && <div className="preview-sites" role="group" aria-label="Choose a storefront">{previews.map((entry, index) => <button className={site === index ? 'active' : ''} aria-pressed={site === index} key={entry.slug} onClick={() => { setSite(index); setLoading(true); }}>{entry.slug === 'tcg-nl' ? 'Retail store' : 'Live shop'}</button>)}</div>}<div className="preview-device" role="group" aria-label="Preview device"><button className={device === 'desktop' ? 'active' : ''} aria-pressed={device === 'desktop'} onClick={() => { setDevice('desktop'); setLoading(true); }}><Monitor size={15} />Desktop</button><button className={device === 'mobile' ? 'active' : ''} aria-pressed={device === 'mobile'} onClick={() => { setDevice('mobile'); setLoading(true); }}><Smartphone size={15} />Phone</button></div>{preview.embedAllowed && <button className="preview-live-toggle" onClick={() => { setInteractive(!interactive); setLoading(true); }}>{interactive ? 'Show capture' : 'Use live preview'}</button>}</div>
    <div className={`preview-viewport ${device} ${live ? 'is-live' : 'is-capture'}`}>
      {live ? <div className="preview-iframe-wrap">{loading && <span className="preview-loading" role="status">Opening live website…</span>}<iframe key={`${preview.url}-${device}`} title={`Live ${project.title} website preview`} src={preview.url} className="preview-iframe" loading="lazy" referrerPolicy="no-referrer" sandbox="allow-scripts allow-same-origin allow-forms allow-popups" onLoad={() => setLoading(false)} onError={() => { setInteractive(false); setLoading(false); }} /></div> : <img src={preview[device]} alt={`Actual ${device === 'mobile' ? 'phone' : 'desktop'} capture of ${project.title}'s live website`} width={device === 'mobile' ? 390 : 1280} height={device === 'mobile' ? 844 : 800} />}
    </div>
    <div className="preview-caption"><span>{live ? 'Live website. You can interact with this preview.' : preview.embedAllowed ? 'Captured from the live website.' : 'Captured from the live site. Open it in a new tab to explore.'}</span>{!live && <span>{new Date(preview.capturedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>}</div>
  </section>;
}
