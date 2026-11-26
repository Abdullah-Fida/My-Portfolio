import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Check, Copy, Fingerprint, Play, Workflow, X } from 'lucide-react';
import { Github, Linkedin } from './BrandIcons';
import LiveProjectPreview from './LiveProjectPreview';
import { categoryLabels, profile } from './content';
import type { Project } from './content';

function useNativeDialog(onClose: () => void) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const focused = document.activeElement as HTMLElement | null;
    dialog.showModal();
    const cancel = (e: Event) => { e.preventDefault(); onClose(); };
    dialog.addEventListener('cancel', cancel);
    return () => { dialog.removeEventListener('cancel', cancel); dialog.close(); focused?.focus(); };
  }, [onClose]);
  return ref;
}

function GymDemo() {
  const [membership, setMembership] = useState<'active' | 'expired'>('active');
  const [scan, setScan] = useState<'idle' | 'scanning' | 'granted' | 'denied'>('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  function run() {
    setScan('scanning');
    timer.current = setTimeout(() => setScan(membership === 'active' ? 'granted' : 'denied'), 1100);
  }
  const message = scan === 'idle' ? 'Choose a membership state and try a check-in.'
    : scan === 'scanning' ? 'Checking membership and access permission…'
    : scan === 'granted' ? 'Access granted. Door unlocked. Check-in recorded.'
    : 'Membership expired. Access denied. Renewal message queued.';
  return <div className="demo">
    <div className="demo-head"><Fingerprint size={18} /><span>Try the access flow</span><small>Interactive walkthrough</small></div>
    <div className="demo-row">
      <label className="demo-select">Membership
        <select value={membership} disabled={scan === 'scanning'} onChange={e => { setMembership(e.target.value as 'active' | 'expired'); setScan('idle'); }}>
          <option value="active">Active</option><option value="expired">Expired</option>
        </select>
      </label>
      <button className={`btn btn-solid scan-btn ${scan}`} disabled={scan === 'scanning'} onClick={run}><Fingerprint size={17} />{scan === 'scanning' ? 'Checking…' : 'Scan fingerprint'}</button>
    </div>
    <p className={`demo-result ${scan}`} aria-live="polite">{message}</p>
  </div>;
}

function AutomationDemo({ type }: { type: 'news' | 'social' | 'clips' }) {
  const steps = type === 'news' ? ['Create article', 'Prepare content', 'Publish article']
    : type === 'clips' ? ['Watch stream', 'Find highlight', 'Cut clip', 'Publish clip']
    : ['Create post', 'Prepare content', 'Publish post'];
  const [step, setStep] = useState(-1);
  const [running, setRunning] = useState(false);
  useEffect(() => {
    if (!running) return;
    const timer = setTimeout(() => { if (step < steps.length - 1) setStep(step + 1); else setRunning(false); }, 800);
    return () => clearTimeout(timer);
  }, [running, step, steps.length]);
  return <div className="demo">
    <div className="demo-head"><Workflow size={18} /><span>Follow the workflow</span><small>Interactive walkthrough</small></div>
    <ol className="demo-steps">{steps.map((s, i) => <li key={s} className={i <= step ? 'done' : ''}><span>{i <= step ? <Check size={14} /> : String(i + 1).padStart(2, '0')}</span>{s}</li>)}</ol>
    <div className="demo-row">
      <button className="btn btn-solid" disabled={running} onClick={() => { setStep(0); setRunning(true); }}><Play size={15} />{running ? 'Running…' : step >= 0 ? 'Run it again' : 'Preview the flow'}</button>
      <small aria-live="polite">{!running && step === steps.length - 1 ? 'Done. Nothing was actually published.' : 'A local preview of the workflow.'}</small>
    </div>
  </div>;
}

export function ProjectModal({ project, onClose, onContact }: { project: Project; onClose: () => void; onContact: () => void }) {
  const ref = useNativeDialog(onClose);
  const demo = project.visual === 'gym' ? <GymDemo /> : ['news', 'social', 'clips'].includes(project.visual) ? <AutomationDemo type={project.visual as 'news' | 'social' | 'clips'} /> : null;
  return <dialog ref={ref} className="modal modal-project" data-lenis-prevent onClick={e => { if (e.target === e.currentTarget) onClose(); }} aria-labelledby="project-title">
    <div className="modal-inner">
      <button className="modal-close" onClick={onClose} aria-label="Close project"><X size={20} /></button>
      {project.url && <div className="modal-preview"><LiveProjectPreview project={project} key={project.id} /></div>}
      <div className="modal-body">
        <div className="modal-meta"><span>{categoryLabels[project.category]}</span><span>{project.status}</span></div>
        <h2 id="project-title">{project.title}</h2>
        <p className="modal-lede">{project.description}</p>
        <p>{project.summary}</p>
        <dl className="modal-role"><dt>My role</dt><dd>{project.role}</dd></dl>
        <h3>What went into it</h3>
        <ul className="modal-features">{project.features.map(f => <li key={f}><Check size={16} />{f}</li>)}</ul>
        {demo}
        <div className="modal-actions">
          {project.url && <a className="btn btn-accent" href={project.url} target="_blank" rel="noreferrer">Visit live site <ArrowUpRight size={16} /></a>}
          {project.secondUrl && <a className="btn btn-line" href={project.secondUrl} target="_blank" rel="noreferrer">{project.secondLabel} <ArrowUpRight size={16} /></a>}
          <button className={`btn ${project.url ? 'btn-ghost' : 'btn-accent'}`} onClick={onContact}>Build something like this</button>
        </div>
      </div>
    </div>
  </dialog>;
}

export function ContactModal({ onClose }: { onClose: () => void }) {
  const ref = useNativeDialog(onClose);
  const [service, setService] = useState('Shopify store');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const brief = `Hi Abdullah! I'd like to talk about a ${service.toLowerCase()} project.\n\n${message}\n\nReply to: ${email}`;
  async function copyBrief() {
    try { await navigator.clipboard.writeText(brief); setCopied(true); setCopyError(false); }
    catch { setCopyError(true); }
  }
  const reset = () => setCopied(false);
  return <dialog ref={ref} className="modal modal-contact" data-lenis-prevent onClick={e => { if (e.target === e.currentTarget) onClose(); }} aria-labelledby="contact-title">
    <div className="modal-inner">
      <button className="modal-close" onClick={onClose} aria-label="Close"><X size={20} /></button>
      <div className="modal-body">
        <span className="label">Start a project</span>
        <h2 id="contact-title">What's on your mind?</h2>
        <p>A new store, a custom system, or a repetitive task you'd love to hand over.</p>
        <div className="contact-direct">
          <a className="btn btn-solid" href={profile.linkedin} target="_blank" rel="noreferrer"><Linkedin size={17} />Message me on LinkedIn</a>
          <a className="btn btn-line" href={profile.github} target="_blank" rel="noreferrer"><Github size={17} />GitHub</a>
        </div>
        <div className="divider"><span>or put a brief together</span></div>
        <form onSubmit={e => {
          e.preventDefault();
          if (profile.email) window.location.href = `mailto:${profile.email}?subject=${encodeURIComponent(`Let's build: ${service}`)}&body=${encodeURIComponent(brief)}`;
          else void copyBrief();
        }}>
          <div className="chips" role="radiogroup" aria-label="Project type">
            {['Shopify store', 'Custom web application', 'AI agent or automation', 'Something else'].map(s =>
              <button type="button" role="radio" aria-checked={service === s} key={s} className={service === s ? 'active' : ''} onClick={() => { setService(s); reset(); }}>{s}</button>)}
          </div>
          <label>Your email<input type="email" autoComplete="email" value={email} onChange={e => { setEmail(e.target.value); reset(); }} placeholder="you@company.com" required /></label>
          <label>About the project<textarea value={message} onChange={e => { setMessage(e.target.value); reset(); }} placeholder="Here's what I have in mind…" rows={4} required /></label>
          <button className="btn btn-accent" type="submit">{profile.email ? 'Open email with my brief' : copied ? <><Check size={17} /> Brief copied</> : <><Copy size={17} /> Copy my project brief</>}</button>
          <p className="form-help" role="status">{copyError ? 'Copy the text below to keep your brief.' : copied ? 'On your clipboard. Paste it into a LinkedIn message. Nothing has been sent.' : profile.email ? 'Opens your email app so you can review before sending.' : 'Copy your brief, then send it over on LinkedIn.'}</p>
          {copyError && <textarea className="copy-fallback" readOnly value={brief} aria-label="Your project brief" />}
        </form>
      </div>
    </div>
  </dialog>;
}
