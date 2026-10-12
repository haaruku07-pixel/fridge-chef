const $ = (selector) => document.querySelector(selector);
let currentRecipes = [];
function el(tag, className, text) { const node = document.createElement(tag); if(className) node.className=className; if(text !== undefined) node.textContent=text; return node; }
// 방문자별 냉장고와 즐겨찾기는 이 브라우저에만 저장합니다.
const KEY_ING = 'fridgeChef.public.ingredients.v1';
const KEY_FAV = 'fridgeChef.public.favorites.v1';
function readStore(key) { try { const x=JSON.parse(localStorage.getItem(key)||'[]');return Array.isArray(x)?x:[]; }catch(_){return [];} }
function writeStore(key,value){ try{localStorage.setItem(key,JSON.stringify(value));}catch(_){throw new Error('브라우저 저장 공간을 사용할 수 없어요.');} }
async function api(path, options={}) {
  const method=(options.method||'GET').toUpperCase();
  if (path==='/api/ingredients') {
    const list=readStore(KEY_ING);
    if(method==='GET')return list;
    if(method==='POST'){
      const data=JSON.parse(options.body||'{}');
      const name=String(data.name||'').trim();
      if(!name||name.length>50)throw new Error('재료 이름은 1~50자로 입력해 주세요.');
      if(list.some(x=>x.name.toLowerCase()===name.toLowerCase()))throw new Error('이미 등록한 재료입니다.');
      if(list.length>=40)throw new Error('재료는 최대 40개까지 등록할 수 있어요.');
      const item={id:Date.now()+Math.floor(Math.random()*10000),name,expiry_date:data.expiry_date||null};
      writeStore(KEY_ING,[...list,item]);return item;
    }
  }
  if(path.startsWith('/api/ingredients/')&&method==='DELETE'){
    const id=Number(path.split('/').pop());
    writeStore(KEY_ING,readStore(KEY_ING).filter(x=>x.id!==id));return {success:true};
  }
  if(path==='/api/favorites'){
    const list=readStore(KEY_FAV);
    if(method==='GET')return list;
    if(method==='POST'){
      const recipe=JSON.parse(options.body||'{}').recipe;
      if(!recipe||!recipe.name)throw new Error('레시피가 올바르지 않습니다.');
      const item={id:Date.now()+Math.floor(Math.random()*10000),recipe,created_at:new Date().toISOString()};
      writeStore(KEY_FAV,[item,...list].slice(0,100));return {id:item.id};
    }
  }
  if(path.startsWith('/api/favorites/')&&method==='DELETE'){
    const id=Number(path.split('/').pop());
    writeStore(KEY_FAV,readStore(KEY_FAV).filter(x=>x.id!==id));return {success:true};
  }
  if(path==='/api/recommend'&&method==='POST'){
    const data=JSON.parse(options.body||'{}');
    options.body=JSON.stringify({...data,ingredients:readStore(KEY_ING).map(x=>({name:x.name,expiry_date:x.expiry_date}))});
  }
  const response=await fetch(path,{headers:{'Content-Type':'application/json'},...options});
  const body=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(body.error||'요청에 실패했어요.');
  return body;
}
function notice(message='',error=false) { $('#notice').textContent=message; $('#notice').classList.toggle('error',error); }
function daysUntil(iso) { if(!iso)return null; const today=new Date();today.setHours(0,0,0,0); const target=new Date(`${iso}T00:00:00`);return Math.round((target-today)/86400000); }
async function refreshIngredients() {
  const items=await api('/api/ingredients'); const container=$('#ingredients');container.replaceChildren();$('#count').textContent=`${items.length}개`;
  if(!items.length){container.append(el('p','muted','아직 등록된 재료가 없어요.'));return;}
  items.forEach(item=>{
    const days=daysUntil(item.expiry_date);const cls=days!==null&&days<0?'expired':days!==null&&days<=3?'expiring':'';
    const chip=el('div',`ingredient ${cls}`);chip.append(el('span','',item.name));
    if(item.expiry_date) chip.append(el('small','date',days<0?'기한 지남':days===0?'오늘까지':`D-${days}`));
    const remove=el('button','remove','×');remove.type='button';remove.title=`${item.name} 삭제`;remove.addEventListener('click',async()=>{try{await api(`/api/ingredients/${item.id}`,{method:'DELETE'});await refreshIngredients();}catch(e){notice(e.message,true);}});
    chip.append(remove);container.append(chip);
  });
}
function renderRecipes(recipes,containerSelector, saved=false) {
  const container=$(containerSelector);container.replaceChildren();
  if(!recipes.length){container.append(el('div','empty',saved?'저장된 레시피가 없어요.':'조건에 맞는 레시피가 없어요. 조리 조건을 바꿔 보세요.'));return;}
  recipes.forEach(entry=>{
    const recipe=saved?entry.recipe:entry;
    const card=el('article','recipe');card.append(el('div','emoji','🥗'));card.append(el('h4','',recipe.name));card.append(el('p','',recipe.description||'직접 만들어 보는 간단한 요리'));
    card.append(el('div','meta',`⏱ ${recipe.minutes}분 · ${recipe.difficulty}`));
    if(!saved){const available=el('span','chip',`보유 ${recipe.owned.length}개`);const missing=el('span','chip missing',`부족 ${recipe.missing.length}개`);card.append(available,document.createTextNode(' '),missing);}
    const actions=el('div','recipe-actions');const open=el('button','btn secondary small','레시피 보기');open.onclick=()=>showDetail(recipe);actions.append(open);
    const action=el('button','btn secondary small',saved?'저장 삭제':'♡ 저장');
    action.onclick=async()=>{try{if(saved){await api(`/api/favorites/${entry.id}`,{method:'DELETE'});}else{await api('/api/favorites',{method:'POST',body:JSON.stringify({recipe})});}await refreshFavorites();if(!saved){action.textContent='✓ 저장됨';action.disabled=true;}}catch(e){notice(e.message,true);}};actions.append(action);card.append(actions);container.append(card);
  });
}
function showDetail(recipe){
  const root=$('#recipe-detail');root.replaceChildren();root.append(el('h2','',`🍽️ ${recipe.name}`),el('p','muted',recipe.description));root.append(el('p','',`⏱ ${recipe.minutes}분 · 난이도: ${recipe.difficulty}`));
  root.append(el('h3','','🛒 필요한 재료'));const tags=el('div','');(recipe.ingredients||[]).forEach(item=>{const missing=Array.isArray(recipe.missing)&&recipe.missing.includes(item);tags.append(el('span',`detail-tag ${missing?'missing':''}`,`${missing?'⚠ ':''}${item}`));});root.append(tags);
  if(Array.isArray(recipe.missing)&&recipe.missing.length)root.append(el('p','muted','주황색은 냉장고에 없는 재료예요.'));
  root.append(el('h3','','👩‍🍳 조리 순서'));const list=el('ol','detail-list');(recipe.steps||[]).forEach(step=>list.append(el('li','',step)));root.append(list);
  if(recipe.tip)root.append(el('p','hint',`💡 ${recipe.tip}`));$('#recipe-dialog').showModal();
}
async function refreshFavorites(){const favorites=await api('/api/favorites');renderRecipes(favorites,'#favorites',true);}
$('#add-form').addEventListener('submit',async(e)=>{e.preventDefault();const name=$('#name').value.trim();if(!name)return;try{await api('/api/ingredients',{method:'POST',body:JSON.stringify({name,expiry_date:$('#expiry').value||null})});$('#name').value='';$('#expiry').value='';notice('재료가 등록됐어요.');await refreshIngredients();}catch(err){notice(err.message,true);}});
$('#recommend').addEventListener('click',async()=>{const btn=$('#recommend');btn.disabled=true;btn.textContent='🍲 AI 추천 생성 중...';notice('온라인 AI가 레시피를 만드는 중이에요. 잠시 기다려 주세요 (최대 약 45초).');try{const data=await api('/api/recommend',{method:'POST',body:JSON.stringify({max_minutes:Number($('#time').value),difficulty:$('#difficulty').value})});currentRecipes=data.recipes;renderRecipes(data.recipes,'#recipes');$('#mode').textContent=data.mode==='demo'?'샘플 모드':'실제 AI 추천';notice(data.notice||'추천이 완료됐어요!');}catch(err){notice(err.message,true);}finally{btn.disabled=false;btn.textContent='✨ AI 레시피 추천받기';}});
$('#reload-favorites').onclick=()=>refreshFavorites().catch(e=>notice(e.message,true));$('#close-dialog').onclick=()=>$('#recipe-dialog').close();$('#recipe-dialog').onclick=e=>{if(e.target===$('#recipe-dialog'))$('#recipe-dialog').close();};
Promise.all([refreshIngredients(),refreshFavorites()]).catch(err=>notice(err.message,true));
