import { useMemo, useState } from 'react'
import { Search, Menu, ArrowUpRight, Archive, MapPin, CalendarDays, BookOpen, ShieldCheck } from 'lucide-react'
import { isSupabaseConfigured } from './lib/supabase'

type ArchiveItem = { type: string; title: string; summary: string; date: string; territory: string; status: string }
const demoItems: ArchiveItem[] = [
  { type: 'DOSSIER', title: 'Comprendre une mobilisation : méthode documentaire', summary: 'Une fiche de démonstration expliquant comment les événements, sources, témoignages et incertitudes seront reliés.', date: 'EXEMPLE', territory: 'NATIONAL', status: 'DÉMONSTRATION' },
  { type: 'RESSOURCE', title: 'Évaluer et citer une source', summary: 'Repères pour identifier l’auteur, la date, la provenance et le niveau de vérification d’un document.', date: 'EXEMPLE', territory: 'DOCUMENTATION', status: 'DÉMONSTRATION' },
  { type: 'ARCHIVE', title: 'Construire une chronologie vérifiable', summary: 'Présentation du modèle de chronologie : annoncé, confirmé, reporté, annulé ou non vérifié.', date: 'EXEMPLE', territory: 'MÉTHODE', status: 'DÉMONSTRATION' }
]

export default function App() {
  const [query, setQuery] = useState('')
  const [active, setActive] = useState('TOUT')
  const [mobileMenu, setMobileMenu] = useState(false)
  const filtered = useMemo(() => demoItems.filter(item =>
    (active === 'TOUT' || item.type === active) &&
    `${item.title} ${item.summary} ${item.territory}`.toLowerCase().includes(query.toLowerCase())
  ), [query, active])

  return <div className="site-shell">
    <div className="topline"><span>ARCHIVES INDÉPENDANTES · FRANCE</span><span>ÉDITION DOCUMENTAIRE — 2026</span></div>
    <header className="header">
      <a className="brand" href="#"><span className="brand-mark">2</span><span>PASSIONS<span className="brand-dot">.</span></span></a>
      <button className="menu-toggle" onClick={() => setMobileMenu(!mobileMenu)} aria-label="Ouvrir le menu"><Menu /></button>
      <nav className={mobileMenu ? 'nav open' : 'nav'}>
        <a href="#archives">ARCHIVES</a><a href="#explorer">EXPLORER</a><a href="#comprendre">COMPRENDRE</a><a href="#projet">LE PROJET</a>
      </nav>
      <a className="header-cta" href="#archives">CONSULTER <ArrowUpRight size={15}/></a>
    </header>

    <main>
      <section className="hero">
        <div className="hero-kicker"><span className="red-square"/> ARCHIVER. DOCUMENTER. TRANSMETTRE.</div>
        <h1>LA MÉMOIRE<br/><span>DES MOBILISATIONS.</span></h1>
        <div className="hero-bottom">
          <p>Une archive documentaire vivante pour comprendre les mobilisations, leurs histoires, leurs revendications et les traces qu’elles laissent.</p>
          <div className="hero-index"><span>PLATEFORME DOCUMENTAIRE</span><strong>FRANCE<br/>2026—…</strong></div>
        </div>
        <div className="hero-rule"><span>01 / ARCHIVES VIVANTES</span><span>INDÉPENDANT · DOCUMENTÉ · ÉVOLUTIF</span></div>
      </section>

      <section className="intro-grid" id="comprendre">
        <div className="section-index">01 — NOTRE DÉMARCHE</div>
        <div><h2>DOCUMENTÉES,<br/>PAS RACONTÉES À MOITIÉ.</h2><p className="lead">2 PASSIONS rassemble des documents, des sources, des témoignages et des données pour conserver une mémoire consultable et vérifiable des mobilisations.</p></div>
        <div className="principles">
          <div><ShieldCheck/><span><b>VÉRIFIER</b><small>Distinguer faits, déclarations, témoignages et incertitudes.</small></span></div>
          <div><Archive/><span><b>ARCHIVER</b><small>Conserver les références et la provenance des documents.</small></span></div>
          <div><BookOpen/><span><b>TRANSMETTRE</b><small>Rendre les ressources accessibles et contextualisées.</small></span></div>
        </div>
      </section>

      <section className="archive-section" id="archives">
        <div className="section-heading"><div><div className="section-index">02 — EXPLORER LES CONTENUS</div><h2>LES ARCHIVES<span className="red-dot">.</span></h2></div><p>Rechercher dans les dossiers, les documents et les ressources documentaires.</p></div>
        <div className="search-row"><div className="searchbox"><Search size={19}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Rechercher un sujet, un document, un territoire…"/></div><button className="filter-button" onClick={() => setActive(active === 'TOUT' ? 'DOSSIER' : 'TOUT')}>FILTRER : {active}</button></div>
        <div className="archive-grid">
          {filtered.map((item, i) => <article className="archive-card" key={item.title}>
            <div className="card-meta"><span>{item.type}</span><span>{item.date}</span></div>
            <div className="card-number">0{i+1}</div>
            <h3>{item.title}</h3><p>{item.summary}</p>
            <div className="card-footer"><span>{item.territory}</span><span className="demo-tag">{item.status}</span></div>
          </article>)}
          {filtered.length === 0 && <div className="empty-state">Aucun résultat dans les contenus de démonstration.</div>}
        </div>
        <p className="demo-note">CONTENUS DE DÉMONSTRATION — AUCUN ÉVÉNEMENT HISTORIQUE N’EST AFFIRMÉ ICI.</p>
      </section>

      <section className="explore-band" id="explorer">
        <div><div className="section-index">03 — CARTOGRAPHIE & CHRONOLOGIE</div><h2>COMPRENDRE<br/>LES LIENS.</h2></div>
        <div><MapPin size={28}/><p>La carte nationale reliera les établissements, les événements et les territoires à leurs dossiers documentaires. Les localisations sensibles ne seront pas publiées.</p><span className="coming">MODULE À DÉVELOPPER APRÈS CONFIGURATION DES DONNÉES</span></div>
        <div><CalendarDays size={28}/><p>Une chronologie permettra de distinguer les annonces, les événements confirmés, les reports, les annulations et les informations non vérifiées.</p><span className="coming">DONNÉES SOURCÉES UNIQUEMENT</span></div>
      </section>

      <section className="project-section" id="projet">
        <div className="section-index">04 — LE PROJET</div><h2>UNE ARCHIVE<br/>POUR DEMAIN.</h2>
        <div className="project-copy"><p>2 PASSIONS est conçu comme un outil documentaire indépendant. Sa fiabilité repose sur la traçabilité des sources, la transparence éditoriale, la protection des personnes et la possibilité de corriger les informations.</p><a href="mailto:contact@2passions.fr">CONTACTER LE PROJET <ArrowUpRight size={15}/></a></div>
      </section>
    </main>
    <footer><a className="brand" href="#"><span className="brand-mark">2</span><span>PASSIONS<span className="brand-dot">.</span></span></a><span>ARCHIVER. DOCUMENTER. TRANSMETTRE.</span><span>© 2 PASSIONS</span></footer>
    {!isSupabaseConfigured && <div className="config-banner">MODE INITIAL — BASE DE DONNÉES NON CONFIGURÉE</div>}
  </div>
}
