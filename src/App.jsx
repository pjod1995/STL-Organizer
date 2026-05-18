
import React,{useState} from 'react';
import { Pencil, Check } from 'lucide-react';

export default function App(){
 const [files,setFiles]=useState([{id:1,name:'example.stl'}]);
 const [renamingId,setRenamingId]=useState(null);
 const [renameValue,setRenameValue]=useState('');
 return <div style={{padding:40,color:'white',background:'#111',minHeight:'100vh'}}>
 <h1>Newest STL Organizer Build</h1>
 {files.map(file=><div key={file.id} style={{display:'flex',gap:10,alignItems:'center'}}>
 {renamingId===file.id?
 <>
 <input value={renameValue} onChange={e=>setRenameValue(e.target.value)} />
 <button onClick={()=>{setFiles([{...file,name:renameValue+'.stl'}]);setRenamingId(null)}}><Check/></button>
 </>
 :
 <>
 <span>{file.name}</span>
 <button onClick={()=>{setRenamingId(file.id);setRenameValue(file.name.replace('.stl',''))}}><Pencil/></button>
 </>
 }
 </div>)}
 </div>
}
