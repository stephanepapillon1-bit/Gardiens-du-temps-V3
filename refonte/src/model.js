export const SAVE_KEY='gardiens.refonte.level1.v1';
export const CHECKPOINTS=[120,1100,2320,3550];
export function cleanSave(value){
 const v=value&&typeof value==='object'?value:{};
 return {irrigation:Array.from({length:3},(_,i)=>Number.isInteger(v.irrigation?.[i])?Math.max(0,Math.min(6,v.irrigation[i])):0),version:1,stage:Number.isInteger(v.stage)?Math.max(0,Math.min(3,v.stage)):0,done:v.done===true,deaths:Number.isFinite(v.deaths)?Math.max(0,Math.floor(v.deaths)):0,seconds:Number.isFinite(v.seconds)?Math.max(0,v.seconds):0,fragments:Array.isArray(v.fragments)?[...new Set(v.fragments.filter(x=>Number.isInteger(x)&&x>=0&&x<12))]:[]};
}
export function readSave(storage){try{return cleanSave(JSON.parse(storage.getItem(SAVE_KEY)));}catch{return cleanSave(null);}}
export function writeSave(storage,value){try{storage.setItem(SAVE_KEY,JSON.stringify(cleanSave(value)));return true;}catch{return false;}}
export function irrigationResult(values){
 const total=values.reduce((a,b)=>a+b,0);
 if(total>6)return {ok:false,text:'Le canal apporte seulement 6 parts de débit. Tu en demandes '+total+' : réduis certaines ouvertures.'};
 if(values[2]<1)return {ok:false,text:'Les familles en aval dépendent du même canal. Réserve au moins une part pour elles.'};
 if(values[0]!==2||values[1]!==3)return {ok:false,text:'Le champ A a besoin de 2 parts et le champ B de 3. Trop peu assèche une parcelle; trop d’eau peut l’engorger. Ajuste chaque prise.'};
 return {ok:true,text:'Deux parts au champ A, trois au champ B, une vers l’aval : le débit est partagé. Les canaux conduisent l’eau; leur entretien et une répartition concertée rendent l’irrigation possible.'};
}
export const QUESTION={title:'Ce que le registre permet de conclure',document:'Reconstitution pédagogique — ce texte n’est pas la traduction d’une tablette réelle.\n« Équipe du canal : 12 travailleurs. Terre et limon retirés. Orge du magasin : 36 mesures reçues, 12 distribuées aux travailleurs. »',question:'Quelle conclusion est appuyée par les informations de ce registre?',answers:['Les 12 travailleurs sont nécessairement tous des esclaves du temple.','Les 24 mesures restantes prouvent que toute la population est bien nourrie.','L’entretien mobilise une équipe; le registre suit aussi la distribution des réserves.','L’orge distribuée démontre que ces travailleurs ont abandonné l’agriculture.'],correct:2,feedback:['Le statut des travailleurs n’est pas indiqué. Une liste de travailleurs ne prouve pas qu’ils sont esclaves.','Le calcul est juste : 36 − 12 = 24. Mais un seul magasin ne renseigne pas sur l’alimentation de toute la population.','Le texte mentionne une équipe, l’enlèvement du limon et une distribution d’orge. Il appuie cette conclusion sans préciser le statut de chacun.','Une distribution d’orge ne dit pas si ces personnes cultivent aussi des champs. N’ajoute pas au document une information absente.']};
export const FLOOD_ORDER=['intake','levee','drain'];
export function floodStep(step,action){return action===FLOOD_ORDER[step]?{step:step+1,ok:true}:{step:0,ok:false};}
export function bossPattern(hp,cycle){return hp>6?'wave':cycle%2?'rain':'double';}
