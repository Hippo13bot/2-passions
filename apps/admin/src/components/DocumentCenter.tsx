import { useEffect, useState, type FormEvent } from 'react'
import { FileText, Upload, ExternalLink, Save } from 'lucide-react'
import { supabase } from '../lib/supabase'

declare global { interface Window { Tesseract?: { createWorker:(language:string)=>Promise<{recognize:(input:any)=>Promise<{data:{text:string}}>;terminate:()=>Promise<void>}> }; pdfjsLib?: { GlobalWorkerOptions:{workerSrc:string}; getDocument:(input:any)=>{promise:Promise<{numPages:number;getPage:(n:number)=>Promise<any>}>} } } }
type Source={id:string;title:string;file_name:string|null;mime_type:string|null;storage_path:string|null;extracted_text:string|null;abstract:string|null;extraction_status:string;created_at:string}
const maxSize=50*1024*1024
const mimeByExtension:Record<string,string>={pdf:'application/pdf',jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp',tif:'image/tiff',tiff:'image/tiff',txt:'text/plain',md:'text/markdown',csv:'text/csv',html:'text/html',htm:'text/html',rtf:'application/rtf',doc:'application/msword',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',pptx:'application/vnd.openxmlformats-officedocument.presentationml.presentation',xlsx:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',odt:'application/vnd.oasis.opendocument.text',ods:'application/vnd.oasis.opendocument.spreadsheet',odp:'application/vnd.oasis.opendocument.presentation'}
export default function DocumentCenter({profileId,canEdit,onMessage}:{profileId:string;canEdit:boolean;onMessage:(message:string)=>void}){
 const [items,setItems]=useState<Source[]>([])
 const [file,setFile]=useState<File|null>(null)
 const [title,setTitle]=useState('')
 const [publisher,setPublisher]=useState('')
 const [date,setDate]=useState('')
 const [text,setText]=useState('')
 const [selected,setSelected]=useState<Source|null>(null)
 const [busy,setBusy]=useState(false)
 async function load(){if(!supabase)return;const {data,error}=await supabase.from('sources').select('id,title,file_name,mime_type,storage_path,extracted_text,abstract,extraction_status,created_at').not('storage_path','is',null).order('created_at',{ascending:false});if(error)onMessage(error.message);else setItems((data||[]) as Source[])}
 useEffect(()=>{void load()},[])
 async function upload(e:FormEvent){
  e.preventDefault();if(!supabase||!file||!canEdit)return
  if(file.size>maxSize){onMessage('Fichier trop volumineux : limite 50 Mo.');return}
  setBusy(true)
  const path=`${profileId}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`
  const extension=file.name.split('.').pop()?.toLowerCase()||''
  const mimeType=(!file.type||file.type==='application/octet-stream')?(mimeByExtension[extension]||'application/octet-stream'):file.type
  const {error:storageError}=await supabase.storage.from('source-documents').upload(path,file,{contentType:mimeType,upsert:false})
  if(storageError){setBusy(false);onMessage('Téléversement impossible : '+storageError.message);return}
  const isText=file.type.startsWith('text/')||/\.(txt|md|csv|html?)$/i.test(file.name)
  const extracted=isText?await file.text():''
  const {data,error}=await supabase.from('sources').insert({
   title:title||file.name,source_type:'document',publisher:publisher||null,published_on:date||null,
   file_name:file.name,mime_type:mimeType,storage_path:path,
   extracted_text:extracted||null,extraction_status:isText?'extracted':(mimeType.startsWith('image/')||mimeType==='application/pdf'?'needs_ocr':'uploaded'),
   notes:'Document importé dans le centre documentaire.',created_by:profileId
  }).select('id').single()
  if(error){await supabase.storage.from('source-documents').remove([path]);setBusy(false);onMessage('Enregistrement de la source impossible : '+error.message);return}
  await supabase.from('source_documents').insert({source_id:data.id,storage_path:path,file_name:file.name,mime_type:mimeType,file_size:file.size,extracted_text:extracted||null,extraction_status:isText?'extracted':(file.type.startsWith('image/')||file.type==='application/pdf'?'needs_ocr':'uploaded'),created_by:profileId})
  setBusy(false);setFile(null);setTitle('');setPublisher('');setDate('');onMessage(isText?'Document importé et texte indexé.':mimeType.startsWith('image/')?'Image importée. Lance l’OCR puis relis le texte reconnu.':mimeType==='application/pdf'?'PDF importé. Lance l’extraction des pages puis relis le texte reconnu.':'Document importé. Le texte peut être ajouté dans l’éditeur documentaire.');await load()
 }
 async function runImageOcr(item:Source){
  if(!supabase||!item.storage_path)return
  setBusy(true);onMessage('Chargement du moteur OCR français dans le navigateur…')
  try{
   if(!window.Tesseract){await new Promise<void>((resolve,reject)=>{const script=document.createElement('script');script.src='https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';script.onload=()=>resolve();script.onerror=()=>reject(new Error('Chargement de Tesseract impossible.'));document.head.appendChild(script)})}
   const {data:signed,error}=await supabase.storage.from('source-documents').createSignedUrl(item.storage_path,300)
   if(error||!signed?.signedUrl)throw new Error(error?.message||'Fichier inaccessible.')
   const response=await fetch(signed.signedUrl);if(!response.ok)throw new Error('Téléchargement du document impossible.')
   const blob=await response.blob();const worker=await window.Tesseract!.createWorker('fra')
   try{const result=await worker.recognize(blob);setSelected(item);setText(result.data.text||'');onMessage('OCR terminé. Relis et corrige le texte avant de l’enregistrer.')}finally{await worker.terminate()}
  }catch(error){onMessage('OCR impossible : '+(error instanceof Error?error.message:'erreur inconnue'))}
  setBusy(false)
 }
 async function runPdfExtraction(item:Source){
  if(!supabase||!item.storage_path)return
  setBusy(true);onMessage('Lecture du PDF : extraction du texte et OCR des pages numérisées si nécessaire…')
  let worker:{recognize:(input:any)=>Promise<{data:{text:string}}>;terminate:()=>Promise<void>}|null=null
  try{
   if(!window.pdfjsLib){await new Promise<void>((resolve,reject)=>{const script=document.createElement('script');script.src='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';script.onload=()=>resolve();script.onerror=()=>reject(new Error('Chargement du lecteur PDF impossible.'));document.head.appendChild(script)})}
   window.pdfjsLib!.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
   const {data:signed,error}=await supabase.storage.from('source-documents').createSignedUrl(item.storage_path,300)
   if(error||!signed?.signedUrl)throw new Error(error?.message||'Fichier inaccessible.')
   const response=await fetch(signed.signedUrl);if(!response.ok)throw new Error('Téléchargement du PDF impossible.')
   const bytes=new Uint8Array(await response.arrayBuffer())
   const pdf=await window.pdfjsLib!.getDocument({data:bytes}).promise
   const pageCount=Math.min(pdf.numPages,15)
   const pages:string[]=[]
   for(let pageNumber=1;pageNumber<=pageCount;pageNumber++){
    const page=await pdf.getPage(pageNumber)
    const content=await page.getTextContent()
    let pageText=content.items.map((entry:any)=>entry.str||'').join(' ').trim()
    if(pageText.length<30){
     if(!window.Tesseract){await new Promise<void>((resolve,reject)=>{const script=document.createElement('script');script.src='https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';script.onload=()=>resolve();script.onerror=()=>reject(new Error('Chargement du moteur OCR impossible.'));document.head.appendChild(script)})}
     if(!worker)worker=await window.Tesseract!.createWorker('fra')
     const viewport=page.getViewport({scale:1.5})
     const canvas=document.createElement('canvas');canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height)
     const context=canvas.getContext('2d');if(!context)throw new Error('Canvas indisponible pour cette page.')
     await page.render({canvasContext:context,viewport}).promise
     const recognized=await worker.recognize(canvas);pageText=recognized.data.text||''
    }
    pages.push(`[Page ${pageNumber}]\n${pageText}`)
   }
   setSelected(item);setText(pages.join('\n\n'))
   onMessage(`Extraction terminée : ${pageCount} page(s) traitée(s)${pdf.numPages>pageCount?' (seules les 15 premières pages sont traitées dans cette version)':''}. Relis le texte avant de l’enregistrer.`)
  }catch(error){onMessage('Extraction PDF impossible : '+(error instanceof Error?error.message:'erreur inconnue'))}
  finally{if(worker)await worker.terminate();setBusy(false)}
 }
 async function editText(){
  if(!supabase||!selected)return
  setBusy(true)
  const {error}=await supabase.from('sources').update({extracted_text:text,extraction_status:text.trim()?'extracted':'uploaded'}).eq('id',selected.id)
  if(!error)await supabase.from('source_documents').update({extracted_text:text,extraction_status:text.trim()?'extracted':'uploaded'}).eq('source_id',selected.id)
  setBusy(false);if(error)onMessage(error.message);else{onMessage('Texte documentaire enregistré.');setSelected({...selected,extracted_text:text,extraction_status:text.trim()?'extracted':'uploaded'});await load()}
 }
 async function openFile(item:Source){
  if(!supabase||!item.storage_path)return
  const {data,error}=await supabase.storage.from('source-documents').createSignedUrl(item.storage_path,300)
  if(error)onMessage(error.message);else window.open(data.signedUrl,'_blank','noopener,noreferrer')
 }
 return <div className="document-layout">
  <section className="admin-panel"><div className="panel-heading"><div><span className="admin-kicker">IMPORT DOCUMENTAIRE</span><h2>Ajouter un document</h2></div><FileText/></div>
   <p className="document-note">PDF, images, textes et documents bureautiques acceptés jusqu'à 50 Mo. Les images peuvent être lues par OCR dans le navigateur ; le texte doit être relu. Les PDF sont conservés et leur texte peut être collé dans l'éditeur. Les originaux restent privés.</p>
   <form onSubmit={upload}>
    <label>FICHIER<input type="file" required accept=".pdf,.jpg,.jpeg,.png,.webp,.tif,.tiff,.txt,.md,.csv,.html,.htm,.rtf,.doc,.docx,.pptx,.xlsx,.odt,.ods,.odp" onChange={e=>setFile(e.target.files?.[0]||null)}/></label>
    <label>TITRE DOCUMENTAIRE<input value={title} onChange={e=>setTitle(e.target.value)} placeholder={file?.name||'Titre du document'}/></label>
    <div className="form-grid"><label>AUTEUR / ORGANISATION<input value={publisher} onChange={e=>setPublisher(e.target.value)}/></label><label>DATE DE PUBLICATION<input type="date" value={date} onChange={e=>setDate(e.target.value)}/></label></div>
    {file&&<p className="document-note">{file.name} · {(file.size/1024/1024).toFixed(2)} Mo · {file.type||'type inconnu'}</p>}
    <button className="primary" disabled={busy||!file}><Upload size={15}/>{busy?'IMPORT…':'IMPORTER LE DOCUMENT'}</button>
   </form>
  </section>
  <section className="admin-panel"><div className="panel-heading"><div><span className="admin-kicker">FONDS DOCUMENTAIRE</span><h2>Documents importés</h2></div><span className="status-pill">{items.length} fichiers</span></div>
   {items.map(item=><div className="data-row" key={item.id}><div><b>{item.title}</b><small>{item.file_name} · {item.mime_type} · {new Date(item.created_at).toLocaleDateString('fr-FR')}</small><small>{item.extraction_status==='extracted'?'Texte disponible':item.extraction_status==='needs_ocr'?'OCR nécessaire':'Texte à compléter'}</small></div>{item.mime_type?.startsWith('image/')&&<button className="icon-button" disabled={busy} onClick={()=>void runImageOcr(item)} title="Reconnaissance de texte par OCR"><span>OCR</span></button>}{item.mime_type==='application/pdf'&&<button className="icon-button" disabled={busy} onClick={()=>void runPdfExtraction(item)} title="Extraire le texte et lancer l’OCR des pages scannées"><span>PDF</span></button>}<button className="icon-button" onClick={()=>{setSelected(item);setText(item.extracted_text||'')}} title="Modifier le texte extrait"><Save size={15}/></button><button className="icon-button" onClick={()=>void openFile(item)} title="Ouvrir le fichier"><ExternalLink size={15}/></button></div>)}
   {!items.length&&<p className="empty-state">Aucun document importé.</p>}
  </section>
  {selected&&<section className="admin-panel"><div className="panel-heading"><div><span className="admin-kicker">TEXTE INDEXÉ</span><h2>{selected.title}</h2></div><button className="icon-button" onClick={()=>setSelected(null)}>✕</button></div><p className="document-note">Tu peux coller ici le texte extrait d'un PDF scanné ou d'une image. Il sera conservé avec la source pour la recherche et les futures synthèses.</p><textarea className="document-textarea" rows={14} value={text} onChange={e=>setText(e.target.value)} placeholder="Texte intégral extrait du document…"/><button className="primary" disabled={busy} onClick={()=>void editText()}><Save size={15}/> ENREGISTRER LE TEXTE</button></section>}
 </div>
}
