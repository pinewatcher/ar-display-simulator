const $=id=>document.getElementById(id);
const camera=$("camera"), canvas=$("canvas"), ctx=canvas.getContext("2d");
let stream=null, displays=[], selected=null, showSize=true, bezel=true, nextId=1;
let scale=0.35; // CSS pixels per mm; adjusted for usability, not metrology.
let arMode=false;

function resize(){canvas.width=innerWidth*devicePixelRatio;canvas.height=innerHeight*devicePixelRatio;canvas.style.width=innerWidth+"px";canvas.style.height=innerHeight+"px"}
addEventListener("resize",resize); resize();

function ratioWH(r){
  if(r==="16:9") return 16/9;
  if(r==="3:4") return 3/4;
  if(r==="3:2") return 3/2;
  return null;
}
$("ratio").onchange=()=>{
  const r=ratioWH($("ratio").value);
  $("heightWrap").style.display=r?"inline":"inline";
  if(r) $("height").value=Math.round(Number($("width").value)/r);
};
$("width").oninput=()=>{
  const r=ratioWH($("ratio").value);
  if(r) $("height").value=Math.round(Number($("width").value)/r);
};
$("height").oninput=()=>{$("ratio").value="custom"};

function createDisplay(x=innerWidth/2,y=innerHeight/2){
  const w=Number($("width").value)||1200, h=Number($("height").value)||675;
  const d={id:nextId++,x,y,w,h,rot:0,bezel};
  displays.push(d); selected=d; render();
}
function render(){
  document.querySelectorAll(".display").forEach(e=>e.remove());
  displays.forEach(d=>{
    const el=document.createElement("div");
    el.className="display"+(d.bezel?"":" nobezel")+(selected===d?" selected":"");
    el.dataset.id=d.id;
    el.style.width=(d.w*scale)+"px"; el.style.height=(d.h*scale)+"px";
    el.style.left=(d.x-d.w*scale/2)+"px"; el.style.top=(d.y-d.h*scale/2)+"px";
    el.style.transform=`rotate(${d.rot}deg)`;
    if(showSize){
      const label=document.createElement("div"); label.className="label";
      label.textContent=`${Math.round(d.w)} Ã ${Math.round(d.h)} mm`;
      el.appendChild(label);
    }
    el.addEventListener("pointerdown",startDrag);
    $("app").appendChild(el);
  });
  $("selected").textContent=selected?`é¸æ: ${Math.round(selected.w)} Ã ${Math.round(selected.h)} mm`:"é¸æãªã";
  $("floorHeight").textContent="åºé«ã: ARåºé¢æ¤åºæã«è¡¨ç¤º";
}
function startDrag(e){
  e.preventDefault(); e.stopPropagation();
  const d=displays.find(x=>x.id===Number(e.currentTarget.dataset.id)); selected=d;
  const sx=e.clientX, sy=e.clientY, ox=d.x, oy=d.y;
  e.currentTarget.setPointerCapture(e.pointerId);
  const move=ev=>{d.x=ox+(ev.clientX-sx);d.y=oy+(ev.clientY-sy);render()};
  const up=()=>{e.currentTarget.removeEventListener("pointermove",move);e.currentTarget.removeEventListener("pointerup",up)};
  e.currentTarget.addEventListener("pointermove",move);e.currentTarget.addEventListener("pointerup",up);
  render();
}
$("add").onclick=()=>createDisplay();
$("sizeToggle").onclick=()=>{showSize=!showSize;$("sizeToggle").textContent=`ãµã¤ãºè¡¨ç¤º ${showSize?"ON":"OFF"}`;render()};
$("bezelToggle").onclick=()=>{bezel=!bezel;$("bezelToggle").textContent=`ãã¼ã« ${bezel?"5mm":"ãªã"}`;if(selected){selected.bezel=bezel}render()};
$("save").onclick=()=>{
  localStorage.setItem("ar-display-layout",JSON.stringify({version:1,displays}));
  $("status").textContent="éç½®ãã­ã¼ã«ã«ä¿å­";
};
$("load").onclick=()=>{
  try{const x=JSON.parse(localStorage.getItem("ar-display-layout"));if(x?.displays){displays=x.displays;nextId=Math.max(0,...displays.map(d=>d.id))+1;selected=displays[0]||null;render();$("status").textContent="éç½®ãèª­è¾¼"}}
  catch(e){alert("ä¿å­ãã¼ã¿ãèª­ã¿è¾¼ãã¾ãã")}
};
$("shot").onclick=async()=>{
  // Capture the visible camera frame plus UI-independent display overlay.
  const out=document.createElement("canvas"); out.width=innerWidth*2;out.height=innerHeight*2;
  const o=out.getContext("2d");
  if(camera.srcObject){o.drawImage(camera,0,0,out.width,out.height)}
  else{o.fillStyle="#555";o.fillRect(0,0,out.width,out.height)}
  o.scale(2,2);
  displays.forEach(d=>{
    o.save();o.translate(d.x,d.y);o.rotate(d.rot*Math.PI/180);
    o.fillStyle="#777";o.fillRect(-d.w*scale/2,-d.h*scale/2,d.w*scale,d.h*scale);
    if(d.bezel){o.strokeStyle="#111";o.lineWidth=10;o.strokeRect(-d.w*scale/2,-d.h*scale/2,d.w*scale,d.h*scale)}
    if(showSize){o.fillStyle="#fff";o.font="12px sans-serif";o.fillText(`${Math.round(d.w)} Ã ${Math.round(d.h)} mm`,-d.w*scale/2,d.h*scale/2+18)}
    o.restore();
  });
  const a=document.createElement("a");a.download=`ar-display-${Date.now()}.png`;a.href=out.toDataURL("image/png");a.click();
};
$("start").onclick=async()=>{
  try{
    stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:"environment"}},audio:false});
    camera.srcObject=stream;camera.style.display="block";$("sceneHint").textContent="ã¿ããã§éç½® / ãã©ãã°ã§ç§»å";
    $("status").textContent="ã«ã¡ã©èµ·åä¸­";
    arMode=true;
  }catch(e){$("status").textContent="ã«ã¡ã©ãèµ·åã§ãã¾ãããHTTPSã§éãã¦ãã ãã";alert("ã«ã¡ã©è¨±å¯ãå¿è¦ã§ããGitHub Pagesç­ã®HTTPSç°å¢ã§éãã¦ãã ããã")}
};
document.body.addEventListener("click",e=>{
  if(arMode && e.target===document.body) createDisplay(e.clientX,e.clientY);
});
render();
