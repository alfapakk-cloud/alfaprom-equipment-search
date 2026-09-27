var API_URL="https://script.google.com/macros/s/AKfycbyfAoAmHOiM2O18kEh-AAjzNKv5reH1RErFZp0-wNKKKJbSG3kxW9el8bqTMo8ZzI8/exec";
var GOOGLE_CLIENT_ID="873194848568-i3ee7nonqb2j1j4r97pqheddf2f62vbi.apps.googleusercontent.com";
var GOOGLE_ID_TOKEN="";
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
 return {name:val(s.name)||"Без названия",brand:val(s.brand),country:val(s.country),legalName:val(s.legalName),site:val(s.site),status:val(s.status),discount:val(s.discount),groups:val(s.groups),workFeatures:val(s.workFeatures),contact:val(s.mainContact),advantages:val(s.advantages),note:val(s.comments),phone:val(s.phone),email:val(s.email),messenger:val(s.messenger),priority:val(s.priority).toUpperCase(),lkLink:val(s.personalCabinet),login:val(s.login),additionalInfo:val(s.additionalInfo),department:val(s.department),additionalContacts:val(s.additionalContacts),serviceCenter:val(s.serviceCenter),showroom:val(s.showroom),warehouse:val(s.warehouse),pickup:val(s.pickup),deliveryToTK:val(s.deliveryToTK),deliveryTerms:val(s.deliveryTerms),shipmentRequest:val(s.shipmentRequest),accounting:val(s.accounting),categoryId:val(s.categoryId)};
}

function build(items){
  C=[];
  var map={};

  (items||[]).forEach(function(item){
    var category=item && item.category ? item.category : {};
    var supplierData=item && item.supplier ? item.supplier : {};

    var cat=val(category.name);
    if(!cat)return;

    var keywords=list(category.keywords);
    var questions=list(category.questions);
    var features=val(category.features);

    // Название категории всегда является поисковым термином.
    if(keywords.map(norm).indexOf(norm(cat))<0){
      keywords.unshift(cat);
    }

    var r={
      category:cat,
      keywords:keywords,
      questions:questions,
      features:features,
      supplier:supplier(supplierData)
    };

    var key=norm(cat);
    if(!map[key]){
      map[key]={
        id:"cat-"+key.replace(/[^a-zа-я0-9]+/gi,"-"),
        name:cat,
        kw:[],
        q:[],
        note:"",
        rows:[]
      };
    }

    var group=map[key];
    group.rows.push(r);

    keywords.forEach(function(x){
      if(group.kw.map(norm).indexOf(norm(x))<0)group.kw.push(x);
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

function handleGoogleCredential(response){
  GOOGLE_ID_TOKEN=val(response&&response.credential);
  if(!GOOGLE_ID_TOKEN){
    message("Ошибка входа","Google не вернул токен авторизации.");
    return;
  }
  var auth=document.getElementById("authText");
  if(auth)auth.textContent="Google-аккаунт подтверждён. Проверяю доступ к базе...";
  loadApi();
}

function initGoogleLogin(){
  if(typeof google==="undefined" || !google.accounts || !google.accounts.id){
    setTimeout(initGoogleLogin,300);
    return;
  }
  google.accounts.id.initialize({
    client_id:GOOGLE_CLIENT_ID,
    callback:handleGoogleCredential,
    auto_select:true,
    cancel_on_tap_outside:false
  });
  google.accounts.id.renderButton(
    document.getElementById("googleButton"),
    {theme:"outline",size:"large",text:"signin_with",shape:"rectangular",logo_alignment:"left"}
  );
}

function loadApi(){
  if(!GOOGLE_ID_TOKEN){
    message("Требуется вход","Войдите через Google, чтобы получить доступ к базе.");
    return;
  }

  message("Проверка доступа","Проверяю ваш Google-аккаунт и доступ к базе АЛЬФАПРОМ...");

  fetch(API_URL+"?token="+encodeURIComponent(GOOGLE_ID_TOKEN)+"&t="+Date.now(),{cache:"no-store"}).then(function(r){
    if(!r.ok)throw Error("HTTP "+r.status);
    return r.json();
  }).then(function(d){
    if(!d||d.success!==true||!Array.isArray(d.items)){
      if(d&&d.accessDenied){
        throw Error(d.error||"Доступ запрещён");
      }
      throw Error((d&&d.error)||"API вернул неожиданный формат");
    }
    build(d.items);
    if(!C.length)throw Error("API не вернул категории");
    API_LOADED=true;
    var auth=document.getElementById("authText");
    if(auth)auth.textContent="Доступ разрешён. База поставщиков загружена.";
    message("Готово","База поставщиков загружена: "+d.items.length+" записей.");
  }).catch(function(e){
    API_ERROR=e.message||"Ошибка";
    message("Доступ не получен",API_ERROR);
    var auth=document.getElementById("authText");
    if(auth)auth.textContent="Доступ не получен. Если ваш Google-аккаунт есть в листе «❗️⚙️Доступ» со статусом «Да», попробуйте ещё раз.";
  });
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
 var a=C.map(function(c){return {c:c,m:score(q,c)};}).filter(function(x){return x.m.score>=50;}).sort(function(a,b){return b.m.score-a.m.score;});
 if(!a.length){showExternalSearch();return;}
 render(a[0].c,q,a[0].m);
}

function questionGroups(items){
 var universal=[],specific=[],mode="specific";
 (items||[]).forEach(function(raw){
  var text=val(raw);if(!text)return;
  var n=norm(text);
  if(n.indexOf("универсальн")===0){mode="universal";text=text.replace(/^\s*универсальные вопросы\s*[:—-]?\s*/i,"").trim();if(text)universal.push(text);return;}
  if(n.indexOf("специфичн")===0||n.indexOf("специфическ")===0){mode="specific";text=text.replace(/^\s*специфич(?:ные|еские)\s*(?:вопросы)?\s*[:—-]?\s*/i,"").trim();if(text)specific.push(text);return;}
  if(mode==="universal")universal.push(text);else specific.push(text);
 });
 return {universal:universal,specific:specific};
}
function renderQuestionList(title,items){
 var h='<div class="question-col"><div class="question-heading">'+esc(title)+'</div>';
 if(!items.length)h+='<div class="question-empty">Нет отдельных вопросов в базе.</div>';
 else items.forEach(function(x,i){h+='<div class="question-row"><span class="question-num">'+(i+1)+'</span><span>'+esc(x)+'</span></div>';});
 return h+'</div>';
}
function renderQuestions(items){
 var g=questionGroups(items);
 return '<div class="questions-grid">'+renderQuestionList("Универсальные вопросы",g.universal)+renderQuestionList("Специфичные вопросы по подбору",g.specific)+'</div>';
}
function makeExternalPrompt(q){
 return "Я подбираю оборудование для клиента в России. Найди подходящее оборудование для задачи: "+q+". Найди реальные модели, производителей или крупных импортеров в РФ, у кого можно купить это оборудование. Укажи ключевые технические характеристики, производительность, ограничения по применению и ссылки на источники. Не выдумывай модели и характеристики.";
}
function showExternalSearch(){
 var q=val(document.getElementById("search").value);
 if(!q)return;
 var prompt=makeExternalPrompt(q);
 document.getElementById("results").innerHTML=
 '<div class="card external">'+
 '<h3>В базе АЛЬФАПРОМ подходящее оборудование не найдено</h3>'+
 '<div class="small">Можно поискать подходящее оборудование через Алису AI или ChatGPT. Ниже — готовый запрос, его можно проверить и отредактировать:</div>'+
 '<textarea id="externalPrompt" class="external-prompt">'+esc(prompt)+'</textarea>'+
 '<div class="actions">'+
 '<button class="primary" onclick="externalSearch(\'alice\')">🔎 Поиск с Алисой AI</button>'+
 '<button class="secondary" onclick="externalSearch(\'chatgpt\')">🤖 Спросить ChatGPT</button>'+
 '</div></div>';
}
function externalSearch(type){
 var el=document.getElementById("externalPrompt");
 var prompt=el ? val(el.value) : "";
 if(!prompt)return;

 try{navigator.clipboard.writeText(prompt);}catch(e){}

 if(type==="alice"){
   window.open("https://yandex.ru/search/?text="+encodeURIComponent(prompt),"_blank","noopener,noreferrer");
 }else{
   // Передаём запрос непосредственно через параметр q веб-версии ChatGPT.
   // Если ОС откроет нативное приложение, запрос также остаётся в буфере обмена.
   window.open("https://chatgpt.com/?q="+encodeURIComponent(prompt),"_blank","noopener,noreferrer");
 }
}

var SUPPLIER_MODAL_DATA=[];
function safeUrl(x){x=val(x);return /^https?:\\/\\//i.test(x)?x:"";}
function linkHtml(label,url){url=safeUrl(url);return url?'<a class="supplier-link" href="'+esc(url)+'" target="_blank" rel="noopener noreferrer">'+esc(label)+'</a>':"";}
function fieldRow(label,value){value=val(value);return value?'<div class="detail-row"><div class="detail-label">'+esc(label)+'</div><div class="detail-value">'+esc(value)+'</div></div>':"";}
function supplierCard(s,index){
 var h='<div class="supplier">';
 h+='<div class="prio '+esc(s.priority)+'">'+esc(s.priority||"—")+' · '+esc(s.name)+'</div>';
 if(s.contact)h+='<div class="supplier-key"><b>Основной контакт:</b> '+esc(s.contact)+'</div>';
 if(s.country)h+='<div class="supplier-key">🌍 <b>Страна:</b> '+esc(s.country)+'</div>';
 h+='<div class="supplier-key">🏷️ <b>Наша скидка:</b> '+esc(s.discount||"—")+'</div>';
 if(s.site)h+='<div class="supplier-links">'+linkHtml("🌐 Сайт",s.site)+'</div>';
 if(s.lkLink)h+='<div class="supplier-links">'+linkHtml("🔗 Личный кабинет",s.lkLink)+'</div>';
 if(s.login)h+='<div class="supplier-key">👤 <b>Логин:</b> '+esc(s.login)+'</div>';
 h+='<div class="supplier-key">🔑 <b>Пароль:</b> Смотри в таблице поставщиков</div>';
 if(s.workFeatures)h+='<div class="supplier-key">⚠️ <b>Особенности работы:</b> '+esc(s.workFeatures)+'</div>';
 if(s.advantages)h+='<div class="supplier-key">🔥 <b>Дополнительные преимущества:</b> '+esc(s.advantages)+'</div>';
 h+='<button class="secondary details-btn" onclick="openSupplierModalByIndex('+index+')">Подробнее</button>';
 return h+'</div>';
}
function renderSupplierModal(s){
 var h='<div class="modal-overlay" id="supplierModal" onclick="if(event.target===this)closeSupplierModal()"><div class="supplier-modal">';
 h+='<div class="modal-head"><div><div class="title">Поставщик</div><h2>'+esc(s.priority||"—")+' · '+esc(s.name)+'</h2></div><button class="secondary modal-close" onclick="closeSupplierModal()">✕</button></div>';
 h+='<div class="detail-grid">';
 h+=fieldRow("Основной контакт",s.contact);h+=fieldRow("Страна",s.country);h+=fieldRow("Наша скидка",s.discount);h+=fieldRow("Сайт",s.site);h+=fieldRow("Личный кабинет",s.lkLink);h+=fieldRow("Логин",s.login);h+=fieldRow("Юридическое лицо",s.legalName);h+=fieldRow("Статус поставщика",s.status);h+=fieldRow("Основные группы оборудования",s.groups);h+=fieldRow("Особенности работы",s.workFeatures);h+=fieldRow("Дополнительные преимущества",s.advantages);h+=fieldRow("Общие комментарии",s.note);h+=fieldRow("Отдел / направление",s.department);h+=fieldRow("Телефон",s.phone);h+=fieldRow("Email",s.email);h+=fieldRow("Мессенджер",s.messenger);h+=fieldRow("Дополнительные контакты",s.additionalContacts);h+=fieldRow("Адрес СЦ",s.serviceCenter);h+=fieldRow("Адрес шоурума",s.showroom);h+=fieldRow("Адрес склада",s.warehouse);h+=fieldRow("Адрес самовывоза",s.pickup);h+=fieldRow("Доставка до ТК",s.deliveryToTK);h+=fieldRow("Условия доставки",s.deliveryTerms);h+=fieldRow("Заявка на отгрузку",s.shipmentRequest);h+=fieldRow("Бухгалтерия",s.accounting);h+=fieldRow("Доп. информация",s.additionalInfo);h+=fieldRow("ID категории",s.categoryId);
 h+='</div></div></div>';return h;
}
function openSupplierModalByIndex(index){var s=SUPPLIER_MODAL_DATA[index];if(!s)return;var root=document.getElementById("supplierModalRoot");if(!root)return;root.innerHTML=renderSupplierModal(s);document.body.style.overflow="hidden";}
function closeSupplierModal(){var root=document.getElementById("supplierModalRoot");if(root)root.innerHTML="";document.body.style.overflow="";}
document.addEventListener("keydown",function(e){if(e.key==="Escape")closeSupplierModal();});
function render(c,q,m){
 var h='<div class="card"><div class="title">Найдено</div><h2>'+esc(c.name)+'</h2><span class="pill">Совпадение '+m.score+'%</span><div class="why">Совпало: '+esc(m.hits.join(", "))+'</div></div>';
 h+='<div class="card"><div class="title">Что уточнить у клиента</div>'+renderQuestions(c.q)+'</div>';
 h+='<div class="card"><div class="title">Особенности категории</div>'+esc(c.note||"Уточнить задачу клиента.")+'</div>';
 h+='<div class="card"><div class="title">Поставщики</div><div class="suppliers">';
 SUPPLIER_MODAL_DATA=c.rows.map(function(r){return r.supplier;});
 c.rows.forEach(function(r,i){h+=supplierCard(r.supplier,i);});
 h+='</div></div>';
 document.getElementById("results").innerHTML=h;
}

function demo(x){document.getElementById("search").value=x;search();}
document.getElementById("search").addEventListener("keydown",function(e){if(e.key==="Enter")search();});
initGoogleLogin();