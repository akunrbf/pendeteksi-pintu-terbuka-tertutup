// ================= ELEMENT =================
const video = document.getElementById('webcam');
const overlay = document.getElementById('overlay');
const ctxOverlay = overlay.getContext('2d');

const processor = document.getElementById('processor');
const ctxProcessor = processor.getContext('2d', {
    willReadFrequently: true
});

const statusPanel = document.getElementById('status-panel');
const logPanel = document.getElementById('log-panel');
const initBtn = document.getElementById('btn-init');

// ================= AUDIO =================
const alarmSound = new Audio(
'https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg'
);

const successSound = new Audio(
'https://actions.google.com/sounds/v1/cartoon/wood_plank_flicks.ogg'
);

// ================= CONFIG =================
const CONFIG = {
    modelPath: './best.onnx',

    labels: [
        'closed',
        'open'
    ],

    inputSize: 640,

    confidence: 0.70,
    iouThreshold: 0.45,

    maxDetections: 10
};

// ================= GLOBAL =================
let session = null;
let currentState = "NONE";
let lastDetectionTime = 0;

// ================= INIT =================
initBtn.addEventListener('click', async () => {

    initBtn.disabled = true;
    initBtn.innerText = "BOOTING...";

    try {

        if (Notification.permission !== "granted") {
            await Notification.requestPermission();
        }

        await loadModel();
        await startCamera();

        statusPanel.innerText = "✅ SYSTEM ACTIVE";

    } catch (err) {

        console.error(err);

        statusPanel.innerText = "❌ ERROR LOAD MODEL";
    }
});

// ================= LOAD MODEL =================
async function loadModel() {

    ort.env.wasm.wasmPaths =
        'https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/';

    session = await ort.InferenceSession.create(
        CONFIG.modelPath,
        {
            executionProviders: ['webgl', 'wasm'],
            graphOptimizationLevel: 'all'
        }
    );

    console.log("MODEL LOADED");
}

// ================= CAMERA =================
async function startCamera() {

    const stream = await navigator.mediaDevices.getUserMedia({
        video: {
            width: 640,
            height: 480,
            facingMode: 'environment'
        },
        audio: false
    });

    video.srcObject = stream;

    await video.play();

    requestAnimationFrame(detectFrame);
}

// ================= IOU =================
function iou(box1, box2) {

    const x1 = Math.max(box1.x, box2.x);
    const y1 = Math.max(box1.y, box2.y);

    const x2 = Math.min(
        box1.x + box1.width,
        box2.x + box2.width
    );

    const y2 = Math.min(
        box1.y + box1.height,
        box2.y + box2.height
    );

    const intersection =
        Math.max(0, x2 - x1) *
        Math.max(0, y2 - y1);

    const union =
        (box1.width * box1.height) +
        (box2.width * box2.height) -
        intersection;

    return intersection / union;
}

// ================= NMS =================
function nonMaxSuppression(boxes) {

    boxes.sort((a, b) => b.score - a.score);

    const selected = [];

    while (boxes.length > 0) {

        const first = boxes.shift();

        selected.push(first);

        boxes = boxes.filter(box => {

            return iou(first, box) < CONFIG.iouThreshold;

        });
    }

    return selected.slice(0, CONFIG.maxDetections);
}

// ================= PREPROCESS =================
function prepareInput() {

    ctxProcessor.drawImage(
        video,
        0,
        0,
        CONFIG.inputSize,
        CONFIG.inputSize
    );

    const imageData = ctxProcessor.getImageData(
        0,
        0,
        CONFIG.inputSize,
        CONFIG.inputSize
    );

    const { data } = imageData;

    const input = new Float32Array(
        3 * CONFIG.inputSize * CONFIG.inputSize
    );

    for (let i = 0; i < CONFIG.inputSize * CONFIG.inputSize; i++) {

        input[i] = data[i * 4] / 255.0;

        input[i + CONFIG.inputSize * CONFIG.inputSize] =
            data[i * 4 + 1] / 255.0;

        input[i + CONFIG.inputSize * CONFIG.inputSize * 2] =
            data[i * 4 + 2] / 255.0;
    }

    return input;
}

// ================= LOG EVENT =================
function saveLog() {

    const c = document.createElement('canvas');

    c.width = video.videoWidth;
    c.height = video.videoHeight;

    c.getContext('2d').drawImage(video, 0, 0);

    const img = c.toDataURL('image/jpeg');

    const div = document.createElement('div');

    div.className = 'log-entry';

    div.innerHTML = `
        <img src="${img}">
        <p>
        🚪 PINTU TERBUKA<br>
        ${new Date().toLocaleTimeString()}
        </p>
    `;

    logPanel.prepend(div);

    if (Notification.permission === "granted") {

        new Notification("DoorGuard Alert", {
            body: "Pintu terbuka terdeteksi",
            icon: img
        });
    }
}

// ================= DRAW =================
function drawBoxes(boxes) {

    ctxOverlay.clearRect(0, 0, 640, 480);

    let foundOpen = false;

    boxes.forEach(box => {

        const x = box.x * (640 / CONFIG.inputSize);
        const y = box.y * (480 / CONFIG.inputSize);

        const w = box.width * (640 / CONFIG.inputSize);
        const h = box.height * (480 / CONFIG.inputSize);

        const color =
            box.classId === 1
            ? '#ff3b30'
            : '#00ff88';

        if (box.classId === 1) {
            foundOpen = true;
        }

        ctxOverlay.strokeStyle = color;
        ctxOverlay.lineWidth = 4;

        ctxOverlay.strokeRect(x, y, w, h);

        ctxOverlay.fillStyle = color;
        ctxOverlay.font = 'bold 18px Arial';

        ctxOverlay.fillText(
            `${CONFIG.labels[box.classId]} ${(box.score * 100).toFixed(0)}%`,
            x,
            y - 10
        );
    });

    // ===== STATUS =====

    if (foundOpen) {

        statusPanel.innerText =
            "🚨 WARNING : PINTU TERBUKA";

        if (currentState !== "OPEN") {

            alarmSound.currentTime = 0;
            alarmSound.play();

            saveLog();

            currentState = "OPEN";
        }

    } else {

        statusPanel.innerText =
            "🔒 PINTU TERTUTUP";

        if (currentState !== "CLOSED") {

            successSound.currentTime = 0;
            successSound.play();

            currentState = "CLOSED";
        }
    }
}

// ================= DETECT =================
async function detectFrame() {

    if (!session) {

        requestAnimationFrame(detectFrame);
        return;
    }

    try {

        const input = prepareInput();

        const tensor = new ort.Tensor(
            'float32',
            input,
            [1, 3, CONFIG.inputSize, CONFIG.inputSize]
        );

        const outputs = await session.run({
            [session.inputNames[0]]: tensor
        });

        const output =
            outputs[session.outputNames[0]].data;

        const boxes = [];

        const rows = 8400;
        const dimensions = 6;

        for (let i = 0; i < rows; i++) {

            const offset = i * dimensions;

            const x = output[offset];
            const y = output[offset + 1];
            const w = output[offset + 2];
            const h = output[offset + 3];

            const scoreClosed = output[offset + 4];
            const scoreOpen = output[offset + 5];

            const score =
                Math.max(scoreClosed, scoreOpen);

            if (score < CONFIG.confidence) continue;

            const classId =
                scoreOpen > scoreClosed ? 1 : 0;

            boxes.push({

                x: x - w / 2,
                y: y - h / 2,

                width: w,
                height: h,

                score,
                classId
            });
        }

        const finalBoxes =
            nonMaxSuppression(boxes);

        drawBoxes(finalBoxes);

    } catch (err) {

        console.error(err);
    }

    requestAnimationFrame(detectFrame);
}
