const $=id=>document.getElementById(id)
let scene,camera,renderer,raycaster
let xrReady=false,xrRunning=false,showSize=true,defaultBezel=true
let displays=[],selected=null,lastReality=null

const ratioValue=r=>r==="16:9"?16/9:r==="3:4"?3/4:r==="3:2"?3/2:null
function sizeFromInch(diagonal,ratio){
  const r=ratioValue(ratio)||16/9, d=diagonal*25.4
  const width=d*r/Math.sqrt(r*r+1)
  return {width,height:width/r}
}
function currentSize(){
  if($("unit").value==="inch"){
    const d=$("inchSize").value==="custom"?Number($("customInch").value):Number($("inchSize").value)
    return sizeFromInch(d,$("ratio").value==="custom"?"16:9":$("ratio").value)
  }
  return {width:Number($("mmWidth").value)||1200,height:Number($("mmHeight").value)||675}
}
function syncControls(){
  const inch=$("unit").value==="inch"
  $("mmWidthWrap").hidden=inch;$("mmHeightWrap").hidden=inch
  $("inchSizeWrap").hidden=!inch;$("customInchWrap").hidden=!inch||$("inchSize").value!=="custom"
}
function updateRatio(){const r=ratioValue($("ratio").value);if(r&&$("unit").value==="mm")$("mmHeight").value=Math.round(Number($("mmWidth").value)/r)}
$("unit").onchange=()=>{syncControls();updateSelected()}
$("inchSize").onchange=()=>{syncControls();updateSelected()}
$("ratio").onchange=()=>{updateRatio();updateSelected()}
$("mmWidth").oninput=()=>{updateRatio();updateSelected()}
$("mmHeight").oninput=updateSelected
$("customInch").oninput=updateSelected

function makeDisplay(wMm,hMm,pos,ry=0,rz=0,bezel=defaultBezel,number=displays.length+1){
  const g=new THREE.Group()
  g.userData.number=number;g.userData.wMm=wMm;g.userData.hMm=hMm
  const w=wMm/1000,h=hMm/1000,b=bezel?.005:0
  const frame=new THREE.Mesh(new THREE.BoxGeometry(w,h,Math.max(b*2,.002)),new THREE.MeshBasicMaterial({color:bezel?0x111111:0x777777}))
  frame.position.z=-.001;g.add(frame)
  const screen=new THREE.Mesh(new THREE.PlaneGeometry(Math.max(w-b*2,.001),Math.max(h-b*2,.001)),new THREE.MeshBasicMaterial({color:0x777777,side:THREE.DoubleSide}))
  screen.position.z=bezel?.003:.001;g.add(screen)
  g.position.copy(pos);g.rotation.set(0,ry,rz);scene.add(g)
  const d={number,wMm,hMm,bezel,object:g};displays.push(d);selected=d;renumber();refreshUI();return d
}
function renumber(){displays.forEach((d,i)=>{d.number=i+1;d.object.userData.number=d.number})}
function refreshUI(){
  $("delete").disabled=!selected
  $("selected").textContent=selected?`Selected: #${selected.number}  ${Math.round(selected.wMm)} × ${Math.round(selected.hMm)} mm`:"Selected: none"
}
function placeDisplay(){
  if(!xrReady||!camera)return showMessage("Start AR first.")
  const s=currentSize(),f=new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion).normalize()
  makeDisplay(s.width,s.height,camera.position.clone().add(f.multiplyScalar(2)))
  $("hint").style.display="none"
}
function deleteSelected(){
  if(!selected)return
  scene.remove(selected.object)
  selected.object.traverse(o=>{o.geometry?.dispose();o.material?.dispose()})
  displays=displays.filter(d=>d!==selected);selected=displays.at(-1)||null;renumber();refreshUI()
}
function updateSelected(){
  if(!selected)return
  const s=currentSize(),b=defaultBezel?.005:0,w=s.width/1000,h=s.height/1000
  selected.wMm=s.width;selected.hMm=s.height;selected.bezel=defaultBezel
  const f=selected.object.children[0],m=selected.object.children[1]
  f.geometry.dispose();f.geometry=new THREE.BoxGeometry(w,h,Math.max(b*2,.002));f.material.color.set(defaultBezel?0x111111:0x777777)
  m.geometry.dispose();m.geometry=new THREE.PlaneGeometry(Math.max(w-b*2,.001),Math.max(h-b*2,.001))
  refreshUI()
}
function saveLayout(){
  localStorage.setItem("ar-display-layout",JSON.stringify({version:2,displays:displays.map(d=>({
    number:d.number,wMm:d.wMm,hMm:d.hMm,bezel:d.bezel,
    position:d.object.position.toArray(),rotation:d.object.rotation.toArray()
  }))}))
  $("status").textContent="Saved locally"
}
function loadLayout(){
  const raw=localStorage.getItem("ar-display-layout");if(!raw)return showMessage("No saved layout found.")
  try{
    const data=JSON.parse(raw);displays.forEach(d=>scene.remove(d.object));displays=[];selected=null
    for(const d of data.displays||[])makeDisplay(d.wMm,d.hMm,new THREE.Vector3(...d.position),d.rotation?.[1]||0,d.rotation?.[2]||0,!!d.bezel,d.number)
    renumber();refreshUI();$("status").textContent="Loaded locally"
  }catch(e){showMessage("Saved data could not be loaded.")}
}
function project(world){
  const v=world.clone().project(camera);if(v.z<-1||v.z>1)return null
  return {x:(v.x*.5+.5)*innerWidth,y:(-v.y*.5+.5)*innerHeight}
}
async function screenshot(){
  if(!xrReady||!XR8.canvasScreenshot)return showMessage("AR is not running.")
  try{
    const data=await XR8.canvasScreenshot().takeScreenshot()
    const blob=await(await fetch("data:image/jpeg;base64,"+data)).blob()
    const file=new File([blob],`ar-display-${Date.now()}.jpg`,{type:"image/jpeg"})
    if(navigator.share&&navigator.canShare?.({files:[file]})){await navigator.share({files:[file],title:"AR Display Screenshot"});$("status").textContent="Screenshot shared"}
    else{const u=URL.createObjectURL(blob),a=document.createElement("a");a.href=u;a.download=file.name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),1000);$("status").textContent="Screenshot saved"}
  }catch(e){console.error(e);showMessage("Screenshot failed. Try again when tracking is ready.")}
}
function ndc(e){return new THREE.Vector2(e.clientX/innerWidth*2-1,-e.clientY/innerHeight*2+1)}
function pick(e){
  raycaster.setFromCamera(ndc(e),camera)
  const hits=raycaster.intersectObjects(displays.flatMap(d=>d.object.children),false)
  if(!hits.length)return null
  return displays.find(d=>d.object===hits[0].object.parent)||null
}
let drag=null
function down(e){
  if(e.target.closest("#panel,button,select,input"))return
  const d=pick(e);if(!d)return
  selected=d;refreshUI()
  const distance=camera.position.distanceTo(d.object.position)
  drag={pointerId:e.pointerId,distance}
  e.currentTarget.setPointerCapture?.(e.pointerId)
}
function move(e){
  if(!drag||drag.pointerId!==e.pointerId||!selected)return
  raycaster.setFromCamera(ndc(e),camera)
  const p=new THREE.Vector3();raycaster.ray.at(drag.distance,p);selected.object.position.copy(p)
  if(selected) $("heightInfo").textContent=`Height above floor: ${Math.round((selected.object.position.y-selected.hMm/2000)*1000)} mm`
}
function up(e){if(drag?.pointerId===e.pointerId)drag=null}
function showMessage(t){$("message").textContent=t;$("message").style.display="block";setTimeout(()=>$("message").style.display="none",2200)}

function sceneModule(){
  return {name:"display-simulator-scene",
    onStart:({canvas})=>{
      const xr=XR8.Threejs.xrScene();scene=xr.scene;camera=xr.camera;renderer=xr.renderer;raycaster=new THREE.Raycaster()
      XR8.XrController.updateCameraProjectionMatrix({origin:camera.position,facing:camera.quaternion})
      canvas.addEventListener("pointerdown",down,true);canvas.addEventListener("pointermove",move,true);canvas.addEventListener("pointerup",up,true);canvas.addEventListener("pointercancel",up,true)
    },
    onUpdate:({processCpuResult})=>{
      const r=processCpuResult?.reality;if(!r)return
      lastReality=r;$("tracking").textContent=`Tracking: ${r.trackingStatus||"—"}`
      if(r.trackingStatus==="NORMAL")$("status").textContent="AR tracking"
      if(selected)$("heightInfo").textContent=`Height above floor: ${Math.round((selected.object.position.y-selected.hMm/2000)*1000)} mm`
    }
  }
}
function startXR(){
  if(!window.XR8)return showMessage("AR engine is still loading. Try again in a moment.")
  if(xrRunning)return
  try{
    XR8.XrController.configure({disableWorldTracking:false,scale:"absolute"})
    XR8.addCameraPipelineModules([XR8.GlTextureRenderer.pipelineModule(),XR8.Threejs.pipelineModule(),XR8.XrController.pipelineModule(),XR8.canvasScreenshot().cameraPipelineModule(),sceneModule()])
    XR8.run({canvas:$("camerafeed"),allowedDevices:XR8.XrConfig.device().MOBILE,cameraConfig:{direction:XR8.XrConfig.camera().BACK},glContextConfig:{alpha:false,preserveDrawingBuffer:true}})
    xrRunning=true;xrReady=true;$("status").textContent="Starting AR...";$("hint").textContent="Move slowly until Tracking: NORMAL, then tap ADD DISPLAY."
  }catch(e){console.error(e);showMessage("AR startup failed: "+(e.message||e))}
}
$("add").onclick=placeDisplay
$("delete").onclick=deleteSelected
$("save").onclick=saveLayout
$("load").onclick=loadLayout
$("screenshot").onclick=screenshot
$("recenter").onclick=()=>window.XR8?.XrController?.recenter()
$("sizeToggle").onclick=()=>{showSize=!showSize;$("sizeToggle").textContent=`SIZE: ${showSize?"ON":"OFF"}`}
$("bezelToggle").onclick=()=>{defaultBezel=!defaultBezel;$("bezelToggle").textContent=`BEZEL: ${defaultBezel?"5 mm":"NONE"}`;updateSelected()}
syncControls()
window.addEventListener("xrloaded",startXR)
setTimeout(()=>{if(window.XR8)startXR()},1500)
