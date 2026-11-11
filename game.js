(()=>{'use strict';
const $=id=>document.getElementById(id);
// 画面上にエラーを表示する。ファイル名・読み込みミスを見つけやすくする。
window.addEventListener('error',e=>{
 const box=$('start-screen');
 if(box){let msg=$('runtime-error');if(!msg){msg=document.createElement('p');msg.id='runtime-error';msg.style.cssText='color:#ffd0d0;background:#641f36;padding:10px 14px;border-radius:10px;max-width:90%;font-size:12px';box.appendChild(msg);}msg.textContent='ゲーム内エラー：'+(e.message||'不明なエラー')+'（F12のConsoleも確認してな）';}
});
window.addEventListener('unhandledrejection',e=>{
 const box=$('start-screen');if(box){let msg=$('runtime-error');if(!msg){msg=document.createElement('p');msg.id='runtime-error';msg.style.cssText='color:#ffd0d0;background:#641f36;padding:10px 14px;border-radius:10px';box.appendChild(msg);}msg.textContent='処理エラー：'+String(e.reason||'不明なエラー');}
});
const canvas=$('game'),ctx=canvas?canvas.getContext('2d'):null;
if(!canvas||!ctx)throw new Error('index.html に canvas id="game" が見つからない');
const W=960,H=540,GROUND=445,WORLD_W=4640;
const STAGES=[
 {name:'黄金ジャズ酒場',sub:'踊るシャンデリア',icon:'🍷',sky:['#1d1024','#6d3126'],ground:'#774226',rim:'#df9f57',accent:'#ffd17d',music:'jazz',boss:'ポチ（犬）',hp:4,mechanic:'crumble',desc:'ジャズが流れるのに、床が流れる。'},
 {name:'星降る夜の空中庭園',sub:'月夜の反逆',icon:'🌙',sky:['#090e39','#35447f'],ground:'#38406a',rim:'#b6bcf7',accent:'#d1c0ff',music:'pop',boss:'ミケ（猫）',hp:5,mechanic:'reverse',desc:'星も足場も、信じたら負け。'},
 {name:'ネオン電脳迷宮',sub:'404 NOT FOUND',icon:'🕹️',sky:['#110e31','#351253'],ground:'#333265',rim:'#fa63dd',accent:'#6cfaff',music:'electro',boss:'コン（キツネ）',hp:5,mechanic:'laser',desc:'見えない床とレーザーの迷宮。'},
 {name:'灼熱マグマの大行進',sub:'熱すぎドッグ',icon:'🌋',sky:['#270a16','#ac3926'],ground:'#6b2e32',rim:'#ff9749',accent:'#ffca65',music:'rock',boss:'ゴン（クマ）',hp:6,mechanic:'lava',desc:'熱いステージと熱すぎるボス。'},
 {name:'アンチェイン筋肉監獄',sub:'筋肉がルール',icon:'💪',sky:['#131825','#323b4c'],ground:'#4b4a4e',rim:'#d7a66a',accent:'#ffc986',music:'metal',boss:'レオ（ライオン）',hp:8,mechanic:'fists',desc:'筋肉の圧が物理的に来る。'},
 {name:'氷結オーロラ滑走路',sub:'ツルツル絶望',icon:'❄️',sky:['#08243d','#33759e'],ground:'#4a83ac',rim:'#caefff',accent:'#a4fffa',music:'chill',boss:'ユキ（ウサギ）',hp:6,mechanic:'ice',desc:'床がすべる、つららが降る。'},
 {name:'黄金カラクリ宮殿',sub:'キラキラ詐欺',icon:'👑',sky:['#3c2445','#a97936'],ground:'#83602c',rim:'#ffe174',accent:'#ffe9a1',music:'royal',boss:'トラ（トラ）',hp:7,mechanic:'mimic',desc:'金ぴかでも、だいたい罠。'},
 {name:'深海ブルーの沈没都市',sub:'海底の秘密',icon:'🫧',sky:['#08273d','#08667e'],ground:'#185c65',rim:'#78d7d0',accent:'#a3ffee',music:'ambient',boss:'タマ（タコ）',hp:7,mechanic:'bubble',desc:'泡まで敵なの、ちょっと理不尽。'},
 {name:'狂乱のミッドナイトサーカス',sub:'笑ってはいけない',icon:'🎪',sky:['#290c35','#902c69'],ground:'#73365d',rim:'#ffc6e3',accent:'#ffe770',music:'circus',boss:'ハチ（オオカミ）',hp:8,mechanic:'circus',desc:'空飛ぶ弾と101匹のワンちゃん。'},
 {name:'終焉・超次元の修羅城',sub:'全罠、全開。',icon:'🔥',sky:['#15071c','#7d1628'],ground:'#3d2347',rim:'#ed6f7b',accent:'#ffe27d',music:'final',boss:'ドラ（ドラゴン）',hp:10,mechanic:'chaos',desc:'最後の敵は、もはや世界観そのもの。'},
 {name:'STAR UNIVERSE',sub:'星々の果て・最終試練',icon:'🌌',sky:['#080a2b','#24105b'],ground:'#29275d',rim:'#8eeaff',accent:'#fff1a8',music:'spacepop',boss:'フクロウ',hp:15,mechanic:'cosmic',desc:'10世界を制覇した者だけが入れる、星空の最終コース。'}
];
let state='MENU',stageIndex=0,stage=null,frame=0,camera=0,deathCount=0,lives=3,checkpointSaved=false,won=false,partyTicks=0,partyStars=[],danceDogs=[],toastTicks=0;
let keys={left:false,right:false,jump:false},jumpBuffer=0,canFire=false,shotCooldown=0,player=null,grounds=[],crumble=[],qblocks=[],invisible=[],hazards=[],stampedes=[],items=[],particles=[],shots=[],bossShots=[],boss=null,goal=null,checkpoint=null,midDecor=[],saveData={cleared:[]};
try{saveData=JSON.parse(localStorage.getItem('superdog_chaos_dx_save')||'{"cleared":[],"resume":null}');if(!Array.isArray(saveData.cleared))saveData.cleared=[];if(!saveData.resume||typeof saveData.resume!=='object')saveData.resume=null;}catch(e){saveData={cleared:[],resume:null};}
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),rnd=(n)=>{let x=Math.sin(n*91.21+17.29)*43758.5453;return x-Math.floor(x)},hits=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
const isPlaying=()=>state==='PLAYING';
const show=(id,v)=>$(id).hidden=!v;
function syncScreens(){show('start-screen',state==='MENU');show('stage-screen',state==='SELECT');show('death-screen',state==='DEAD');show('clear-screen',state==='CLEAR');show('pause-screen',state==='PAUSE');show('hud',['PLAYING','PARTY','DEAD','CLEAR','PAUSE'].includes(state));show('progress',['PLAYING','PARTY','DEAD','CLEAR','PAUSE'].includes(state));show('touch',['PLAYING','PARTY'].includes(state));show('save-button',['PLAYING','PAUSE'].includes(state));show('continue-button',!!saveData.resume);$('save-status').textContent=saveData.resume?'💾 セーブデータあり：続きから再開できるで':'セーブデータなし';}
function updateHud(){$('hud-world').textContent=`WORLD ${String(stageIndex+1).padStart(2,'0')} / ${STAGES.length}`;$('hud-name').textContent=STAGES[stageIndex].name;$('hud-lives').textContent=String(lives).padStart(2,'0');$('hud-deaths').textContent=String(deathCount).padStart(2,'0');$('hud-fire').hidden=!canFire;$('fire').hidden=!canFire;$('progressfill').style.width=`${clamp(player?player.x/WORLD_W*100:0,0,100)}%`;}
function toast(s,t=150){$('toast').textContent=s;$('toast').classList.add('active');toastTicks=t;}
function hideToast(){$('toast').classList.remove('active');toastTicks=0;}
function saveProgress(){try{localStorage.setItem('superdog_chaos_dx_save',JSON.stringify(saveData));return true;}catch(e){return false;}}
function saveCurrentRun(){if(!['PLAYING','PAUSE'].includes(state)||!player)return false;saveData.resume={stage:stageIndex,x:player.x,y:player.y,vx:player.vx,vy:player.vy,face:player.face,grounded:player.grounded,camera,checkpointSaved,lives,deathCount,canFire,bossHp:boss?boss.hp:null,bossX:boss?boss.x:null};const ok=saveProgress();toast(ok?'💾 セーブ完了！次回はここから再開できるで！':'⚠️ 保存できなかった。ブラウザの保存設定を確認してな。',190);return ok;}
function continueSavedRun(){const run=saveData.resume;if(!run){toast('セーブデータがないで！',130);return;}const n=clamp(Number(run.stage)||0,0,STAGES.length-1);if(n===10&&!isSecretUnlocked()){toast('🔒 隠しコースの解放条件を満たしていないで！',180);return;}stageIndex=n;stage=STAGES[n];checkpointSaved=!!run.checkpointSaved;lives=clamp(Number(run.lives)|| (n===10?5:3),1,n===10?5:3);deathCount=Math.max(0,Number(run.deathCount)||0);buildLevel();if(player){player.x=clamp(Number.isFinite(Number(run.x))?Number(run.x):90,0,WORLD_W-player.w);player.y=clamp(Number.isFinite(Number(run.y))?Number(run.y):floorYAt(player.x)-player.h,0,H+80);player.vx=clamp(Number.isFinite(Number(run.vx))?Number(run.vx):0,-6,6);player.vy=clamp(Number.isFinite(Number(run.vy))?Number(run.vy):0,-15,15);player.face=run.face<0?-1:1;player.grounded=!!run.grounded;player.invuln=45;camera=clamp(Number.isFinite(Number(run.camera))?Number(run.camera):Math.max(0,player.x-300),0,WORLD_W-W);}canFire=!!run.canFire;if(boss){if(run.bossHp!==null&&run.bossHp!==undefined&&Number.isFinite(Number(run.bossHp)))boss.hp=clamp(Number(run.bossHp),0,boss.maxhp);if(run.bossX!==null&&run.bossX!==undefined&&Number.isFinite(Number(run.bossX)))boss.x=clamp(Number(run.bossX),0,WORLD_W-boss.w);}state='PLAYING';syncScreens();updateHud();music.start(stageIndex);hideToast();toast('💾 セーブ地点から再開！',140);}
function resetSaveData(){if(!window.confirm('本当にセーブデータをリセットする？\nクリアした星・隠しコースの解放・途中セーブがすべて消えるで。'))return;saveData={cleared:[],resume:null};try{localStorage.removeItem('superdog_chaos_dx_save');}catch(e){}stageIndex=0;stage=STAGES[0];checkpointSaved=false;lives=3;deathCount=0;buildLevel();state='MENU';music.stop();syncScreens();toast('🗑 セーブデータをリセットしたで！',170);}
function isSecretUnlocked(){return Array.from({length:10},(_,i)=>i).every(i=>saveData.cleared.includes(i));}
function stageSelect(){state='SELECT';keys.left=keys.right=keys.jump=false;music.stop();fillStageGrid();syncScreens();}
function fillStageGrid(){const visible=STAGES.map((s,i)=>({s,i})).filter(({i})=>i<10||isSecretUnlocked());$('stage-grid').innerHTML=visible.map(({s,i})=>`<button class="stage-card ${i===10?'secret-stage':''}" data-stage="${i}" style="--a:${s.sky[0]};--b:${s.sky[1]}"><span class="num">WORLD ${String(i+1).padStart(2,'0')} ${i===10?'・SECRET':''}</span><span class="clear">${saveData.cleared.includes(i)?'⭐':''}</span><span class="emoji">${s.icon}</span><span class="sname">${s.name}</span></button>`).join('');$('stage-grid').querySelectorAll('[data-stage]').forEach(b=>b.addEventListener('click',()=>startStage(Number(b.dataset.stage),true)));}
function makePlayer(x,y){return{x,y,w:34,h:44,vx:0,vy:0,grounded:false,coyote:0,face:1,invuln:0,walk:0,reverse:0,reverseTriggered:false};}
function floorYAt(x){let top=GROUND;for(const g of grounds)if(x+15>=g.x&&x+15<=g.x+g.w)top=Math.min(top,g.y);return top;}
function carveFloorAt(x,w){let next=[];for(const g of grounds){const l=g.x,r=g.x+g.w;if(x>=r||x+w<=l){next.push(g);continue;}if(x>l+2)next.push({...g,w:x-l});if(x+w<r-2)next.push({...g,x:x+w,w:r-x-w});}grounds=next;}
function startStage(n,fresh=false){const target=clamp(n,0,STAGES.length-1);if(target===10&&!isSecretUnlocked()){toast('🔒 先にWORLD 01〜10をすべてクリアしよう！',180);return;}stageIndex=target;stage=STAGES[stageIndex];if(fresh){checkpointSaved=false;lives=stageIndex===10?5:3;deathCount=0;}buildLevel();state='PLAYING';syncScreens();updateHud();hideToast();music.start(stageIndex);toast(`${stage.icon} ${stage.name}`,110);}
function buildLevel(){
 grounds=[];crumble=[];qblocks=[];invisible=[];hazards=[];stampedes=[];items=[];particles=[];shots=[];bossShots=[];partyTicks=0;partyStars=[];danceDogs=[];canFire=false;shotCooldown=0;camera=checkpointSaved?1900:0;
 // Prevent held movement/jump from leaking into a retry or next stage.
 keys.left=false;keys.right=false;keys.jump=false;jumpBuffer=0;
 const b=stageIndex===10?[{x:0,w:570},{x:700,w:430},{x:1250,w:420},{x:1800,w:440},{x:2380,w:400},{x:2910,w:430},{x:3480,w:1160}]:[{x:0,w:640},{x:765,w:390},{x:1265,w:380},{x:1755,w:385},{x:2235,w:450},{x:2790,w:385},{x:3295,w:1345}];
 grounds=b.map((g,i)=>({...g,y:(stageIndex===1&&[1,2,3,5].includes(i))?GROUND-([0,42,12,30,0,18,0][i]):(stageIndex===7&&i===2?GROUND-24:GROUND),h:540}));
 // For long jumps, a small helpful ledge appears on selected gaps.
 if(stageIndex%3===1){grounds.push({x:686,y:394,w:58,h:22,float:true});grounds.push({x:1692,y:375,w:66,h:18,float:true});}
 if(stageIndex>=5){grounds.push({x:3170,y:378,w:90,h:18,float:true});}
 if(stageIndex===10){grounds.push({x:610,y:382,w:70,h:18,float:true},{x:1145,y:366,w:76,h:18,float:true},{x:1705,y:382,w:72,h:18,float:true},{x:2250,y:360,w:78,h:18,float:true},{x:2785,y:375,w:78,h:18,float:true},{x:3350,y:382,w:82,h:18,float:true});}
 const weak=stageIndex===10?[{x:830,w:82},{x:1415,w:82},{x:2515,w:86},{x:3010,w:84}]:[{x:890,w:96},{x:1510,w:84},{x:2860,w:98}];
 if(stageIndex>0&&stageIndex!==10)weak.push({x:2365,w:100});
 if(stageIndex===9)weak.push({x:3390,w:100});
 for(const d of weak){const y=floorYAt(d.x+20);carveFloorAt(d.x,d.w);crumble.push({x:d.x,y,w:d.w,h:28,delay:-1,fall:0,vy:0});}
 const blocks=[
 [230,321,'FIRE'],[420,317,'GOLD'],[550,303,'COPPER'],[846,308,'SILVER'],
 [1360,300,stageIndex%2?'SILVER':'GOLD'],[1880,319,'COPPER'],[2315,301,'FIRE'],
 [2490,305,'GOLD'],[2950,304,'SILVER'],[3125,301,'COPPER'],[3435,313,'GOLD']
 ];
 qblocks=blocks.map(([x,y,type],i)=>({x,y,w:44,h:44,type,hit:false,bump:0,style:i%3}));
 invisible=[{x:680,y:300,w:42,h:42,visible:false},{x:1165,y:295,w:42,h:42,visible:false},{x:2710,y:290,w:42,h:42,visible:false}];
 if(stageIndex>=3)invisible.push({x:3390,y:286,w:42,h:42,visible:false});
 for(const [x,trigger,kind] of [[1050,790,'spear'],[2000,1715,'spear'],[3040,2795,stageIndex===5?'icicle':'spear']])hazards.push({kind,x,y:-120,w:30,h:100,trigger,t:-1,vy:0,active:true});
 if(['laser','chaos','mimic'].includes(stage.mechanic)){for(const x of [1450,2630,3345])hazards.push({kind:'laser',x,y:170,w:24,h:275,phase:Math.floor(rnd(x+stageIndex)*130)});}
 if(['lava','chaos'].includes(stage.mechanic)){for(const x of [1320,2520,3070])hazards.push({kind:'geyser',x,y:GROUND-15,w:55,h:0,phase:Math.floor(rnd(x)*130)});}
 if(['bubble','chaos'].includes(stage.mechanic)){for(const x of [1490,1960,2950])hazards.push({kind:'bubble',x,y:GROUND-145,w:42,h:42,phase:x%80});}
 if(['circus','chaos'].includes(stage.mechanic)){for(const x of [950,1850,3070])hazards.push({kind:'cannon',x,y:GROUND-50,w:38,h:40,clock:0});}
 if(['fists','chaos'].includes(stage.mechanic)){for(const x of [1440,2600])hazards.push({kind:'fist',x,y:-120,w:90,h:120,trigger:x-265,t:-1,vy:0,active:true});}
 if(['ice'].includes(stage.mechanic))for(const x of [820,1440,2350])hazards.push({kind:'icicle',x,y:-120,w:34,h:110,trigger:x-265,t:-1,vy:0,active:true});
 if(['reverse','chaos'].includes(stage.mechanic))hazards.push({kind:'reverse',x:1800,y:GROUND-40,w:85,h:40,used:false});
 if(['mimic','chaos'].includes(stage.mechanic))hazards.push({kind:'fakefood',x:3165,y:GROUND-72,w:65,h:73,used:false});
 if(stageIndex===10){
  for(const [x,phase] of [[1360,15],[2740,70],[3385,115]])hazards.push({kind:'stargate',x,y:170,w:30,h:275,phase,period:170,on:76,active:false});
  for(const [x,phase] of [[930,30],[1930,95],[3070,145]])hazards.push({kind:'meteor',x,y:-70,w:34,h:38,phase,clock:0,next:phase,falling:false,speed:6.1});
  for(const x of [625,1740,2810])hazards.push({kind:'boost',x,y:GROUND-83,w:54,h:83,used:false});
 }
 if([0,2,8,9].includes(stageIndex))stampedes.push({trigger:3090,activated:false,dogs:[],age:0});
 // tiny floating jumps before the final arena keep the boss encounter reachable.
 grounds.push({x:3500,y:374,w:85,h:18,float:true});
 checkpoint={x:stageIndex===10?2460:2318,y:GROUND-90,w:27,h:90};
 goal={x:4480,y:GROUND-119,w:103,h:118};
 const bossSize=stageIndex===4?174:stageIndex===9?187:stageIndex===10?180:130+stageIndex*3;
 boss={x:stageIndex===10?3990:4020,y:GROUND-bossSize,w:stageIndex===9?190:stageIndex===10?180:stageIndex===4?174:102+stageIndex*3,h:bossSize,hp:stage.hp,maxhp:stage.hp,vx:-(stageIndex===10?2.35:1.4+stageIndex*.13),vy:0,grounded:true,attack:0,flash:0,active:false,stompCooldown:0,phase:0};
 // Respawn on the solid section BEFORE the 2365px collapsing floor.
 // Previously x=checkpoint.x+48 placed stages 2-10 in a falling-floor tile.
 const spX=checkpointSaved?checkpoint.x-48:90;
 player=makePlayer(spX,floorYAt(spX)-44);
 if(checkpointSaved)player.invuln=70;
 frame=0;
}
function startFresh(){saveData.resume=null;saveProgress();startStage(0,true);}
function retry(){
 if(state!=='DEAD'&&state!=='PLAYING'&&state!=='PAUSE')return;
  // A true Game Over loses the checkpoint and restarts with three lives.
 if(lives<=0){lives=3;checkpointSaved=false;}
 startStage(stageIndex,false);
}
function kill(reason, unavoidable=false){
 if(state!=='PLAYING')return;
 // Falling off-screen and copper poison must not cause invincibility softlocks.
 if(player.invuln>0&&!unavoidable)return;
 state='DEAD';lives=Math.max(0,lives-1);deathCount++;
 if(lives===0){
  checkpointSaved=false;
  $('death-msg').textContent=reason+' 残機0！ 中間地点はリセットされる。';
  $('retry-label').textContent='💀 GAME OVER：スタート地点から再挑戦';
 }else{
  $('death-msg').textContent=reason;
  $('retry-label').textContent=checkpointSaved?'🚩 中間地点から復活！':'🐾 コースの最初から挑戦';
 }
 keys.left=keys.right=keys.jump=false;jumpBuffer=0;
 updateHud();syncScreens();sound.die();
}
function clear(){if(state!=='PLAYING'||boss.hp>0)return;const unlockedBefore=isSecretUnlocked();state='CLEAR';if(!saveData.cleared.includes(stageIndex))saveData.cleared.push(stageIndex);if(stageIndex===10)saveData.resume=null;else{const nextIndex=Array.from({length:10},(_,i)=>i).find(i=>!saveData.cleared.includes(i));saveData.resume={stage:nextIndex===undefined?10:nextIndex};}saveProgress();const unlockedNow=isSecretUnlocked();if(stageIndex===10){$('clear-title').textContent='🌌 宇宙の頂点！';$('clear-msg').textContent='STAR UNIVERSE 完全制覇！11の世界をすべてクリアした伝説のレトリバー！';$('next-button').textContent='🏆 タイトルに戻る';}else if(unlockedNow&&!unlockedBefore){$('clear-title').textContent='🌌 WORLD 11 解放！';$('clear-msg').textContent='10の世界をすべて制覇した！星々の向こうに、最後の宇宙コースが現れた！';$('next-button').textContent='🚀 STAR UNIVERSEへ！';}else{$('clear-title').textContent='STAGE CLEAR!';$('clear-msg').textContent=`${STAGES[stageIndex].name}を突破！巨大ドッグフードをゲット！`;$('next-button').textContent=unlockedNow?'🌌 STAR UNIVERSEへ！':'▶ 次のワールドへ';}syncScreens();sound.win();}
function next(){if(stageIndex===10){state='MENU';music.stop();syncScreens();return;}if(isSecretUnlocked()){checkpointSaved=false;startStage(10,true);return;}const nextIndex=Array.from({length:10},(_,i)=>i).find(i=>!saveData.cleared.includes(i));if(nextIndex!==undefined){checkpointSaved=false;startStage(nextIndex,false);return;}state='MENU';music.stop();syncScreens();}
function pause(){
 if(state==='PLAYING'){
  state='PAUSE';keys.left=keys.right=keys.jump=false;jumpBuffer=0;syncScreens();
 }else if(state==='PAUSE'){
  state='PLAYING';keys.left=keys.right=keys.jump=false;jumpBuffer=0;syncScreens();
 }
}
function pressJump(){if(!keys.jump){keys.jump=true;jumpBuffer=9;}}
function releaseJump(){keys.jump=false;if(player&&player.vy< -4)player.vy*=.57;}
function fire(){if(!isPlaying()||!canFire||shotCooldown>0)return;shotCooldown=18;shots.push({x:player.x+player.w/2+player.face*22,y:player.y+20,w:17,h:15,vx:player.face*11,life:90});sound.shoot();}
const normalizeCode=c=>['ArrowLeft','KeyA'].includes(c)?'left':['ArrowRight','KeyD'].includes(c)?'right':['Space','KeyW','ArrowUp'].includes(c)?'jump':null;
document.addEventListener('keydown',e=>{const key=normalizeCode(e.code);if(key){e.preventDefault();if(state==='PLAYING'){if(key==='jump'){if(!e.repeat)pressJump();}else keys[key]=true;}return;}if(e.code==='KeyF'&&!e.repeat){e.preventDefault();fire();}if(e.code==='KeyR'&&!e.repeat){e.preventDefault();if(state==='DEAD'||state==='PLAYING'||state==='PAUSE')retry();}if((e.code==='KeyP'||e.code==='Escape')&&!e.repeat){e.preventDefault();pause();}if(e.code==='KeyM'&&!e.repeat)music.toggle();});
document.addEventListener('keyup',e=>{const k=normalizeCode(e.code);if(k==='jump')releaseJump();else if(k)keys[k]=false;});window.addEventListener('blur',()=>{keys={left:false,right:false,jump:false};if(state==='PLAYING')pause();});
function bindHold(id,down,up){const b=$(id);if(!b)throw new Error(`操作ボタン #${id} が index.html に見つからない`);b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);initAudio();down();});for(const evt of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(evt,e=>{e.preventDefault();up();});}
bindHold('left',()=>keys.left=true,()=>keys.left=false);bindHold('right',()=>keys.right=true,()=>keys.right=false);bindHold('jump',pressJump,releaseJump);bindHold('fire',fire,()=>{});
// 固定ボタンはそれぞれに直接イベントを登録。クリックの委譲漏れを防ぐ。
function bindClick(id,action){
 const button=$(id);
 if(!button)throw new Error(`ボタン #${id} が index.html に見つからない`);
 button.addEventListener('click',event=>{event.preventDefault();action();});
}
bindClick('start-button',()=>{initAudio();startFresh();});
bindClick('continue-button',()=>{initAudio();continueSavedRun();});
bindClick('reset-button',resetSaveData);
bindClick('save-button',saveCurrentRun);
bindClick('save-title-button',()=>{if(saveCurrentRun()){state='MENU';music.stop();syncScreens();}});
for(const id of ['select-button','death-select','clear-select','pause-select'])bindClick(id,stageSelect);
bindClick('select-back',()=>{state='MENU';syncScreens();});
bindClick('retry-button',()=>{initAudio();retry();});
bindClick('next-button',()=>{initAudio();next();});
bindClick('resume-button',pause);
bindClick('pause',pause);
bindClick('mute',()=>music.toggle());
function spawnDust(x,y,color='#ffecac',n=8){for(let i=0;i<n;i++)particles.push({x,y,vx:(rnd(frame+i)*2-1)*4,vy:-2-rnd(i*19+frame)*4,life:35+rnd(i*7)*20,color,size:2+rnd(i*3)*5});}
function hitBlock(q){if(q.hit)return;q.hit=true;q.bump=12;items.push({type:q.type,x:q.x+5,y:q.y-35,w:34,h:39,vx:rnd(q.x+stageIndex)>.5?-2.1:2.1,vy:-3.7,age:0});spawnDust(q.x+20,q.y,stage.accent,9);sound.block();}
function checkFloor(o,oldBottom,allowCrumble=true){let landing=null;for(const g of grounds){if(o.x+o.w<=g.x+3||o.x>=g.x+g.w-3)continue;if(oldBottom<=g.y+10&&o.y+o.h>=g.y&&o.vy>=0){if(!landing||g.y<landing.y)landing=g;}}
 if(allowCrumble)for(const f of crumble){if(f.fall>0)continue;if(o.x+o.w<=f.x+3||o.x>=f.x+f.w-3)continue;if(oldBottom<=f.y+10&&o.y+o.h>=f.y&&o.vy>=0){if(!landing||f.y<landing.y)landing=f;}}
 if(landing){o.y=landing.y-o.h;o.vy=0;o.grounded=true;if(o===player&&allowCrumble&&crumble.includes(landing)&&landing.delay<0)landing.delay=27-(stageIndex>=7?8:0);return landing;}return null;}
function updatePlayer(){
 player.walk+=Math.abs(player.vx)*.11;
 const reverse=player.reverse>0?-1:1,dir=((keys.right?1:0)-(keys.left?1:0))*reverse;
 const accel=stage.mechanic==='ice'?.25:.73,drag=stage.mechanic==='ice'?.985:.79;
 if(dir){player.vx=clamp(player.vx+dir*accel,-5.6,5.6);player.face=dir>0?1:-1;}else player.vx*=drag;
 player.x=clamp(player.x+player.vx,0,WORLD_W-player.w);
 if(jumpBuffer>0)jumpBuffer--;
 if(player.grounded)player.coyote=7;else player.coyote=Math.max(0,player.coyote-1);
 if(jumpBuffer>0&&player.coyote>0){player.vy=-13.7;player.grounded=false;player.coyote=0;jumpBuffer=0;spawnDust(player.x+player.w/2,player.y+player.h,'#fff9cc',6);sound.jump();}
 const oldTop=player.y,oldBottom=player.y+player.h;player.vy=Math.min(player.vy+.66,15);player.y+=player.vy;player.grounded=false;
 for(const q of qblocks){if(q.bump>0)q.bump--;if(player.x+player.w<=q.x+3||player.x>=q.x+q.w-3)continue;
  if(player.vy<0&&oldTop>=q.y+q.h-7&&player.y<=q.y+q.h){player.y=q.y+q.h+1;player.vy=1.7;hitBlock(q);}
  else if(player.vy>=0&&oldBottom<=q.y+9&&player.y+player.h>=q.y){player.y=q.y-player.h;player.vy=0;player.grounded=true;}
 }
 for(const q of invisible){if(player.x+player.w<=q.x+3||player.x>=q.x+q.w-3)continue;
  if(player.vy<0&&oldTop>=q.y+q.h-7&&player.y<=q.y+q.h){player.y=q.y+q.h+1;player.vy=2;q.visible=true;spawnDust(q.x+21,q.y+21,'#cfdbff',5);sound.block();}
  else if(q.visible&&player.vy>=0&&oldBottom<=q.y+9&&player.y+player.h>=q.y){player.y=q.y-player.h;player.vy=0;player.grounded=true;}
 }
 checkFloor(player,oldBottom);
 if(player.y>H+80){kill('穴に落ちた！ 落ちた先は犬も知らない世界。',true);return;}
 if(player.invuln>0)player.invuln--;
 if(player.reverse>0)player.reverse--;
 if(shotCooldown>0)shotCooldown--;
 if(checkpoint&&!checkpointSaved&&player.x+player.w>checkpoint.x+12){checkpointSaved=true;player.invuln=55;toast('🚩 中間セーブ！ やられてもここから！',160);spawnDust(checkpoint.x,checkpoint.y,'#ffda65',24);sound.checkpoint();}
 if(goal&&hits(player,goal)){if(boss.hp<=0)clear();else if(frame%60===0)toast('🔒 先にボスを倒そう！',65);}
}
function updateCrumble(){for(const f of crumble){if(f.delay>=0){f.delay--;if(f.delay===0){f.fall=1;spawnDust(f.x+f.w/2,f.y,stage.rim,15);sound.crumble();}}if(f.fall>0){f.vy+=.55;f.y+=f.vy;f.fall++;}}}
function updateItems(){for(let i=items.length-1;i>=0;i--){const it=items[i];it.age++;const oldBottom=it.y+it.h;it.vy=Math.min(it.vy+.52,12);it.x+=it.vx;it.y+=it.vy;it.grounded=false;
 checkFloor(it,oldBottom,true);
 if(it.x<0||it.x>WORLD_W)it.vx*=-1;
 if(it.y>H+100){items.splice(i,1);continue;}
 if(hits(it,player)){
  if(it.type==='GOLD'){lives=Math.min(99,lives+1);toast('🥇 金のレトリバー像！ 1UP +1',135);sound.gold();}
  if(it.type==='COPPER'){items.splice(i,1);kill('🥉 銅のレトリバー像は毒だった！ 金色と見間違えた？',true);return;}
  if(it.type==='SILVER'){startParty();}
  if(it.type==='FIRE'){canFire=true;toast('🔥 ファイアボーン獲得！ Fで炎を投げられる！',140);sound.gold();}
  items.splice(i,1);updateHud();
 }
 }}
function startParty(){partyTicks=300;danceDogs=Array.from({length:86},(_,i)=>({x:rnd(i*7+3)*W,y:rnd(i*19+7)*H,s:26+rnd(i*13+5)*42,phase:rnd(i*3+4)*6.28,delay:i*2.4}));partyStars=Array.from({length:44},(_,i)=>({x:rnd(i*3+2)*W,y:rnd(i*29+12)*H,r:2+rnd(i*17)*5}));state='PARTY';sound.party();toast('🥈 シルバー犬像！ DOG DISCO 発動！',200);syncScreens();}
function updateTraps(){
 for(const h of hazards){
  if(h.kind==='spear'||h.kind==='icicle'||h.kind==='fist'){
   if(h.t<0&&player.x+player.w>h.trigger)h.t=0;
   if(h.t>=0){h.t++;if(h.t>24){h.vy+=h.kind==='fist'?1.45:1.1;h.y+=h.vy;}if(h.t>180)h.active=false;}
   if(h.active&&h.t>24&&hits(player,h))kill(h.kind==='icicle'?'❄️ 空から巨大なつららが！':h.kind==='fist'?'💪 天から筋肉の鉄拳が落ちてきた！':'🗡️ 天井の槍が落ちてきた！');
  } else if(h.kind==='laser'){
    const on=(frame+h.phase)%165<105;if(on&&hits(player,h))kill('⚡ ネオンレーザーが起動！ タイミングを見極めよう。');
  }else if(h.kind==='geyser'){
    h.h=(frame+h.phase)%145<42?190:0;if(h.h&&player.x<h.x+h.w&&player.x+player.w>h.x&&player.y+player.h>GROUND-h.h)kill('🌋 突然のマグマ噴射！ 焼き上がったのはドッグフードではない。');
  }else if(h.kind==='bubble'){
    h.y=GROUND-145+Math.sin((frame+h.phase)*.047)*72;if(hits(player,h))kill('🫧 深海の危険な巨大泡に捕まった！');
  }else if(h.kind==='cannon'){
    h.clock++;if(h.clock%135===30&&Math.abs(h.x-player.x)<850)bossShots.push({x:h.x,y:h.y-10,w:23,h:23,vx:-4.6,vy:-7,kind:'ball',life:200});
  }else if(h.kind==='reverse'){
    if(!h.used&&hits(player,h)){h.used=true;player.reverse=210;toast('↔ 操作が逆になった！ 3.5秒だけ！',170);sound.block();}
  }else if(h.kind==='stargate'){
    h.active=((frame+h.phase)%h.period)<h.on;if(h.active&&hits(player,h))kill('✨ 星のゲートに触れた！ 光が消えるタイミングを見よう。');
  }else if(h.kind==='meteor'){
    h.clock++;if(!h.falling&&Math.abs(h.x-player.x)<780&&h.clock>=h.next){h.falling=true;h.y=-55;h.clock=0;}
    if(h.falling){h.y+=h.speed;if(hits(player,h))kill('☄️ 流星が目の前に落ちてきた！');if(h.y>H+30){h.falling=false;h.next=95+Math.floor(rnd(h.x+frame)*75);h.clock=0;}}
  }else if(h.kind==='boost'){
    if(!h.used&&hits(player,h)){h.used=true;player.vy=-16.2;player.grounded=false;player.vx=player.face*7.4;spawnDust(h.x+h.w/2,h.y+h.h/2,'#fff2a8',24);toast('🌠 スターダッシュ！ 大ジャンプ！',100);sound.gold();}
  }else if(h.kind==='fakefood'){
    if(!h.used&&hits(player,h)){h.used=true;toast('🥫 偽物のドッグフードだ！！',110);hazards.push({kind:'spear',x:h.x-45,y:-100,w:35,h:100,trigger:-999,t:0,vy:0,active:true});}
  }
 }
 for(const s of stampedes){if(!s.activated&&player.x>=s.trigger){s.activated=true;s.age=0;s.dogs=Array.from({length:101},(_,i)=>({x:s.trigger+480+i*30,y:GROUND-32-(i%13===0?7:0),w:31,h:30,speed:7.8+stageIndex*.23+rnd(i*13)*1.5}));toast('🐕 101匹のワンちゃんが大暴走！！',140);sound.woof();}
 if(s.activated){s.age++;for(const d of s.dogs){d.x-=d.speed;if(d.x+32<player.x-680)continue;if(hits(player,d))kill('🐕 101匹のワンちゃん軍団に追いつかれた！ ジャンプで回避！');}}}
}
function updateBoss(){if(!boss||boss.hp<=0)return;boss.active=player.x>3535||boss.active;if(!boss.active)return;boss.attack++;boss.phase+=.04;if(boss.flash>0)boss.flash--;if(boss.stompCooldown>0)boss.stompCooldown--;
 boss.x+=boss.vx;if(boss.x<3650||boss.x>4340-boss.w)boss.vx*=-1;
 let floor=GROUND;if(boss.grounded&&boss.attack%(110-stageIndex*3)===0){boss.vy=-(8+stageIndex*.19);boss.grounded=false;}
 if(!boss.grounded){boss.vy+=.55;boss.y+=boss.vy;if(boss.y+boss.h>=floor){boss.y=floor-boss.h;boss.vy=0;boss.grounded=true;}}
 const every=Math.max(62,150-stageIndex*7);
 if(boss.attack%every===35){const side=player.x<boss.x?-1:1;bossShots.push({kind:['pencil','gear','pixel','lava','wave','snow','coin','bubble','clown','wave','star'][stageIndex],x:boss.x+(side<0?-15:boss.w),y:GROUND-27,w:29,h:27,vx:side*(4.3+stageIndex*.36),vy:stageIndex%2===0?-4.5:-7,life:145});sound.boss();}
 if(stageIndex>=7&&boss.attack%210===110)for(const dy of [32,70])bossShots.push({kind:'orb',x:boss.x+boss.w/2,y:boss.y+dy,w:24,h:24,vx:player.x<boss.x?-5.1:5.1,vy:-2.5,life:130});
 if(stageIndex===10&&boss.attack%150===95){for(const offset of [-1,0,1])bossShots.push({kind:'star',x:boss.x+boss.w/2,y:boss.y+50,w:26,h:26,vx:(player.x<boss.x?-1:1)*(5.5+offset*1.1),vy:-3.5+Math.abs(offset)*1.2,life:150});}
 if(hits(player,boss)){
  const prevBottom=player.y+player.h-player.vy;
  if(player.vy>0&&prevBottom<=boss.y+19&&boss.stompCooldown===0){hitBoss(1);player.vy=-12.5;player.y=boss.y-player.h-2;player.grounded=false;boss.stompCooldown=20;sound.stomp();}
  else if(boss.stompCooldown===0)kill(`👹 ボス「${stage.boss}」の圧倒的なパワーに負けた！`);
 }
}
function hitBoss(n){if(boss.hp<=0)return;boss.hp=Math.max(0,boss.hp-n);boss.flash=17;spawnDust(boss.x+boss.w/2,boss.y+boss.h/2,'#ffad60',14);if(boss.hp<=0){boss.active=false;bossShots=[];toast('🏆 ボス撃破！ 巨大ドッグフードへ急げ！',180);sound.bossDown();}}
function updateProjectiles(){for(let i=shots.length-1;i>=0;i--){const b=shots[i];b.x+=b.vx;b.life--;if(boss.hp>0&&hits(b,boss)){hitBoss(1);shots.splice(i,1);continue;}if(b.life<=0||b.x<0||b.x>WORLD_W){shots.splice(i,1);continue;}}
 for(let i=bossShots.length-1;i>=0;i--){const b=bossShots[i];b.life--;b.x+=b.vx;b.vy+=b.kind==='wave'?.8:.18;b.y+=b.vy;if(b.y>GROUND-b.h){b.y=GROUND-b.h;b.vy=b.kind==='wave'?-1.5:-6;}if(hits(player,b)){kill('💥 予想外の飛び道具！ ボスは遠くからも襲ってくる。');}if(b.life<=0)bossShots.splice(i,1);}}
function updateParticles(){for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.x+=p.vx;p.y+=p.vy;p.vy+=.13;p.life--;if(p.life<=0)particles.splice(i,1);}}
function tick(){frame++;if(toastTicks>0&&--toastTicks===0)hideToast();
 if(state==='PARTY'){partyTicks--;if(partyTicks<=0){state='PLAYING';syncScreens();toast('🎉 パーティー終了！ また地獄へ。',115);}return;}
 if(state!=='PLAYING')return;
 updatePlayer();if(state!=='PLAYING')return;
 updateCrumble();updateItems();if(state!=='PLAYING')return;
 updateTraps();if(state!=='PLAYING')return;
 updateBoss();if(state!=='PLAYING')return;
 updateProjectiles();if(state!=='PLAYING')return;
 updateParticles();
 camera+=(clamp(player.x-260,0,WORLD_W-W)-camera)*.095;
 if(frame%5===0)updateHud();
}
// ----- ORIGINAL SYNTHETIC SOUNDTRACK; no outside audio assets -----
let audio=null,master=null,musicTimer=null,seqTime=0,seqStep=0,muted=false,activeMusicIndex=0;
function initAudio(){if(!audio){try{audio=new (window.AudioContext||window.webkitAudioContext)();master=audio.createGain();master.gain.value=.19;master.connect(audio.destination);}catch(e){return;}}if(audio.state==='suspended'){const resumed=audio.resume();if(resumed&&typeof resumed.catch==='function')resumed.catch(()=>{});}}
function osc(freq,wave,at,duration,vol=.12,detune=0){if(!audio||muted)return;const o=audio.createOscillator(),g=audio.createGain();o.type=wave;o.frequency.setValueAtTime(freq,at);o.detune.value=detune;g.gain.setValueAtTime(.0001,at);g.gain.exponentialRampToValueAtTime(Math.max(.0002,vol),at+.012);g.gain.exponentialRampToValueAtTime(.0001,at+duration);o.connect(g);g.connect(master);o.start(at);o.stop(at+duration+.04);}
function freq(m){return 440*Math.pow(2,(m-69)/12);}
const BGM=[
 {bpm:118,root:48,kind:'jazz',bass:[0,7,12,7,5,12,10,7],mel:[12,null,16,19,17,null,16,12,14,null,12,7,10,12,16,null]},
 {bpm:124,root:50,kind:'pop',bass:[0,7,5,7,3,7,5,7],mel:[12,14,17,null,19,17,14,null,12,10,14,null,17,14,12,null]},
 {bpm:146,root:45,kind:'electro',bass:[0,0,7,0,3,3,10,7],mel:[12,19,17,null,15,17,12,7,12,19,null,22,20,19,17,null]},
 {bpm:157,root:43,kind:'rock',bass:[0,0,7,0,8,8,7,5],mel:[12,null,12,15,17,null,15,12,19,17,15,null,12,10,12,null]},
 {bpm:168,root:40,kind:'metal',bass:[0,0,0,1,3,0,6,5],mel:[12,12,15,12,18,15,12,7,12,12,17,15,12,10,7,null]},
 {bpm:92,root:50,kind:'chill',bass:[0,7,5,9,3,7,5,7],mel:[12,null,null,16,19,null,17,null,14,null,12,9,12,null,14,null]},
 {bpm:129,root:48,kind:'royal',bass:[0,7,12,7,5,12,7,5],mel:[12,16,19,24,22,19,16,null,17,21,24,22,19,17,16,null]},
 {bpm:86,root:45,kind:'ambient',bass:[0,7,5,7,3,7,5,7],mel:[12,null,null,19,null,17,null,14,12,null,null,10,null,12,null,19]},
 {bpm:173,root:52,kind:'circus',bass:[0,7,5,7,0,7,5,7],mel:[12,16,19,16,12,19,24,null,17,21,24,21,17,12,14,null]},
 {bpm:185,root:38,kind:'final',bass:[0,0,6,0,3,0,8,7],mel:[12,15,18,19,18,15,12,7,12,15,19,24,22,19,18,15]},
 {bpm:156,root:60,kind:'spacepop',bass:[0,7,5,7,3,7,10,7],mel:[12,16,19,24,22,19,16,null,14,17,21,24,21,17,14,null]}
];
function musicStep(t){if(!audio||muted)return;const s=BGM[activeMusicIndex];const i=seqStep%16,b=s.bass[Math.floor(i/2)%s.bass.length],bass=freq(s.root-12+b),kind=s.kind;
 if(i%2===0)osc(bass,kind==='jazz'||kind==='chill'||kind==='ambient'?'sine':'triangle',t,.25,kind==='metal'?.17:.13);
 if(s.mel[i]!==null)osc(freq(s.root+12+s.mel[i]),kind==='jazz'||kind==='ambient'?'sine':kind==='electro'?'square':kind==='metal'||kind==='rock'?'sawtooth':'triangle',t+.012,kind==='ambient'?.32:.15,kind==='jazz'?.09:.075);
 if(i%4===0){for(const note of [0,4,7])osc(freq(s.root+note+12+(i>=8?5:0)),kind==='jazz'?'sine':'triangle',t,.25,kind==='jazz'?.035:.027);}
 if(kind!=='ambient'){if(i%4===0)osc(67, 'sine',t,.075,.18);if(i%8===4)osc(164,'triangle',t,.055,.075);if((kind==='electro'||kind==='circus'||kind==='metal')&&i%2===1)osc(2100,'square',t,.019,.013);}
 if(kind==='spacepop'){const arp=[24,19,16,19,26,21,17,21];if(i%2===1)osc(freq(s.root+arp[i%arp.length]),'square',t+.018,.075,.026);if(i%4===2)osc(2350,'sine',t,.035,.022);}
}
const music={
 start(index){
  activeMusicIndex=index;initAudio();this.stop();
  if(!audio)return;
  seqStep=0;seqTime=audio.currentTime+.08;
  musicTimer=setInterval(()=>{
   if(!audio)return;
   // When paused/muted/backgrounded, move the scheduler forward. Without
   // this, unmuting after a minute could schedule hundreds of notes at once.
   if(muted||audio.state!=='running'||!['PLAYING','PARTY'].includes(state)){
    seqTime=audio.currentTime+.06;
    return;
   }
   if(seqTime<audio.currentTime-.25)seqTime=audio.currentTime+.04;
   let safety=0;
   while(seqTime<audio.currentTime+.16&&safety++<8){
    if(state==='PARTY'){
     const j=seqStep%16;
     if(j%2===0)osc(freq(48+[0,7,10,12][Math.floor(j/4)%4]),'square',seqTime,.13,.10);
     osc(freq(72+[0,4,7,9,12,9,7,4][j%8]),'triangle',seqTime,.085,.10);
    }else musicStep(seqTime);
    seqTime+=60/(state==='PARTY'?174:BGM[activeMusicIndex].bpm)/4;
    seqStep++;
   }
  },45);
 },
 stop(){if(musicTimer)clearInterval(musicTimer);musicTimer=null;},
 toggle(){
  muted=!muted;
  $('mute').textContent=muted?'🔇':'♫';
  if(!muted){initAudio();if(audio)seqTime=audio.currentTime+.06;}
 }
};
const sound={jump(){osc(520,'square',audio?.currentTime||0,.13,.13);},block(){osc(790,'square',audio?.currentTime||0,.1,.11);},gold(){if(!audio)return;for(let i=0;i<4;i++)osc(freq(73+i*4),'triangle',audio.currentTime+i*.08,.26,.13);},die(){if(!audio)return;for(let i=0;i<5;i++)osc(freq(58-i*3),'sawtooth',audio.currentTime+i*.1,.2,.13);},checkpoint(){this.gold();},crumble(){osc(122,'sawtooth',audio?.currentTime||0,.18,.12);},shoot(){osc(690,'sawtooth',audio?.currentTime||0,.11,.1);},stomp(){osc(200,'square',audio?.currentTime||0,.19,.2);},boss(){osc(100,'sawtooth',audio?.currentTime||0,.2,.1);},bossDown(){this.gold();},win(){this.gold();},woof(){osc(155,'sawtooth',audio?.currentTime||0,.4,.15);},party(){this.gold();}};
// ----- CANVAS ARTWORK -----
function rect(x,y,w,h,c){ctx.fillStyle=c;ctx.fillRect(x,y,w,h);}
function rr(x,y,w,h,r,c){ctx.fillStyle=c;ctx.beginPath();if(typeof ctx.roundRect==='function'){ctx.roundRect(x,y,w,h,r);}else{const q=Math.max(0,Math.min(r,w/2,h/2));ctx.moveTo(x+q,y);ctx.arcTo(x+w,y,x+w,y+h,q);ctx.arcTo(x+w,y+h,x,y+h,q);ctx.arcTo(x,y+h,x,y,q);ctx.arcTo(x,y,x+w,y,q);ctx.closePath();}ctx.fill();}
function circle(x,y,r,c){ctx.fillStyle=c;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();}
function ellipse(x,y,rx,ry,c){ctx.fillStyle=c;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fill();}
function line(x1,y1,x2,y2,c,w=2){ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.strokeStyle=c;ctx.lineWidth=w;ctx.stroke();}
function text(str,x,y,font,color,align='left'){ctx.font=font;ctx.textAlign=align;ctx.fillStyle=color;ctx.fillText(str,x,y);ctx.textAlign='left';}
function gradient(y1,y2,a,b){let g=ctx.createLinearGradient(0,y1,0,y2);g.addColorStop(0,a);g.addColorStop(1,b);return g;}
function star(x,y,s,c='#fff4b8'){line(x-s,y,x+s,y,c,1.5);line(x,y-s,x,y+s,c,1.5);circle(x,y,1.5,c);}
function drawBackground(){const s=stage||STAGES[0],id=stageIndex;rect(0,0,W,H,gradient(0,H,s.sky[0],s.sky[1]));
 if(id===0){ // warm, rich tavern
  for(let i=-1;i<14;i++){const x=i*112-(camera*.16%112);rect(x,0,7,H,'#1f102088');rect(x+50,0,2,H,'#d1a66b19');}
  rect(0,275,W,15,'#6d3f30');rect(0,292,W,17,'#261523');rect(0,370,W,75,'#311c24');
  for(let i=-1;i<10;i++){const x=i*155-(camera*.19%155);rr(x+22,105,105,151,18,'#1b1427');rr(x+30,112,89,137,13,'#ac643b');rect(x+74,112,3,137,'#553225');rect(x+30,178,89,3,'#553225');circle(x+45,134,3,'#ffdf8d');}
  for(let i=0;i<7;i++){const x=i*163-(camera*.3%163);rect(x+20,302,130,12,'#a36b45');rect(x+24,314,11,65,'#61332f');rect(x+133,314,10,65,'#61332f');rr(x+31,286,25,16,3,'#b83d56');rect(x+48,276,8,15,'#e3c9a5');}
  for(let i=0;i<5;i++){const x=(i*247+70)-(camera*.18%1235);line(x,0,x,65,'#c49e6d',2);circle(x,73,23,'#ffbc6677');circle(x,73,11,'#ffe4a3');}
  rr(355-camera*.08,14,260,44,8,'#38252d');text('GOLDEN JAZZ PUB',485-camera*.08,42,'bold 23px Georgia','#ffe7a3','center');
 }else if(id===1){
  circle(746-camera*.03,98,46,'#ffeed1');circle(761-camera*.03,87,43,s.sky[0]);for(let i=0;i<95;i++){const x=(rnd(i*7)*1200-camera*.16)%1100,y=rnd(i*19)*280;star((x+1100)%1100,y,1.1+rnd(i*23)*2,i%3?'#e5ddff':'#ffe8a5');}
  for(let i=0;i<12;i++){let x=i*160-camera*.27%1920;ellipse(x,350+Math.sin(i)*35,105,32,'#b4a6ea30');ellipse(x+34,344+Math.sin(i)*35,70,27,'#f2d9ee33');}
  for(let i=0;i<10;i++){const x=i*175-camera*.4%1750;rr(x,315+(i%3)*25,60,85,25,'#a5a3eb29');rect(x+15,300+(i%3)*25,7,15,'#fff4b555');}
 }else if(id===2){
  for(let i=0;i<25;i++){const x=i*64-(camera*.27%64),h=90+rnd(i*13)*230;rect(x,GROUND-h,44,h,'#0a0d31');for(let j=0;j<8;j++)if(rnd(i*23+j)>.45)rect(x+9+(j%3)*11,GROUND-h+15+Math.floor(j/3)*32,5,10,'#6df8ff7c');}
  for(let i=0;i<16;i++){const y=140+i*26;line(0,y,W,y,'#b74fff12',1);}for(let i=0;i<16;i++)line(i*90-(camera*.1%90),140,i*90-(camera*.1%90),H,'#69c4ff0e',1);
  for(let i=0;i<4;i++){let x=(i*325+30)-(camera*.26%1300);rr(x,90+(i%3)*75,175,43,5,'#080b3199');text(['ERROR 404','DOG.exe','RUN >>>','⚡SYSTEM'][i],x+10,117+(i%3)*75,'bold 19px monospace',i%2?'#ff5edf':'#6bf9ed');}
 }else if(id===3){
  for(let i=0;i<6;i++){const x=i*250-(camera*.18%1500);ctx.fillStyle='#231019';ctx.beginPath();ctx.moveTo(x,GROUND);ctx.lineTo(x+128,115+(i%3)*42);ctx.lineTo(x+274,GROUND);ctx.fill();line(x+128,130+(i%3)*42,x+143,230+(i%3)*42,'#ff6b3988',9);}
  for(let i=0;i<32;i++){const x=(rnd(i*21)*1200-camera*.13%1200+1200)%1200,y=(rnd(i*33)*H+frame*.8*(i%3+1))%H;circle(x,y,1.8+(i%3),'#ffc66f77');}
  rect(0,GROUND-10,W,100,'#ba301f99');for(let i=0;i<20;i++)ellipse(i*60-(camera*.2%60),GROUND+10+Math.sin(frame*.08+i)*7,36,13,'#f6ad3777');
 }else if(id===4){
  for(let i=0;i<14;i++){const x=i*100-(camera*.24%100);rect(x,0,13,GROUND,'#0c121d77');rect(x+43,0,5,GROUND,'#a9c0cc19');rect(x+10,130,96,7,'#607080aa');rect(x+10,360,96,6,'#607080aa');}
  for(let i=0;i<7;i++){let x=i*168-camera*.2%1176;rect(x,85,110,144,'#111623');for(let k=0;k<5;k++)rect(x+14+k*20,85,5,144,'#9a989355');rr(x+27,285,58,34,6,'#ad733a');text('IRON',x+37,308,'bold 13px sans-serif','#ffdbb1');}
  for(let i=0;i<5;i++){const x=i*250-camera*.17%1250;line(x,0,x,140,'#c0b0a499',6);circle(x,147,17,'#a1a6aa');}
 }else if(id===5){
  for(let i=0;i<14;i++){const x=i*165-(camera*.15%2310),h=80+rnd(i*45)*140;ctx.beginPath();ctx.moveTo(x-85,GROUND);ctx.lineTo(x+60,GROUND-h);ctx.lineTo(x+205,GROUND);ctx.fillStyle='#97e6ed44';ctx.fill();line(x+60,GROUND-h,x+130,GROUND-h/2,'#ffffff88',3);}
  for(let i=0;i<6;i++){const x=i*290-camera*.08%1740;ellipse(x,52+(i%2)*18,210,50,'#8dfaca24');ellipse(x+100,100,200,55,'#84c4fc19');}
  for(let i=0;i<50;i++){const x=(rnd(i*45)*1100-camera*.2%1100+1100)%1100,y=(rnd(i*12)*540+frame*(i%3+1)*.6)%540;star(x,y,1.4,'#ffffffa8');}
 }else if(id===6){
  for(let i=0;i<10;i++){let x=i*148-(camera*.18%148);rect(x,66,115,365,'#46253b88');rect(x+9,67,96,9,'#f7d17799');rect(x+20,74,8,300,'#edc97962');rect(x+90,74,8,300,'#edc97962');rr(x+35,101,55,90,27,'#b06c4399');star(x+62,136,13,'#ffeaa6');}
  for(let i=0;i<8;i++){let x=i*210-(camera*.22%210);line(x,0,x,58,'#ffb95f',2);circle(x,75,19,'#fff0c049');for(let j=-1;j<=1;j++)circle(x+j*13,78,5,'#ffe8a3');}
 }else if(id===7){
  for(let i=0;i<9;i++){const x=i*158-(camera*.18%158);ctx.beginPath();ctx.moveTo(x,GROUND);ctx.lineTo(x+35,245);ctx.lineTo(x+67,GROUND);ctx.fillStyle='#134e5d';ctx.fill();for(let j=0;j<4;j++)circle(x+40,330+j*20,5,'#42c9aa67');}
  for(let i=0;i<10;i++){let x=i*170-(camera*.25%170);rr(x,210+(i%2)*49,32,210,13,'#80dad034');rr(x+9,189+(i%2)*49,14,16,4,'#ddf7ce75');}
  for(let i=0;i<34;i++){let x=(rnd(i*3)*1050+frame*(i%4+1)*.15)%1050,y=(rnd(i*27)*540-frame*(1+i%3)*.55+2000)%540;circle(x,y,3+i%3,'#bdffff31');}
  for(let i=0;i<6;i++)line(i*200,0,i*200-160,GROUND,'#5de7fb12',38);
 }else if(id===8){
  for(let i=0;i<18;i++){const x=i*80-(camera*.22%80);ctx.fillStyle=i%2?'#9b315982':'#f6aeaf44';ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x+80,0);ctx.lineTo(x+40,280);ctx.fill();}
  for(let i=0;i<16;i++){let x=i*91-(camera*.15%91);circle(x,272,7,(i+Math.floor(frame/13))%3?'#ffec94':'#ff5a8f');}
  for(let i=0;i<7;i++){const x=i*195-(camera*.25%1365);rr(x,318,110,125,60,'#43274c88');rr(x+15,323,80,70,45,'#d95392a1');star(x+55,343,11,'#fff09e');}
 }else if(id===10){
  // Deep-space sky: a bright nebula band, hundreds of twinkling stars and planets.
  ctx.save();ctx.translate(W/2,H/2);ctx.rotate(-.28);const neb=ctx.createRadialGradient(0,0,35,0,0,560);neb.addColorStop(0,'#b05cff38');neb.addColorStop(.42,'#4c7bff24');neb.addColorStop(1,'#090a3000');ctx.fillStyle=neb;ctx.fillRect(-620,-230,1240,460);ctx.restore();
  for(let i=0;i<230;i++){const drift=.012+(i%6)*.006;const sx=((rnd(i*17+1)*W-camera*drift)%W+W)%W,sy=rnd(i*23+2)*H;const tw=.55+.45*Math.sin(frame*.055+i*1.7),size=.7+rnd(i*31+8)*2.4;circle(sx,sy,size,`rgba(255,255,255,${.28+tw*.65})`);if(i%13===0)star(sx,sy,size*2.2,i%26?'#aeeeff':'#ffe9a5');}
  for(let i=0;i<7;i++){const x=((i*205-camera*.035)%1500+1500)%1500-250,y=80+(i%3)*105;ellipse(x,y,155,28,'#a56cff16');ellipse(x+25,y+10,105,17,'#68d7ff18');}
  const px=175-(camera*.045%1180);const pg=ctx.createRadialGradient(px-17,112,4,px,112,62);pg.addColorStop(0,'#fff1c9');pg.addColorStop(.35,'#e9a7ff');pg.addColorStop(1,'#6548b7');circle(px,112,58,pg);ctx.strokeStyle='#d7baff99';ctx.lineWidth=5;ctx.beginPath();ctx.ellipse(px,119,84,20,-.18,0,Math.PI*2);ctx.stroke();
  const px2=760-(camera*.025%1320);const pg2=ctx.createRadialGradient(px2-15,285,2,px2,285,35);pg2.addColorStop(0,'#d6ffff');pg2.addColorStop(.4,'#56c9e7');pg2.addColorStop(1,'#254a9b');circle(px2,285,37,pg2);
  if(frame%170<7){const sx=80+(frame*13)%850;line(sx,40,sx-65,72,'#ffffffcc',2);circle(sx,40,2,'#fff');}
 }else{
  for(let i=0;i<15;i++){const x=i*110-(camera*.1%110);ctx.beginPath();ctx.moveTo(x,GROUND);ctx.lineTo(x+70,120+(i%4)*40);ctx.lineTo(x+165,GROUND);ctx.fillStyle='#1c0c24aa';ctx.fill();}
  for(let i=0;i<7;i++){let x=i*230-camera*.19%1610;line(x,-30,x+70,GROUND,'#d9538344',13);circle(x+30,73,25,'#c742574a');}
  for(let i=0;i<30;i++){let x=(rnd(i*17)*1300-camera*.22%1300+1300)%1300,y=(rnd(i*29)*540+frame*.8)%540;circle(x,y,1.3+i%3,'#ff697aaa');}
  if(frame%200<6){line(605,0,575,120,'#e8c7f499',3);line(575,120,660,190,'#e8c7f499',3);}
 }
 // atmospheric fog along horizon
 rect(0,405,W,42,gradient(405,447,'#ffffff00','#05051a38'));
}
function drawGrounds(){for(const g of grounds){if(g.x+g.w<camera-100||g.x>camera+W+100)continue;const {x,y,w}=g;rr(x,y,w,g.float?20:H-y+200,2,stage.ground);if(stageIndex===10){ctx.save();ctx.shadowColor=stage.rim;ctx.shadowBlur=15;rect(x,y,w,9,stage.rim);ctx.restore();}else rect(x,y,w,9,stage.rim);rect(x,y+8,w,4,'#21122e33');if(g.float)rect(x+5,y+14,w-10,3,stageIndex===10?'#d9fbff88':'#ffffff24');for(let i=Math.floor(x/45)*45;i<x+w;i+=45){line(i,y+13,i,y+(g.float?19:170),'#160d1b3a',1);if(i%90===0&&!g.float){circle(i+18,y+29,3,stage.accent+'66');}}}}
function drawCrumble(){for(const f of crumble){if(f.y>H+60)continue;ctx.save();const shake=f.delay>=0?Math.sin(frame*2)*3:0;ctx.translate(shake,0);rect(f.x,f.y,f.w,f.h,stage.ground);rect(f.x,f.y,f.w,8,f.delay>=0?'#ff7b5b':stage.rim);for(let i=8;i<f.w;i+=24){line(f.x+i,f.y+9,f.x+i+7,f.y+23,'#120e27aa',2);}if(f.delay>=0)text('!',f.x+f.w/2,f.y-10,'bold 18px monospace','#ffd89c','center');ctx.restore();}}
function drawQuestionBlocks(){for(const q of qblocks){const yy=q.y-(q.bump>0?Math.sin(q.bump/12*Math.PI)*7:0),s=stage;rr(q.x+2,yy+3,q.w,q.h,5,'#0009');rr(q.x,yy,q.w,q.h,5,q.hit?'#484054':s.rim);rr(q.x+4,yy+4,q.w-8,q.h-8,3,q.hit?'#777284':s.ground);rect(q.x+6,yy+5,q.w-12,4,q.hit?'#9995aa':s.accent);circle(q.x+6,yy+6,2,'#ffffffab');circle(q.x+q.w-6,yy+q.h-7,2,'#ffffffab');text(q.hit?'·':['?','✦','♬','✧','♛'][stageIndex%5],q.x+22,yy+32,'bold 28px system-ui',q.hit?'#bcbcc1':'#fff2ba','center');}
 for(const q of invisible)if(q.visible){rr(q.x,q.y,q.w,q.h,5,'#b7c6e4aa');rr(q.x+4,q.y+4,q.w-8,q.h-8,4,'#ffffff44');text('!',q.x+21,q.y+30,'bold 24px sans-serif','#fff','center');}}
function drawStatue(x,y,type,size=1,tick=0){const palette={GOLD:['#ffef8d','#d59b22','#fffbd5'],SILVER:['#f2f7ff','#899db6','#fff'],COPPER:['#f0b67d','#9e5035','#ffdab0']};const c=palette[type]||palette.GOLD;ctx.save();ctx.translate(x,y+Math.sin(tick*.13)*1.3);ctx.scale(size,size);
 ellipse(18,38,19,5,'#0005');rr(4,30,28,8,2,c[1]);rect(6,30,24,3,c[0]);
 ellipse(17,24,12,13,c[1]);ellipse(15,22,11,13,c[0]);ellipse(8,25,5,8,c[1]);ellipse(27,27,5,8,c[1]);
 ellipse(7,12,6,11,c[1]);ellipse(28,12,6,11,c[1]);circle(18,12,13,c[0]);ellipse(18,18,7,6,c[2]);circle(18,17,2.6,'#513126');circle(13,11,2,c[1]);circle(23,11,2,c[1]);rect(13,6,11,2,'#ffffff7a');
 if(type==='GOLD'){text('★',17,3,'bold 12px sans-serif','#fff9b3','center');}if(type==='SILVER')text('♫',31,7,'bold 12px sans-serif','#f3eaff','center');
 ctx.restore();}
 function drawHero(x,y,dance=false){if(player.invuln>0&&Math.floor(frame/5)%2===0)return;ctx.save();ctx.translate(x+player.w/2,y+player.h/2);ctx.scale(player.face,1);const bop=dance?Math.sin(frame*.34)*5:player.grounded?Math.sin(player.walk)*1.8:0;ctx.translate(0,bop);if(dance)ctx.rotate(Math.sin(frame*.3)*.29);
 // paws and running legs
 const gait=player.grounded&&!dance?Math.sin(player.walk)*5:dance?Math.sin(frame*.4)*8:0;
 rr(-13,14+gait,10,10,4,'#b77b3e');rr(4,14-gait,10,10,4,'#b77b3e');ellipse(14,3,9,4,'#c38b46');
 ellipse(0,4,15,17,'#edb969');ellipse(0,8,10,12,'#ffdf9e');
 ctx.save();ctx.rotate(Math.sin(frame*.15)*.17);rr(-11,-2,8,15,5,'#dca150');rr(4,-2,8,15,5,'#dca150');ctx.restore();
 ellipse(-12,-16,7,12,'#ae713c');ellipse(12,-16,7,12,'#ae713c');circle(0,-14,15,'#edbe76');ellipse(0,-8,8,6,'#ffe6ae');circle(0,-9,2.7,'#342434');circle(-6,-16,2.1,'#281d24');circle(6,-16,2.1,'#281d24');circle(-6.3,-16.7,.8,'white');circle(5.7,-16.7,.8,'white');
 // iconic scarf and hero hat
 rr(-12,-2,23,5,3,'#e84b62');ctx.beginPath();ctx.moveTo(7,1);ctx.lineTo(16,13+Math.sin(frame*.16)*3);ctx.lineTo(4,5);ctx.fillStyle='#b62c52';ctx.fill();
 rr(-13,-31,25,8,5,'#30285d');rr(-16,-25,32,5,3,'#453b86');circle(-4,-27,3,'#ffce56');
 if(canFire){circle(14,3,3,'#ff7e2e');star(17,1,5,'#ffdb56');}
 ctx.restore();}
function drawBoss(b){
 if(b.hp<=0)return;
 const id=stageIndex;
 const coats=['#c98a45','#e9a94d','#d96b35','#8b6049','#d6a34c','#f0eee5','#d77a32','#5a9d9b','#8a8f9e','#8a4dba','#b6a6e8'];
 const darks=['#75472d','#8a542f','#9a3e25','#49352e','#9a5b22','#a5b8c0','#71351d','#233f46','#424b5a','#43235f','#5d4c9d'];
 const lights=['#f7d7a5','#fff0c2','#fff0d8','#d8c0a7','#f9dca2','#ffffff','#ffd49b','#d5eeee','#e2e5ed','#f0d7ff','#fff5c7'];
 ctx.save();
 ctx.translate(b.x+b.w/2,b.y+b.h/2);
 if(b.flash>0&&frame%4<2)ctx.globalAlpha=.5;
 ctx.scale(b.w/120,b.h/150);
 if(b.vx>0)ctx.scale(-1,1);
 const coat=coats[id],dark=darks[id],light=lights[id];
 if(id===10){ctx.save();ctx.rotate(frame*.012);ctx.strokeStyle='#ffe78b';ctx.lineWidth=4;ctx.beginPath();ctx.ellipse(0,-44,66,18,0,0,Math.PI*2);ctx.stroke();for(let k=0;k<5;k++){const a=k*Math.PI*2/5+frame*.012;star(Math.cos(a)*66,-44+Math.sin(a)*18,5,'#fff5b5');}ctx.restore();}
 // Tail and back legs.
 ctx.strokeStyle=coat;ctx.lineWidth=12;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(-35,14);ctx.quadraticCurveTo(-66,8,-58,-20+Math.sin(frame*.13)*5);ctx.stroke();
 rr(-31,28,17,34,7,dark);rr(14,28,17,34,7,dark);
 // Dragon gets wings; the other bosses get a broad animal body.
 if(id===9){
  ctx.fillStyle='#61358d';ctx.beginPath();ctx.moveTo(-28,-2);ctx.lineTo(-76,-42);ctx.lineTo(-67,24);ctx.lineTo(-25,22);ctx.fill();
  ctx.beginPath();ctx.moveTo(28,-2);ctx.lineTo(76,-42);ctx.lineTo(67,24);ctx.lineTo(25,22);ctx.fill();
 }
 ellipse(0,12,48,37,coat);ellipse(0,19,29,22,light);
 // Lion mane and panda eye patches.
 if(id===4){for(let k=0;k<12;k++){const a=k*Math.PI/6;circle(Math.cos(a)*38,Math.sin(a)*34-23,17,'#b96b2d');}}
 rr(-45,27,23,12,6,coat);rr(22,27,23,12,6,coat);
 // Ears / horns differ by animal.
 if(id===0||id===8){ellipse(-28,-39,11,20,dark);ellipse(28,-39,11,20,dark);}
 else if(id===1||id===2||id===5||id===6){
  ctx.fillStyle=dark;ctx.beginPath();ctx.moveTo(-28,-48);ctx.lineTo(-32,-83);ctx.lineTo(-5,-59);ctx.fill();ctx.beginPath();ctx.moveTo(28,-48);ctx.lineTo(32,-83);ctx.lineTo(5,-59);ctx.fill();
  if(id===5){ctx.save();ctx.translate(-13,-60);ctx.rotate(-.16);ellipse(0,-19,9,27,'#f6f2e9');ellipse(0,-19,4,18,'#f4b5ca');ctx.restore();ctx.save();ctx.translate(13,-60);ctx.rotate(.16);ellipse(0,-19,9,27,'#f6f2e9');ellipse(0,-19,4,18,'#f4b5ca');ctx.restore();}
 }
 else if(id===3||id===7){circle(-24,-56,13,dark);circle(24,-56,13,dark);circle(-24,-56,7,coat);circle(24,-56,7,coat);}
 else if(id===9){ctx.fillStyle='#f4b94d';ctx.beginPath();ctx.moveTo(-23,-53);ctx.lineTo(-34,-82);ctx.lineTo(-8,-59);ctx.fill();ctx.beginPath();ctx.moveTo(23,-53);ctx.lineTo(34,-82);ctx.lineTo(8,-59);ctx.fill();}
 else if(id===10){ctx.fillStyle=dark;ctx.beginPath();ctx.moveTo(-25,-51);ctx.lineTo(-37,-82);ctx.lineTo(-5,-60);ctx.fill();ctx.beginPath();ctx.moveTo(25,-51);ctx.lineTo(37,-82);ctx.lineTo(5,-60);ctx.fill();}
 // Head and muzzle.
 circle(0,-31,34,coat);
 if(id===2){ // fox's pale cheek mask
  ellipse(0,-17,25,17,light);
 } else if(id===7){ // panda eye patches
  ellipse(-13,-36,10,14,dark);ellipse(13,-36,10,14,dark);
 } else if(id===4){ // lion's warm face
  ellipse(0,-20,23,18,'#e9b56d');
 } else {
  ellipse(0,-18,23,16,light);
 }
 circle(-12,-35,5,'#fff');circle(12,-35,5,'#fff');
 circle(-11,-35,2.4,'#211a23');circle(13,-35,2.4,'#211a23');
 ellipse(0,-19,5,4,dark);
 ctx.strokeStyle='#39242c';ctx.lineWidth=2.2;ctx.beginPath();ctx.moveTo(0,-15);ctx.lineTo(0,-10);ctx.moveTo(0,-10);ctx.quadraticCurveTo(-7,-5,-12,-10);ctx.moveTo(0,-10);ctx.quadraticCurveTo(7,-5,12,-10);ctx.stroke();
 // Distinctive stripes, suction cups, or scales.
 if(id===6){for(let k=-2;k<=2;k++){line(k*13-3,-55,k*13+4,-46,dark,5);line(k*13-4,-2,k*13+4,5,dark,4);}}
 if(id===7){ellipse(-13,-36,10,14,dark);ellipse(13,-36,10,14,dark);circle(-11,-35,2.5,'#fff');circle(13,-35,2.5,'#fff');}
 if(id===9){for(let k=0;k<5;k++)circle(-25+k*13,8+(k%2)*8,3,'#f7d76c');}
 if(id===5){line(-18,-67,-9,-62,'#d8d4cb',2);line(18,-67,9,-62,'#d8d4cb',2);}
 // Collar and badge.
 rr(-28,3,56,9,4,id===9?'#f5bf53':'#e94c69');circle(0,8,7,'#ffe18b');
 ctx.restore();
 // Name tag and health bar.
 rr(b.x-23,b.y-35,b.w+46,29,7,'#100d29d9');
 text(stage.boss,b.x+b.w/2,b.y-16,'bold 12px system-ui','#fff3de','center');
 rr(b.x,b.y-7,b.w,7,3,'#160c23');rr(b.x,b.y-7,b.w*(b.hp/b.maxhp),7,3,'#ff6969');
}
function drawFood(x,y,size=1,fake=false){ctx.save();ctx.translate(x,y);ctx.scale(size,size);ellipse(51,113,49,10,'#0006');rr(8,12,87,100,12,fake?'#7655a3':'#d75c4a');ellipse(51,16,44,14,fake?'#b0a2d9':'#ffe5a3');ellipse(51,107,44,12,fake?'#c9b1dc':'#f0b75c');rr(16,33,71,56,9,fake?'#866bad':'#fff2bb');text('DOG',51,56,'1000 24px system-ui',fake?'#f8e4ff':'#913f46','center');text('FOOD',51,77,'1000 20px system-ui',fake?'#fff':'#913f46','center');if(!fake){star(16,19,6,'#fff');star(89,50,6,'#fff');}ctx.restore();}
function drawTraps(){for(const h of hazards){if(h.kind==='spear'||h.kind==='icicle'||h.kind==='fist'){
  if(h.t>=0&&h.t<=24){for(let k=0;k<4;k++)line(h.x-12,h.y+110+k*35,h.x+52,h.y+110+k*35,'#ff7272'+(frame%12<6?'aa':'35'),3);text('!',h.x+14,90,'bold 28px sans-serif','#ff5656','center');}
  if(h.t>=0&&h.active&&h.t>24){if(h.kind==='fist'){rr(h.x,h.y,90,110,24,'#c7836a');for(let i=0;i<4;i++)rr(h.x+6+i*20,h.y+70,18,34,7,'#e5ae82');}else{ctx.fillStyle=h.kind==='icicle'?'#b7f5ff':'#c4ccd8';ctx.beginPath();ctx.moveTo(h.x,h.y);ctx.lineTo(h.x+h.w,h.y);ctx.lineTo(h.x+h.w/2,h.y+h.h);ctx.fill();line(h.x+7,h.y+6,h.x+h.w/2,h.y+h.h-16,h.kind==='icicle'?'#fff':'#758297',3);}}
 }else if(h.kind==='laser'){rect(h.x-7,160,38,14,'#322c50');const on=(frame+h.phase)%165<105;if(on){rect(h.x,174,h.w,GROUND-174,'#ff426483');rect(h.x+8,174,7,GROUND-174,'#fff5b7');circle(h.x+12,175,15,'#ff6c9a88');}else{rect(h.x+10,174,5,GROUND-174,'#8664e043');}}
 else if(h.kind==='geyser'&&h.h){rr(h.x,GROUND-h.h,h.w,h.h,9,'#fa663dbb');rr(h.x+13,GROUND-h.h+10,23,h.h-10,10,'#ffc25b99');}
 else if(h.kind==='bubble'){circle(h.x+21,h.y+21,22,'#81eeed65');circle(h.x+13,h.y+12,7,'#ffffff83');circle(h.x+23,h.y+23,5,'#ff6273');}
 else if(h.kind==='cannon'){rr(h.x,h.y,39,37,8,'#3b2849');circle(h.x+17,h.y+18,13,'#dbe0f0');circle(h.x+17,h.y+18,7,'#272943');}
 else if(h.kind==='stargate'){const pulse=.65+.35*Math.sin(frame*.12+h.phase);ctx.save();ctx.shadowColor='#a5f7ff';ctx.shadowBlur=18;ctx.strokeStyle=h.active?'#fff0a8':'#7c8bff99';ctx.lineWidth=6;ctx.beginPath();ctx.ellipse(h.x+h.w/2,GROUND-125,25,115,0,0,Math.PI*2);ctx.stroke();ctx.strokeStyle=`rgba(139,239,255,${pulse})`;ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(h.x+h.w/2,GROUND-125,14,105,0,0,Math.PI*2);ctx.stroke();ctx.restore();if(h.active)text('!',h.x+h.w/2,150,'bold 22px system-ui','#fff2a8','center');}
 else if(h.kind==='meteor'){if(h.falling){ctx.save();ctx.shadowColor='#ffb36d';ctx.shadowBlur=18;line(h.x+17,h.y-24,h.x+17,h.y+17,'#ffb86c',9);circle(h.x+17,h.y+18,14,'#ff8d53');circle(h.x+12,h.y+12,5,'#fff0ad');ctx.restore();}else if(Math.abs(h.x-player.x)<780){star(h.x+17,36,8,'#ffdca0');}}
 else if(h.kind==='boost'){ctx.save();ctx.shadowColor='#ffe68b';ctx.shadowBlur=16;ctx.strokeStyle=h.used?'#8d9bb4':'#fff0a0';ctx.lineWidth=6;ctx.beginPath();ctx.ellipse(h.x+h.w/2,h.y+h.h/2,23,37,0,0,Math.PI*2);ctx.stroke();ctx.strokeStyle='#9cecff';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(h.x+h.w/2,h.y+h.h/2,13,28,0,0,Math.PI*2);ctx.stroke();ctx.restore();if(!h.used)star(h.x+h.w/2,h.y+h.h/2,8,'#fff');}
 else if(h.kind==='reverse'&&!h.used){rr(h.x,h.y,h.w,h.h,8,'#f879c4');text('↔ !',h.x+42,h.y+29,'bold 27px system-ui','#331341','center');}
 else if(h.kind==='fakefood'&&!h.used){drawFood(h.x,h.y,.6,true);}
 }
 for(const s of stampedes)if(s.activated){for(let i=0;i<s.dogs.length;i++){const d=s.dogs[i];if(d.x<camera-65||d.x>camera+W+65)continue;drawTinyDog(d.x,d.y,29,frame+i);}
 if(s.age<145)text('101 DOGS!',s.trigger+175,275,'1000 29px system-ui','#ffdb7e');}
 for(const p of bossShots){if(p.kind==='star'){star(p.x+p.w/2,p.y+p.h/2,15,'#fff1a0');circle(p.x+p.w/2,p.y+p.h/2,5,'#ff9fe6');}else if(p.kind==='wave'){rr(p.x,p.y+6,p.w,p.h-6,9,'#f2a35b');star(p.x+p.w/2,p.y+3,12,'#fff8a0');}else if(p.kind==='pixel'){rect(p.x,p.y,p.w,p.h,'#a64fe8');rect(p.x+5,p.y+5,p.w-10,p.h-10,'#6cffed');}else if(p.kind==='gear'){text('⚙',p.x+12,p.y+24,'bold 27px serif','#ffd37c','center');}else if(p.kind==='pencil'){ctx.save();ctx.translate(p.x+12,p.y+12);ctx.rotate(.8);rr(-5,-15,11,32,3,'#eac86d');rect(-5,-15,11,4,'#ed7180');ctx.restore();}else if(p.kind==='snow'){circle(p.x+13,p.y+13,14,'#d8faff');star(p.x+13,p.y+13,9,'#7ebacf');}else if(p.kind==='coin'){circle(p.x+13,p.y+13,13,'#ffdb59');text('¥',p.x+13,p.y+20,'bold 20px serif','#8d6429','center');}else if(p.kind==='bubble'){circle(p.x+13,p.y+13,13,'#89ebf8a0');circle(p.x+9,p.y+9,4,'#faffff');}else if(p.kind==='lava'){circle(p.x+13,p.y+13,14,'#fa673c');circle(p.x+10,p.y+9,6,'#ffdd64');}else if(p.kind==='clown'){circle(p.x+13,p.y+13,13,'#fa83ca');circle(p.x+8,p.y+10,3,'#fff');circle(p.x+18,p.y+10,3,'#fff');circle(p.x+13,p.y+18,4,'#f55');}else{circle(p.x+p.w/2,p.y+p.h/2,p.w/2,'#ff6598');circle(p.x+p.w/2-4,p.y+p.h/2-4,p.w/5,'#ffcee8');}}
 for(const p of shots){circle(p.x+8,p.y+7,10,'#ff8a3c');circle(p.x+8,p.y+7,5,'#ffe6a4');}
}
function drawTinyDog(x,y,s,t){ctx.save();ctx.translate(x+s/2,y+s/2);const bob=Math.sin(t*.4)*2;ctx.translate(0,bob);ellipse(0,3,s*.34,s*.3,'#e2a457');ellipse(-s*.26,-s*.13,s*.15,s*.26,'#ac7645');ellipse(s*.26,-s*.13,s*.15,s*.26,'#ac7645');circle(0,-s*.09,s*.32,'#edc179');ellipse(0,s*.03,s*.19,s*.14,'#ffdfad');circle(-s*.12,-s*.16,s*.035,'#28202b');circle(s*.12,-s*.16,s*.035,'#28202b');circle(0,-s*.01,s*.06,'#2f2930');ctx.restore();}
function drawCheckpoint(){if(!checkpoint)return;rect(checkpoint.x+4,checkpoint.y,8,90,'#e7e1bd');circle(checkpoint.x+8,checkpoint.y+4,9,checkpointSaved?'#82ffad':'#ffce69');ctx.fillStyle=checkpointSaved?'#57e8ac':'#ffd264';ctx.beginPath();ctx.moveTo(checkpoint.x+13,checkpoint.y+9);ctx.lineTo(checkpoint.x+77,checkpoint.y+26);ctx.lineTo(checkpoint.x+13,checkpoint.y+45);ctx.fill();text('CHECK',checkpoint.x+28,checkpoint.y+27,'1000 12px sans-serif','#2c2440');if(checkpointSaved)star(checkpoint.x+30,checkpoint.y-9,9,'#c7ffe1');}
function drawWorld(){drawBackground();ctx.save();ctx.translate(-Math.round(camera),0);drawGrounds();drawCrumble();drawQuestionBlocks();drawCheckpoint();
 // thematic decorations near the checkpoint and arenas
 for(let i=0;i<12;i++){const x=140+i*370;if(x<camera-80||x>camera+W+70)continue;if(stageIndex===0){rr(x,GROUND-31,10,31,3,'#482638');circle(x+5,GROUND-32,7,'#ffca7488');}if(stageIndex===7){ellipse(x,GROUND-20,9,22,'#3ca69c');}}
 drawTraps();for(const it of items){if(it.type==='FIRE'){rr(it.x+3,it.y+7,28,17,8,'#d95c31');circle(it.x+28,it.y+12,8,'#ffe39c');circle(it.x+7,it.y+13,7,'#ffe39c');text('🔥',it.x+8,it.y+28,'bold 18px serif','#fff');}else drawStatue(it.x,it.y,it.type,1,it.age);}
 if(boss&&boss.hp>0)drawBoss(boss);
 if(goal){drawFood(goal.x,goal.y,1,boss.hp>0);if(boss.hp>0){rr(goal.x+23,goal.y-30,56,23,4,'#262036dd');text('🔒',goal.x+50,goal.y-13,'bold 19px serif','#fff','center');}else star(goal.x+48,goal.y-32,18,'#ffe495');}
 for(const p of particles){ctx.globalAlpha=clamp(p.life/42,0,1);circle(p.x,p.y,p.size,p.color);}ctx.globalAlpha=1;
 if(player)drawHero(player.x,player.y,state==='PARTY');ctx.restore();
 if(state==='PARTY')drawParty();
}
function drawParty(){const t=300-partyTicks;rect(0,0,W,H,'#38176ba1');for(const p of partyStars){star(p.x+Math.sin(t*.03+p.r)*14,p.y,p.r,'#fff3a5');}
 for(let i=0;i<danceDogs.length;i++){const d=danceDogs[i];if(t<d.delay)continue;const phase=t*.12+d.phase;ctx.save();ctx.translate(d.x+Math.sin(phase)*23,d.y+Math.cos(phase*.6)*22);ctx.rotate(Math.sin(phase)*.24);const s=d.s;drawTinyDog(-s/2,-s/2,s,t+i);ctx.restore();}
 rr(218,178,524,141,18,'#28163ce8');ctx.lineWidth=3;ctx.strokeStyle='#ffd566';ctx.strokeRect(224,184,512,129);text('🪩 GOLDEN DOG DISCO 🪩',480,224,'1000 26px system-ui','#fff1a5','center');text('🐕 レトリバー大量発生中 🐕',480,259,'1000 22px system-ui','#fff','center');text(`あと ${(partyTicks/60).toFixed(1)} 秒`,480,295,'bold 17px system-ui','#ffc6f4','center');}
function render(){drawWorld();}
let last=performance.now(),acc=0;function loop(now){let dt=Math.min(60,now-last);last=now;acc+=dt;while(acc>=1000/60){tick();acc-=1000/60;}render();requestAnimationFrame(loop);}requestAnimationFrame(loop);
// The menu still has an animated full-sized level behind it.
stage=STAGES[0];buildLevel();state='MENU';syncScreens();
function bindHold(id,down,up){
 const b=$(id);
 if(!b)throw new Error(`操作ボタン #${id} が見つからない`);

 let held=false;

 const begin=e=>{
  if(e&&e.cancelable)e.preventDefault();
  if(held)return;
  held=true;

  // ポインター取得に失敗してもゲーム操作は続ける
  try{
   if(e&&e.pointerId!==undefined&&b.setPointerCapture){
    b.setPointerCapture(e.pointerId);
   }
  }catch(_){}

  initAudio();
  down();
 };

 const end=e=>{
  if(e&&e.cancelable)e.preventDefault();
  if(!held)return;
  held=false;
  up();
 };

 if(window.PointerEvent){
  b.addEventListener('pointerdown',begin);
  for(const evt of ['pointerup','pointercancel','lostpointercapture']){
   b.addEventListener(evt,end);
  }
 }else{
  b.addEventListener('mousedown',begin);
  window.addEventListener('mouseup',end);
  b.addEventListener('touchstart',begin,{passive:false});
  b.addEventListener('touchend',end,{passive:false});
  b.addEventListener('touchcancel',end,{passive:false});
 }

 // キーボード・支援技術からの操作にも対応
 b.addEventListener('click',e=>{
  if(e.detail!==0)return;
  e.preventDefault();
  initAudio();
  down();
  setTimeout(up,120);
 });
}

bindHold('left',()=>keys.left=true,()=>keys.left=false);
bindHold('right',()=>keys.right=true,()=>keys.right=false);
bindHold('jump',pressJump,releaseJump);
bindHold('fire',fire,()=>{});
})();