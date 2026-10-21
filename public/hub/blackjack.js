import {BLACKJACK,handValue,cardLabel} from './blackjack-rules.mjs';
const $=id=>document.getElementById(id),bridge=()=>window.MINER_HUB_ONLINE,dialog=$('hubBlackjackDialog'),amount=$('hubBlackjackAmount'),fmt=n=>n.toLocaleString('es-AR');
let machine=null,game=null,busy=false,pending=null,generation=0,timer=0,animating=false;
const sessionKey=()=> 'minerhub.blackjack.'+bridge().user.id;
function remember(value){pending=value;try{if(value)sessionStorage.setItem(sessionKey(),JSON.stringify(value));else sessionStorage.removeItem(sessionKey());}catch{}}
function restore(){try{const v=JSON.parse(sessionStorage.getItem(sessionKey()));return v&&['start','play'].includes(v.route)&&typeof v.input?.requestId==='string'?v:null;}catch{return null;}}
function status(text){$('hubBlackjackStatus').textContent=text;}
function cards(id,list){
 const row=$(id);row.replaceChildren();
 for(const value of list){const card=document.createElement('div');card.className='bj-card';
  if(value===null){card.classList.add('bj-card-back');card.textContent='♠';card.setAttribute('aria-label','Carta oculta');}
  else{const c=cardLabel(value);card.dataset.red=String(c.red);card.setAttribute('aria-label',c.rank+' '+c.suit);const rank=document.createElement('b'),suit=document.createElement('span');rank.textContent=c.rank;suit.textContent=c.suit;card.append(rank,suit);}
  row.append(card);
 }
}
function controls(){
 const playing=game?.status==='playing',disabled=busy||animating;
 $('hubBlackjackBalance').textContent=fmt(bridge().ledger.credits())+' créditos';
 $('hubBlackjackWager').textContent=game?'En la mesa · '+fmt(game.stake):'Apostá de 1 a 100 créditos';
 amount.disabled=disabled||!!pending||playing;
 $('hubBlackjackStart').hidden=playing&&!pending;$('hubBlackjackStart').disabled=disabled||!machine;
 $('hubBlackjackStart').textContent=pending?'Recuperar jugada':game?'Nueva mano':'Repartir cartas';
 $('hubBlackjackActions').hidden=!playing||!!pending;
 for(const id of ['hubBlackjackHit','hubBlackjackStand','hubBlackjackDouble'])$(id).disabled=disabled||!!pending;
 $('hubBlackjackDouble').disabled=disabled||!!pending||!game?.canDouble||bridge().ledger.credits()<(game?.amount||0);
 $('hubBlackjackDouble').textContent='Doblar'+(playing?' · +'+fmt(game.amount):'');
}
const outcomes={blackjack:'¡Blackjack!',win:'¡Ganaste!',push:'Empate',bust:'Te pasaste de 21',loss:'Gana la banca','dealer-blackjack':'Blackjack de la banca'};
function render(dealerLimit){
 const player=game?.player||[],dealer=game?.dealer||[];
 cards('hubBlackjackPlayer',player);cards('hubBlackjackDealer',dealerLimit?dealer.slice(0,dealerLimit):dealer);
 const p=handValue(player),shown=dealerLimit?dealer.slice(0,dealerLimit):dealer;
 $('hubBlackjackPlayerTotal').textContent=player.length?p.total+(p.soft?' · suave':''):'';
 $('hubBlackjackDealerTotal').textContent=dealer.length?(shown.includes(null)?handValue(shown.filter(n=>n!==null)).total+' + ?':handValue(shown).total):'';
 if(game?.status==='finished'&&!dealerLimit){const delta=game.payout-game.stake;status(outcomes[game.outcome]+(delta>0?' · +'+fmt(delta)+' créditos':delta<0?' · −'+fmt(-delta)+' créditos':' · Recuperás tu apuesta'));dialog.dataset.result=delta>0?'win':delta<0?'loss':'push';}
 else{dialog.dataset.result='';status(dealerLimit?'Juega la banca…':game?'Pedí otra carta o plantate.':'Llegá a 21 sin pasarte.');}
 controls();
}
function show(next,animate=false){
 clearTimeout(timer);animating=false;game=next;
 if(animate&&game?.status==='finished'&&game.dealer.length>2&&!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches){
  animating=true;const token=generation;let limit=2;const step=()=>{if(token!==generation||!dialog.open)return;if(limit<game.dealer.length){render(limit++);timer=setTimeout(step,420);}else{animating=false;render();}};step();
 }else render();
}
async function request(route,input){
 if(busy||animating)return;const token=generation;remember({route,input});busy=true;controls();status('Confirmando jugada…');
 try{const data=await bridge().blackjack(route,input);remember(null);if(token===generation&&dialog.open)show(data.game,true);}
 catch(e){if(e.status&&e.status<500)remember(null);if(token===generation)status(e.message+(pending?' Tocá «Recuperar jugada» para reintentar sin volver a pagar.':''));}
 finally{busy=false;if(token===generation)controls();}
}
async function open(item){
 if(busy)return;const token=++generation;machine={roomId:bridge().room.id,itemId:item.id};game=null;pending=restore();busy=true;show(null);status('Abriendo mesa…');dialog.showModal();
 try{const data=await bridge().blackjack('open',machine);if(token!==generation)return;
  if(pending?.route==='start'&&data.game?.id===pending.input.requestId)remember(null);
  if(pending?.route==='play'&&data.game?.id===pending.input.handId&&data.game.revision>pending.input.revision)remember(null);
  show(data.game);if(data.game)amount.value=String(data.game.amount);if(pending)status('Hay una jugada pendiente. Recuperala sin volver a pagar.');
 }catch(e){if(token===generation){machine=null;status(e.message);}}
 finally{busy=false;if(token===generation)controls();}
}
$('hubBlackjackForm').onsubmit=e=>{e.preventDefault();if(busy||animating||!machine)return;if(pending)return request(pending.route,pending.input);const value=Number(amount.value);if(!Number.isSafeInteger(value)||value<BLACKJACK.min||value>BLACKJACK.max){status('Apostá entre 1 y 100 créditos enteros.');return;}if(value>bridge().ledger.credits()){status('No tenés créditos suficientes.');return;}request('start',{...machine,amount:value,requestId:crypto.randomUUID()});};
function play(action){if(busy||animating||pending||!machine||game?.status!=='playing')return;request('play',{...machine,handId:game.id,revision:game.revision,action,requestId:crypto.randomUUID()});}
$('hubBlackjackHit').onclick=()=>play('hit');$('hubBlackjackStand').onclick=()=>play('stand');$('hubBlackjackDouble').onclick=()=>play('double');
$('hubBlackjackClose').onclick=()=>dialog.close();dialog.addEventListener('close',()=>{generation++;clearTimeout(timer);animating=false;machine=null;});
window.HubBlackjack={open,close(){if(dialog.open)dialog.close();}};
