/* ============================================================
   42-views-agents.js — Import CV, RFP, Credentials, Configuration, Données
   ============================================================ */

/* ---------- analyse locale de CV (sans clé API) : mots-clés de la taxonomie ---------- */
const LocalCV = {
  parse(text, filename){
    const base = String(filename||"").replace(/\.[a-z0-9]+$/i,"").replace(/^\d{6,8}[_ -]*/,"").replace(/^(cv|profil)[_ -]*/i,"").replace(/[_-]+/g," ").trim();
    const nameParts = base.split(/\s+/).filter(Boolean).map(w=> w===w.toUpperCase() ? w.toLowerCase().replace(/(^|[-' ])([a-z\u00e0-\u00ff])/g,(m,a,b)=>a+b.toUpperCase()) : w);
    const roleM = text.match(/^(Senior Manager|Manager|Consultant(?:e)? (?:senior|junior)?|Consultant(?:e)?|Analyst|Associate|Directeur[^\n]{0,30}|Managing Director)[^\n]{0,60}/mi);
    const role = roleM ? roleM[0].trim() : "";
    const grade = /senior manager|directeur|managing/i.test(role)?"Senior Manager":/^manager/i.test(role)?"Manager":/consultant(e)? senior|senior consultant/i.test(role)?"Senior Consultant":/analyst|junior|associate|stagiaire/i.test(role)?"Analyst":"Consultant";
    const base0 = {"Associate":1,"Analyst":2,"Consultant":2,"Manager":3,"Senior Manager":4}[grade]||2;
    const skills={}; const evidence={};
    TAXONOMY.skills.forEach(sk=>{ if(!sk.kw) return; let re; try{ re=new RegExp(sk.kw,"gi"); }catch(e){ return; }
      const hits = text.match(re); if(!hits) return; const n=hits.length; let lv=base0; if(n>=6) lv++; if(n<=1) lv--; lv=clamp(lv,1,5);
      const yrs = [...text.matchAll(new RegExp(`(20\\d\\d)[^\\n]{0,200}(?:${sk.kw})|(?:${sk.kw})[^\\n]{0,200}(20\\d\\d)`,"gi"))].map(m=>+(m[1]||m[2])).filter(Boolean);
      skills[sk.id]=[lv,1,yrs.length?Math.max(...yrs):null,n>=2?1:0]; evidence[sk.id]=`${n} mention(s)`; });
    const lobs={}; (TAXONOMY.lobs||[]).forEach(l=>{ if(!l.kw) return; let re; try{ re=new RegExp(l.kw,"gi"); }catch(e){ return; } const n=(text.match(re)||[]).length; if(n) lobs[l.id]=[n<=2?1:(n<=8?2:3), null, n>=3?1:0]; });
    const bioM = text.split(/\n+/).find(l=>l.length>120 && /exp[ée]rience|dipl[oô]m/i.test(l));
    const xpM = text.match(/(\d{1,2})\s*(?:ans|années)\s+d.exp/i);
    const projects=[]; const lines=text.split(/\n+/); let cur=null;
    lines.forEach(l=>{ l=l.trim(); if(/[–—:-]/.test(l)&&/20\d\d|janvier|f[ée]vrier|mars|avril|mai|juin|juillet|ao[uû]t|septembre|octobre|novembre|d[ée]cembre|depuis/i.test(l)&&l.length<170){ if(cur&&cur.responsibilities.length) projects.push(cur); cur={projectName:l.slice(0,120),clientType:l.split(/\s[–—-]\s/)[0].slice(0,50),insuranceLine:"",domain:"",role:"",duration:(l.match(/20\d\d(?:[^\n]{0,20}20\d\d)?/)||[""])[0],impact:"",technologies:[],responsibilities:[]}; }
      else if(cur&&cur.responsibilities.length<5&&l.length>15) cur.responsibilities.push(l.slice(0,160)); });
    if(cur&&cur.responsibilities.length) projects.push(cur);
    projects.forEach(pr=>{ pr.impact = pr.responsibilities[0]||""; });
    return Agents.normalizeProfile({ firstName:nameParts[0]||"", lastName:nameParts.slice(1).join(" "), grade, role, headline:"", shortBio:bioM||"", yearsExperience:xpM?+xpM[1]:0,
      languages:["Français"], education:[], certifications:/institut des actuaires/i.test(text)?["Institut des Actuaires"]:[], tools:[], industries:[], keyStrengths:[], skills, lobs, skillEvidence:evidence, selectedProjects:projects.slice(0,8) }, filename);
  }
};

/* ---------- IMPORT CV ---------- */
const ImportCV = {
  queue: [],
  render(){
    $("importAgent").innerHTML = LLM.ready() ? `<span class="badge b-green">Agent prêt · ${esc(LLM.cfg().provider)} / ${esc(LLM.cfg().model)}</span>` : `<span class="badge b-amber">Sans clé API : analyse locale par mots-clés (moins fine)</span> <button class="btn sm ghost" onclick="App.go('settings')">Configurer</button>`;
    this.renderQueue();
  },
  addFiles(files){ [...files].forEach(f=>this.queue.push({file:f, name:f.name, status:"En attente", parsed:null, text:"", mode:"enrich", err:""})); this.renderQueue(); },
  renderQueue(){
    const q=this.queue; if(!q.length){ $("importQueue").innerHTML=`<p class="muted small">Aucun fichier en attente. Déposez des CV (PPTX, DOCX, PDF, TXT) ci-dessus.</p>`; return; }
    const todo=q.filter(x=>!x.parsed&&!x.err).length;
    $("importQueue").innerHTML = `<div style="display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap;align-items:center"><button class="btn primary" onclick="ImportCV.analyzeAll()" ${todo?"":"disabled"}>${todo?`Analyser ${todo} fichier(s)`:"Tout est analysé"}</button><button class="btn" onclick="ImportCV.applyAll()" ${q.some(x=>x.parsed&&!x.applied)?"":"disabled"}>Appliquer tout</button><button class="btn ghost" onclick="ImportCV.queue=[];ImportCV.renderQueue()">Vider la file</button></div>` +
      q.map((it,i)=>{ const p=it.parsed; const ex = p? Agents.findExisting(p) : null;
        const top = p? Object.entries(p.skills).sort((a,b)=>b[1][0]-a[1][0]).slice(0,8).map(([id,v])=>`<span class="badge b-violet" title="${esc(p.skillEvidence?.[id]||"")}">${esc(skillById(id)?.name||id)} ${v[0]}</span>`).join(" ") : "";
        return `<div class="card" style="margin-bottom:10px"><div class="bd">
          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap"><b>${esc(it.name)}</b><span class="badge ${it.err?"b-rose":p?"b-green":"b-grey"}">${esc(it.err||it.status)}</span>${it.applied?'<span class="badge b-teal">appliqué</span>':""}<span style="flex:1"></span>
            ${!p&&!it.err?`<button class="btn sm" onclick="ImportCV.analyze(${i})">Analyser</button>`:""}<button class="btn sm ghost" onclick="ImportCV.queue.splice(${i},1);ImportCV.renderQueue()">Retirer</button></div>
          ${p?`<div style="margin-top:10px;display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div><div class="frow"><input value="${esc(p.displayName)}" onchange="ImportCV.queue[${i}].parsed.displayName=this.value;ImportCV.queue[${i}].parsed.id='p_'+slugify(this.value)" style="flex:2"><select onchange="ImportCV.queue[${i}].parsed.grade=this.value">${GRADES.map(g=>`<option ${g===p.grade?"selected":""}>${g}</option>`).join("")}</select></div>
              <div class="small muted" style="margin-top:6px">${esc(p.role)} · ${esc(yrs(p.yearsExperience))} · ${p.selectedProjects.length} expérience(s) · ${Object.keys(p.skills).length} compétences détectées</div>
              <p class="small" style="margin-top:6px;color:var(--ink-2)">${esc((p.shortBio||"").slice(0,260))}</p></div>
            <div><div style="display:flex;flex-wrap:wrap;gap:5px">${top}</div>
              <div style="display:flex;flex-wrap:wrap;gap:5px;margin-top:6px">${Object.entries(p.lobs||{}).filter(([,v])=>v[0]>=1).map(([id,v])=>`<span class="badge b-teal">${esc(lobShort(id))} ${LOB_LEVELS[v[0]]}</span>`).join("")}</div>
              ${p.newSkillSuggestions?.length?`<div class="small" style="margin-top:8px"><b>Compétences hors taxonomie :</b> ${p.newSkillSuggestions.map((s,k)=>`<label class="toggle small"><input type="checkbox" data-q="${i}" data-k="${k}" class="newsk"> ${esc(s.name)} <span class="muted">(${esc(domainName(s.dom))})</span></label>`).join(" ")}</div>`:""}
              <div style="margin-top:10px;display:flex;gap:8px;align-items:center;flex-wrap:wrap">
                ${ex?`<span class="small">Profil existant : <b>${esc(ex.displayName)}</b></span><select onchange="ImportCV.queue[${i}].mode=this.value"><option value="enrich" ${it.mode==="enrich"?"selected":""}>Enrichir (niveau max, champs vides)</option><option value="replace" ${it.mode==="replace"?"selected":""}>Remplacer par le CV</option><option value="new" ${it.mode==="new"?"selected":""}>Créer un second profil</option></select>`:`<span class="small muted">Nouveau profil</span>`}
                ${it.applied?"":`<button class="btn sm primary" onclick="ImportCV.apply(${i})">Appliquer</button>`}</div></div></div>`:""}
        </div></div>`; }).join("");
  },
  async analyze(i){
    const it=this.queue[i]; it.err=""; it.status="Lecture…"; this.renderQueue();
    try{ it.text = await Parsers.fileToText(it.file); if(!it.text.trim()) throw new Error("Aucun texte extrait (document image ?)");
      it.status = LLM.ready()? "Analyse par l'agent…" : "Analyse locale…"; this.renderQueue();
      it.parsed = LLM.ready() ? await Agents.run(`Analyse ${it.name}`, ()=>Agents.parseCV(it.text, it.name)) : LocalCV.parse(it.text, it.name);
      it.parsed.cvText = it.text.slice(0, 20000); it.parsed.source = { kind:"cv", file:it.name, importedAt:isoDate(), agent: LLM.ready()? `${LLM.cfg().provider}/${LLM.cfg().model}` : "local-keywords" };
      it.status="Analysé"; }
    catch(e){ it.err = e.message; it.status="Erreur"; }
    this.renderQueue();
  },
  async analyzeAll(){ for(let i=0;i<this.queue.length;i++){ if(!this.queue[i].parsed && !this.queue[i].err) await this.analyze(i); } },
  apply(i){
    const it=this.queue[i], p=it.parsed; if(!p||it.applied) return;
    document.querySelectorAll(`input.newsk[data-q="${i}"]:checked`).forEach(cb=>{ const s=p.newSkillSuggestions[+cb.dataset.k]; if(s?.name) Agents.applyProposal({type:"add",skill:{name:s.name,dom:s.dom,cat:"core",critical:false,kw:slugify(s.name).replace(/_/g,"[ -]?")}}); });
    const ex = it.mode!=="new" ? Agents.findExisting(p) : null;
    if(ex){ Agents.mergeInto(ex, p, it.mode); }
    else { if(PEOPLE.some(x=>x.id===p.id)) p.id += "_"+Math.random().toString(36).slice(2,5); PEOPLE.push(p); }
    it.applied=true; Store.touch(); App.renderAll(); this.renderQueue(); toast(`${p.displayName} ${ex?"mis à jour":"ajouté"}.`);
  },
  applyAll(){ this.queue.forEach((it,i)=>{ if(it.parsed&&!it.applied) this.apply(i); }); }
};

/* ---------- RFP MATCHING ---------- */
const RFP = {
  need: null, ranking: null, ai: null,
  render(){
    $("rfpAgent").innerHTML = LLM.ready() ? `<span class="badge b-green">Agent prêt</span>` : `<span class="badge b-amber">Sans clé API : analyse locale par mots-clés</span>`;
    if(this.need) this.renderResults();
  },
  async fromFile(file){ try{ const t = await Parsers.fileToText(file); $("rfpText").value = t.slice(0,60000); toast(`${file.name} lu (${t.length} caractères).`); }catch(e){ toast(e.message,true); } },
  needFromLocal(text){
    const n = Search.parse(text);
    return { id:"rfp_"+Date.now(), title:"Besoin exprimé (analyse locale)", client:"", summary:text.slice(0,220)+(text.length>220?"…":""), skills:n.skills.map(id=>({id,importance:2,minLevel:3,why:""})), domains:n.domains, lobs:n.lobs||[],
      grades:n.grades.map(g=>({grade:g,count:1,role:""})), languages:n.langs, startWithinDays:n.maxDays, durationMonths:null, location:"", teamSize:null, keyRisks:[], questionsToClarify:[], raw:text.slice(0,4000), analyzedAt:isoDate(), local:true };
  },
  async run(useAgent){
    const text = $("rfpText").value.trim(); if(!text) return toast("Collez le RFP ou décrivez le besoin.", true);
    this.ai=null;
    this.need = (useAgent && LLM.ready()) ? await Agents.run("Analyse du RFP", ()=>Agents.analyzeRFP(text)) : this.needFromLocal(text);
    this.ranking = Search.rank(this.need);
    RFPS.unshift(this.need); RFPS = RFPS.slice(0,10);
    if(useAgent && LLM.ready()){ try{ this.ai = await Agents.run("Composition d'équipe", ()=>Agents.rerankRFP(this.need, this.ranking)); }catch(e){} }
    this.renderResults();
  },
  renderResults(){
    const n=this.need, R=this.ranking||[];
    const ai=this.ai; const fitOf = id => ai?.ranking?.find(x=>x.personId===id);
    const list = ai?.ranking?.length ? ai.ranking.map(x=>R.find(r=>r.p.id===x.personId)).filter(Boolean).concat(R.filter(r=>!ai.ranking.some(x=>x.personId===r.p.id))) : R;
    $("rfpNeed").innerHTML = `<div class="card"><div class="hd"><h3>${esc(n.title||"Besoin")}${n.client?` — ${esc(n.client)}`:""}</h3><span class="note">${n.local?"analyse locale":"analyse par l'agent"} · ${esc(n.analyzedAt)}</span></div><div class="bd">
      ${n.summary?`<p class="small" style="color:var(--ink-2);margin-bottom:8px">${esc(n.summary)}</p>`:""}
      <div style="display:flex;flex-wrap:wrap;gap:5px;margin-bottom:8px">${n.skills.map(s=>`<span class="badge b-violet" title="${esc(s.why||"")}">${esc(skillById(s.id)?.name||s.id)} · imp. ${s.importance} · min ${s.minLevel}</span>`).join("")||'<span class="muted small">Aucune compétence détectée — précisez le besoin.</span>'}</div>
      <div style="display:flex;flex-wrap:wrap;gap:5px;margin-bottom:8px">${(n.domains||[]).map(d=>`<span class="chip">${esc(domShort(d))}</span>`).join("")}${(n.lobs||[]).map(l=>`<span class="badge b-teal">${esc(lobName(l))}</span>`).join("")}</div>
      <div class="small muted">${n.grades.length?`Grades : ${n.grades.map(g=>`${g.count}× ${g.grade}${g.role?" ("+g.role+")":""}`).join(", ")} · `:""}${n.languages.length?`Langues : ${n.languages.join(", ")} · `:""}${n.startWithinDays!=null?`Démarrage sous ${n.startWithinDays} j · `:""}${n.durationMonths?`Durée ${n.durationMonths} mois · `:""}${n.teamSize?`Équipe ${n.teamSize}`:""}</div>
      ${n.questionsToClarify?.length?`<div class="small" style="margin-top:8px"><b>À clarifier :</b> ${n.questionsToClarify.map(esc).join(" · ")}</div>`:""}
      ${n.keyRisks?.length?`<div class="small" style="margin-top:4px"><b>Risques :</b> ${n.keyRisks.map(esc).join(" · ")}</div>`:""}</div></div>`;
    $("rfpTeam").innerHTML = ai ? `<div class="card" style="border-color:var(--violet)"><div class="hd"><h3>Équipe proposée par l'agent</h3><span class="note">à valider</span></div><div class="bd">
        ${ai.pitch?`<p class="small" style="color:var(--ink-2);margin-bottom:10px">${esc(ai.pitch)}</p>`:""}
        ${(ai.team||[]).map(t=>{ const p=PEOPLE.find(x=>x.id===t.personId); return p?`<div class="proj"><div class="pn">${esc(p.displayName)} <span class="badge b-grey">${esc(p.grade)}</span> <span class="badge b-violet">${esc(t.role||"")}</span></div><div class="pi">${esc(t.rationale||"")}</div></div>`:""; }).join("")||'<p class="muted small">—</p>'}
        ${ai.gaps?.length?`<div class="small" style="margin-top:8px;color:var(--rose)"><b>Manques :</b> ${ai.gaps.map(esc).join(" · ")}</div>`:""}
        <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap"><button class="btn sm primary" onclick="RFP.selectTeam()">Retenir cette équipe</button><button class="btn sm" onclick="RFP.toCV()">CV ciblés sur ce besoin</button></div></div></div>` : "";
    $("rfpResults").innerHTML = list.slice(0,12).map(r=>{ const a=availInfo(r.p), f=fitOf(r.p.id); const d=r.detail;
        const segs=[["Compétences",d.skills,40,"var(--violet)"],["Étape",d.domain,10,"#be82ff"],["LoB",d.lob,10,"var(--teal)"],["Séniorité",d.seniority,15,"#460073"],["Dispo",d.availability,10,"var(--green)"],["Langues",d.languages,10,"var(--blue)"],["Expérience",d.experience,5,"var(--amber)"]];
        return `<div class="mres"><div class="score-ring" style="--p:${f?f.fit:r.total}" title="${f?"Fit agent":"Score local"}"><span>${f?f.fit:r.total}</span></div>
          <div><div style="display:flex;gap:9px;align-items:center;flex-wrap:wrap"><b style="font-size:1rem;cursor:pointer" onclick="Drawer.open('${r.p.id}')">${esc(r.p.displayName)}</b><span class="badge b-grey">${esc(r.p.grade)}</span><span class="badge ${a.badge}">${a.label}${a.from&&a.dot!=="av"?" · "+a.from:""}</span>${f?`<span class="badge b-violet">${esc(f.role||"")}</span>`:""}</div>
            ${f?`<div class="why" style="margin-top:6px"><b>Agent :</b> ${esc(f.rationale)}</div>`:""}
            <div class="why" style="margin-top:6px">${r.why.slice(0,5).join(" · ")||"<span class='muted'>Pas de correspondance forte explicite.</span>"}</div>
            ${r.gaps.length?`<div class="gapline">Gaps : ${r.gaps.slice(0,4).join(" · ")}</div>`:""}
            <div class="sbar">${segs.map(([n2,v,m,c])=>v?`<i style="width:${v}%;background:${c}" title="${n2} ${v}/${m}"></i>`:"").join("")}</div><div class="sbar-leg">${segs.map(([n2,v,m,c])=>`<span><i style="background:${c}"></i>${n2} ${v}/${m}</span>`).join("")}</div></div>
          <div style="display:flex;flex-direction:column;gap:7px"><button class="btn sm ${State.selection.has(r.p.id)?"":"primary"}" onclick="Selection.toggle('${r.p.id}');RFP.renderResults()">${State.selection.has(r.p.id)?"✓ Retenu":"Retenir"}</button><button class="btn sm ghost" onclick="Drawer.open('${r.p.id}')">Profil</button></div></div>`; }).join("") || `<p class="muted small">Aucun profil.</p>`;
  },
  selectTeam(){ (this.ai?.team||[]).forEach(t=>State.selection.add(t.personId)); Selection.refresh(); this.renderResults(); toast("Équipe retenue dans la sélection."); },
  toCV(){ State.cvNeed = this.need; App.go("cvgen"); }
};

/* ---------- CREDENTIALS ---------- */
const Creds = {
  render(){
    const f=State.credFilters, q=f.q.trim().toLowerCase();
    $("credFilters").innerHTML = `<div><label>Domaine</label><select id="cfDom"><option value="">Tous</option>${TAXONOMY.domains.map(d=>`<option value="${d.id}" ${f.domain===d.id?"selected":""}>${esc(d.name)}</option>`).join("")}</select></div>
      <div style="flex:1;min-width:170px"><label>Recherche</label><input type="search" id="cfQ" value="${esc(f.q)}" placeholder="client, sujet, livrable…" style="width:100%"></div>
      <button class="btn sm primary" onclick="Creds.generate('selection')" title="Génère des credentials depuis les expériences des profils sélectionnés">Générer (sélection ${State.selection.size})</button>
      <button class="btn sm" onclick="Creds.generate('all')">Générer (tous)</button>
      <button class="btn sm" onclick="Exports.credentialsPptx()">PPTX</button><button class="btn sm" onclick="Exports.credentialsExcel()">Excel</button>`;
    $("cfDom").addEventListener("change",()=>{ f.domain=$("cfDom").value; Creds.render(); }); $("cfQ").addEventListener("input",()=>{ f.q=$("cfQ").value; Creds.renderList(); });
    this.renderList();
  },
  renderList(){
    const f=State.credFilters, q=f.q.trim().toLowerCase();
    const list = CREDENTIALS.filter(c=>(!f.domain||(c.domains||[]).includes(f.domain)) && (!q || [c.title,c.client,c.clientAnonymized,c.context,c.approach,(c.results||[]).join(" "),(c.deliverables||[]).join(" ")].join(" ").toLowerCase().includes(q)));
    $("credKpis").innerHTML = kpiHtml("",CREDENTIALS.length,"Credentials","en bibliothèque")+kpiHtml("g",CREDENTIALS.filter(c=>c.status==="validated").length,"Validées","prêtes pour proposition")+kpiHtml("a",CREDENTIALS.filter(c=>c.status!=="validated").length,"Brouillons","à relire")+kpiHtml("b",uniq(CREDENTIALS.map(c=>c.clientAnonymized||c.client).filter(Boolean)).length,"Clients / types d'acteurs","couverts");
    $("credList").innerHTML = list.map((c,i)=>`<div class="card cred ${c.status==="validated"?"ok":""}"><div class="bd">
        <div style="display:flex;gap:8px;align-items:flex-start;flex-wrap:wrap"><div style="flex:1;min-width:0"><div style="font-weight:650;font-size:.98rem">${esc(c.title)}</div><div class="small muted">${esc(c.client||c.clientAnonymized)}${c.client&&c.clientAnonymized?` · <i>${esc(c.clientAnonymized)}</i>`:""}${c.period?` · ${esc(c.period)}`:""}${c.lob?` · ${esc(c.lob)}`:""}</div></div>
          <span class="badge ${c.status==="validated"?"b-green":"b-amber"}">${c.status==="validated"?"validée":"brouillon"}</span><span class="badge b-grey">${esc(c.confidence)}</span></div>
        <div class="cred-grid">
          <div><div class="k">Contexte</div><div contenteditable="true" class="ed" onblur="Creds.set('${c.id}','context',this.innerText)">${esc(c.context)}</div></div>
          <div><div class="k">Enjeu</div><div contenteditable="true" class="ed" onblur="Creds.set('${c.id}','challenge',this.innerText)">${esc(c.challenge)}</div></div>
          <div><div class="k">Approche</div><div contenteditable="true" class="ed" onblur="Creds.set('${c.id}','approach',this.innerText)">${esc(c.approach)}</div></div>
          <div><div class="k">Résultats</div><div contenteditable="true" class="ed" onblur="Creds.setList('${c.id}','results',this.innerText)">${(c.results||[]).map(esc).join("\n")}</div></div>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:5px;margin-top:8px">${(c.domains||[]).map(d=>`<span class="chip">${esc(domainName(d))}</span>`).join("")}${(c.skills||[]).slice(0,6).map(s=>`<span class="badge b-violet">${esc(skillById(s)?.name||s)}</span>`).join("")}</div>
        <div class="small muted" style="margin-top:6px">Consultants : ${(c.personIds||[]).map(id=>PEOPLE.find(p=>p.id===id)?.displayName||id).map(esc).join(", ")||"—"}${c.team?` · ${esc(c.team)}`:""}</div>
        <div style="display:flex;gap:8px;margin-top:10px"><button class="btn sm ${c.status==="validated"?"":"primary"}" onclick="Creds.set('${c.id}','status','${c.status==="validated"?"draft":"validated"}');Creds.renderList()">${c.status==="validated"?"Repasser en brouillon":"Valider"}</button><button class="btn sm ghost" style="color:var(--rose)" onclick="Creds.remove('${c.id}')">Supprimer</button></div>
      </div></div>`).join("") || emptyState("Aucune credential", "Sélectionnez des profils puis « Générer » : l'agent transforme leurs expériences en références commerciales relues et éditables.");
  },
  set(id,k,v){ const c=CREDENTIALS.find(x=>x.id===id); if(!c) return; c[k]=String(v).trim(); Store.touch(); },
  setList(id,k,v){ const c=CREDENTIALS.find(x=>x.id===id); if(!c) return; c[k]=String(v).split(/\n+/).map(s=>s.trim()).filter(Boolean); Store.touch(); },
  remove(id){ CREDENTIALS=CREDENTIALS.filter(c=>c.id!==id); Store.touch(); this.renderList(); },
  async generate(scope){
    if(!LLM.ready()) return toast("Configurez un fournisseur et une clé API (Configuration).", true);
    const list = scope==="selection" ? Selection.people() : PEOPLE.filter(p=>(p.selectedProjects||[]).length);
    if(!list.length) return toast("Sélectionnez au moins un profil ayant des expériences.", true);
    const batches=[]; for(let i=0;i<list.length;i+=6) batches.push(list.slice(i,i+6));
    let n=0;
    for(const b of batches){ const out = await Agents.run(`Credentials (${b.map(p=>p.displayName.split(" ")[0]).join(", ")})`, ()=>Agents.writeCredentials(b));
      out.forEach(c=>{ const dup = CREDENTIALS.find(x=>normName(x.title).slice(0,40)===normName(c.title).slice(0,40)); if(dup){ dup.personIds = uniq([...dup.personIds,...c.personIds]); } else { CREDENTIALS.push(c); n++; } }); }
    Store.touch(); this.render(); toast(`${n} credential(s) générée(s) — à relire et valider.`);
  }
};

/* ---------- CONFIGURATION (agents & clés) ---------- */
const Settings = {
  render(){
    const s=Store.settings, P=LLM.PROVIDERS, p=P[s.provider]||P.custom;
    $("setProvider").innerHTML = Object.entries(P).map(([k,v])=>`<option value="${k}" ${k===s.provider?"selected":""}>${esc(v.name)}</option>`).join("");
    $("setModel").value = s.model || p.defaultModel || ""; $("setModelList").innerHTML = p.models.map(m=>`<option value="${esc(m)}">`).join("");
    $("setKey").value = s.apiKey||""; $("setBase").value = s.baseUrl||""; $("setBasePh").textContent = p.base||"https://…/v1"; $("setTemp").value = s.temperature; $("setMax").value = s.maxTokens;
    $("setHelp").textContent = p.help||""; $("setCvLang").value = s.cvLanguage||"fr";
    $("setPractice").value = s.practiceName||"I&E Insurance"; const lp=$("setLogoPreview"); if(lp){ if(s.logo){ lp.src=s.logo; lp.style.display="inline-block"; } else { lp.removeAttribute("src"); lp.style.display="none"; } }
    $("ghToken").value=s.github.token||""; $("ghOwner").value=s.github.owner||""; $("ghRepo").value=s.github.repo||""; $("ghBranch").value=s.github.branch||"main"; $("ghPath").value=s.github.path||"data/team.json";
    $("promptEditors").innerHTML = Object.entries(Agents.PROMPTS).map(([id,txt])=>`<details class="prompt"><summary>${esc(id)} ${s.prompts?.[id]?'<span class="badge b-amber">personnalisé</span>':""}</summary><textarea id="pr_${id}" rows="6">${esc(s.prompts?.[id]||txt)}</textarea><div style="display:flex;gap:8px;margin-top:6px"><button class="btn sm" onclick="Settings.savePrompt('${id}')">Enregistrer</button><button class="btn sm ghost" onclick="Settings.resetPrompt('${id}')">Défaut</button></div></details>`).join("");
    $("agentLog").textContent = State.agentLog.join("\n") || "—";
  },
  onProvider(){ const k=$("setProvider").value, p=LLM.PROVIDERS[k]; Store.saveSettings({provider:k, model:p.defaultModel||""}); this.render(); },
  save(){ Store.saveSettings({ provider:$("setProvider").value, model:$("setModel").value.trim(), apiKey:$("setKey").value.trim(), baseUrl:$("setBase").value.trim(), temperature:+$("setTemp").value||0.2, maxTokens:+$("setMax").value||4000, cvLanguage:$("setCvLang").value, practiceName:$("setPractice").value.trim()||"I&E Insurance",
      github:{ token:$("ghToken").value.trim(), owner:$("ghOwner").value.trim(), repo:$("ghRepo").value.trim(), branch:$("ghBranch").value.trim()||"main", path:$("ghPath").value.trim()||"data/team.json" } }); toast("Configuration enregistrée (dans ce navigateur uniquement)."); App.updateAgentBadge(); Brand.apply(); },
  async test(){ this.save(); try{ const r = await Agents.run("Test de connexion", ()=>LLM.test()); toast(`Réponse du modèle : ${r.slice(0,60)}`); }catch(e){} },
  async listModels(){ this.save(); try{ const ms = await Agents.run("Liste des modèles", ()=>LLM.listModels()); $("setModelList").innerHTML = ms.map(m=>`<option value="${esc(m)}">`).join(""); toast(`${ms.length} modèles disponibles — tapez dans le champ Modèle pour choisir.`); }catch(e){} },
  savePrompt(id){ const t=$("pr_"+id).value.trim(); const pr={...(Store.settings.prompts||{})}; if(t && t!==Agents.PROMPTS[id]) pr[id]=t; else delete pr[id]; Store.saveSettings({prompts:pr}); this.render(); toast("Prompt enregistré."); },
  resetPrompt(id){ const pr={...(Store.settings.prompts||{})}; delete pr[id]; Store.saveSettings({prompts:pr}); this.render(); },
  clearKey(){ Store.saveSettings({apiKey:""}); this.render(); App.updateAgentBadge(); toast("Clé API effacée de ce navigateur."); }
};

/* ---------- DONNÉES ---------- */
const DataView = {
  render(){ const v=Calc.validatedShare(); const el=$("calibStatus"); if(el) el.textContent=`${v.val} / ${v.tot} niveaux validés (${v.pct} %)`;
    const bn=$("bundleNotice"); if(bn){ if(typeof TEAM_DATA!=="undefined"){ const d=TEAM_DATA.meta?.exportedAt? String(TEAM_DATA.meta.exportedAt).slice(0,10):"?"; bn.innerHTML=`Base livrée avec le projet (<code>private-data/team-data.js</code>, ${TEAM_DATA.people?.length||0} profils, ${TEAM_DATA.pipeline?.length||0} opportunités, générée le ${esc(d)}). <button class="btn sm ghost" onclick="if(confirm('Remplacer les données locales par la base livrée ?')){Store.loadBundled();App.renderAll();toast('Base livrée rechargée.');}">Recharger la base livrée</button>`; } else bn.textContent="Aucune base livrée (private-data/team-data.js absent) : l'application démarre vide sur ce poste."; }
    const sel=$("calibLead"); if(sel){ const cur=sel.value; const leads=uniq(PEOPLE.map(p=>p.staffing?.peopleLead||"").filter(Boolean)).sort(); sel.innerHTML='<option value="">Tous les people leads</option>'+leads.map(l=>`<option ${l===cur?"selected":""}>${esc(l)}</option>`).join(""); }
    $("dataSummary").innerHTML = `<b>${PEOPLE.length}</b> profils · <b>${CREDENTIALS.length}</b> credentials · <b>${TAXONOMY.skills.length}</b> compétences · sauvegarde locale automatique${Store.settings.github?.repo?` · GitHub : ${esc(Store.settings.github.owner)}/${esc(Store.settings.github.repo)}`:""}`; },
  showJSON(){ $("jsonOut").style.display="block"; $("jsonOut").value = JSON.stringify(Store.payload(),null,2); }
};
