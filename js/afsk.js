import { EventEmitter } from 'events';
import drawCanvasService from './services/drawCanvas';
import config, { events } from './config';
import audioCtx from './audioContext';

// encoder

// class AFSKKeyer implementes Keyer
export class AFSKKeyer {

	constructor() {

		this._oscillator = audioCtx.createOscillator();
		this._oscillator.frequency.value = 0;
		this._oscillator.active = false;
		this._oscillator.start();

		this.currentValue = 0;
		this._queueEnd = 0;

		// Noise generator
		this.output = audioCtx.createChannelMerger(2);

//		const noise = audioCtx.createScriptProcessor(config.fftSize, 1, 1);
/*		var sampleIndex = 0;
		const frequency = config.afskFrq - config.afskShift / 2;
		const waveLength = audioCtx.sampleRate / frequency;
		const coefficient = 2 * Math.PI / waveLength;
		noise.onaudioprocess = function(e) {
			const outputData = e.outputBuffer.getChannelData(0);
			const l = outputData.length;
			for(let i = 0; i < l; i++) {
				outputData[i] = Math.sin(sampleIndex * coefficient);
				sampleIndex++;
			}
			if(e.playbackTime <= audioCtx.currentTime) console.log('asdasd');
		};*/
//		noise.connect(this.output);

		const gain = audioCtx.createGain();
		gain.gain.value = 1;
		this._oscillator.connect(gain).connect(this.output);

		events.on('afskOutput', this._toggleFeedback.bind(this));
		this._toggleFeedback();
	}

	cleanup() {
		this._oscillator.stop();
		this._oscillator = undefined;
	}

	_toggleFeedback() {
		try {
			if(config.afskOutput && this.currentValue) {
				this._oscillator.connect(audioCtx.destination);
			} else {
				this.output.disconnect(audioCtx.destination);
			}
		} catch(e) {
			// ignored intentionally
		}
	}

	queue(values) {
		values = values.slice(0).sort((a, b) => a.timestamp - b.timestamp);
		const c = Math.max(this._queueEnd, audioCtx.currentTime + .001);
		for(const value of values) {
			this._queueEnd = c + value.timestamp;
			switch(value.value) {
			case 0: this.stop(this._queueEnd); break;
			case -1: this.mark(this._queueEnd); break;
			case 1: this.space(this._queueEnd); break;
			}
		}

		return this._queueEnd;
	}

	_setFrequencyAtTime(frequency, time) {
		if(!Number.isFinite(time)) {
			time = 0;
		}
		this._oscillator.frequency.setValueAtTime(frequency, time);
		this._toggleFeedback();
	}

	mark(time) {
		this.currentalue = -1;
		this._setFrequencyAtTime(config.afskFrq - config.afskShift / 2, time);
	}

	space(time) {
		this.currentValue = 1;
		this._setFrequencyAtTime(config.afskFrq + config.afskShift / 2, time);
	}

	stop(time) {
		this.currentValue = 0;
		this._setFrequencyAtTime(0, time);
	}
}



// decoder

// Bandpass filters for mark and space frequency
const [ markFilter, spaceFilter ] = function() {
	const markFilter = audioCtx.createBiquadFilter(),
	      spaceFilter = audioCtx.createBiquadFilter();
	markFilter.Q.value = spaceFilter.Q.value = 1000;
	markFilter.type = spaceFilter.type = 'bandpass';

	function updateFrequency() {
		markFilter.frequency.setValueAtTime(config.afskFrq - config.afskShift / 2, 0);
		spaceFilter.frequency.setValueAtTime(config.afskFrq + config.afskShift / 2, 0);
	}

	events.on('afskFrq', updateFrequency);
	events.on('afskShift', updateFrequency);
	updateFrequency();

	return [ markFilter, spaceFilter ];
}();


// Filter output merging
const merger = function(markFilter, spaceFilter) {
	const merger = audioCtx.createScriptProcessor(null, 2, 1);
	merger.onaudioprocess = function onaudioprocess(e) {
		const input1 = e.inputBuffer.getChannelData(0);
		const input2 = e.inputBuffer.getChannelData(1);
		const output = e.outputBuffer.getChannelData(0);

		for(let i = 0, l = input1.length; i < l; i++) {
			output[i] = input1[i] * input1[i] - input2[i] * input2[i];
		}
	}

	const mergerNode = audioCtx.createChannelMerger(2)
	markFilter.connect(mergerNode, 0, 0);
	spaceFilter.connect(mergerNode, 0, 1);
	mergerNode.connect(merger);

	return merger;
}(markFilter, spaceFilter);


// Lowpass filter
const lpFilter = function(merger) {
	const lpFilter = audioCtx.createBiquadFilter();
	lpFilter.frequency.value = 25;
	lpFilter.Q.value = 1;
	lpFilter.type = 'lowpass';

	merger.connect(lpFilter);

	return lpFilter;
}(merger);


// Final data extraction

export const result = new EventEmitter;
result.currentValue = NaN;

const processor = function(lpFilter) {

	const THRESHOLD = .00009; // the minimum difference between two signals

	var sampleCounter = 0;

	const processor = audioCtx.createScriptProcessor(null, 1, 1);
	processor.onaudioprocess = function onaudioprocess(e) {
		const input = e.inputBuffer.getChannelData(0);

		for(const sample of input) {
			const current = sample > THRESHOLD ? 1 : (sample < -THRESHOLD ? -1 : 0);

			if(current !== result.currentValue) {
				result.currentValue = current;
				result.emit('change', current, sampleCounter);
			}

			if(result._events[sampleCounter]) {
				result.emit('' + sampleCounter, current, sampleCounter);
			}

			sampleCounter++;
		}

//		for(let i = 0; i < this.bufferSize; i++) input[i] *= 10;

		drawCanvasService(document.getElementById('lowpass'), input, null);
	};
	lpFilter.connect(processor);

	// Workaround for Webkit/Blink issue 327649
	// https://bugs.chromium.org/p/chromium/issues/detail?id=327649
	const dummyDestination = audioCtx.createMediaStreamDestination();
	processor.connect(dummyDestination);

	return processor;
}(lpFilter)


// Connecting source
var source;

export function setSource(s) {
	if(!(s instanceof AudioNode)) {
		throw new Error('Argument is not AudioNode');
	}

	if(source) {
		source.disconnect(markFilter);
		source.disconnect(spaceFilter);
	}

	source = s;

	source.connect(markFilter);
	source.connect(spaceFilter);
}

// Debugging

// Analyser for audio visualisation

function createAnalyser() {
	const analyser = audioCtx.createAnalyser();
	analyser.fftSize = config.fftSize;
	analyser.smoothingTimeConstant = 0;
	return analyser;
}

const lpGain = audioCtx.createGain();
lpGain.gain.value = 500;
lpFilter.connect(lpGain);

const markAnalyser = createAnalyser(),
      spaceAnalyser = createAnalyser(),
      additionAnalyser = createAnalyser(),
      lowpassAnalyser = createAnalyser();
markFilter.connect(markAnalyser);
spaceFilter.connect(spaceAnalyser);
merger.connect(additionAnalyser);
lpGain.connect(lowpassAnalyser);


var drawing = true;
function draw() {

	if(!drawing) return;

	const samples = new Float32Array(config.fftSize);
	const fft = new Uint8Array(config.fftSize / 8);

	markAnalyser.getFloatTimeDomainData(samples);
	markAnalyser.getByteFrequencyData(fft);
	drawCanvasService(document.getElementById('biquad-mark'), samples, fft);

	spaceAnalyser.getFloatTimeDomainData(samples);
	spaceAnalyser.getByteFrequencyData(fft);
	drawCanvasService(document.getElementById('biquad-space'), samples, fft);

	additionAnalyser.getFloatTimeDomainData(samples);
	additionAnalyser.getByteFrequencyData(fft);
	drawCanvasService(document.getElementById('addition'), samples, fft);

//	lowpassAnalyser.getFloatTimeDomainData(samples);
//	lowpassAnalyser.getByteFrequencyData(fft);
//	drawCanvasService(document.getElementById('lowpass'), samples, fft);

	requestAnimationFrame(draw);
}

draw();
