import {SAVE_KEY,CHECKPOINTS,readSave,writeSave,cleanSave,floodStep,bossPattern} from './model.js';
import {UI} from './ui.js';
const W=960,H=540,FLOOR=432,WORLD=4800;
const OBJECTIVES=['Rétablir le partage de l’eau','Retrouver le registre du canal','Protéger les champs de la crue','Vaincre le Gardien des crues'];
class UrScene extends Phaser.Scene{
 constructor(){super('Ur');}
 preload(){
  this.load.image('ur','ur-sunset.png');this.load.spritesheet('boars','boar-sheet.png',{frameWidth:512,frameHeight:512});this.load.spritesheet('guardian','guardian-sheet.png',{frameWidth:512,frameHeight:512});this.load.spritesheet('props','irrigation-atlas.png',{frameWidth:512,frameHeight:512});
  for(const n of ['tablet','water'])this.load.image(n,'../assets/'+n+'.png');
  for(const [type,n] of Object.entries({idle:6,run:6,jump:5,attack:5,hurt:5}))for(let i=0;i<n;i++)this.load.image(type+i,'../assets/kael_'+type+'_'+i+'.png');
  this.load.on('loaderror',file=>{document.querySelector('#loading').textContent='Ressource indisponible : '+file.key+'. Recharge la page.';this.loadFailed=true;});
 }
 create(){
  if(this.loadFailed)return;
  document.querySelector('#loading').remove();try{this.storage=window.localStorage;}catch{this.storage=null;}this.progress=new URLSearchParams(location.search).has('qa')?cleanSave(null):readSave(this.storage);this.hp=5;this.modal=false;this.started=false;this.paused=false;this.audioOn=false;this.face=1;this.clock=0;this.attackUntil=0;this.nextAttack=0;this.invUntil=0;this.dashUntil=0;this.nextDash=0;this.groundTime=-1;this.jumpConsumed=false;this.jumpBuffer=-1;this.flood=0;this.floodRead=false;this.messageUntil=0;this.bossActive=false;this.won=false;this.saveClock=0;
  // Frames reference illustrated pixels directly: no scenery is drawn with geometry.
  const art=this.textures.get('ur');art.add('landscape',0,0,0,1536,770);art.add('canal',0,730,680,210,65);art.add('earth',0,0,770,1536,254);art.add('ledge',0,320,770,256,68);
  this.back=this.add.tileSprite(0,0,W,FLOOR,'ur','landscape').setOrigin(0).setScrollFactor(0).setDepth(-20);this.back.setTileScale(1,.562);
  this.solids=this.physics.add.staticGroup();
  [[0,900],[1000,1100],[2200,1220],[3520,1280]].forEach(([x,w])=>this.ground(x,w));
  this.gates=[{x:900,stage:1},{x:2100,stage:2},{x:3420,stage:3}].map(g=>{const zone=this.add.zone(g.x,200,22,480).setOrigin(0);this.physics.add.existing(zone,true);this.solids.add(zone);g.wall=zone;g.art=this.add.image(g.x+10,FLOOR,'props',2).setOrigin(.5,1).setDisplaySize(180,180);return g;});
  [[340,342,160],[575,280,140],[1260,348,150],[1510,286,170],[1830,342,145],[2500,332,145],[2730,270,150],[3150,338,140],[3740,342,160],[4000,286,160],[4300,340,150]].forEach(([x,y,w])=>this.platform(x,y,w));
  for(const x of [45,560,1190,1750,2410,3210,3610,4470])this.add.image(x,FLOOR+5,'props',0).setOrigin(.5,1).setDisplaySize(200,200).setDepth(-4).setAlpha(.9);
  for(const x of [240,1180,2420,3640,4630])this.add.image(x,FLOOR+9,'props',1).setOrigin(.5,1).setDisplaySize(80,80).setDepth(-1);
  
  this.waters=[900,2100,3420].map(x=>this.add.tileSprite(x,FLOOR,100,H-FLOOR,'ur','canal').setOrigin(0).setTileScale(.65,1.7).setDepth(-2));
  this.stations=[{x:730,type:'irrigation',label:'LE PARTAGE DES EAUX'},{x:1950,type:'record',label:'LE REGISTRE DU CANAL'},{x:2440,type:'brief',label:'L’ALERTE À LA CRUE'},{x:2650,type:'intake',label:'PRISE D’EAU'},{x:2960,type:'levee',label:'DIGUE FRAGILE'},{x:3260,type:'drain',label:'ÉVACUATION'}];
  for(const s of this.stations){s.sprite=this.add.image(s.x,FLOOR+3,'props',({irrigation:2,record:3,brief:3,intake:2,levee:4,drain:5})[s.type]).setOrigin(.5,1).setDisplaySize(125,125).setDepth(2);this.add.text(s.x,FLOOR-110,s.label,{fontFamily:'Arial',fontSize:'10px',color:'#ffe3a2',backgroundColor:'#16252c',padding:{x:7,y:5}}).setOrigin(.5);}
  this.shards=this.physics.add.staticGroup();const coords=[[360,310],[600,248],[840,390],[1310,316],[1570,254],[1870,310],[2540,300],[2790,238],[3190,306],[3780,310],[4070,254],[4350,308]];
  coords.forEach(([x,y],id)=>{if(this.progress.fragments.includes(id))return;const f=this.shards.create(x,y,'tablet').setDisplaySize(22,26).refreshBody();f.setData('id',id);this.tweens.add({targets:f,y:y-7,yoyo:true,repeat:-1,duration:950});});
  this.player=this.physics.add.sprite(CHECKPOINTS[this.progress.stage],FLOOR-70,'idle0').setDepth(10);this.player.setSize(28,65).setOffset(42,27);this.player.body.setMaxVelocity(600,850);this.player.setCollideWorldBounds(false);
  for(const [key,n,rate,repeat] of [['idle',6,7,-1],['run',6,13,-1],['jump',5,11,0],['attack',5,24,0],['hurt',5,18,0]])this.anims.create({key,frames:Array.from({length:n},(_,i)=>({key:key+i})),frameRate:rate,repeat});
  this.player.play('idle');this.physics.add.collider(this.player,this.solids);
  this.physics.add.overlap(this.player,this.shards,(_,f)=>{const id=f.getData('id');if(!this.progress.fragments.includes(id)){this.progress.fragments.push(id);f.destroy();this.tone(880);this.burst(this.player.x,this.player.y,8);if(this.progress.fragments.length%4===0)this.hp=Math.min(5,this.hp+1);this.persist();}});
  this.anims.create({key:'boar-run',frames:this.anims.generateFrameNumbers('boars',{start:0,end:5}),frameRate:9,repeat:-1});this.enemies=this.physics.add.group({allowGravity:false,immovable:true});for(const [x,min,max] of [[490,400,680],[1390,1150,1470],[1790,1680,1900],[3050,2850,3160],[3830,3630,3920]]){const e=this.enemies.create(x,FLOOR-26,'boars').setDisplaySize(92,92).play('boar-run');e.body.setSize(310,190).setOffset(90,210);e.setData({min,max,dir:-1,hp:2,hitUntil:0});}
  this.physics.add.overlap(this.player,this.enemies,(_,e)=>this.damage(e.x));
  this.boss=this.add.sprite(4510,FLOOR+12,'guardian',0).setOrigin(.5,1).setDisplaySize(222,222).setDepth(3);this.bossHp=12;this.bossCycle=0;this.bossState='idle';this.bossTimer=1.2;this.bossHitUntil=0;this.hazards=this.physics.add.group({allowGravity:false});this.physics.add.overlap(this.player,this.hazards,()=>this.damage(this.boss.x));
  this.cameras.main.setBounds(0,0,WORLD,H).startFollow(this.player,true,.12,.12,-145,0);this.cameras.main.setDeadzone(70,160);this.physics.world.setBounds(0,-300,WORLD,1200);
  this.keys=this.input.keyboard.addKeys({left:'LEFT',right:'RIGHT',a:'A',d:'D',jump:'SPACE',up:'UP',attack:'J',x:'X',dash:'K',shift:'SHIFT',interact:'E',p:'P',esc:'ESC'});
  this.input.keyboard.on('keydown-P',()=>this.togglePause());this.input.keyboard.on('keydown-ESC',()=>this.togglePause());this.input.keyboard.on('keydown',event=>{if(this.modal&&/^[1-4]$/.test(event.key))this.ui.overlay.querySelector('[data-answer="'+(+event.key-1)+'"]')?.click();});
  this.ui=new UI(this);this.refreshGates();this.ui.title();this.updateHud();
  window.addEventListener('blur',()=>this.pauseForFocusLoss());document.addEventListener('visibilitychange',()=>{if(document.hidden)this.pauseForFocusLoss();});window.addEventListener('pagehide',()=>{if(!new URLSearchParams(location.search).has('qa'))this.persist();});
 }
 ground(x,w){this.add.tileSprite(x,FLOOR,w,H-FLOOR,'ur','earth').setOrigin(0).setTileScale(.65,.65);const z=this.add.zone(x,FLOOR,w,250).setOrigin(0);this.physics.add.existing(z,true);this.solids.add(z);}
 platform(x,y,w){this.add.tileSprite(x,y,w,32,'ur','ledge').setOrigin(0).setTileScale(.6,.5);const z=this.add.zone(x,y,w,24).setOrigin(0);this.physics.add.existing(z,true);this.solids.add(z);}
 refreshGates(){for(const g of this.gates)if(this.progress.stage>=g.stage&&!g.open){g.open=true;g.wall.destroy();g.art.destroy();this.ground(g.x,100);}for(const s of this.stations){if((s.type==='irrigation'&&this.progress.stage>0)||(s.type==='record'&&this.progress.stage>1)||(this.progress.stage>2&&['brief','intake','levee','drain'].includes(s.type)))s.sprite.setTint(0x8be1c5);}}
 persist(){const ok=writeSave(this.storage,this.progress);document.querySelector('#save-status').textContent=ok?'Point de reprise enregistré':'Sauvegarde indisponible dans ce navigateur';return ok;}
 completeStage(stage){this.progress.stage=Math.max(this.progress.stage,stage);this.hp=5;this.refreshGates();this.persist();this.tone(660);this.updateHud();}
 newGame(){this.progress=cleanSave(null);writeSave(this.storage,this.progress);location.reload();}
 pauseForFocusLoss(){if(this.started&&!this.modal&&!this.won&&!this.paused)this.togglePause();}
 togglePause(){if(!this.started||this.won)return;if(this.paused){this.paused=false;this.ui.close();}else if(!this.modal){this.paused=true;this.persist();this.ui.pause();}}
 tone(f){if(!this.audioOn)return;try{this.audio??=new(window.AudioContext||window.webkitAudioContext)();this.audio.resume();const o=this.audio.createOscillator(),g=this.audio.createGain();o.type='triangle';o.frequency.setValueAtTime(f,this.audio.currentTime);o.frequency.exponentialRampToValueAtTime(f*.6,this.audio.currentTime+.12);g.gain.setValueAtTime(.055,this.audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,this.audio.currentTime+.16);o.connect(g).connect(this.audio.destination);o.start();o.stop(this.audio.currentTime+.18);}catch{}}
 burst(x,y,n){for(let i=0;i<n;i++){const p=this.add.image(x,y,'tablet').setScale(.07).setTint(0xffd38c).setDepth(20);this.tweens.add({targets:p,x:x+Phaser.Math.Between(-65,65),y:y+Phaser.Math.Between(-70,20),alpha:0,angle:180,duration:500,onComplete:()=>p.destroy()});}}
 hint(text,duration=2.5){this.message=text;this.messageUntil=this.clock+duration;}
 damage(source){if(this.modal||this.won||this.clock<this.invUntil||this.clock<this.dashUntil)return;this.hp--;this.invUntil=this.clock+1.25;this.player.setVelocity((this.player.x<source?-1:1)*210,-200);this.knockUntil=this.clock+.2;this.cameras.main.shake(100,.004);this.tone(120);this.updateHud();if(this.hp<=0){this.progress.deaths++;this.persist();this.ui.death();}}
 respawn(count=true){if(count)this.progress.deaths++;this.hp=5;this.player.setPosition(CHECKPOINTS[this.progress.stage],FLOOR-90).setVelocity(0);this.player.body.reset(this.player.x,this.player.y);this.invUntil=this.clock+1.5;this.dashUntil=0;this.nextDash=0;this.nextAttack=0;this.attackUntil=0;this.knockUntil=0;this.groundTime=-10;this.jumpBuffer=-10;this.jumpConsumed=false;this.bossActive=false;this.bossHp=12;this.bossState='idle';this.bossTimer=1.2;this.bossCycle=0;this.boss.clearTint().setFrame(0);this.rainMark?.destroy();this.hazards.clear(true,true);document.querySelector('#boss-hud').hidden=true;this.flood=0;this.stations.filter(t=>['intake','levee','drain'].includes(t.type)).forEach(t=>t.sprite.clearTint());this.refreshGates();this.cameras.main.setBounds(0,0,WORLD,H);this.persist();this.updateHud();}
 interact(){const s=this.stations.find(s=>Math.abs(s.x-this.player.x)<82&&this.player.body.bottom>FLOOR-55);if(!s)return;
  if(s.type==='irrigation'){if(this.progress.stage===0)this.ui.irrigation();else this.ui.message('Une eau partagée','Les champs et les familles en aval reçoivent leur part. Le premier canal est rétabli.');return;}
  if(s.type==='record'){if(this.progress.stage===1)this.ui.question();else this.ui.message('Un registre de travail','Les réserves et l’entretien des canaux nécessitent une organisation collective.');return;}
  if(s.type==='brief'){this.floodRead=true;this.ui.floodBrief();return;}
  if(this.progress.stage!==2)return;
  if(!this.floodRead){this.floodRead=true;this.ui.floodBrief();return;}
  const result=floodStep(this.flood,s.type);this.flood=result.step;if(!result.ok)this.stations.filter(t=>['intake','levee','drain'].includes(t.type)).forEach(t=>t.sprite.clearTint());
  if(!result.ok){this.tone(160);this.ui.message('L’eau trouve une brèche','Il faut empêcher l’entrée d’eau <b>avant</b> de renforcer la digue, puis ouvrir l’évacuation. L’équipe remet les postes à leur état initial : recommence à la prise d’eau.');return;}
  s.sprite.setTint(0x83ded2);this.tone(550);this.hint(['','Prise fermée. Rejoins maintenant la digue.','Digue renforcée. Ouvre maintenant l’évacuation.'][this.flood]||'La crue est maîtrisée.',4);
  if(this.flood===3){this.completeStage(3);this.ui.message('Les champs sont protégés','Tu as fermé l’entrée, consolidé la digue et ouvert l’évacuation. C’est un modèle simplifié de gestion d’une crue : les ouvrages demandent une surveillance et un entretien collectifs.<br><br>Le Gardien t’attend. Observe ses gestes : <b>saute par-dessus les vagues</b>, esquive les chutes d’eau, puis frappe son cœur lorsqu’il devient turquoise.');}
 }
 strike(){if(this.clock<this.nextAttack||this.clock<this.dashUntil)return;this.attackUntil=this.clock+.22;this.nextAttack=this.clock+.32;this.player.play('attack',true);this.tone(270);const reach=this.player.x+this.face*47;
  for(const e of this.enemies.getChildren())if(e.active&&Math.abs(e.x-reach)<65&&Math.abs(e.y-(this.player.body.center.y+6))<52&&this.clock>e.getData('hitUntil')){e.setData('hp',e.getData('hp')-1);e.setData('hitUntil',this.clock+.35);this.burst(e.x,e.y,5);if(e.getData('hp')<=0)e.destroy();}
  if(this.bossActive&&this.bossState==='rest'&&this.clock>this.bossHitUntil&&Math.abs(reach-this.boss.x)<105&&this.player.body.bottom>FLOOR-145){this.bossHp--;this.bossHitUntil=this.clock+.34;this.burst(this.boss.x,FLOOR-80,10);this.cameras.main.shake(80,.003);if(this.bossHp<=0)this.victory();}
 }
 startBoss(){this.bossActive=true;this.bossTimer=1.3;this.cameras.main.setBounds(3920,0,880,H);document.querySelector('#boss-hud').hidden=false;this.hint('Le Gardien prépare ses attaques. Frappe après la vague !',3);}
 spawnWave(speed){const h=this.hazards.create(this.boss.x-60,FLOOR-15,'water').setDisplaySize(82,30);h.setVelocityX(-speed);h.setData('expires',this.clock+5);h.body.setSize(140,28).setOffset(10,10);}
 updateBoss(dt){
  if(!this.bossActive)return;
  this.player.x=Phaser.Math.Clamp(this.player.x,3960,4750);
  if(Math.abs(this.player.x-this.boss.x)<55&&this.player.body.bottom>FLOOR-135)this.damage(this.boss.x);
  this.bossTimer-=dt;
  if(this.bossState==='idle'&&this.bossTimer<=0){this.pattern=bossPattern(this.bossHp,this.bossCycle++);this.bossState='warn';this.bossTimer=this.bossHp>6?1.05:.85;this.boss.setTint(0xffb25e);this.hint(this.pattern==='rain'?'CHUTE D’EAU · Quitte la zone marquée !':this.pattern==='double'?'DOUBLE VAGUE · Prépare deux sauts !':'VAGUE BASSE · Saute !',2);if(this.pattern==='rain'){this.rainX=this.player.x;this.rainMark=this.add.image(this.rainX,FLOOR-4,'water').setDisplaySize(115,20).setTint(0xff775b).setDepth(8);}}
  else if(this.bossState==='warn'&&this.bossTimer<=0){this.bossState='attack';this.bossTimer=this.pattern==='double'?.65:.45;this.boss.clearTint();if(this.pattern==='rain'){this.rainMark?.destroy();const h=this.hazards.create(this.rainX,110,'water').setDisplaySize(74,105).setAngle(90);h.body.setSize(115,35);h.setVelocityY(490);h.setData('expires',this.clock+1.2);}else this.spawnWave(this.bossHp>6?280:340);this.cameras.main.shake(90,.003);this.tone(100);}
  else if(this.bossState==='attack'&&this.bossTimer<=0){if(this.pattern==='double')this.spawnWave(340);this.bossState='rest';this.bossTimer=this.bossHp>6?2.2:1.8;this.boss.setTint(0x73ece0);this.hint('CŒUR EXPOSÉ · Approche et frappe avec J !',this.bossTimer);}
  else if(this.bossState==='rest'&&this.bossTimer<=0){this.bossState='idle';this.bossTimer=.55;this.boss.clearTint();}
  this.boss.setFrame(this.bossState==='warn'?(this.pattern==='rain'?3:1):this.bossState==='attack'?2:this.bossState==='rest'?4:0);this.boss.y=FLOOR+12+Math.sin(this.clock*2.5)*2;document.querySelector('#boss-life').value=this.bossHp;document.querySelector('#phase').textContent=this.bossHp>6?'· I':'· II';
 }
 victory(){this.won=true;this.progress.done=true;this.hazards.clear(true,true);this.boss.setFrame(5).setAlpha(.55);document.querySelector('#boss-life').value=0;this.burst(this.boss.x,FLOOR-90,35);this.persist();try{let p=JSON.parse(localStorage.getItem('gardiens_campagne')||'{}');if(!p||typeof p!=='object'||Array.isArray(p))p={};p.level1={done:true,score:6,fragments:this.progress.fragments.length,time:Math.round(this.progress.seconds),deaths:this.progress.deaths};localStorage.setItem('gardiens_campagne',JSON.stringify(p));}catch{}this.autoAdvance=true;this.winElapsed=0;this.ui.win();}
 advance(){location.assign('../niveau_2.html');}
 updateHud(){document.querySelector('#hud').hidden=false;document.querySelector('#hearts').textContent=Array.from({length:5},(_,i)=>i<this.hp?'●':'○').join(' ');document.querySelector('#shards').textContent=this.progress.fragments.length+' / 12 éclats';document.querySelector('#objective').textContent=OBJECTIVES[this.progress.stage];}
 update(_,delta){
  if(!this.player)return;const dt=Math.min(delta/1000,.04);
  if(this.won){if(this.autoAdvance&&!document.hidden){this.winElapsed+=dt;const el=document.querySelector('#countdown');if(el)el.textContent=Math.max(0,Math.ceil(8-this.winElapsed));if(this.winElapsed>=8)this.advance();}return;}
  if(this.modal||!this.started)return;
  this.clock+=dt;this.progress.seconds+=dt;this.saveClock+=dt;if(this.saveClock>12){this.saveClock=0;this.persist();}
  this.back.tilePositionX=this.cameras.main.scrollX*.18;this.waters.forEach(w=>w.tilePositionX=this.clock*25);
  const just=k=>Phaser.Input.Keyboard.JustDown(k);const left=this.keys.left.isDown||this.keys.a.isDown,right=this.keys.right.isDown||this.keys.d.isDown;const direction=(right?1:0)-(left?1:0);if(direction)this.face=direction;
  if(this.player.body.blocked.down&&this.player.body.velocity.y>=0){this.groundTime=this.clock;this.jumpConsumed=false;}
  if(just(this.keys.jump)||just(this.keys.up))this.jumpBuffer=this.clock;
  if(!this.jumpConsumed&&this.clock-this.jumpBuffer<.12&&this.clock-this.groundTime<.1){this.jumpConsumed=true;this.player.setVelocityY(-550);this.groundTime=-10;this.jumpBuffer=-10;this.tone(350);}
  if(!this.keys.jump.isDown&&!this.keys.up.isDown&&this.player.body.velocity.y< -225)this.player.setVelocityY(-225);
  if((just(this.keys.dash)||just(this.keys.shift))&&this.clock>this.nextDash){this.dashUntil=this.clock+.16;this.nextDash=this.clock+.85;this.tone(500);}
  if(this.clock<this.dashUntil){this.player.setVelocityX(this.face*560);this.player.setVelocityY(0);this.player.setTint(0x9deded);}else{this.player.clearTint();if(!(this.clock<this.knockUntil))this.player.setVelocityX(direction*255);}
  this.player.setFlipX(this.face<0);this.player.setAlpha(this.clock<this.invUntil&&Math.floor(this.clock*14)%2===0?.4:1);
  if(just(this.keys.attack)||just(this.keys.x))this.strike();if(this.won)return;
  if(this.clock>=this.attackUntil)this.player.play(!this.player.body.blocked.down?'jump':direction?'run':'idle',true);
  if(just(this.keys.interact))this.interact();if(this.modal)return;
  for(const e of this.enemies.getChildren()){let dir=e.getData('dir');if(e.x<e.getData('min'))dir=1;if(e.x>e.getData('max'))dir=-1;e.setData('dir',dir);e.setVelocityX(dir*62);e.setFlipX(dir>0);e.setTint(this.clock<e.getData('hitUntil')?0xffc987:0xffffff);}
  for(const h of [...this.hazards.getChildren()])if(h.x<3900||h.y>590||this.clock>h.getData('expires'))h.destroy();
  if(this.player.y>650){this.damage(this.player.x+1);if(!this.modal){this.respawn(false);this.hint('Reprise sur la berge. Tes missions sont conservées.');}}
  this.player.x=Phaser.Math.Clamp(this.player.x,30,WORLD-30);
  if(this.progress.stage===3&&this.player.x>4000&&!this.bossActive)this.startBoss();this.updateBoss(dt);
  const station=this.stations.find(s=>Math.abs(s.x-this.player.x)<82&&this.player.body.bottom>FLOOR-55);document.querySelector('#hint').textContent=this.clock<this.messageUntil?this.message:station?'E · '+station.label:this.player.x<260?'← → pour avancer · Espace pour sauter':'';this.updateHud();
 }
}
const game=new Phaser.Game({type:Phaser.AUTO,width:W,height:H,parent:'game',backgroundColor:'#d08b61',pixelArt:true,antialias:false,roundPixels:true,physics:{default:'arcade',arcade:{gravity:{y:1450},debug:false,fps:60}},scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},scene:[UrScene],fps:{target:60,forceSetTimeOut:true},audio:{noAudio:true},render:{powerPreference:'low-power'}});

if(new URLSearchParams(location.search).has("qa"))import("./qa.js").then(m=>m.installQA(game));
