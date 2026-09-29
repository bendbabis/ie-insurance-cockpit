/* ============================================================
   60-cvgen.js — génération PowerPoint
   - CvGen.pptx(list, opts) : CV au format « cabinet » (structure observée
     dans les CV de la practice : PROFIL / Compétences & Formation /
     Expériences significatives + annexe historique). Palette violette,
     police Arial, aucun logo propriétaire (zone réservée).
   - CvGen.credentials(list) : une slide par credential.
   ============================================================ */
const CvGen = {
  C: { purple:"7500C0", bright:"A100FF", dark:"460073", ink:"000000", grey:"4D4D4D", light:"F1E5FF", line:"E6E6E6", white:"FFFFFF" },
  /* logo fourni par l'utilisateur (Configuration → Identité visuelle) ou zone réservée */
  logo(s, pptx, logo, x, y, w, h, label){ if(logo){ const lh=Math.min(h, w*logo.ratio); s.addImage({data:logo.data, x:x+w-w*Math.min(1,lh/(w*logo.ratio)), y:y+(h-lh)/2, w:Math.min(w, lh/logo.ratio), h:lh}); }
    else { s.addShape(pptx.ShapeType.rect,{x,y,w,h,fill:{color:this.C.light},line:{color:this.C.light}}); s.addText(label,{x,y,w,h,fontSize:9,color:this.C.grey,align:"center",valign:"middle",fontFace:"Arial"}); } },
  _need(){ if(typeof PptxGenJS==="undefined") throw new Error("PptxGenJS indisponible (CDN inaccessible)."); },
  _pptx(){ const pptx=new PptxGenJS(); pptx.defineLayout({name:"W",width:13.33,height:7.5}); pptx.layout="W"; return pptx; },

  cvSlides(pptx, p, opts, logo){
    const C=this.C, lang=opts.lang||"fr", c = MiniCV.cabinet(p, lang), anon=!!opts.anonymize;
    const cl = x => anon ? (x.clientAnonymized||x.client||"") : (x.client||x.clientAnonymized||"");
    const T = lang==="en" ? {profil:"PROFILE",comp:"Skills & Education",exp:"SIGNIFICANT EXPERIENCES",fun:"FUNCTIONAL",tech:"TECHNOLOGIES",ind:"INDUSTRIES",edu:"EDUCATION",annex:"ANNEX — PREVIOUS EXPERIENCES",years:"years of experience"}
                           : {profil:"PROFIL",comp:"Compétences & Formation",exp:"EXPÉRIENCES SIGNIFICATIVES",fun:"FONCTIONNELLES",tech:"TECHNOLOGIES",ind:"INDUSTRIES",edu:"FORMATION",annex:"ANNEXES — HISTORIQUE DES MISSIONS",years:"ans d'expérience"};
    /* --- slide 1 : profil --- */
    const s = pptx.addSlide(); s.background={color:C.white};
    s.addShape(pptx.ShapeType.rect,{x:0,y:0,w:13.33,h:.14,fill:{color:C.bright}});
    s.addText(T.profil,{x:.5,y:.3,w:6,h:.4,fontSize:11,bold:true,color:C.purple,charSpacing:3,fontFace:"Arial"});
    s.addText(p.displayName,{x:.5,y:.62,w:8,h:.55,fontSize:24,bold:true,color:C.ink,fontFace:"Arial"});
    s.addText(c.title||gradeRole(p),{x:.5,y:1.14,w:8,h:.35,fontSize:12,color:C.purple,bold:true,fontFace:"Arial"});
    s.addText(`${initials(p)} · ${yrs(p.yearsExperience)} ${T.years.replace(/^(ans|years)\s*/,"")}`.replace("  "," "),{x:9.2,y:.62,w:3.6,h:.4,fontSize:11,color:C.grey,align:"right",fontFace:"Arial"});
    this.logo(s, pptx, logo, 9.6, 1.0, 3.2, .6, lang==="en"?"Logo area":"Zone logo");
    // bio
    s.addText(c.profile||"",{x:.5,y:1.65,w:7.6,h:1.55,fontSize:10.5,color:C.ink,valign:"top",fontFace:"Arial",paraSpaceAfter:4});
    // expériences significatives (colonne gauche)
    s.addText(T.exp,{x:.5,y:3.25,w:7.6,h:.3,fontSize:10,bold:true,color:C.purple,charSpacing:2,fontFace:"Arial"});
    s.addShape(pptx.ShapeType.line,{x:.5,y:3.56,w:7.6,h:0,line:{color:C.purple,width:1}});
    const runs=[]; (c.significant||[]).slice(0,4).forEach(x=>{ runs.push({text:[cl(x),x.title].filter(Boolean).join(" — ")+(x.period?` · ${x.period}`:""),options:{bold:true,fontSize:9.5,color:C.ink,breakLine:true,paraSpaceBefore:4}});
      (x.bullets||[]).slice(0,4).forEach(b=>runs.push({text:b,options:{bullet:{indent:10},fontSize:8.8,color:C.ink,breakLine:true}})); });
    if(runs.length) s.addText(runs,{x:.5,y:3.62,w:7.6,h:3.45,valign:"top",fontFace:"Arial"});
    // colonne droite : compétences
    s.addShape(pptx.ShapeType.rect,{x:8.45,y:1.65,w:4.4,h:5.42,fill:{color:C.light},line:{color:C.light}});
    s.addText(T.comp,{x:8.65,y:1.75,w:4,h:.3,fontSize:10,bold:true,color:C.purple,fontFace:"Arial"});
    let y=2.12;
    const block=(label,items)=>{ if(!items||!items.length) return; s.addText(label,{x:8.65,y,w:4,h:.25,fontSize:8.5,bold:true,color:C.purple,charSpacing:2,fontFace:"Arial"}); y+=.26;
      const h=Math.min(1.5, .2*items.length+.05); s.addText(items.map(t=>({text:String(t),options:{breakLine:true}})),{x:8.65,y,w:4.05,h,fontSize:9,color:C.ink,valign:"top",fontFace:"Arial"}); y+=h+.12; };
    block(T.fun, c.functional); block(T.tech, c.technologies); block(T.ind, c.industries); block(T.edu, c.education);
    s.addText(`${p.location||""}${p.country?", "+p.country:""} · ${(p.languages||[]).join(" / ")}`,{x:.5,y:7.12,w:8,h:.28,fontSize:8,color:C.grey,fontFace:"Arial"});
    /* --- annexes --- */
    const annex=(c.annex||[]).filter(x=>x.title);
    for(let i=0;i<annex.length;i+=4){
      const a=pptx.addSlide(); a.background={color:C.white}; a.addShape(pptx.ShapeType.rect,{x:0,y:0,w:13.33,h:.14,fill:{color:C.bright}});
      a.addText(T.annex,{x:.5,y:.3,w:8,h:.4,fontSize:11,bold:true,color:C.purple,charSpacing:3,fontFace:"Arial"});
      a.addText(p.displayName+" — "+(c.title||gradeRole(p)),{x:.5,y:.65,w:12,h:.4,fontSize:13,bold:true,color:C.ink,fontFace:"Arial"});
      const chunk=annex.slice(i,i+4), r2=[];
      chunk.forEach(x=>{ r2.push({text:[cl(x),x.title].filter(Boolean).join(" — ")+(x.period?` · ${x.period}`:""),options:{bold:true,fontSize:10,color:C.ink,breakLine:true,paraSpaceBefore:6}}); (x.bullets||[]).slice(0,5).forEach(b=>r2.push({text:b,options:{bullet:{indent:10},fontSize:9,color:C.ink,breakLine:true}})); });
      a.addText(r2,{x:.5,y:1.2,w:12.3,h:5.9,valign:"top",fontFace:"Arial"});
    }
  },
  async pptx(list, opts={}){
    try{ this._need(); if(!list.length) return toast("Sélectionnez au moins un profil.", true);
      const logo = await Brand.logoPng(); const pptx=this._pptx(); list.forEach(p=>this.cvSlides(pptx,p,opts,logo));
      const name = list.length===1 ? `CV_${slugify(list[0].displayName)}_${(opts.lang||"fr").toUpperCase()}.pptx` : `CV_selection_${list.length}_${(opts.lang||"fr").toUpperCase()}.pptx`;
      pptx.writeFile({fileName:name}).then(()=>toast(`${list.length} CV exporté(s) au format cabinet.`)); }
    catch(e){ toast(e.message,true); }
  },
  async credentials(list){
    try{ this._need(); if(!list.length) return toast("Aucune credential à exporter.", true);
      const C=this.C, pptx=this._pptx(), logo=await Brand.logoPng();
      list.forEach(c=>{ const s=pptx.addSlide(); s.background={color:C.white}; s.addShape(pptx.ShapeType.rect,{x:0,y:0,w:13.33,h:.14,fill:{color:C.bright}});
        if(logo) this.logo(s, pptx, logo, 10.6, .28, 2.2, .5, "");
        s.addText("CREDENTIAL",{x:.5,y:.3,w:6,h:.4,fontSize:11,bold:true,color:C.purple,charSpacing:3,fontFace:"Arial"});
        s.addText(c.title,{x:.5,y:.62,w:12.3,h:.6,fontSize:20,bold:true,color:C.ink,fontFace:"Arial"});
        s.addText([c.clientAnonymized||c.client, c.lob, c.period].filter(Boolean).join(" · "),{x:.5,y:1.2,w:12.3,h:.35,fontSize:11,color:C.purple,bold:true,fontFace:"Arial"});
        const col=(x,label,txt,h)=>{ s.addText(label,{x,y:1.75,w:3.95,h:.3,fontSize:9,bold:true,color:C.purple,charSpacing:2,fontFace:"Arial"}); s.addShape(pptx.ShapeType.line,{x,y:2.05,w:3.95,h:0,line:{color:C.purple,width:1}}); s.addText(txt,{x,y:2.12,w:3.95,h:h||2.6,fontSize:9.5,color:C.ink,valign:"top",fontFace:"Arial"}); };
        col(.5,"CONTEXTE & ENJEU",[c.context,c.challenge].filter(Boolean).join("\n\n")); col(4.7,"APPROCHE",c.approach||""); col(8.9,"RÉSULTATS",(c.results||[]).map(r=>({text:r,options:{bullet:true,breakLine:true}})));
        if((c.deliverables||[]).length){ s.addText("LIVRABLES",{x:.5,y:4.95,w:8,h:.3,fontSize:9,bold:true,color:C.purple,charSpacing:2,fontFace:"Arial"}); s.addText(c.deliverables.join(" · "),{x:.5,y:5.25,w:12.3,h:.6,fontSize:9.5,color:C.ink,fontFace:"Arial"}); }
        s.addText([...(c.domains||[]).map(domainName), ...(c.skills||[]).map(x=>skillById(x)?.name||x)].join("  ·  "),{x:.5,y:6.1,w:12.3,h:.5,fontSize:8.5,color:C.grey,fontFace:"Arial"});
        s.addText(`Équipe : ${(c.personIds||[]).map(id=>PEOPLE.find(p=>p.id===id)?.displayName||id).join(", ")||"—"}${c.team?" · "+c.team:""}`,{x:.5,y:6.7,w:12.3,h:.4,fontSize:8.5,color:C.grey,fontFace:"Arial"}); });
      pptx.writeFile({fileName:`credentials_${isoDate()}.pptx`}).then(()=>toast(`${list.length} credential(s) exportée(s).`)); }
    catch(e){ toast(e.message,true); }
  }
};
