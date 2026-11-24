import { useState } from 'react'
import { LayoutDashboard, FileText, Images, Inbox, Users, Settings, Bell, Plus, LockKeyhole, Menu } from 'lucide-react'
import { isSupabaseConfigured, supabase } from './lib/supabase'

const sections = [
  { label: 'Vue générale', icon: LayoutDashboard },
  { label: 'Dossiers & événements', icon: FileText },
  { label: 'Documents & sources', icon: Images },
  { label: 'Contributions', icon: Inbox },
  { label: 'Équipe & accès', icon: Users },
  { label: 'Paramètres', icon: Settings }
]

export default function App() {
  const [active, setActive] = useState('Vue générale')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)

  async function signIn(e: React.FormEvent) {
    e.preventDefault()
    if (!supabase) { setMessage('Supabase n’est pas configuré. Renseignez les variables VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY.'); return }
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setMessage(error ? 'Connexion refusée : vérifiez vos identifiants.' : 'Connexion réussie. Rechargez la page pour accéder au tableau de bord.')
  }

  return <div className="admin-shell">
    <aside className={menuOpen ? 'sidebar show' : 'sidebar'}>
      <a className="admin-brand" href="#"><span>2</span> PASSIONS<small>ADMINISTRATION</small></a>
      <div className="side-label">ESPACE DE TRAVAIL</div>
      {sections.map(({label,icon:Icon}) => <button key={label} onClick={() => {setActive(label);setMenuOpen(false)}} className={active===label?'side-link active':'side-link'}><Icon size={17}/>{label}</button>)}
      <div className="sidebar-bottom"><span className="status-dot"/> ENVIRONNEMENT INITIAL<br/><small>Accès réservé à l’équipe autorisée</small></div>
    </aside>
    <main className="admin-main">
      <header className="admin-top"><button className="admin-menu" onClick={()=>setMenuOpen(!menuOpen)}><Menu/></button><div><span>2 PASSIONS</span><b>/ {active.toUpperCase()}</b></div><div className="top-actions"><Bell size={18}/><span className="avatar">A</span></div></header>
      <div className="admin-content">
        <div className="admin-kicker">CENTRE DE CONTRÔLE / 2026</div>
        <div className="admin-title-row"><div><h1>{active}</h1><p>Gestion documentaire et suivi éditorial de la plateforme.</p></div><button className="primary" onClick={()=>setMessage('La création sera activée après configuration de Supabase et des droits.')}><Plus size={16}/> NOUVEAU CONTENU</button></div>
        {!isSupabaseConfigured ? <div className="notice"><LockKeyhole/><div><b>Connexion à la base de données non configurée</b><p>Cette interface est une base de travail. Ajoutez les variables Supabase dans <code>apps/admin/.env.local</code> puis redémarrez le serveur.</p></div></div> : <div className="notice"><LockKeyhole/><div><b>Authentification disponible</b><p>Connectez-vous avec un compte créé dans Supabase Auth et autorisé dans la table des profils.</p></div></div>}
        {message && <div className="feedback">{message}</div>}
        <section className="login-panel"><div className="panel-heading"><div><span className="admin-kicker">AUTHENTIFICATION</span><h2>Accès administrateur</h2></div><LockKeyhole/></div>
          <form onSubmit={signIn}><label>ADRESSE E-MAIL<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required placeholder="administration@exemple.fr"/></label><label>MOT DE PASSE<input type="password" value={password} onChange={e=>setPassword(e.target.value)} required placeholder="••••••••••••"/></label><button className="primary full" type="submit">SE CONNECTER</button></form>
          <small className="security-note">Aucun compte par défaut n’est créé. Ne partagez jamais vos identifiants et n’inscrivez aucune clé secrète dans le code source.</small>
        </section>
        <section className="admin-placeholder"><div className="admin-kicker">STRUCTURE DU TABLEAU DE BORD</div><div className="placeholder-grid"><div><b>01</b><span>À vérifier</span><strong>—</strong></div><div><b>02</b><span>Contributions reçues</span><strong>—</strong></div><div><b>03</b><span>Dossiers publiés</span><strong>—</strong></div><div><b>04</b><span>Sources à contrôler</span><strong>—</strong></div></div><p>Les compteurs resteront vides tant qu’aucune donnée réelle n’aura été enregistrée et validée.</p></section>
      </div>
    </main>
  </div>
}
