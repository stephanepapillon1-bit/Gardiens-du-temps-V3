// Opt-in browser integration suite. Never loaded by a normal player.
// Arranges controlled scenarios, uses the real Phaser physics loop and DOM controls.
export function installQA(game){
 const box=document.createElement('section');box.style='padding:20px;max-width:1000px;margin:auto;background:#20343b';box.innerHTML='<button id="run-qa" disabled>Exécuter les essais du moteur</button><pre id="qa-report" style="white-space:pre-wrap"></pre>';document.body.append(box);
 const ready=()=>{if(game.scene.getScene('Ur')?.ui)document.querySelector('#run-qa').disabled=false;else setTimeout(ready,100);};ready();const out=document.querySelector('#qa-report');const log=t=>{out.textContent+=t+'\n';};
 const wait=ms=>new Promise(r=>setTimeout(r,ms));
 document.querySelector('#run-qa').onclick=async()=>{
  document.querySelector('#run-qa').disabled=true;const s=game.scene.getScene('Ur');const before=localStorage.getItem('gardiens.refonte.level1.v1');const campaignBefore=localStorage.getItem('gardiens_campagne');
  const key=(code,down)=>window.dispatchEvent(new KeyboardEvent(down?'keydown':'keyup',{key:code==='Space'?' ':code.replace('Key','').toLowerCase(),code,keyCode:{ArrowRight:39,ArrowLeft:37,Space:32,KeyK:75,KeyJ:74,KeyE:69}[code],which:{ArrowRight:39,ArrowLeft:37,Space:32,KeyK:75,KeyJ:74,KeyE:69}[code],bubbles:true}));
  const hold=async(code,ms)=>{key(code,true);await wait(ms);key(code,false);await wait(40);};
  const assert=(ok,name)=>{log((ok?'PASS ':'FAIL ')+name);if(!ok)throw Error(name);};
  const place=async(x,y=360)=>{s.player.body.reset(x,y);s.player.setVelocity(0);await wait(300);};
  try{
   s.ui.close();s.started=true;s.paused=false;s.progress.stage=0;s.hp=5;s.invUntil=1e9;await place(120);
   const x=s.player.x;await hold('ArrowRight',600);assert(s.player.x-x>110&&s.player.x-x<190,'flèche droite : déplacement réel à 255 px/s');
   await place(120);const y=s.player.y;key('Space',true);await wait(240);assert(s.player.y<y-55,'saut : montée sous gravité');key('Space',false);await wait(700);assert(s.player.body.blocked.down,'saut : retombée sur collision de la berge');
   s.invUntil=0;s.hp=3;s.damage(s.player.x+100);s.damage(s.player.x+100);assert(s.hp===2,'dégâts : invulnérabilité temporaire après un impact');s.hp=5;s.invUntil=1e9;await wait(300);const pausedAt=s.clock;s.togglePause();await wait(350);assert(s.clock===pausedAt&&s.physics.world.isPaused,'pause : arrêt des chronomètres et de la physique');s.pauseForFocusLoss();assert(s.paused&&s.physics.world.isPaused,'perte de focus répétée : le jeu reste en pause');s.togglePause();const dx=s.player.x;await hold('KeyK',230);assert(s.player.x-dx>60,'esquive : déplacement et fin de course');
   await place(870);await hold('ArrowRight',450);assert(s.player.body.right<=902,'barrière : impossible de passer avant la mission');
   s.ui.irrigation();document.querySelector('#test').click();assert(document.querySelector('#feedback').textContent.includes('aval'),'irrigation : rétroaction sur le manque d’eau en aval');
   document.querySelector('[data-i="0"][data-d="1"]').click();document.querySelector('#leave').click();s.ui.irrigation();assert(document.querySelector('#v0').textContent==='1','irrigation : réglage conservé après fermeture');
   for(const [i,n]of [[0,1],[1,3],[2,1]])for(let j=0;j<n;j++)document.querySelector('[data-i="'+i+'"][data-d="1"]').click();document.querySelector('#test').click();assert(s.progress.stage===1&&s.gates[0].open,'irrigation : réussite, ouverture physique et point de reprise');document.querySelector('#continue').click();
   await place(870);await hold('ArrowRight',650);assert(s.player.x>1000,'passage du canal rétabli sans chute');
   s.ui.question();document.querySelector('[data-answer="0"]').click();assert(s.progress.stage===1&&document.querySelector('[data-answer="0"]').disabled,'registre : mauvaise réponse sans progression');document.querySelector('[data-answer="2"]').click();assert(s.progress.stage===2,'registre : interprétation correcte acceptée');document.querySelector('#continue').click();
   s.floodRead=true;await place(3260);s.interact();assert(s.flood===0&&s.modal,'crue : mauvais ordre refusé');document.querySelector('#continue').click();
   for(const px of [2650,2960,3260]){await place(px);s.interact();}assert(s.progress.stage===3&&s.gates[2].open,'crue : séquence physique des trois postes réussie');document.querySelector('#continue').click();
   assert(JSON.parse(localStorage.getItem('gardiens.refonte.level1.v1')).stage===3,'sauvegarde : stade 3 écrit');
   s.respawn(false);await wait(350);assert(Math.abs(s.player.x-3550)<2&&s.hp===5,'reprise : position du dernier point et énergie restaurée');
   await place(4100);await wait(2200);assert(s.bossActive&&s.hazards.getChildren().length>0,'boss phase I : attaque annoncée puis vague réelle');
   s.bossHp=6;s.bossState='idle';s.bossTimer=0;s.bossCycle=0;s.hazards.clear(true,true);await wait(1700);assert(s.pattern==='double'&&s.hazards.getChildren().length>=2,'boss phase II : deux vagues distinctes');s.bossHp=6;s.bossState='idle';s.bossTimer=0;s.bossCycle=1;s.hazards.clear(true,true);await wait(1300);assert(s.pattern==='rain'&&s.hazards.getChildren().some(h=>h.body.velocity.y>0),'boss phase II : chute d’eau réelle');
   s.hazards.clear(true,true);s.rainMark?.destroy();s.bossState='rest';s.bossTimer=10;s.bossHp=2;s.invUntil=1e9;await place(4400);s.face=1;await hold('KeyJ',80);assert(s.bossHp===1,'attaque : cœur vulnérable touché');
   await wait(400);await hold('KeyJ',80);assert(s.won&&s.progress.done,'victoire : boss vaincu et bilan affiché');s.autoAdvance=false;
   assert(JSON.parse(localStorage.getItem('gardiens_campagne')).level1.done,'campagne : chapitre 1 marqué terminé');
   s.autoAdvance=true;s.winElapsed=0;let transitions=0;const originalAdvance=s.advance;s.advance=()=>{transitions++;s.autoAdvance=false;};await wait(8500);assert(transitions===1,'transition automatique : déclenchement après huit secondes');s.advance=originalAdvance;
   log('TERMINÉ : tous les essais ont réussi. Scénarios contrôlés; ne remplacent pas une partie sur Chromebook.');
  }catch(e){log('ARRÊT : '+e.message);s.physics.pause();}
  finally{for(const k of ['ArrowRight','ArrowLeft','Space','KeyK','KeyJ','KeyE'])key(k,false);if(before===null)localStorage.removeItem('gardiens.refonte.level1.v1');else localStorage.setItem('gardiens.refonte.level1.v1',before);if(campaignBefore===null)localStorage.removeItem('gardiens_campagne');else localStorage.setItem('gardiens_campagne',campaignBefore);}
 };
}
