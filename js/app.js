import audioCtx from './audioContext';
import drawCanvasService from './services/drawCanvas';
import config, { events } from './config';
import * as afsk from './afsk';
import { UARTTransmitter } from './uart';

// Microphone input node
var source;

// Analyser for audio visualisation
const analyser = audioCtx.createAnalyser();
events.on('fftSize', () => { analyser.fftSize = config.fftSize; })
analyser.fftSize = 4096;
analyser.smoothingTimeConstant = 0;

const afskKeyer = new afsk.AFSKKeyer();
const uartTransmitter = new UARTTransmitter(afskKeyer, {
	byteSize: 5,
	bitSize: 60 / 45.45 / 6,
	stopBits: 0
});


var tx = false;

function startRx() {
	tx = false;

	try {
		afskKeyer.output.disconnect(analyser);
	} catch(e) {
		// ignored intentionally
	}

	if(source) {
		source.connect(analyser);
	} else {
		console.warn('Source is not available');
	}
}

function startTx() {
	tx = true;
	if(source) {
		try {
			source.disconnect(analyser);
		} catch(e) {
			// ignored intentionally
		}
	} else {
		console.warn('Source is not available');
	}

	afskKeyer.output.connect(analyser);
}

window.startRx = startRx;
window.startTx = startTx;
window.mark = () => afskKeyer.mark();
window.space = () => afskKeyer.space();
window.stop = () => afskKeyer.stop();
window.queue = s => afskKeyer.queue(s);
window.audioCtx = audioCtx;
window.result = afsk.result;
window.send = v => uartTransmitter.send(v);

const waterfall = [];
var waterfallPointer = 0;

function draw() {
	const freq = config.afskFrq - config.afskShift / 2;
	const waveLength = audioCtx.sampleRate / freq;
	const samples = new Float32Array(analyser.fftSize);
	const fft = new Uint8Array(analyser.frequencyBinCount);

	waterfall[waterfallPointer++] = fft;
	waterfallPointer %= document.getElementById('waterfall').height;
	const wfCanvas = document.getElementById('waterfall');
	const wfCtx = wfCanvas.getContext('2d');
	for(let y = 0; y < wfCanvas.height; y++) {
		for(let x = 0; x < fft.length; x++) {
			wfCtx.strokeStyle = 'rgb(' + fft[x] + ', 0, 0)';
		}
	};

	analyser.getFloatTimeDomainData(samples);
	analyser.getByteFrequencyData(fft);
	drawCanvasService(document.getElementById('original'), samples, fft);

	requestAnimationFrame(draw);
}

draw();

navigator.mediaDevices.getUserMedia({ audio: true }).then(media => {
	source = audioCtx.createMediaStreamSource(media);
	afsk.setSource(afskKeyer.output);
	startRx();
}).catch(e => {
	console.warn(e);
});


