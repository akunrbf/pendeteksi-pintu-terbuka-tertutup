// ================= ELEMENT =================
const video=document.getElementById('webcam');
const overlay=document.getElementById('overlay');
const ctxOverlay=overlay.getContext('2d');

const processor=document.getElementById('processor');
const ctxProcessor=processor.getContext('2d',{willReadFrequently:true});

const statusPanel=document.getElementById('status-panel');
const logPanel=document.getElementById('log-panel');
const initBtn=document.getElementById('btn-init');

// ================= AUDIO =================
const alarmSound=new Audio(
'https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg'
);

const successSound=new Audio(
'https://actions.google.com/sounds/v1/cartoon/wood_plank_flicks.ogg'
);

let currentState="AWAITING";
let session=null;

// ================= MODEL CONFIG =================
const TARGET_SIZE=640;
const CONFIDENCE_THRESHOLD=0.25;
const IOU_THRESHOLD=0.4;

// ================= INIT =================
initBtn.addEventListener('click',async()=>{

initBtn.disabled=true;
initBtn.innerText="BOOTING...";

if(Notification.permission!=="granted")
await Notification.requestPermission();

await loadModel();
});

// ================= LOAD MODEL =================
async function loadModel(){

ort.env.wasm.wasmPaths=
'https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/';

session=await ort.InferenceSession.create(
'./best.onnx',
{
executionProviders:['webgl','wasm'],
graphOptimizationLevel:'all'
});

statusPanel.innerText="MODEL READY";
startCamera();
}

// ================= CAMERA =================
async function startCamera(){

const stream=await navigator.mediaDevices.getUserMedia({
video:{width:640,height:480}
});

video.srcObject=stream;

video.onloadedmetadata=()=>{
video.play();
requestAnimationFrame(processFrame);
};
}

// ================= IOU =================
function calculateIoU(a,b){

const xA=Math.max(a.x,b.x);
const yA=Math.max(a.y,b.y);
const xB=Math.min(a.x+a.w,b.x+b.w);
const yB=Math.min(a.y+a.h,b.y+b.h);

const inter=Math.max(0,xB-xA)*Math.max(0,yB-yA);

return inter/(a.w*a.h+b.w*b.h-inter);
}

// ================= NMS =================
function nonMaxSuppression(boxes){

boxes.sort((a,b)=>b.score-a.score);

const result=[];

while(boxes.length){
const best=boxes.shift();
result.push(best);

boxes=boxes.filter(
b=>calculateIoU(best,b)<IOU_THRESHOLD
);
}

return result;
}

// ================= LOG =================
function logDoorEvent(){

const c=document.createElement('canvas');
c.width=video.videoWidth;
c.height=video.videoHeight;

c.getContext('2d').drawImage(video,0,0);

const img=c.toDataURL('image/jpeg');

const div=document.createElement('div');
div.className='log-entry';

div.innerHTML=`
<img src="${img}">
<p>🚪 PINTU TERBUKA<br>
${new Date().toLocaleTimeString()}
</p>`;

logPanel.prepend(div);

if(Notification.permission==="granted"){
new Notification("Pintu Terbuka!",{icon:img});
}
}

// ================= MAIN LOOP =================
async function processFrame(){

if(!session)return;

// resize
ctxProcessor.drawImage(video,0,0,TARGET_SIZE,TARGET_SIZE);

const data=
ctxProcessor.getImageData(0,0,TARGET_SIZE,TARGET_SIZE).data;

// tensor
const input=new Float32Array(3*TARGET_SIZE*TARGET_SIZE);

for(let i=0;i<TARGET_SIZE*TARGET_SIZE;i++){

input[i]=data[i*4]/255;
input[i+TARGET_SIZE*TARGET_SIZE]=data[i*4+1]/255;
input[i+2*TARGET_SIZE*TARGET_SIZE]=data[i*4+2]/255;
}

const tensor=new ort.Tensor(
'float32',
input,
[1,3,TARGET_SIZE,TARGET_SIZE]
);

const output=
(await session.run({
[session.inputNames[0]]:tensor
}))[session.outputNames[0]].data;

const ELEMENTS=8400;
let boxes=[];

// ===== PARSE YOLO =====
for(let i=0;i<ELEMENTS;i++){

let x=output[i];
let y=output[i+ELEMENTS];
let w=output[i+2*ELEMENTS];
let h=output[i+3*ELEMENTS];

const closed=output[i+4*ELEMENTS];
const open=output[i+5*ELEMENTS];

const score=Math.max(closed,open);
if(score<CONFIDENCE_THRESHOLD)continue;

x*=TARGET_SIZE;
y*=TARGET_SIZE;
w*=TARGET_SIZE;
h*=TARGET_SIZE;

boxes.push({
x:x-w/2,
y:y-h/2,
w,
h,
score,
classId:open>closed?1:0
});
}

boxes=nonMaxSuppression(boxes);

ctxOverlay.clearRect(0,0,640,480);

let isDoorOpen=false;

boxes.forEach(box=>{

const sx=box.x*(640/TARGET_SIZE);
const sy=box.y*(480/TARGET_SIZE);
const sw=box.w*(640/TARGET_SIZE);
const sh=box.h*(480/TARGET_SIZE);

if(box.classId===1)isDoorOpen=true;

ctxOverlay.strokeStyle=
box.classId?'#FF3B30':'#34C759';

ctxOverlay.lineWidth=4;
ctxOverlay.strokeRect(sx,sy,sw,sh);

ctxOverlay.fillStyle=
box.classId?'#FF3B30':'#34C759';

ctxOverlay.fillText(
box.classId?'OPEN':'CLOSED',
sx,
sy-5
);
});

// ===== STATUS =====
if(isDoorOpen){

statusPanel.innerText="🚪 WARNING: PINTU TERBUKA";

if(currentState!=="OPEN"){
alarmSound.play();
logDoorEvent();
currentState="OPEN";
}

}else{

statusPanel.innerText="🔒 PINTU TERTUTUP";

if(currentState!=="CLOSED"){
successSound.play();
currentState="CLOSED";
}
}

requestAnimationFrame(processFrame);
}
