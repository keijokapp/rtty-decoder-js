import audioCtx from './audioContext';
import config, { events } from './state';
import { AFSKKeyer, AFSKDekeyer } from './afsk';
import { UARTTransmitter, UARTReceiver } from './uart';
import { analyser } from './visualisation';

// Microphone input node
var source;

const bitSize = 60 / 45.45 / 7; // in seconds
const samplesPerBit = parseInt(audioCtx.sampleRate * bitSize / 2) * 2;

const afskKeyer = new AFSKKeyer();
const afskDekeyer = new AFSKDekeyer();
const uartTransmitter = new UARTTransmitter(afskKeyer, {
	byteSize: 5,
	parityBits: 0,
	bitSize: samplesPerBit / audioCtx.sampleRate,
	stopBits: 1
});
const uartReceiver = new UARTReceiver(afskDekeyer, {
	byteSize: 5,
	parityBits: 0,
	bitSize: samplesPerBit,
	stopBits: 1
});

function startRx() {
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
window.queue = s => afskKeyer.queue(s);
window.setValueAtTime = (s, t) => afskKeyer.setValueAtTime(s, t);
window.audioCtx = audioCtx;
window.send = v => uartTransmitter.send(v);
window.events = events;

navigator.mediaDevices.getUserMedia({ audio: true }).then(media => {
	source = audioCtx.createMediaStreamSource(media);
	afskDekeyer.setSource(source);
	startRx();
}).catch(e => {
	console.warn(e);
});


