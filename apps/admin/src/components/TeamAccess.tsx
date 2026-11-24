import { useEffect, useState, type FormEvent } from 'react'
import { UserPlus, ShieldCheck } from 'lucide-react'
import { supabase } from '../lib/supabase'
type Member={id:string;display_name:string|null;role:string;created_at:string;email?:string}
const roles=[['administrator','Administrateur'],['editor','Éditeur'],['fact_checker','Vérificateur'],['moderator','Modérateur']]
export default function TeamAccess({members,onMessage,onReload}:{members:Member[];onMessage:(message:string)=>void;onReload:()=>void}){
 const [listed,setListed]=useState<Member[]>(members);const [email,setEmail]=useState('');const [displayName,setDisplayName]=useState('');const [role,setRole]=useState('editor');const [busy,setBusy]=useState(false)
 async function loadMembers(){if(!supabase)return;const {data,error}=await supabase.functions.invoke('manage-team',{body:{action:'list'}});if(error)onMessage('Lecture de l’équipe impossible : '+error.message);else if(data?.members)setListed(data.members as Member[])}
 useEffect(()=>{void loadMembers()},[])
 async function add(e:FormEvent){e.preventDefault();if(!supabase)return;setBusy(true);const {data,error}=await supabase.functions.invoke('manage-team',{body:{email,display_name:displayName,role}});setBusy(false);if(error)onMessage('Gestion du compte impossible : '+error.message);else if(data?.error)onMessage(data.error);else{onMessage('Compte existant ajouté à l’équipe.');setEmail('');setDisplayName('');onReload();void loadMembers()}}
 return <section className="admin-panel"><div className="panel-heading"><div><span className="admin-kicker">COMPTES SUPABASE EXISTANTS</span><h2>Équipe & accès</h2></div><ShieldCheck/></div><p className="document-note">Plus besoin de copier un UUID dans Supabase. La personne doit simplement avoir créé son compte et s'être connectée au moins une fois. Tu peux ensuite lui attribuer son rôle ici.</p>
 <form className="team-form" onSubmit={add}><label>ADRESSE E-MAIL DU COMPTE<input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="membre@exemple.fr"/></label><div className="form-grid"><label>NOM AFFICHÉ<input value={displayName} onChange={e=>setDisplayName(e.target.value)} placeholder="Nom de la personne"/></label><label>RÔLE<select value={role} onChange={e=>setRole(e.target.value)}>{roles.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label></div><button className="primary" disabled={busy}><UserPlus size={15}/>{busy?'AJOUT…':'AJOUTER À L’ÉQUIPE'}</button></form>
 <div className="team-members">{listed.map(m=><div className="data-row" key={m.id}><div><b>{m.display_name||'Membre sans nom'}</b><small>{m.email||m.id}</small></div><span className="status-pill">{roles.find(x=>x[0]===m.role)?.[1]||m.role}</span></div>)}</div>
 </section>
}
