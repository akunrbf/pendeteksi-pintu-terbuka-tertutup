const video = document.getElementById('webcam');
const overlay = document.getElementById('overlay');
const ctxOverlay = overlay.getContext('2d');

const processor = document.getElementById('processor');
const ctxProcessor = processor.getContext('2d', { willReadFrequently: true });

const statusPanel = document.getElementById('status-panel');
const logPanel = document.getElementById('log-panel');
const initBtn = document.getElementById('btn-init');

// ================= CONFIG =================
const TARGET_SIZE = 640;
const CONFIDENCE_THRESHOLD = 0.4;
const IOU_THRESHOLD = 0.4;

// 🔥 CLASS MAPPING (AMAN WALAU ONNX KEBALIK)
const CLASS_MAP = {
    0: "OPEN",
    1: "CLOSED"
};

// ================= STATE =================
let session;
let currentState = "WAITING";

// ================= SOUND =================
const alarmSound = new Audio('https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg');

// ================= INIT BUTTON =================
initBtn.addEventListener('click', async () => {
    initBtn.disabled = true;
    initBtn.innerText = "LOADING SYSTEM...";

    await loadModel();
});

// ================= LOAD MODEL =================
async function loadModel() {
    try {
        ort.env.wasm.wasmPaths =
            'https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/';

        session = await ort.InferenceSession.create('./best.onnx', {
            executionProviders: ['webgl', 'wasm']
        });

        statusPanel.innerText = "MODEL LOADED - STARTING CAMERA";

        startCamera();

    } catch (err) {
        console.error(err);
        statusPanel.innerText = "MODEL LOAD FAILED";
    }
}

// ================= CAMERA =================
async function startCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false
        });

        video.srcObject = stream;

        video.onloadedmetadata = () => {
            video.play();
            initBtn.style.display = "none";
            requestAnimationFrame(processFrame);
        };

    } catch (err) {
        console.error(err);
        statusPanel.innerText = "CAMERA ERROR";
    }
}

// ================= LOG =================
function addLog(img, text) {
    const item = document.createElement('div');
    item.className = 'log-item';

    item.innerHTML = `
        <img src="${img}">
        <p>${text}</p>
    `;

    logPanel.prepend(item);
}

function captureFrame(label) {
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);

    const img = canvas.toDataURL('image/jpeg');

    addLog(img, label);
}

// ================= IOU =================
function calculateIoU(a, b) {
    const x1 = Math.max(a.x, b.x);
    const y1 = Math.max(a.y, b.y);
    const x2 = Math.min(a.x + a.w, b.x + b.w);
    const y2 = Math.min(a.y + a.h, b.y + b.h);

    const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);

    return inter / ((a.w * a.h) + (b.w * b.h) - inter);
}

function nms(boxes, threshold) {
    boxes.sort((a, b) => b.score - a.score);

    const result = [];

    while (boxes.length) {
        const best = boxes.shift();
        result.push(best);

        boxes = boxes.filter(b => calculateIoU(best, b) < threshold);
    }

    return result;
}

// ================= MAIN LOOP =================
async function processFrame() {
    if (!session) return;

    ctxProcessor.drawImage(video, 0, 0, TARGET_SIZE, TARGET_SIZE);

    const imageData = ctxProcessor.getImageData(
        0, 0, TARGET_SIZE, TARGET_SIZE
    ).data;

    const input = new Float32Array(3 * TARGET_SIZE * TARGET_SIZE);

    for (let i = 0; i < TARGET_SIZE * TARGET_SIZE; i++) {
        input[i] = imageData[i * 4] / 255;
        input[i + TARGET_SIZE * TARGET_SIZE] = imageData[i * 4 + 1] / 255;
        input[i + 2 * TARGET_SIZE * TARGET_SIZE] = imageData[i * 4 + 2] / 255;
    }

    const tensor = new ort.Tensor('float32', input, [
        1, 3, TARGET_SIZE, TARGET_SIZE
    ]);

    const results = await session.run({
        [session.inputNames[0]]: tensor
    });

    const output = results[session.outputNames[0]].data;

    const elements = 8400;
    let boxes = [];

    for (let i = 0; i < elements; i++) {

        let x = output[i];
        let y = output[i + elements];
        let w = output[i + elements * 2];
        let h = output[i + elements * 3];

        const openScore = output[i + elements * 4];
        const closedScore = output[i + elements * 5];

        const score = Math.max(openScore, closedScore);

        if (score > CONFIDENCE_THRESHOLD) {

            if (w <= 1.5 && h <= 1.5) {
                x *= TARGET_SIZE;
                y *= TARGET_SIZE;
                w *= TARGET_SIZE;
                h *= TARGET_SIZE;
            }

            const classId = openScore > closedScore ? 0 : 1;

            boxes.push({
                x: x - w / 2,
                y: y - h / 2,
                w,
                h,
                score,
                classId
            });
        }
    }

    const finalBoxes = nms(boxes, IOU_THRESHOLD);

    ctxOverlay.clearRect(0, 0, overlay.width, overlay.height);

    let detectedOpen = false;

    finalBoxes.forEach(box => {

        const state = CLASS_MAP[box.classId];
        const isOpen = state === "OPEN";

        if (isOpen) detectedOpen = true;

        const scaleX = overlay.width / TARGET_SIZE;
        const scaleY = overlay.height / TARGET_SIZE;

        const x = box.x * scaleX;
        const y = box.y * scaleY;
        const w = box.w * scaleX;
        const h = box.h * scaleY;

        const color = isOpen ? '#ef4444' : '#22c55e';

        const label = isOpen
            ? `DOOR OPEN ${(box.score * 100).toFixed(1)}%`
            : `DOOR CLOSED ${(box.score * 100).toFixed(1)}%`;

        ctxOverlay.strokeStyle = color;
        ctxOverlay.lineWidth = 4;
        ctxOverlay.strokeRect(x, y, w, h);

        ctxOverlay.fillStyle = color;
        ctxOverlay.fillRect(x, y - 30, 220, 30);

        ctxOverlay.fillStyle = '#fff';
        ctxOverlay.font = 'bold 18px Arial';
        ctxOverlay.fillText(label, x + 10, y - 8);
    });

    // ================= STATE =================
    if (finalBoxes.length > 0) {

        if (detectedOpen) {

            statusPanel.innerText = "🚨 DOOR IS OPEN";
            statusPanel.style.background = "#450a0a";
            statusPanel.style.borderColor = "#ef4444";

            if (currentState !== "OPEN") {
                alarmSound.play();
                captureFrame("🚨 Door Open Detected");
                currentState = "OPEN";
            }

        } else {

            statusPanel.innerText = "✅ DOOR CLOSED";
            statusPanel.style.background = "#052e16";
            statusPanel.style.borderColor = "#22c55e";

            currentState = "CLOSED";
        }

    } else {

        statusPanel.innerText = "WAITING FOR DOOR";
        statusPanel.style.background = "#1e293b";
        statusPanel.style.borderColor = "#334155";

        currentState = "WAITING";
    }

    requestAnimationFrame(processFrame);
}
