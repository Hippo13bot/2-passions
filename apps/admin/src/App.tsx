import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { LayoutDashboard, FileText, Images, Inbox, Users, Settings, LogOut, Plus, LockKeyhole, Menu, RefreshCw, Search, Pencil, CheckCircle2, AlertCircle, Activity, ImagePlus, Rss, FileUp } from 'lucide-react'
import { isSupabaseConfigured, supabase } from './lib/supabase'
import MediaLibrary from './components/MediaLibrary'
import ObservatoryManager from './components/ObservatoryManager'
import WatchCenter from './components/WatchCenter'
import DocumentCenter from './components/DocumentCenter'
import TeamAccess from './components/TeamAccess'
import BrandMark from './components/BrandMark'

type Role = 'administrator' | 'editor' | 'fact_checker' | 'moderator'
type Entity = { id: string; entity_type: string; slug: string; title: string; summary: string | null; body: string | null; territory: string | null; editorial_status: string; verification_status: string; event_date: string | null; event_status: string; updated_at: string }
type Source = { id: string; title: string; source_url: string | null; publisher: string | null; source_type: string | null; verification_status: string; created_at: string }
type Contribution = { id: string; contribution_type: string; message: string; source_url: string | null; contact_email: string | null; status: string; created_at: string }
type Profile = { id: string; display_name: string | null; role: Role; created_at: string }
type Section = 'Vue générale' | 'Dossiers & événements' | 'Documents & sources' | 'Centre documentaire' | 'Veille documentaire' | 'Contributions' | 'Équipe & accès' | 'Journal d’activité' | 'Médiathèque' | 'Observatoires' | 'Paramètres'
const sections: { label: Section; icon: typeof LayoutDashboard }[] = [
  { label: 'Vue générale', icon: LayoutDashboard }, { label: 'Dossiers & événements', icon: FileText },
  { label: 'Documents & sources', icon: Images }, { label: 'Centre documentaire', icon: FileUp }, { label: 'Veille documentaire', icon: Rss }, { label: 'Médiathèque', icon: ImagePlus }, { label: 'Observatoires', icon: Activity }, { label: 'Contributions', icon: Inbox },
  { label: 'Équipe & accès', icon: Users }, { label: 'Journal d’activité', icon: Settings }, { label: 'Paramètres', icon: LockKeyhole }
]
const emptyEntity = { entity_type: 'mobilisation', title: '', slug: '', summary: '', body: '', territory: '', event_date: '', editorial_status: 'draft', verification_status: 'unverified', event_status: 'confirmed' }
const statusLabel: Record<string,string> = { draft: 'Brouillon', review: 'À relire', published: 'Publié', archived: 'Archivé', rejected: 'Refusé', unverified: 'Non vérifié', single_source: 'Une source', cross_checked: 'Croisé', contested: 'Contesté', not_verifiable: 'Invérifiable', pending: 'En attente', in_review: 'En examen', accepted: 'Acceptée', withdrawn: 'Retirée' }
const roleLabel: Record<Role,string> = { administrator: 'Administrateur', editor: 'Éditeur', fact_checker: 'Vérificateur', moderator: 'Modérateur' }
const canEdit = (role: Role | null) => role === 'administrator' || role === 'editor'

export default function App() {
  const [active, setActive] = useState<Section>('Vue générale')
  const [menuOpen, setMenuOpen] = useState(false)
  const [session, setSession] = useState<any>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(false)
  const [entities, setEntities] = useState<Entity[]>([])
  const [sources, setSources] = useState<Source[]>([])
  const [contributions, setContributions] = useState<Contribution[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [audit, setAudit] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [entityForm, setEntityForm] = useState({ ...emptyEntity })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showEntityForm, setShowEntityForm] = useState(false)
  const [sourceForm, setSourceForm] = useState({ title: '', source_url: '', publisher: '', source_type: 'article', notes: '' })
  const [showSourceForm, setShowSourceForm] = useState(false)

  const loadProfile = useCallback(async (userId: string) => {
    if (!supabase) return
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
    if (error) { setMessage('Impossible de lire votre profil : ' + error.message); setProfile(null); return }
    setProfile(data as Profile | null)
  }, [])

  const loadData = useCallback(async () => {
    if (!supabase || !session?.user?.id || !profile) return
    setLoading(true)
    const [e, s, c, p, a] = await Promise.all([
      supabase.from('entities').select('*').order('updated_at', { ascending: false }).limit(200),
      profile.role === 'moderator' ? Promise.resolve({ data: [], error: null }) : supabase.from('sources').select('*').order('created_at', { ascending: false }).limit(200),
      ['administrator','moderator'].includes(profile.role) ? supabase.from('contributions').select('*').order('created_at', { ascending: false }).limit(200) : Promise.resolve({ data: [], error: null }),
      profile.role === 'administrator' ? supabase.from('profiles').select('*').order('created_at', { ascending: true }) : Promise.resolve({ data: [], error: null }),
      profile.role === 'administrator' ? supabase.from('audit_log').select('*').order('created_at', { ascending: false }).limit(100) : Promise.resolve({ data: [], error: null })
    ])
    if (e.error) setMessage('Lecture des dossiers impossible : ' + e.error.message); else setEntities((e.data || []) as Entity[])
    if (s.error) setMessage('Lecture des sources impossible : ' + s.error.message); else setSources((s.data || []) as Source[])
    if (c.error) setMessage('Lecture des contributions impossible : ' + c.error.message); else setContributions((c.data || []) as Contribution[])
    setProfiles((p.data || []) as Profile[])
    setAudit(a.data || [])
    setLoading(false)
  }, [session, profile])

  useEffect(() => {
    if (!supabase) return
    let mounted = true
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      setSession(data.session)
      if (data.session?.user) void loadProfile(data.session.user.id)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setProfile(null)
      if (nextSession?.user) window.setTimeout(() => { if (mounted) void loadProfile(nextSession.user.id) }, 0)
    })
    return () => { mounted = false; listener.subscription.unsubscribe() }
  }, [loadProfile])

  useEffect(() => { if (session && profile) void loadData() }, [session, profile, loadData])

  const filteredEntities = useMemo(() => entities.filter(item => (item.title + ' ' + item.territory + ' ' + item.entity_type).toLowerCase().includes(search.toLowerCase())), [entities, search])
  const counts = useMemo(() => ({ published: entities.filter(x => x.editorial_status === 'published').length, review: entities.filter(x => x.editorial_status === 'review').length, pending: contributions.filter(x => x.status === 'pending' || x.status === 'in_review').length, sources: sources.filter(x => x.verification_status !== 'cross_checked').length }), [entities, contributions, sources])

  async function signIn(e: FormEvent) {
    e.preventDefault()
    if (!supabase) return
    setBusy(true); setMessage('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setBusy(false)
    setMessage(error ? 'Connexion refusée : vérifiez vos identifiants.' : 'Connexion réussie.')
  }
  async function signOut() { if (supabase) await supabase.auth.signOut(); setProfile(null); setSession(null); setMessage('Vous êtes déconnecté.') }
  function startNewEntity() { setEditingId(null); setEntityForm({ ...emptyEntity }); setShowEntityForm(true) }
  function startEditEntity(item: Entity) { setEditingId(item.id); setEntityForm({ entity_type: item.entity_type, title: item.title, slug: item.slug, summary: item.summary || '', body: item.body || '', territory: item.territory || '', event_date: item.event_date || '', editorial_status: item.editorial_status, verification_status: item.verification_status, event_status: item.event_status || 'confirmed' }); setShowEntityForm(true) }
  async function saveEntity(e: FormEvent) {
    e.preventDefault()
    if (!supabase || !profile || !canEdit(profile.role)) return
    setBusy(true); setMessage('')
    const payload: Record<string, unknown> = { ...entityForm, event_date: entityForm.event_date || null, updated_by: profile.id, updated_at: new Date().toISOString(), published_at: entityForm.editorial_status === 'published' ? new Date().toISOString() : null }
    if (!editingId) payload.created_by = profile.id
    const result = editingId ? await supabase.from('entities').update(payload).eq('id', editingId) : await supabase.from('entities').insert(payload)
    setBusy(false)
    if (result.error) setMessage('Enregistrement impossible : ' + result.error.message)
    else { setMessage('Dossier enregistré.'); setShowEntityForm(false); await loadData() }
  }
  async function saveSource(e: FormEvent) {
    e.preventDefault()
    if (!supabase || !profile || !canEdit(profile.role)) return
    setBusy(true)
    const { error } = await supabase.from('sources').insert({ ...sourceForm, source_url: sourceForm.source_url || null, publisher: sourceForm.publisher || null, created_by: profile.id })
    setBusy(false)
    if (error) setMessage('Enregistrement impossible : ' + error.message)
    else { setMessage('Source ajoutée.'); setSourceForm({ title: '', source_url: '', publisher: '', source_type: 'article', notes: '' }); setShowSourceForm(false); await loadData() }
  }
  async function updateVerification(item: Entity, verification_status: string) {
    if (!supabase || !profile || !['administrator','editor','fact_checker'].includes(profile.role)) return
    const { error } = await supabase.from('entities').update({ verification_status, updated_by: profile.id }).eq('id', item.id)
    setMessage(error ? 'Vérification impossible : ' + error.message : 'Niveau de vérification mis à jour.')
    if (!error) await loadData()
  }
  async function updateContribution(id: string, status: string) {
    if (!supabase || !profile || !['administrator','moderator'].includes(profile.role)) return
    const { error } = await supabase.from('contributions').update({ status, reviewed_at: new Date().toISOString(), reviewed_by: profile.id }).eq('id', id)
    setMessage(error ? 'Mise à jour impossible : ' + error.message : 'Contribution mise à jour.')
    if (!error) await loadData()
  }

  if (!isSupabaseConfigured || !supabase) return <div className="admin-login-wrap"><section className="login-panel"><div className="admin-brand"><span>2</span> PASSIONS</div><h1>Configuration requise</h1><p>Renseignez <code>VITE_SUPABASE_URL</code> et <code>VITE_SUPABASE_ANON_KEY</code> dans <code>apps/admin/.env.local</code>, puis redémarrez l’application.</p></section></div>
  if (!session) return <div className="admin-login-wrap"><section className="login-panel login-card"><div className="admin-brand"><BrandMark/> PASSIONS<small>ADMINISTRATION</small></div><div className="admin-kicker">ESPACE PRIVÉ</div><h1>Accès à l’administration</h1><p>Connectez-vous avec un compte Supabase autorisé par un administrateur du projet.</p>{message && <div className="feedback">{message}</div>}<form onSubmit={signIn}><label>ADRESSE E-MAIL<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required autoComplete="username"/></label><label>MOT DE PASSE<input type="password" value={password} onChange={e=>setPassword(e.target.value)} required autoComplete="current-password"/></label><button className="primary full" disabled={busy}>{busy ? 'CONNEXION…' : 'SE CONNECTER'}</button></form><small className="security-note">Aucun compte par défaut. Ne transmettez jamais votre mot de passe ni une clé secrète.</small></section></div>
  if (!profile) return <div className="admin-login-wrap"><section className="login-panel login-card"><LockKeyhole/><h1>Profil non autorisé</h1><p>Votre compte est connecté, mais aucun profil d’équipe ne lui est associé. Demandez à un administrateur de créer votre ligne dans <code>public.profiles</code>.</p><button className="primary" onClick={signOut}>SE DÉCONNECTER</button></section></div>

  return <div className="admin-shell">
    <aside className={menuOpen ? 'sidebar show' : 'sidebar'}><a className="admin-brand" href="#"><BrandMark/> PASSIONS<small>ADMINISTRATION</small></a><div className="side-label">ESPACE DE TRAVAIL</div>
      {sections.filter(({label}) => (label !== 'Médiathèque' || canEdit(profile.role)) && (label !== 'Observatoires' || profile.role !== 'moderator') && (label !== 'Documents & sources' || profile.role !== 'moderator') && (label !== 'Centre documentaire' && label !== 'Veille documentaire' || canEdit(profile.role)) && (label !== 'Contributions' || ['administrator','moderator'].includes(profile.role)) && (label !== 'Équipe & accès' || profile.role === 'administrator') && (label !== 'Journal d’activité' || profile.role === 'administrator')).map(({label,icon:Icon}) => <button key={label} onClick={() => {setActive(label);setMenuOpen(false)}} className={active===label?'side-link active':'side-link'}><Icon size={17}/>{label}</button>)}
      <div className="sidebar-bottom"><span className="status-dot"/> SESSION AUTHENTIFIÉE<br/><small>{profile.display_name || session.user.email} · {roleLabel[profile.role]}</small></div>
    </aside>
    <main className="admin-main"><header className="admin-top"><button className="admin-menu" onClick={()=>setMenuOpen(!menuOpen)}><Menu/></button><div><span>2 PASSIONS</span><b>/ {active.toUpperCase()}</b></div><div className="top-actions"><button className="icon-button" onClick={()=>void loadData()} title="Actualiser"><RefreshCw size={17}/></button><span className="avatar">{(profile.display_name || session.user.email || 'A').slice(0,1).toUpperCase()}</span><button className="icon-button" onClick={signOut} title="Déconnexion"><LogOut size={17}/></button></div></header>
      <div className="admin-content"><div className="admin-kicker">CENTRE DE CONTRÔLE / 2026</div><div className="admin-title-row"><div><h1>{active}</h1><p>Gestion documentaire et suivi éditorial de la plateforme.</p></div>{active === 'Dossiers & événements' && canEdit(profile.role) && <button className="primary" onClick={startNewEntity}><Plus size={16}/> NOUVEAU DOSSIER</button>}{active === 'Documents & sources' && canEdit(profile.role) && <button className="primary" onClick={()=>setShowSourceForm(true)}><Plus size={16}/> AJOUTER UNE SOURCE</button>}</div>
        {message && <div className="feedback"><AlertCircle size={16}/>{message}</div>}
        {loading && <div className="notice"><RefreshCw size={17}/> Chargement des données…</div>}
        {active === 'Vue générale' && <><div className="stats-grid"><div><span>DOSSIERS PUBLIÉS</span><strong>{counts.published}</strong></div><div><span>À RELIRE</span><strong>{counts.review}</strong></div><div><span>CONTRIBUTIONS À TRAITER</span><strong>{counts.pending}</strong></div><div><span>SOURCES À VÉRIFIER</span><strong>{counts.sources}</strong></div></div><section className="admin-panel"><div className="panel-heading"><div><span className="admin-kicker">ACTIVITÉ RÉCENTE</span><h2>Derniers dossiers modifiés</h2></div></div>{entities.slice(0,6).map(item=><div className="data-row" key={item.id}><div><b>{item.title}</b><small>{item.entity_type} · {item.territory || 'Territoire non renseigné'}</small></div><span className={'status-pill '+item.editorial_status}>{statusLabel[item.editorial_status] || item.editorial_status}</span><button className="icon-button" onClick={()=>{setActive('Dossiers & événements');startEditEntity(item)}}><Pencil size={15}/></button></div>)}{entities.length===0 && <p className="empty-state">Aucun dossier enregistré. Créez votre premier dossier pour commencer l’archive.</p>}</section></>}
        {active === 'Dossiers & événements' && <section className="admin-panel"><div className="toolbar"><div className="searchbox"><Search size={16}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher un dossier…"/></div><span>{filteredEntities.length} résultat(s)</span></div>{filteredEntities.map(item=><div className="data-row" key={item.id}><div><b>{item.title}</b><small>{item.entity_type} · {item.event_date || 'Date non renseignée'} · {item.territory || 'Territoire non renseigné'}</small></div><span className={'status-pill '+item.editorial_status}>{statusLabel[item.editorial_status] || item.editorial_status}</span><span className="status-pill">{statusLabel[item.verification_status] || item.verification_status}</span>{canEdit(profile.role) && <button className="icon-button" onClick={()=>startEditEntity(item)}><Pencil size={15}/></button>}{['administrator','editor','fact_checker'].includes(profile.role) && <select aria-label={'Vérification de '+item.title} value={item.verification_status} onChange={e=>void updateVerification(item,e.target.value)}>{['unverified','single_source','cross_checked','contested','not_verifiable'].map(v=><option key={v} value={v}>{statusLabel[v]}</option>)}</select>}</div>)}{filteredEntities.length===0 && <p className="empty-state">Aucun dossier ne correspond à cette recherche.</p>}</section>}
        {active === 'Documents & sources' && <section className="admin-panel"><div className="panel-heading"><div><span className="admin-kicker">RÉFÉRENCES DOCUMENTAIRES</span><h2>Sources enregistrées</h2></div></div>{sources.map(item=><div className="data-row" key={item.id}><div><b>{item.title}</b><small>{item.publisher || 'Éditeur non renseigné'} · {item.source_type || 'Type non renseigné'}</small>{item.source_url && <a href={item.source_url} target="_blank" rel="noreferrer">Ouvrir la source ↗</a>}</div><span className="status-pill">{statusLabel[item.verification_status] || item.verification_status}</span></div>)}{sources.length===0 && <p className="empty-state">Aucune source enregistrée.</p>}</section>}
        <>{active === 'Veille documentaire' && <WatchCenter profileId={profile.id} canEdit={canEdit(profile.role)} onMessage={setMessage}/>}
        {active === 'Centre documentaire' && <DocumentCenter profileId={profile.id} canEdit={canEdit(profile.role)} onMessage={setMessage}/>}
        {active === 'Médiathèque' && <MediaLibrary profileId={profile.id} canEdit={canEdit(profile.role)} entities={entities.map(x=>({id:x.id,title:x.title}))} onMessage={setMessage}/>}</>
        <>{active === 'Observatoires' && <ObservatoryManager profileId={profile.id} canEdit={canEdit(profile.role)} onMessage={setMessage}/>}</>
        {active === 'Contributions' && <section className="admin-panel"><div className="panel-heading"><div><span className="admin-kicker">MODÉRATION</span><h2>Contributions reçues</h2></div></div>{contributions.map(item=><article className="contribution-card" key={item.id}><div className="data-row"><div><b>{item.contribution_type}</b><small>{new Date(item.created_at).toLocaleString('fr-FR')} · {item.contact_email || 'Contribution anonyme'}</small></div><span className="status-pill">{statusLabel[item.status] || item.status}</span></div><p>{item.message}</p>{item.source_url && <a href={item.source_url} target="_blank" rel="noreferrer">Consulter le lien transmis ↗</a>}{['administrator','moderator'].includes(profile.role) && <div className="row-actions"><button onClick={()=>void updateContribution(item.id,'in_review')}>Mettre en examen</button><button onClick={()=>void updateContribution(item.id,'accepted')}>Accepter</button><button onClick={()=>void updateContribution(item.id,'rejected')}>Refuser</button></div>}</article>)}{contributions.length===0 && <p className="empty-state">Aucune contribution reçue.</p>}</section>}
        {active === 'Équipe & accès' && <TeamAccess members={profiles} onMessage={setMessage} onReload={()=>void loadData()}/>}
        {active === 'Journal d’activité' && <section className="admin-panel"><div className="panel-heading"><div><span className="admin-kicker">TRAÇABILITÉ</span><h2>Journal d’activité</h2></div></div>{profile.role==='administrator' ? audit.map(item=><div className="data-row" key={item.id}><div><b>{item.action} · {item.table_name}</b><small>{new Date(item.created_at).toLocaleString('fr-FR')} · {item.actor_id || 'Système'}</small></div></div>) : <p className="empty-state">Consultation réservée aux administrateurs.</p>}</section>}
        {active === 'Paramètres' && <section className="admin-panel"><div className="panel-heading"><div><span className="admin-kicker">CONFIGURATION</span><h2>Environnement</h2></div><CheckCircle2/></div><div className="data-row"><div><b>Connexion Supabase</b><small>URL et clé publique configurées dans les variables d’environnement</small></div><span className="status-pill published">Connecté</span></div><div className="data-row"><div><b>Compte courant</b><small>{session.user.email}</small></div><span className="status-pill">{roleLabel[profile.role]}</span></div><p className="security-note">Ne placez jamais de clé service_role dans une application navigateur. Les droits sont appliqués par les politiques RLS de Supabase.</p></section>}
      </div>
    </main>
    {showEntityForm && <div className="modal-backdrop"><section className="editor-modal"><div className="panel-heading"><h2>{editingId ? 'Modifier le dossier' : 'Créer un dossier'}</h2><button className="icon-button" onClick={()=>setShowEntityForm(false)}>✕</button></div><form onSubmit={saveEntity}><label>TYPE<select value={entityForm.entity_type} onChange={e=>setEntityForm({...entityForm,entity_type:e.target.value})}>{['mobilisation','establishment','event','organisation','collective','document','resource'].map(x=><option key={x} value={x}>{x}</option>)}</select></label><label>TITRE<input required value={entityForm.title} onChange={e=>setEntityForm({...entityForm,title:e.target.value})}/></label><label>IDENTIFIANT URL (SLUG)<input required value={entityForm.slug} onChange={e=>setEntityForm({...entityForm,slug:e.target.value})} placeholder="mobilisation-exemple"/></label><label>RÉSUMÉ<textarea value={entityForm.summary} onChange={e=>setEntityForm({...entityForm,summary:e.target.value})}/></label><label>CONTENU DOCUMENTAIRE<textarea rows={6} value={entityForm.body} onChange={e=>setEntityForm({...entityForm,body:e.target.value})}/></label><div className="form-grid"><label>TERRITOIRE<input value={entityForm.territory} onChange={e=>setEntityForm({...entityForm,territory:e.target.value})}/></label><label>DATE DE L’ÉVÉNEMENT<input type="date" value={entityForm.event_date} onChange={e=>setEntityForm({...entityForm,event_date:e.target.value})}/></label><label>ÉTAT DE L’ÉVÉNEMENT<select value={entityForm.event_status} onChange={e=>setEntityForm({...entityForm,event_status:e.target.value})}>{[["announced","Annoncé"],["confirmed","Confirmé"],["postponed","Reporté"],["cancelled","Annulé"],["unknown","Non confirmé"]].map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label><label>STATUT ÉDITORIAL<select value={entityForm.editorial_status} onChange={e=>setEntityForm({...entityForm,editorial_status:e.target.value})}>{['draft','review','published','archived','rejected'].map(x=><option key={x} value={x}>{statusLabel[x]}</option>)}</select></label><label>VÉRIFICATION<select value={entityForm.verification_status} onChange={e=>setEntityForm({...entityForm,verification_status:e.target.value})}>{['unverified','single_source','cross_checked','contested','not_verifiable'].map(x=><option key={x} value={x}>{statusLabel[x]}</option>)}</select></label></div><div className="modal-actions"><button type="button" onClick={()=>setShowEntityForm(false)}>ANNULER</button><button className="primary" disabled={busy}>{busy?'ENREGISTREMENT…':'ENREGISTRER'}</button></div></form></section></div>}
    {showSourceForm && <div className="modal-backdrop"><section className="editor-modal"><div className="panel-heading"><h2>Ajouter une source</h2><button className="icon-button" onClick={()=>setShowSourceForm(false)}>✕</button></div><form onSubmit={saveSource}><label>TITRE<input required value={sourceForm.title} onChange={e=>setSourceForm({...sourceForm,title:e.target.value})}/></label><label>URL<input type="url" value={sourceForm.source_url} onChange={e=>setSourceForm({...sourceForm,source_url:e.target.value})}/></label><label>ÉDITEUR / ORGANISATION<input value={sourceForm.publisher} onChange={e=>setSourceForm({...sourceForm,publisher:e.target.value})}/></label><label>TYPE<select value={sourceForm.source_type} onChange={e=>setSourceForm({...sourceForm,source_type:e.target.value})}>{['article','communique','document','video','photo','temoignage','rapport','autre'].map(x=><option key={x}>{x}</option>)}</select></label><label>NOTES<textarea value={sourceForm.notes} onChange={e=>setSourceForm({...sourceForm,notes:e.target.value})}/></label><div className="modal-actions"><button type="button" onClick={()=>setShowSourceForm(false)}>ANNULER</button><button className="primary" disabled={busy}>ENREGISTRER</button></div></form></section></div>}
  </div>
}
