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

// =========================
// AUDIO
// =========================
const alarmSound = new Audio(
    'https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg'
);

const successSound = new Audio(
    'https://actions.google.com/sounds/v1/cartoon/wood_plank_flicks.ogg'
);

let currentState = "AWAITING";

// =========================
// MODEL
// =========================
let session;

const TARGET_SIZE = 640;
const CONFIDENCE_THRESHOLD = 0.25;
const IOU_THRESHOLD = 0.4;

// =========================
// BUTTON INIT
// =========================
initBtn.addEventListener('click', async () => {

    initBtn.disabled = true;
    initBtn.innerText = "BOOTING...";

    // notification permission
    if ("Notification" in window &&
        Notification.permission !== "granted") {

        await Notification.requestPermission();
    }

    alarmSound.load();
    successSound.load();

    loadModel();
});

// =========================
// LOAD MODEL
// =========================
async function loadModel() {

    try {

        ort.env.wasm.wasmPaths =
            'https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/';

        const numCores =
            navigator.hardwareConcurrency || 4;

        ort.env.wasm.numThreads =
            Math.min(4, numCores);

        session = await ort.InferenceSession.create(
            './best.onnx',
            {
                executionProviders: ['webgl', 'wasm'],
                graphOptimizationLevel: 'all'
            }
        );

        statusPanel.innerText =
            "STANDBY: CAMERA INITIALIZATION";

        startCamera();

    } catch (e) {

        console.error(e);

        statusPanel.innerText =
            "SYSTEM FAILURE: MODEL ERROR";

        statusPanel.style.borderColor = "#ff0000";
    }
}

// =========================
// START CAMERA
// =========================
async function startCamera() {

    try {

        const stream =
            await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 640 },
                    height: { ideal: 480 }
                },
                audio: false
            });

        video.srcObject = stream;

        video.onloadedmetadata = async () => {

            await video.play();

            statusPanel.innerText =
                "AWAITING DOOR DETECTION...";

            initBtn.style.display = "none";

            requestAnimationFrame(processFrame);
        };

    } catch (e) {

        console.error(e);

        statusPanel.innerText =
            "CAMERA ACCESS DENIED";

        statusPanel.style.borderColor = "#ff0000";
    }
}

// =========================
// LOG + NOTIFICATION
// =========================
function logDoorEvent() {

    const captureCanvas =
        document.createElement('canvas');

    captureCanvas.width = video.videoWidth;
    captureCanvas.height = video.videoHeight;

    const captureCtx =
        captureCanvas.getContext('2d');

    captureCtx.drawImage(
        video,
        0,
        0,
        captureCanvas.width,
        captureCanvas.height
    );

    const dataUrl =
        captureCanvas.toDataURL(
            'image/jpeg',
            0.8
        );

    const timestamp =
        new Date().toLocaleTimeString();

    // sidebar log
    const entry =
        document.createElement('div');

    entry.className = 'log-entry';

    entry.innerHTML = `
        <img src="${dataUrl}">
        <p>
            🚪 PINTU TERBUKA
            <br>
            ${timestamp}
        </p>
    `;

    logPanel.insertBefore(
        entry,
        logPanel.children[1]
    );

    // notification
    if ("Notification" in window &&
        Notification.permission === "granted") {

        new Notification(
            "🚪 STATUS PINTU",
            {
                body:
                    `Pintu terbuka terdeteksi pada ${timestamp}`,
                icon: dataUrl,
                vibrate: [200, 100, 200]
            }
        );
    }
}

// =========================
// IOU
// =========================
function calculateIoU(box1, box2) {

    const xA = Math.max(box1.x, box2.x);
    const yA = Math.max(box1.y, box2.y);

    const xB = Math.min(
        box1.x + box1.w,
        box2.x + box2.w
    );

    const yB = Math.min(
        box1.y + box1.h,
        box2.y + box2.h
    );

    const intersectionArea =
        Math.max(0, xB - xA) *
        Math.max(0, yB - yA);

    return intersectionArea /
        (
            (box1.w * box1.h) +
            (box2.w * box2.h) -
            intersectionArea
        );
}

// =========================
// NMS
// =========================
function nonMaxSuppression(boxes, iouThreshold) {

    boxes.sort((a, b) =>
        b.score - a.score
    );

    const result = [];

    while (boxes.length > 0) {

        const current = boxes.shift();

        result.push(current);

        boxes = boxes.filter(box =>
            calculateIoU(current, box)
            < iouThreshold
        );
    }

    return result;
}

// =========================
// MAIN LOOP
// =========================
async function processFrame() {

    if (!session) return;

    // resize to 640
    ctxProcessor.drawImage(
        video,
        0,
        0,
        TARGET_SIZE,
        TARGET_SIZE
    );

    const imageData =
        ctxProcessor.getImageData(
            0,
            0,
            TARGET_SIZE,
            TARGET_SIZE
        ).data;

    // convert to tensor
    const float32Data =
        new Float32Array(
            3 * TARGET_SIZE * TARGET_SIZE
        );

    for (let i = 0; i < TARGET_SIZE * TARGET_SIZE; i++) {

        float32Data[i] =
            imageData[i * 4] / 255.0;

        float32Data[
            i + TARGET_SIZE * TARGET_SIZE
        ] =
            imageData[i * 4 + 1] / 255.0;

        float32Data[
            i + 2 * TARGET_SIZE * TARGET_SIZE
        ] =
            imageData[i * 4 + 2] / 255.0;
    }

    const inputTensor =
        new ort.Tensor(
            'float32',
            float32Data,
            [1, 3, TARGET_SIZE, TARGET_SIZE]
        );

    // inference
    const results =
        await session.run({
            [session.inputNames[0]]:
                inputTensor
        });

    const output =
        results[
            session.outputNames[0]
        ].data;

    let rawBoxes = [];

    const elements = 8400;

    // =========================
    // PARSE YOLO OUTPUT
    // =========================
    for (let i = 0; i < elements; i++) {

        let x = output[i];
        let y = output[i + elements];
        let w = output[i + 2 * elements];
        let h = output[i + 3 * elements];

        // class 0 = pintu tertutup
        // class 1 = pintu terbuka
        const scoreClosed =
            output[i + 4 * elements];

        const scoreOpen =
            output[i + 5 * elements];

        const maxScore =
            Math.max(scoreClosed, scoreOpen);

        if (maxScore > CONFIDENCE_THRESHOLD) {

            if (w <= 1.5 && h <= 1.5) {

                x *= TARGET_SIZE;
                y *= TARGET_SIZE;
                w *= TARGET_SIZE;
                h *= TARGET_SIZE;
            }

            rawBoxes.push({

                x: x - w / 2,
                y: y - h / 2,
                w: w,
                h: h,

                score: maxScore,

                classId:
                    scoreOpen > scoreClosed
                        ? 1
                        : 0
            });
        }
    }

    const finalBoxes =
        nonMaxSuppression(
            rawBoxes,
            IOU_THRESHOLD
        );

    ctxOverlay.clearRect(
        0,
        0,
        overlay.width,
        overlay.height
    );

    let isDoorOpen = false;

    // =========================
    // DRAW
    // =========================
    if (finalBoxes.length > 0) {

        finalBoxes.forEach(box => {

            const scaleX =
                overlay.width / TARGET_SIZE;

            const scaleY =
                overlay.height / TARGET_SIZE;

            const scaledX =
                box.x * scaleX;

            const scaledY =
                box.y * scaleY;

            const scaledW =
                box.w * scaleX;

            const scaledH =
                box.h * scaleY;

            if (box.classId === 1) {
                isDoorOpen = true;
            }

            const color =
                box.classId === 1
                    ? '#FF3B30'
                    : '#34C759';

            const labelText =
                box.classId === 1
                    ? `PINTU TERBUKA ${(box.score * 100).toFixed(1)}%`
                    : `PINTU TERTUTUP ${(box.score * 100).toFixed(1)}%`;

            // box
            ctxOverlay.strokeStyle = color;
            ctxOverlay.lineWidth = 4;

            ctxOverlay.strokeRect(
                scaledX,
                scaledY,
                scaledW,
                scaledH
            );

            // label bg
            ctxOverlay.font =
                'bold 18px monospace';

            const textWidth =
                ctxOverlay.measureText(
                    labelText
                ).width;

            ctxOverlay.fillStyle = color;

            ctxOverlay.fillRect(
                scaledX - 2,
                scaledY - 28,
                textWidth + 12,
                28
            );

            // label text
            ctxOverlay.fillStyle =
                '#FFFFFF';

            ctxOverlay.fillText(
                labelText,
                scaledX + 4,
                scaledY - 8
            );
        });

        // =========================
        // GLOBAL STATUS
        // =========================
        if (isDoorOpen) {

            statusPanel.innerText =
                "🚪 WARNING: PINTU TERBUKA";

            statusPanel.style.backgroundColor =
                "#4a0000";

            statusPanel.style.borderColor =
                "#FF3B30";

            statusPanel.style.color =
                "#ffcccc";

            if (currentState !== "OPEN") {

                alarmSound.currentTime = 0;
                alarmSound.play();

                logDoorEvent();

                currentState = "OPEN";
            }

        } else {

            statusPanel.innerText =
                "🔒 PINTU TERTUTUP AMAN";

            statusPanel.style.backgroundColor =
                "#003300";

            statusPanel.style.borderColor =
                "#34C759";

            statusPanel.style.color =
                "#ccffcc";

            if (currentState !== "CLOSED") {

                successSound.currentTime = 0;
                successSound.play();

                currentState = "CLOSED";
            }
        }

    } else {

        statusPanel.innerText =
            "AWAITING DOOR DETECTION...";

        statusPanel.style.backgroundColor =
            "transparent";

        statusPanel.style.borderColor =
            "#555";

        statusPanel.style.color =
            "#ffffff";

        currentState = "AWAITING";
    }

    requestAnimationFrame(processFrame);
}
