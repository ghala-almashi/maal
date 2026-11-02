const R={
 red:{n:'البحر الأحمر',b:[12,29.5,31.5,46],c:[20.5,38.5],z:6,w:[[21.8,38.2,120],[20.3,38.9,80],[24.5,36.5,95],[18,40,150],[26.3,35.1,60],[16,41.5,70]]},
 gulf:{n:'الخليج العربي',b:[24,30.2,48,57],c:[27,51.5],z:7,w:[[27.5,50.2,110],[26.5,51.5,70],[25.8,52.5,90],[28.5,49.5,130],[26.9,50.6,60],[25.2,53.5,50]]}};
const N=9,map=L.map('map',{zoomControl:false,maxBoundsViscosity:1}).setView(R.red.c,R.red.z);
L.control.zoom({position:'bottomleft'}).addTo(map);
L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',{attribution:'Tiles © Esri | Data: Open-Meteo.com (CC BY 4.0)',maxZoom:10}).addTo(map);
map.createPane('lab').style.zIndex=455;map.getPane('lab').style.pointerEvents='none';
L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',{pane:'lab',maxZoom:10}).addTo(map);
const cv=document.getElementById('cv'),ctx=cv.getContext('2d'),$=id=>document.getElementById(id);
function fit(){const s=map.getSize();cv.width=s.x;cv.height=s.y;$('bg').width=s.x;$('bg').height=s.y}fit();
function drawBG(){
 const b=$('bg'),g=b.getContext('2d');g.clearRect(0,0,b.width,b.height);if(!D)return;
 const h=+$('sl').value,st=10;
 for(let y=0;y<b.height;y+=st)for(let x=0;x<b.width;x+=st){
  const ll=map.containerPointToLatLng([x+st/2,y+st/2]),a=ll.lat,o=ll.lng;let v,mx;
  if(layer==='wind'){v=Math.hypot(samp(D.wu,a,o,h),samp(D.wv,a,o,h));mx=40}
  else if(layer==='current'){v=Math.hypot(samp(D.cu,a,o,h),samp(D.cv,a,o,h));mx=2}
  else{v=samp(D.wh,a,o,h);mx=2}
  if(v<=0.02)continue;
  g.fillStyle=`hsla(${190-170*Math.min(1,v/mx)},90%,55%,.5)`;g.fillRect(x,y,st,st)}}
map.on('resize',()=>{fit();drawBG()});map.on('moveend',drawBG);
map.on('movestart zoomstart',()=>{ctx.clearRect(0,0,cv.width,cv.height);$('bg').getContext('2d').clearRect(0,0,cv.width,cv.height)});
let reg='red',layer='wind',D=null,H=0,P=[];const cache={},wl=L.layerGroup().addTo(map),wasteL=L.layerGroup().addTo(map);let wasteObjs=[];

async function load(k){
 if(cache[k])return cache[k];
 const [a,b,c,d]=R[k].b,la=[],lo=[];
 for(let i=0;i<N;i++)for(let j=0;j<N;j++){la.push((a+(b-a)*i/(N-1)).toFixed(3));lo.push((c+(d-c)*j/(N-1)).toFixed(3))}
 const q=`latitude=${la}&longitude=${lo}&forecast_days=2&timezone=Asia%2FRiyadh`;
 const [w,m]=await Promise.all([
  fetch(`https://api.open-meteo.com/v1/forecast?${q}&hourly=wind_speed_10m,wind_direction_10m`).then(r=>r.json()),
  fetch(`https://marine-api.open-meteo.com/v1/marine?${q}&hourly=ocean_current_velocity,ocean_current_direction,wave_height`).then(r=>r.json())]);
 const W=[].concat(w),M=[].concat(m),h=W[0].hourly.time.length,n=N*N*h;
 const o={N,b:R[k].b,H:h,t:W[0].hourly.time,wu:new Float32Array(n),wv:new Float32Array(n),cu:new Float32Array(n),cv:new Float32Array(n),wh:new Float32Array(n),curOK:false};
 for(let p=0;p<N*N;p++)for(let t=0;t<h;t++){
  const x=t*N*N+p,s=W[p].hourly.wind_speed_10m[t]||0,dr=(W[p].hourly.wind_direction_10m[t]||0)*Math.PI/180;
  o.wu[x]=-s*Math.sin(dr);o.wv[x]=-s*Math.cos(dr);   // الرياح: الاتجاه "القادم من"
  const mh=M[p]&&M[p].hourly;if(!mh)continue;
  const cs=mh.ocean_current_velocity?.[t]||0,cd=(mh.ocean_current_direction?.[t]||0)*Math.PI/180;
  o.cu[x]=cs*Math.sin(cd);o.cv[x]=cs*Math.cos(cd);   // التيار: الاتجاه "المتجه إليه"
  o.wh[x]=mh.wave_height?.[t]||0;if(cs>0.05)o.curOK=true;
 }
 return cache[k]=o;
}
function samp(arr,lat,lon,h){
 const B=D.b;let y=(lat-B[0])/(B[1]-B[0])*(N-1),x=(lon-B[2])/(B[3]-B[2])*(N-1);
 if(y<0||x<0||y>N-1||x>N-1)return 0;
 const i=Math.min(N-2,y|0),j=Math.min(N-2,x|0),fy=y-i,fx=x-j,o=h*N*N,g=(a,b)=>arr[o+a*N+b];
 return g(i,j)*(1-fy)*(1-fx)+g(i,j+1)*(1-fy)*fx+g(i+1,j)*fy*(1-fx)+g(i+1,j+1)*fy*fx}
const hr=()=>+$('sl').value;
function seed(p){const B=D.b;p.la=B[0]+Math.random()*(B[1]-B[0]);p.lo=B[2]+Math.random()*(B[3]-B[2]);p.age=40+Math.random()*80}
function initP(){P=Array.from({length:1800},()=>{const p={};seed(p);return p})}
function frame(){
 ctx.globalCompositeOperation='destination-out';ctx.fillStyle='rgba(0,0,0,.07)';ctx.fillRect(0,0,cv.width,cv.height);ctx.globalCompositeOperation='source-over';
 if(D&&layer!=='wave'){
  const wind=layer==='wind',U=wind?D.wu:D.cu,V=wind?D.wv:D.cv,k=wind?0.0005:0.006,mx=wind?40:2,h=hr();ctx.lineWidth=1.2;
  for(const p of P){
   const u=samp(U,p.la,p.lo,h),v=samp(V,p.la,p.lo,h),s=Math.hypot(u,v),a=map.latLngToContainerPoint([p.la,p.lo]);
   p.lo+=u*k/Math.cos(p.la*Math.PI/180);p.la+=v*k;
   const b=map.latLngToContainerPoint([p.la,p.lo]);
   ctx.strokeStyle=`hsl(${190-170*Math.min(1,s/mx)},90%,60%)`;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
   if(--p.age<0||s<0.02)seed(p);
  }}
 requestAnimationFrame(frame)}

function trail(c){let la=c[0],lo=c[1];const pts=[[la,lo]];
 for(let t=0;t<D.H-1;t++){
  const u=samp(D.cu,la,lo,t)+0.03*samp(D.wu,la,lo,t),v=samp(D.cv,la,lo,t)+0.03*samp(D.wv,la,lo,t);
  lo+=u/111/Math.cos(la*Math.PI/180);la+=v/111;pts.push([la,lo])}
 return pts}
function buildWaste(){
 wasteL.clearLayers();wasteObjs=R[reg].w.map((c,i)=>{
  const pts=trail(c),line=L.polyline([pts[0]],{color:'#ff7a59',weight:2,dashArray:'4 4'}).addTo(wasteL),
  m=L.circleMarker(pts[0],{radius:6+c[2]/20,color:'#ff3b30',fillColor:'#ff3b30',fillOpacity:.55,weight:2}).addTo(wasteL);
  return{pts,line,m,c,i}})}
function update(){
 const h=hr();$('hl').textContent=D.t[h].slice(5,16).replace('T',' ');drawBG();
 for(const o of wasteObjs){o.m.setLatLng(o.pts[h]);o.line.setLatLngs(o.pts.slice(0,h+1));
  const wh=samp(D.wh,o.pts[h][0],o.pts[h][1],h),ws=Math.hypot(samp(D.wu,o.pts[h][0],o.pts[h][1],h),samp(D.wv,o.pts[h][0],o.pts[h][1],h));
  o.m.bindPopup(`<b>عنقود نفايات #${o.i+1}</b> (تجريبي)<br>الحجم التقديري: ${o.c[2]}<br>الموج: ${wh.toFixed(2)} م · الرياح: ${ws.toFixed(0)} كم/س<br>${wh<0.6&&ws<20?'✅ ظروف مناسبة للتنظيف':'⚠️ ظروف غير مناسبة'}`)}
 wl.clearLayers();
 if(layer==='wave')for(let i=0;i<N;i++)for(let j=0;j<N;j++){
  const v=D.wh[h*N*N+i*N+j];if(v<=0)continue;const B=D.b;
  L.circleMarker([B[0]+(B[1]-B[0])*i/(N-1),B[2]+(B[3]-B[2])*j/(N-1)],{radius:14,stroke:false,fillOpacity:.7,fillColor:`hsl(${190-170*Math.min(1,v/2)},90%,55%)`}).bindTooltip(v.toFixed(2)+' م').addTo(wl)}}
function clean(){
 let best=null,good=0;
 for(let t=0;t<D.H;t++){let w=0,wn=0,s=0;
  for(let p=0;p<N*N;p++){const x=t*N*N+p;if(D.wh[x]>0){w+=D.wh[x];wn++}s+=Math.hypot(D.wu[x],D.wv[x])}
  if(!wn)continue;w/=wn;s/=N*N;if(w<0.6&&s<20)good++;
  const sc=w/0.6+s/20;if(!best||sc<best.sc)best={sc,t,w,s}}
 $('clean').innerHTML=best?`<b>أنسب وقت للتنظيف:</b><br>${D.t[best.t].slice(5,16).replace('T',' ')}<br>موج ≈ ${best.w.toFixed(2)} م · رياح ≈ ${best.s.toFixed(0)} كم/س<br>ساعات مناسبة خلال 48 ساعة: ${good}`:'لا توجد بيانات أمواج كافية'}

async function setRegion(k){
 reg=k;$('r-red').classList.toggle('on',k==='red');$('r-gulf').classList.toggle('on',k==='gulf');
 $('st').textContent='جاري تحميل بيانات '+R[k].n+'...';
 try{D=await load(k);}catch(e){$('st').innerHTML='❌ تعذر جلب البيانات: '+e.message+'<br>تأكد من الاتصال بالإنترنت.';return}
 const B=R[k].b,bd=L.latLngBounds([B[0]-1,B[2]-1],[B[1]+1,B[3]+1]);
 map.setMaxBounds(null);map.setMinZoom(0);map.fitBounds(bd,{animate:false});
 map.setMinZoom(map.getZoom());map.setMaxBounds(bd);drawBG();$('sl').max=D.H-1;
 $('st').innerHTML='✅ بيانات حية من Open-Meteo<br>'+R[k].n+(D.curOK?'':'<br>⚠️ التيارات في هذه المنطقة ≈ 0 (قد تكون غير متوفرة)');
 initP();buildWaste();clean();update()}
function setLayer(l){layer=l;['wind','cur','wave'].forEach(x=>$('l-'+x).classList.toggle('on',x===(l==='current'?'cur':l)));
 $('lgt').textContent={wind:'سرعة الرياح',current:'سرعة التيار',wave:'ارتفاع الموج'}[l];ctx.clearRect(0,0,cv.width,cv.height);if(D)update()}
$('r-red').onclick=()=>setRegion('red');$('r-gulf').onclick=()=>setRegion('gulf');
$('l-wind').onclick=()=>setLayer('wind');$('l-cur').onclick=()=>setLayer('current');$('l-wave').onclick=()=>setLayer('wave');
$('sl').oninput=()=>D&&update();
let tm=null;$('play').onclick=()=>{if(tm){clearInterval(tm);tm=null;$('play').textContent='▶';return}
 $('play').textContent='⏸';tm=setInterval(()=>{const s=$('sl');s.value=(+s.value+1)%(+s.max+1);update()},400)};
setRegion('red');frame();