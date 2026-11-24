import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  ArrowLeft, ArrowRight, ArrowUpRight, BookOpen, CalendarDays,
  ExternalLink, FileText, Image as ImageIcon, MapPinned, Menu,
  Search, ShieldCheck, X
} from 'lucide-react'
import { isSupabaseConfigured, supabase } from './lib/supabase'
import MapTimeline from './components/MapTimeline'
import Observatories from './components/Observatories'
import ContributionForm from './components/ContributionForm'

type Page = 'accueil' | 'archives' | 'explorer' | 'comprendre' | 'projet'
type Item = {
  id: string
  entity_type: string
  title: string
  summary: string | null
  body: string | null
  event_date: string | null
  territory: string | null
  region: string | null
  department: string | null
  city: string | null
  verification_status: string
  event_status: string | null
  slug: string
  created_at: string
}
type Source = { id: string; title: string; source_url: string | null; publisher: string | null; published_on: string | null; author_label?: string | null; source_type?: string | null }
type Media = { id: string; entity_id: string; url: string; media_type: string; caption: string | null; credit: string | null; alt_text: string | null }
type Relation = { from_entity: string; to_entity: string; relation_type: string; description: string | null }

const pages: { id: Page; label: string; number: string }[] = [
  { id: 'accueil', label: 'Accueil', number: '00' },
  { id: 'archives', label: 'Archives', number: '01' },
  { id: 'explorer', label: 'Explorer', number: '02' },
  { id: 'comprendre', label: 'Comprendre', number: '03' },
  { id: 'projet', label: 'Le projet', number: '04' },
]
const labels: Record<string, string> = {
  mobilisation: 'Mobilisation', establishment: 'Établissement', event: 'Événement',
  organisation: 'Organisation', collective: 'Collectif', document: 'Document', resource: 'Ressource'
}
const verification: Record<string, string> = {
  unverified: 'Non vérifié', single_source: 'Source unique', cross_checked: 'Recoupé',
  contested: 'Contesté', not_verifiable: 'Non vérifiable'
}
const eventStatuses: Record<string, string> = {
  announced: 'Annoncé', confirmed: 'Confirmé', postponed: 'Reporté',
  cancelled: 'Annulé', unknown: 'Non confirmé'
}
const dateLabel = (value: string | null) => value
  ? new Date(value + 'T00:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
  : 'Date non renseignée'
const clean = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
const readHash = (): string => decodeURIComponent(window.location.hash.replace(/^#\/?/, ''))

function Status({ value }: { value: string }) {
  const contested = value === 'contested' || value === 'not_verifiable'
  return <span className={contested ? 'status status-alert' : 'status'}>{verification[value] || value}</span>
}
function ImageFrame({ media, className = '' }: { media?: Media; className?: string }) {
  if (!media) return <div className={`image-placeholder ${className}`} aria-label="Aucune photographie publiée">
    <span>2P</span><small>ARCHIVE DOCUMENTAIRE</small>
  </div>
  return <div className={`image-frame ${className}`}>
    <img src={media.url} alt={media.alt_text || media.caption || 'Photographie documentaire'} loading="lazy" />
    {(media.caption || media.credit) && <div className="image-caption">{media.caption}{media.credit && <small>© {media.credit}</small>}</div>}
  </div>
}
function ItemCard({ item, media, onOpen, variant = '' }: { item: Item; media?: Media; onOpen: (item: Item) => void; variant?: string }) {
  return <button className={`item-card ${variant}`} onClick={() => onOpen(item)}>
    <ImageFrame media={media} className="item-card-image" />
    <div className="item-card-content">
      <div className="item-meta"><span>{labels[item.entity_type] || item.entity_type}</span><span>{item.event_date ? dateLabel(item.event_date) : 'Date non renseignée'}</span></div>
      <h3>{item.title}</h3>
      <p>{item.summary || 'Ouvrir le dossier documentaire et consulter les références associées.'}</p>
      <div className="item-card-bottom"><span>{item.territory || item.region || 'Territoire non précisé'}</span><span className="card-arrow"><ArrowUpRight size={17}/></span></div>
    </div>
  </button>
}

export default function App() {
  const [page, setPage] = useState<Page>('accueil')
  const [mobileMenu, setMobileMenu] = useState(false)
  const [items, setItems] = useState<Item[]>([])
  const [mediaByEntity, setMediaByEntity] = useState<Record<string, Media[]>>({})
  const [selected, setSelected] = useState<Item | null>(null)
  const [selectedSources, setSelectedSources] = useState<Source[]>([])
  const [relatedItems, setRelatedItems] = useState<Item[]>([])
  const [detailLoading, setDetailLoading] = useState(false)
  const [query, setQuery] = useState('')
  const [activeType, setActiveType] = useState('all')
  const [activeTerritory, setActiveTerritory] = useState('all')
  const [activeYear, setActiveYear] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    async function load() {
      const client = supabase
      if (!client) { setLoading(false); return }
      const { data, error: queryError } = await client
        .from('entities')
        .select('id,entity_type,title,summary,body,event_date,territory,region,department,city,verification_status,event_status,slug,created_at')
        .eq('editorial_status', 'published')
        .order('event_date', { ascending: false, nullsFirst: false })
        .limit(300)
      if (!alive) return
      if (queryError) {
        setError('Les archives ne peuvent pas être chargées pour le moment.')
        setLoading(false)
        return
      }
      const published = (data || []) as Item[]
      setItems(published)
      const { data: mediaRows } = await client.rpc('published_media_for_entity')
      if (alive && mediaRows?.length) {
        const imageRows = mediaRows.filter((row: any) => row.media_type === 'image' && row.public_derivative_path)
        const signed = await Promise.all(imageRows.map(async (row: any) => {
          const { data: signedData } = await client.storage.from('media-public').createSignedUrl(row.public_derivative_path, 3600)
          if (!signedData?.signedUrl) return null
          return {
            id: row.id, entity_id: row.entity_id, url: signedData.signedUrl,
            media_type: row.media_type, caption: row.caption, credit: row.credit, alt_text: row.alt_text
          } as Media
        }))
        if (alive) {
          const grouped: Record<string, Media[]> = {}
          signed.filter(Boolean).forEach((media) => {
            if (media) (grouped[media.entity_id] ||= []).push(media)
          })
          setMediaByEntity(grouped)
        }
      }
      if (alive) setLoading(false)
    }
    void load()
    return () => { alive = false }
  }, [])

  const openItem = async (item: Item, updateHistory = true) => {
    setSelected(item)
    setSelectedSources([])
    setRelatedItems([])
    setDetailLoading(true)
    setPage('archives')
    setMobileMenu(false)
    if (updateHistory) window.history.pushState(null, '', `#dossier/${encodeURIComponent(item.slug)}`)
    window.scrollTo({ top: 0, behavior: 'smooth' })
    if (!supabase) { setDetailLoading(false); return }
    const [linksResult, relationsResult] = await Promise.all([
      supabase.from('entity_sources').select('source_id').eq('entity_id', item.id),
      supabase.from('entity_relations').select('from_entity,to_entity,relation_type,description').or(`from_entity.eq.${item.id},to_entity.eq.${item.id}`)
    ])
    if (linksResult.data?.length) {
      const ids = linksResult.data.map((link: any) => link.source_id)
      const { data: refs } = await supabase.from('sources')
        .select('id,title,source_url,publisher,published_on,author_label,source_type')
        .in('id', ids)
      setSelectedSources((refs || []) as Source[])
    }
    if (relationsResult.data?.length) {
      const ids = (relationsResult.data as Relation[]).map((relation) =>
        relation.from_entity === item.id ? relation.to_entity : relation.from_entity
      )
      setRelatedItems(items.filter((candidate) => ids.includes(candidate.id)))
    }
    setDetailLoading(false)
  }

  useEffect(() => {
    const syncRoute = () => {
      const route = readHash()
      if (route.startsWith('dossier/')) {
        const slug = route.slice('dossier/'.length)
        const match = items.find((item) => item.slug === slug)
        if (match) {
          if (selected?.id !== match.id) void openItem(match, false)
          setPage('archives')
        }
        return
      }
      const next = pages.find((entry) => entry.id === route)?.id || 'accueil'
      setSelected(null)
      setPage(next)
      setMobileMenu(false)
    }
    window.addEventListener('hashchange', syncRoute)
    window.addEventListener('popstate', syncRoute)
    if (items.length) syncRoute()
    return () => { window.removeEventListener('hashchange', syncRoute); window.removeEventListener('popstate', syncRoute) }
  }, [items, selected])

  const types = useMemo(() => Array.from(new Set(items.map((item) => item.entity_type))).sort(), [items])
  const territories = useMemo(() => Array.from(new Set(items.map((item) => item.territory).filter(Boolean) as string[])).sort(), [items])
  const years = useMemo(() => Array.from(new Set(items.map((item) => item.event_date?.slice(0, 4)).filter(Boolean) as string[])).sort().reverse(), [items])
  const filteredItems = useMemo(() => items.filter((item) => {
    const haystack = clean([item.title, item.summary || '', item.body || '', item.territory || '', item.region || '', item.city || ''].join(' '))
    return (activeType === 'all' || item.entity_type === activeType)
      && (activeTerritory === 'all' || item.territory === activeTerritory)
      && (activeYear === 'all' || item.event_date?.startsWith(activeYear))
      && (!query.trim() || haystack.includes(clean(query.trim())))
  }), [items, activeType, activeTerritory, activeYear, query])

  const featured = items.find((item) => mediaByEntity[item.id]?.length) || items[0]
  const featuredMedia = featured ? mediaByEntity[featured.id]?.[0] : undefined
  const latest = items.filter((item) => item.id !== featured?.id).slice(0, 4)
  const mediaCount = Object.values(mediaByEntity).reduce((sum, entries) => sum + entries.length, 0)

  const navigate = (next: Page) => {
    setSelected(null)
    setPage(next)
    setMobileMenu(false)
    window.history.pushState(null, '', `#${next}`)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const closeDetail = () => {
    setSelected(null)
    setSelectedSources([])
    setRelatedItems([])
    window.history.replaceState(null, '', '#archives')
    setPage('archives')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const pageTitle: Record<Page, string> = {
    accueil: 'La mémoire des mobilisations.',
    archives: 'Les archives.',
    explorer: 'Explorer les mobilisations.',
    comprendre: 'Comprendre les faits et les traces.',
    projet: 'Une archive pour demain.'
  }

  const archiveToolbar = <div className="archive-tools">
    <label className="archive-search"><Search size={18}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher un dossier, un lieu, un sujet…" aria-label="Rechercher dans les archives"/></label>
    <label className="select-filter"><span>TYPE</span><select value={activeType} onChange={(event) => setActiveType(event.target.value)}><option value="all">Tous les types</option>{types.map((type) => <option value={type} key={type}>{labels[type] || type}</option>)}</select></label>
    <label className="select-filter"><span>TERRITOIRE</span><select value={activeTerritory} onChange={(event) => setActiveTerritory(event.target.value)}><option value="all">Tous les territoires</option>{territories.map((territory) => <option value={territory} key={territory}>{territory}</option>)}</select></label>
    <label className="select-filter"><span>ANNÉE</span><select value={activeYear} onChange={(event) => setActiveYear(event.target.value)}><option value="all">Toutes les années</option>{years.map((year) => <option value={year} key={year}>{year}</option>)}</select></label>
    {(query || activeType !== 'all' || activeTerritory !== 'all' || activeYear !== 'all') && <button className="reset-filters" onClick={() => { setQuery(''); setActiveType('all'); setActiveTerritory('all'); setActiveYear('all') }}>Réinitialiser</button>}
  </div>

  const itemGrid = (list: Item[], variant = '') => <div className={`item-grid ${variant}`}>
    {list.map((item) => <ItemCard key={item.id} item={item} media={mediaByEntity[item.id]?.[0]} onOpen={openItem}/>)}
  </div>

  const detailView = (item: Item) => <article className="dossier-page">
    <button className="back-link" onClick={closeDetail}><ArrowLeft size={16}/> Retour aux archives</button>
    <div className="dossier-kicker"><span>{labels[item.entity_type] || item.entity_type}</span><span>{item.territory || item.region || 'Territoire non précisé'}</span></div>
    <h1>{item.title}</h1>
    <div className="dossier-meta"><span><CalendarDays size={15}/>{dateLabel(item.event_date)}</span><Status value={item.verification_status}/>{item.event_status && <span className="event-status">{eventStatuses[item.event_status] || item.event_status}</span>}</div>
    {mediaByEntity[item.id]?.length ? <div className="dossier-gallery">
      {mediaByEntity[item.id].map((media) => <ImageFrame key={media.id} media={media}/>)}
    </div> : null}
    {item.summary && <p className="dossier-summary">{item.summary}</p>}
    <div className="dossier-layout">
      <div className="dossier-text">
        {item.body ? item.body.split(/\n\s*\n/).map((paragraph, index) => <p key={index}>{paragraph}</p>) : <p className="muted">Aucun texte détaillé n’a encore été publié pour ce dossier. Les informations disponibles sont limitées aux éléments présentés ci-dessus.</p>}
      </div>
      <aside className="dossier-aside">
        <div className="aside-block"><span className="aside-label">REPÈRES</span><b>{labels[item.entity_type] || item.entity_type}</b><p>{item.city || item.department || item.region || item.territory || 'Territoire non précisé'}</p><p>{dateLabel(item.event_date)}</p></div>
        <div className="aside-block"><span className="aside-label">ÉTAT DE VÉRIFICATION</span><Status value={item.verification_status}/><p>Le statut indique le niveau de vérification éditoriale attribué à ce dossier.</p></div>
      </aside>
    </div>
    <section className="dossier-sources"><div className="section-index">RÉFÉRENCES DOCUMENTAIRES</div><h2>Sources et documents</h2>
      {detailLoading ? <p className="muted">Chargement des références…</p> : selectedSources.length ? <div className="source-list">{selectedSources.map((source) => <div className="source-entry" key={source.id}>
        <div><b>{source.title}</b><small>{[source.publisher, source.author_label, source.published_on ? dateLabel(source.published_on) : null].filter(Boolean).join(' · ') || 'Référence documentaire'}</small></div>
        {source.source_url && <a href={source.source_url} target="_blank" rel="noreferrer" aria-label={`Ouvrir la source ${source.title}`}><ExternalLink size={17}/></a>}
      </div>)}</div> : <p className="muted">Aucune source associée n’a été rendue publique pour le moment.</p>}
    </section>
    {relatedItems.length > 0 && <section className="related-section"><div className="section-index">POUR ALLER PLUS LOIN</div><h2>Dossiers liés</h2>{itemGrid(relatedItems.slice(0, 3), 'related-grid')}</section>}
  </article>

  let content: ReactNode
  if (page === 'accueil') {
    content = <>
      <section className="home-hero">
        <div className="home-hero-copy">
          <div className="eyebrow"><span className="red-square"/> ARCHIVER. DOCUMENTER. TRANSMETTRE.</div>
          <h1>LA MÉMOIRE<br/><em>DES MOBILISATIONS.</em></h1>
          <p>Une archive documentaire indépendante pour conserver les traces, croiser les sources et comprendre les mobilisations lycéennes, étudiantes et citoyennes.</p>
          <div className="hero-actions"><button className="button-primary" onClick={() => navigate('archives')}>Parcourir les archives <ArrowUpRight size={16}/></button><button className="button-text" onClick={() => navigate('projet')}>Découvrir le projet <ArrowRight size={16}/></button></div>
          <div className="home-hero-foot"><span>ARCHIVES PUBLIQUES</span><span>FRANCE · MÉTROPOLE & OUTRE-MER</span></div>
        </div>
        <div className="home-hero-visual">
          <ImageFrame media={featuredMedia} className="hero-photo"/>
          {featured && <button className="hero-feature-caption" onClick={() => openItem(featured)}><span>À LA UNE · {labels[featured.entity_type] || featured.entity_type}</span><b>{featured.title}</b><small>Lire le dossier <ArrowUpRight size={14}/></small></button>}
          {!featured && <div className="hero-visual-note"><span>2P / ARCHIVES</span><b>LES TRACES<br/>RESTENT.</b><small>Les photographies publiées apparaîtront ici automatiquement.</small></div>}
        </div>
      </section>
      <section className="home-manifesto">
        <div className="section-index">UNE ARCHIVE, PAS UN FLUX</div>
        <p>Conserver ce qui se passe, documenter ce qui est affirmé, et laisser les sources parler.</p>
        <div className="manifesto-mark">2<span>.</span></div>
      </section>
      <section className="home-latest section-wrap">
        <div className="section-heading"><div><div className="section-index">01 — DOSSIERS DOCUMENTÉS</div><h2>À CONSULTER<span className="red-dot">.</span></h2></div><button className="section-link" onClick={() => navigate('archives')}>Toutes les archives <ArrowUpRight size={16}/></button></div>
        {loading ? <div className="loading-line">Chargement des publications…</div> : latest.length || featured ? <div className="home-story-grid">
          {featured && <ItemCard item={featured} media={featuredMedia} onOpen={openItem} variant="story-feature"/>}
          {latest.slice(0, 3).map((item) => <ItemCard key={item.id} item={item} media={mediaByEntity[item.id]?.[0]} onOpen={openItem}/>)}
        </div> : <div className="empty-state"><b>Les premières archives arrivent.</b><p>Les dossiers apparaîtront ici après leur validation et leur publication depuis l'administration.</p><button className="button-text" onClick={() => navigate('projet')}>Comprendre la démarche <ArrowRight size={15}/></button></div>}
      </section>
      <section className="home-explore">
        <div><span className="section-index">02 — CHANGER D'ÉCHELLE</span><h2>UN TERRITOIRE.<br/><em>DES HISTOIRES.</em></h2><p>Retrouver les dossiers par lieu et par date, et parcourir les mobilisations documentées sur le territoire.</p><button className="button-light" onClick={() => navigate('explorer')}>Explorer la carte et la chronologie <ArrowUpRight size={16}/></button></div>
        <div className="explore-symbol"><MapPinned size={78} strokeWidth={1}/><span>CARTE<br/>DOCUMENTAIRE</span></div>
      </section>
      <section className="home-method section-wrap">
        <div className="section-index">03 — NOTRE MÉTHODE</div>
        <div className="method-grid">
          <div><span>01</span><ShieldCheck/><h3>VÉRIFIER</h3><p>Distinguer les faits recoupés, les déclarations, les témoignages et les informations contestées.</p></div>
          <div><span>02</span><ImageIcon/><h3>ARCHIVER</h3><p>Associer les documents à leur contexte, leur provenance, leur date et leurs crédits.</p></div>
          <div><span>03</span><BookOpen/><h3>TRANSMETTRE</h3><p>Rendre les traces consultables, sourcées et compréhensibles dans le temps.</p></div>
        </div>
      </section>
    </>
  } else if (page === 'archives') {
    content = selected ? detailView(selected) : <section className="archive-page section-wrap">
      <div className="page-heading"><div className="section-index">01 — CONSULTER LA BASE DOCUMENTAIRE</div><h1>LES ARCHIVES<span className="red-dot">.</span></h1><p>Des dossiers reliés à leurs sources, leurs documents et leur contexte. Recherche dans les publications disponibles.</p></div>
      {archiveToolbar}
      <div className="results-line"><span>{loading ? 'Chargement…' : `${filteredItems.length} dossier${filteredItems.length > 1 ? 's' : ''}`}</span><span>CONTENUS PUBLIÉS UNIQUEMENT</span></div>
      {error && <div className="empty-state">{error}</div>}
      {loading ? <div className="loading-line">Chargement des archives publiées…</div> : filteredItems.length ? itemGrid(filteredItems) : <div className="empty-state"><b>Aucun dossier ne correspond à cette recherche.</b><p>Essaie un autre terme ou réinitialise les filtres.</p><button className="button-text" onClick={() => { setQuery(''); setActiveType('all'); setActiveTerritory('all'); setActiveYear('all') }}>Réinitialiser les filtres <ArrowRight size={15}/></button></div>}
      <div className="archive-footnote"><ShieldCheck size={16}/> Les contenus publiés sont identifiés par leur statut de vérification. Les brouillons et contributions privées ne sont jamais visibles dans cette base.</div>
    </section>
  } else if (page === 'explorer') {
    content = <div className="explorer-page"><div className="page-heading section-wrap"><div className="section-index">02 — LIRE LE TERRITOIRE ET LE TEMPS</div><h1>EXPLORER<span className="red-dot">.</span></h1><p>Une lecture géographique et chronologique des dossiers rendus publics. Les localisations sensibles ou masquées ne sont pas exposées.</p></div><MapTimeline onOpen={(id) => { const match = items.find((item) => item.id === id); if (match) void openItem(match) }}/></div>
  } else if (page === 'comprendre') {
    content = <div className="understand-page"><div className="page-heading section-wrap"><div className="section-index">03 — DONNÉES, MÉTHODES ET SOURCES</div><h1>COMPRENDRE<span className="red-dot">.</span></h1><p>Les chiffres et les récits ne se suffisent pas à eux-mêmes. Chaque information doit être replacée dans son périmètre, sa méthode et ses limites.</p></div>
      <Observatories/>
      <section className="knowledge-section section-wrap"><div className="section-index">COMMENT LIRE UNE ARCHIVE</div><h2>UN STATUT N'EST PAS<br/>UNE VÉRITÉ ABSOLUE.</h2><div className="knowledge-grid">
        <div><b>Recoupé</b><p>Plusieurs sources indépendantes concordent sur l'information présentée.</p></div>
        <div><b>Source unique</b><p>L'information repose actuellement sur une seule référence identifiée.</p></div>
        <div><b>Contesté</b><p>Des versions divergentes existent. Elles doivent être contextualisées et sourcées.</p></div>
        <div><b>Non vérifiable</b><p>Les éléments disponibles ne permettent pas de confirmer l'information à ce stade.</p></div>
      </div><p className="knowledge-note">Une déclaration, un témoignage, une estimation et un fait recoupé ne sont pas des catégories interchangeables. La charte éditoriale détaille cette distinction.</p></section>
    </div>
  } else {
    content = <div className="project-page"><section className="project-intro section-wrap"><div className="section-index">04 — LE PROJET</div><h1>UNE ARCHIVE<br/><em>POUR DEMAIN.</em></h1><p>2 PASSIONS documente les mobilisations et les luttes sociales, politiques, lycéennes, étudiantes et citoyennes. Le projet ne cherche pas à remplacer les récits des acteurs : il rassemble des traces, conserve leur provenance et rend les informations vérifiables.</p></section>
      <section className="project-principles"><div className="section-wrap project-principle-grid">
        <div><span>01 / INDÉPENDANCE</span><h2>DOCUMENTer<br/>SANS CONFONDRE.</h2><p>Le travail documentaire distingue les faits, les positions des organisations, les témoignages et les analyses. Les interprétations sont attribuées à leurs auteurs.</p></div>
        <div><span>02 / TRAÇABILITÉ</span><h2>GARDER<br/>LES SOURCES.</h2><p>Chaque dossier peut être relié à des sources, des documents et des médias. Les corrections substantielles doivent pouvoir être expliquées.</p></div>
        <div><span>03 / PROTECTION</span><h2>PROTÉGER<br/>LES PERSONNES.</h2><p>Les informations privées, les données sensibles et les éléments susceptibles de mettre quelqu'un en danger n'ont pas leur place dans une archive publique.</p></div>
      </div></section>
      <section className="contribute-invite section-wrap"><div><div className="section-index">CONTRIBUER À LA MÉMOIRE COMMUNE</div><h2>UNE TRACE À<br/>TRANSMETTRE<span className="red-dot"> ?</span></h2><p>Un document, une source, un témoignage ou une correction peut enrichir un dossier. Chaque envoi est examiné par l'équipe avant toute éventuelle publication.</p></div><div className="contribute-side"><ShieldCheck size={34}/><b>RIEN N'EST PUBLIÉ AUTOMATIQUEMENT.</b><p>Évite de transmettre des noms de mineurs, des coordonnées privées ou des informations qui pourraient exposer quelqu'un à un risque.</p></div></section>
      <ContributionForm/>
    </div>
  }

  return <div className="site-shell">
    <div className="topline"><span>ARCHIVES DOCUMENTAIRES INDÉPENDANTES · FRANCE</span><span>ARCHIVER. DOCUMENTER. TRANSMETTRE.</span></div>
    <header className="site-header">
      <button className="brand" onClick={() => navigate('accueil')} aria-label="2 PASSIONS, accueil"><span className="brand-mark">2</span><span>PASSIONS<span>.</span></span></button>
      <button className="mobile-menu-toggle" onClick={() => setMobileMenu((open) => !open)} aria-label={mobileMenu ? 'Fermer le menu' : 'Ouvrir le menu'}>{mobileMenu ? <X/> : <Menu/>}</button>
      <nav className={mobileMenu ? 'main-nav is-open' : 'main-nav'} aria-label="Navigation principale">
        {pages.map((entry) => <button key={entry.id} className={page === entry.id ? 'nav-link active' : 'nav-link'} onClick={() => navigate(entry.id)}><span>{entry.number}</span>{entry.label}</button>)}
      </nav>
      <button className="header-contribute" onClick={() => navigate('projet')}>Contribuer <ArrowUpRight size={15}/></button>
    </header>
    <main key={page} aria-label={pageTitle[page]}>{content}</main>
    <footer className="site-footer">
      <button className="brand footer-brand" onClick={() => navigate('accueil')}><span className="brand-mark">2</span><span>PASSIONS<span>.</span></span></button>
      <div className="footer-signature">ARCHIVER.<br/>DOCUMENTER.<br/>TRANSMETTRE.</div>
      <div className="footer-nav">{pages.map((entry) => <button key={entry.id} onClick={() => navigate(entry.id)}>{entry.label}</button>)}</div>
      <div className="footer-note"><span>ARCHIVE DOCUMENTAIRE INDÉPENDANTE</span><small>Les contenus sont publiés après examen éditorial. Les sources et les limites doivent rester consultables.</small><small>© 2 PASSIONS</small></div>
    </footer>
    {!isSupabaseConfigured && <div className="config-banner">CONNEXION À LA BASE DOCUMENTAIRE NON CONFIGURÉE</div>}
    {isSupabaseConfigured && !loading && items.length === 0 && <div className="site-state-note"><FileText size={14}/> La base publique ne contient pas encore de dossier publié.</div>}
    {mediaCount > 0 && <span className="sr-only">{mediaCount} médias publiés disponibles</span>}
  </div>
}
