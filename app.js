const video = document.getElementById("webcam");
const overlay = document.getElementById("overlay");
const ctx = overlay.getContext("2d");

const processor = document.getElementById("processor");
const pctx = processor.getContext("2d", { willReadFrequently: true });

const status = document.getElementById("status");
const btn = document.getElementById("btn");
const log = document.getElementById("log");

let session;
let state = "IDLE";

const SIZE = 640;
const THRESHOLD = 0.4;
const IOU = 0.4;

const sound = new Audio("https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg");

// ================= BUTTON =================
btn.onclick = async () => {
    btn.disabled = true;
    btn.innerText = "LOADING MODEL...";

    await loadModel();
};

// ================= LOAD MODEL (GITHUB SAFE) =================
async function loadModel() {
    try {
        ort.env.wasm.wasmPaths =
            "https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/";

        session = await ort.InferenceSession.create("./best.onnx", {
            executionProviders: ["wasm"]
        });

        status.innerText = "MODEL LOADED - START CAMERA";

        startCamera();

    } catch (e) {
        console.error(e);
        status.innerText = "MODEL FAILED: " + e.message;
    }
}

// ================= CAMERA =================
async function startCamera() {
    const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false
    });

    video.srcObject = stream;

    video.onloadedmetadata = () => {
        video.play();
        btn.style.display = "none";
        requestAnimationFrame(loop);
    };
}

// ================= LOG =================
function addLog(text) {
    const div = document.createElement("div");
    div.className = "log-item";
    div.innerHTML = `<p>${text}</p>`;
    log.prepend(div);
}

// ================= IOU =================
function iou(a, b) {
    const x1 = Math.max(a.x, b.x);
    const y1 = Math.max(a.y, b.y);
    const x2 = Math.min(a.x + a.w, b.x + b.w);
    const y2 = Math.min(a.y + a.h, b.y + b.h);

    const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
    return inter / ((a.w * a.h) + (b.w * b.h) - inter);
}

function nms(boxes) {
    boxes.sort((a, b) => b.score - a.score);
    const out = [];

    while (boxes.length) {
        const best = boxes.shift();
        out.push(best);
        boxes = boxes.filter(b => iou(best, b) < IOU);
    }

    return out;
}

// ================= MAIN LOOP =================
async function loop() {
    if (!session) return;

    pctx.drawImage(video, 0, 0, SIZE, SIZE);

    const data = pctx.getImageData(0, 0, SIZE, SIZE).data;

    const input = new Float32Array(3 * SIZE * SIZE);

    for (let i = 0; i < SIZE * SIZE; i++) {
        input[i] = data[i * 4] / 255;
        input[i + SIZE * SIZE] = data[i * 4 + 1] / 255;
        input[i + 2 * SIZE * SIZE] = data[i * 4 + 2] / 255;
    }

    const tensor = new ort.Tensor("float32", input, [1, 3, SIZE, SIZE]);

    const result = await session.run({
        [session.inputNames[0]]: tensor
    });

    const output = result[session.outputNames[0]].data;

    const N = 8400;
    let boxes = [];

    for (let i = 0; i < N; i++) {

        let x = output[i];
        let y = output[i + N];
        let w = output[i + N * 2];
        let h = output[i + N * 3];

        const open = output[i + N * 4];
        const close = output[i + N * 5];

        const score = Math.max(open, close);

        if (score > THRESHOLD) {

            if (w <= 1.5 && h <= 1.5) {
                x *= SIZE;
                y *= SIZE;
                w *= SIZE;
                h *= SIZE;
            }

            const isOpen = open > close;

            boxes.push({
                x: x - w / 2,
                y: y - h / 2,
                w,
                h,
                score,
                isOpen
            });
        }
    }

    const final = nms(boxes);

    ctx.clearRect(0, 0, 640, 480);

    let openDetected = false;

    final.forEach(b => {

        const scaleX = 640 / SIZE;
        const scaleY = 480 / SIZE;

        const x = b.x * scaleX;
        const y = b.y * scaleY;
        const w = b.w * scaleX;
        const h = b.h * scaleY;

        const color = b.isOpen ? "red" : "lime";

        if (b.isOpen) openDetected = true;

        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.strokeRect(x, y, w, h);

        ctx.fillStyle = color;
        ctx.fillText(b.isOpen ? "OPEN" : "CLOSED", x, y - 5);
    });

    // ================= STATE =================
    if (final.length > 0) {

        if (openDetected) {
            status.innerText = "🚨 DOOR OPEN";

            if (state !== "OPEN") {
                sound.play();
                addLog("Door Open Detected");
                state = "OPEN";
            }

        } else {
            status.innerText = "✅ DOOR CLOSED";
            state = "CLOSED";
        }

    } else {
        status.innerText = "WAITING FOR DOOR";
        state = "IDLE";
    }

    requestAnimationFrame(loop);
}
