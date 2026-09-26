var API_URL="https://script.google.com/macros/s/AKfycbyfAoAmHOiM2O18kEh-AAjzNKv5reH1RErFZp0-wNKKKJbSG3kxW9el8bqTMo8ZzI8/exec";
var C=[];
var API_LOADED=false;
var API_ERROR="";

function val(x){return x==null?"":String(x).trim();}
function esc(x){return val(x).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");}
function norm(x){return val(x).toLowerCase().replace(/ё/g,"е").replace(/[^a-zа-я0-9\s-]/gi," ").replace(/\s+/g," ").trim();}
function list(x){if(Array.isArray(x))return x.map(val).filter(Boolean);return val(x).split(/[;\r\n]+/).map(val).filter(Boolean);}
function rank(x){x=val(x).toUpperCase();return x==="A"?1:x==="B"?2:x==="C"?3:9;}

function supplier(s){
 s=s||{};
 return {name:val(s.name)||"Без названия",brand:val(s.brand),country:val(s.country),legalName:val(s.legalName),site:val(s.site),status:val(s.status),discount:val(s.discount),groups:val(s.groups),workFeatures:val(s.workFeatures),contact:val(s.mainContact),advantages:val(s.advantages),note:val(s.comments),phone:val(s.phone),email:val(s.email),messenger:val(s.messenger),priority:val(s.priority).toUpperCase()};
}

function build(items){
 C=[];
 var map={};

 (items||[]).forEach(function(row){
   var cat=val(row.category || row.categoryName || row.type || row.equipmentType);
   if(!cat)return;

   var d=row.categoryData||row.categoryInfo||row;
   var keywords=[];
   var questions=[];
   var features="";

   // API может отдавать поля в разных именах — собираем только
   // поля категории этой конкретной строки.
   [
     d.keywords,d.keyword,d.searchKeywords,d.keywordsForSearch,
     row.keywords,row.searchKeywords,row.categoryKeywords
   ].forEach(function(x){list(x).forEach(function(v){if(keywords.indexOf(v)<0)keywords.push(v);});});

   [
     d.questions,d.clientQuestions,d.whatToClarify,
     row.questions,row.clientQuestions,row.whatToClarify
   ].forEach(function(x){list(x).forEach(function(v){if(questions.indexOf(v)<0)questions.push(v);});});

   features=val(d.features||d.categoryFeatures||d.featuresCategory||row.features||row.categoryFeatures);

   // Даже если API не передал отдельное поле keywords, название категории
   // всегда является поисковым термином.
   if(keywords.indexOf(cat)<0)keywords.unshift(cat);

   var r={
     category:cat,
     keywords:keywords,
     questions:questions,
     features:features,
     supplier:supplier(row.supplier)
   };

   if(!map[cat]){
     map[cat]={
       id:"cat-"+norm(cat).replace(/[^a-zа-я0-9]+/gi,"-"),
       name:cat,
       kw:[],
       q:[],
       note:"",
       rows:[]
     };
   }

   var group=map[cat];
   group.rows.push(r);

   keywords.forEach(function(x){
     if(group.kw.indexOf(x)<0)group.kw.push(x);
   });
   questions.forEach(function(x){
     if(group.q.indexOf(x)<0)group.q.push(x);
   });
   if(!group.note&&features)group.note=features;
 });

 Object.keys(map).forEach(function(k){
   map[k].rows.sort(function(a,b){
     return rank(a.supplier.priority)-rank(b.supplier.priority);
   });
   C.push(map[k]);
 });
}

function message(t,x){document.getElementById("results").innerHTML='<div class="card"><div class="title">'+esc(t)+'</div>'+esc(x)+'</div>';}

function loadApi(){
 message("Подключение","Загружаю актуальную базу поставщиков АЛЬФАПРОМ...");
 fetch(API_URL+"?t="+Date.now(),{cache:"no-store"}).then(function(r){
   if(!r.ok)throw Error("HTTP "+r.status);
   return r.json();
 }).then(function(d){
   if(!d||d.success!==true||!Array.isArray(d.items))throw Error("API вернул неожиданный формат");
   build(d.items);
   if(!C.length)throw Error("API не вернул категории");
   API_LOADED=true;
   message("Готово","База поставщиков загружена: "+d.items.length+" записей.");
 }).catch(function(e){API_ERROR=e.message||"Ошибка";message("Ошибка загрузки",API_ERROR);});
}

function stem(x){
  x=norm(x);
  if(x.length<=4)return x;
  return x.slice(0,Math.max(4,x.length-2));
}

function score(q,c){
 q=norm(q);
 if(!q)return {score:0,hits:[]};

 var words=q.split(" ").filter(function(w){return w.length>=3;});
 var best=0;
 var hits=[];

 // Сначала точное/частичное совпадение с названием категории.
 var category=norm(c.name);
 if(q===category || category.indexOf(q)>=0 || q.indexOf(category)>=0){
   best=98;
   hits.push(c.name);
 }

 // Затем ключевики ЭТОЙ категории.
 (c.kw||[]).forEach(function(term){
   var t=norm(term);
   if(!t)return;

   if(q===t || t.indexOf(q)>=0 || q.indexOf(t)>=0){
     best=Math.max(best,90);
     hits.push(term);
     return;
   }

   var tw=t.split(" ");
   var matched=0;

   words.forEach(function(w){
     var stem=w.slice(0,Math.max(4,w.length-2));
     if(tw.some(function(x){
       var sx=x.slice(0,Math.max(4,x.length-2));
       return sx===stem || sx.indexOf(stem)===0 || stem.indexOf(sx)===0;
     })) matched++;
   });

   if(matched){
     var p=45+Math.round((matched/Math.max(words.length,1))*45);
     best=Math.max(best,p);
     hits.push(term);
   }
 });

 // Базовые технологические словоформы.
 var n=category;
 if(q.indexOf("автоклав")>=0 && n.indexOf("автоклав")>=0)best=Math.max(best,98);
 if(q.indexOf("вакуум")>=0 && n.indexOf("вакуум")>=0)best=Math.max(best,98);
 if((q.indexOf("упаковщик")>=0||q.indexOf("вакуум")>=0) && n.indexOf("вакуум")>=0)best=Math.max(best,95);
 if(q.indexOf("котлет")>=0 && n.indexOf("котлет")>=0)best=Math.max(best,98);
 if(q.indexOf("запай")>=0 && n.indexOf("запай")>=0)best=Math.max(best,98);
 if(q.indexOf("термоформ")>=0 && n.indexOf("термоформ")>=0)best=Math.max(best,98);
 if(q.indexOf("шприц")>=0 && n.indexOf("шприц")>=0)best=Math.max(best,98);

 return {score:Math.min(best,99),hits:Array.from(new Set(hits)).slice(0,5)};
}

function search(){
 var q=document.getElementById("search").value.trim();
 if(!q){document.getElementById("results").innerHTML="";return;}
 if(!API_LOADED){message("База ещё не готова",API_ERROR||"Подождите окончания загрузки данных.");return;}
 var a=C.map(function(c){return {c:c,m:score(q,c)};}).filter(function(x){return x.m.score>=25;}).sort(function(a,b){return b.m.score-a.m.score;});
 if(!a.length){document.getElementById("results").innerHTML='<div class="card external"><h3>Подходящая категория не найдена</h3></div>';return;}
 render(a[0].c,q,a[0].m);
}

function render(c,q,m){
 var h='<div class="card"><div class="title">Найдено</div><h2>'+esc(c.name)+'</h2><span class="pill">Совпадение '+m.score+'%</span><div class="why">Совпало: '+esc(m.hits.join(", "))+'</div></div>';
 h+='<div class="card"><div class="title">Что уточнить у клиента</div><div class="questions">';
 c.q.forEach(function(x){h+='<div class="q">☐ '+esc(x)+'</div>';});
 h+='</div></div>';
 h+='<div class="card"><div class="title">Особенности категории</div>'+esc(c.note||"Уточнить задачу клиента.")+'</div>';
 h+='<div class="card"><div class="title">Поставщики</div><div class="suppliers">';
 c.rows.forEach(function(r){var s=r.supplier;h+='<div class="supplier"><div class="prio '+esc(s.priority)+'">'+esc(s.priority||"—")+' · '+esc(s.name)+'</div><div class="small">'+esc(s.brand)+'</div><h3>'+esc(s.contact||"Контакт не заполнен")+'</h3><div class="small">'+(s.phone?"📞 "+esc(s.phone):"")+(s.email?"<br>✉ "+esc(s.email):"")+'</div><div class="small"><b>Скидка:</b> '+esc(s.discount||"—")+'</div>'+(s.country?'<div class="small">🌍 '+esc(s.country)+'</div>':"")+(s.workFeatures?'<div class="small">Особенности: '+esc(s.workFeatures)+'</div>':"")+(s.advantages?'<div class="small">Преимущества: '+esc(s.advantages)+'</div>':"")+'</div>';});
 h+='</div></div>';
 document.getElementById("results").innerHTML=h;
}

function demo(x){document.getElementById("search").value=x;search();}
document.getElementById("search").addEventListener("keydown",function(e){if(e.key==="Enter")search();});
loadApi();