import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Plus, RefreshCw, ExternalLink, Check, X, Pause, Play } from 'lucide-react'
import { supabase } from '../lib/supabase'

type Feed = { id:string; name:string; feed_url:string; publisher:string|null; topic:string|null; enabled:boolean; last_checked_at:string|null; last_error:string|null }
type Item = { id:string; watch_source_id:string; title:string; item_url:string|null; summary:string|null; published_at:string|null; status:string; created_source_id:string|null; watch_sources?:{name:string} }
const topics = ['Mobilisations','Éducation','Écologie','Répression','Libertés publiques','Précarité','Médias','Autre']

export default function WatchCenter({ profileId, canEdit, onMessage }:{profileId:string;canEdit:boolean;onMessage:(message:string)=>void}) {
  const [feeds,setFeeds]=useState<Feed[]>([])
  const [items,setItems]=useState<Item[]>([])
  const [loading,setLoading]=useState(false)
  const [busy,setBusy]=useState(false)
  const [name,setName]=useState('')
  const [url,setUrl]=useState('')
  const [publisher,setPublisher]=useState('')
  const [topic,setTopic]=useState('Mobilisations')
  const load=useCallback(async()=>{
    if(!supabase)return
    setLoading(true)
    const [f,i]=await Promise.all([
      supabase.from('watch_sources').select('*').order('created_at',{ascending:false}),
      supabase.from('watch_items').select('*,watch_sources(name)').order('detected_at',{ascending:false}).limit(100)
    ])
    if(f.error)onMessage('Lecture des flux impossible : '+f.error.message);else setFeeds((f.data||[]) as Feed[])
    if(i.error)onMessage('Lecture de la veille impossible : '+i.error.message);else setItems((i.data||[]) as Item[])
    setLoading(false)
  },[onMessage])
  useEffect(()=>{void load()},[load])
  async function addFeed(e:FormEvent){
    e.preventDefault();if(!supabase||!canEdit)return
    setBusy(true)
    const {error}=await supabase.from('watch_sources').insert({name,feed_url:url,publisher:publisher||null,topic,created_by:profileId})
    setBusy(false)
    if(error)onMessage('Ajout du flux impossible : '+error.message)
    else{onMessage('Source de veille ajoutée.');setName('');setUrl('');setPublisher('');await load()}
  }
  async function run(force=true){
    if(!supabase)return
    setBusy(true);onMessage('Récupération des nouveaux éléments…')
    const {data,error}=await supabase.functions.invoke('watch-sources',{body:{force}})
    setBusy(false)
    if(error)onMessage('Veille non exécutée : '+error.message)
    else{onMessage(`Veille terminée : ${data?.results?.reduce((n:number,x:any)=>n+(x.detected||0),0)||0} nouveauté(s) détectée(s).`);await load()}
  }
  async function toggleFeed(feed:Feed){if(!supabase)return;const {error}=await supabase.from('watch_sources').update({enabled:!feed.enabled}).eq('id',feed.id);if(error)onMessage('Modification du flux impossible : '+error.message);else await load()}
  async function setStatus(item:Item,status:string){
    if(!supabase)return
    const {error}=await supabase.from('watch_items').update({status,reviewed_by:profileId,reviewed_at:new Date().toISOString()}).eq('id',item.id)
    if(error)onMessage('Mise à jour impossible : '+error.message);else await load()
  }
  async function saveAsSource(item:Item){
    if(!supabase)return
    const feed=feeds.find(f=>f.id===item.watch_source_id)
    const {data,error}=await supabase.from('sources').insert({
      title:item.title,source_url:item.item_url,publisher:feed?.publisher||feed?.name||null,
      source_type:'article',notes:item.summary||'Élément détecté par la veille automatique.',
      verification_status:'unverified',created_by:profileId
    }).select('id').single()
    if(error){onMessage('Création de source impossible : '+error.message);return}
    await supabase.from('watch_items').update({status:'kept',created_source_id:data.id,reviewed_by:profileId,reviewed_at:new Date().toISOString()}).eq('id',item.id)
    onMessage('Source documentaire créée. Elle reste non vérifiée et non publiée.');await load()
  }
  return <div className="watch-layout">
    <section className="admin-panel">
      <div className="panel-heading"><div><span className="admin-kicker">SURVEILLANCE DES PUBLICATIONS</span><h2>Flux surveillés</h2></div><button className="primary" disabled={busy} onClick={()=>void run(true)}><RefreshCw size={15}/> {busy?'ANALYSE…':'LANCER LA VEILLE'}</button></div>
      <p className="document-note">Surveille les flux RSS et Atom. Les résumés affichés sont des extraits automatiques du flux, pas des synthèses journalistiques vérifiées. Aucun élément n'est publié automatiquement.</p>
      {canEdit&&<form className="feed-form" onSubmit={addFeed}>
        <label>NOM DE LA SOURCE<input required value={name} onChange={e=>setName(e.target.value)} placeholder="Ex. Communiqués du collectif"/></label>
        <label>URL DU FLUX RSS / ATOM<input required type="url" value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://exemple.org/feed.xml"/></label>
        <div className="form-grid"><label>ÉDITEUR<input value={publisher} onChange={e=>setPublisher(e.target.value)} placeholder="Organisation ou média"/></label><label>THÈME<select value={topic} onChange={e=>setTopic(e.target.value)}>{topics.map(x=><option key={x}>{x}</option>)}</select></label></div>
        <button className="primary" disabled={busy}><Plus size={15}/> AJOUTER À LA VEILLE</button>
      </form>}
      <div className="watch-feed-list">{feeds.map(feed=><div className="watch-feed" key={feed.id}><div><b>{feed.name}</b><small>{feed.publisher||feed.feed_url}</small><small>Dernière vérification : {feed.last_checked_at?new Date(feed.last_checked_at).toLocaleString('fr-FR'):'Jamais'}</small>{feed.last_error&&<small className="watch-error">{feed.last_error}</small>}</div><span className={'status-pill '+(feed.enabled?'published':'')}>{feed.enabled?'ACTIF':'PAUSÉ'}</span>{canEdit&&<button className="icon-button" onClick={()=>void toggleFeed(feed)} title={feed.enabled?'Mettre en pause':'Réactiver'}>{feed.enabled?<Pause size={15}/>:<Play size={15}/>}</button>}</div>)}{!feeds.length&&<p className="empty-state">Aucun flux enregistré. Ajoute une adresse RSS ou Atom pour commencer.</p>}</div>
    </section>
    <section className="admin-panel">
      <div className="panel-heading"><div><span className="admin-kicker">DÉTECTIONS</span><h2>Publications repérées</h2></div><span className="status-pill">{items.length} éléments</span></div>
      <div className="watch-items">{items.map(item=><article className="watch-item" key={item.id}>
        <div className="watch-item-meta"><span>{item.watch_sources?.name||'Source surveillée'}</span><span>{item.published_at?new Date(item.published_at).toLocaleDateString('fr-FR'):'Date inconnue'}</span></div>
        <h3>{item.title}</h3><p>{item.summary||'Aucun extrait disponible dans le flux.'}</p>
        <div className="watch-item-foot"><span className={'status-pill '+(item.status==='kept'?'published':item.status==='ignored'?'rejected':'review')}>{({pending:'À examiner',in_review:'En examen',kept:'Conservé',ignored:'Ignoré'} as Record<string,string>)[item.status]||item.status}</span><div className="row-actions">{item.item_url&&<a href={item.item_url} target="_blank" rel="noreferrer" aria-label="Ouvrir l'article"><ExternalLink size={15}/></a>}{canEdit&&item.status!=='kept'&&<button onClick={()=>void saveAsSource(item)}><Check size={14}/> Créer une source</button>}{canEdit&&item.status!=='ignored'&&<button onClick={()=>void setStatus(item,'ignored')}><X size={14}/> Ignorer</button>}{canEdit&&item.status==='pending'&&<button onClick={()=>void setStatus(item,'in_review')}>Examiner</button>}</div></div>
      </article>)}{!items.length&&<p className="empty-state">Aucune nouveauté détectée pour le moment.</p>}</div>
      {loading&&<p className="document-note">Actualisation des données…</p>}
    </section>
  </div>
}
