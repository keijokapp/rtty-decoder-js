
'use strict';

import FFT, { FFTData } from './fft';


function drawToCanvas(canvas, data) {
	if(canvas === null) throw undefined;
    var context = canvas.getContext('2d');

	context.clearRect(0, 0, canvas.width, canvas.height);	
	
    context.strokeStyle = 'red';
    context.beginPath();
    for(var i = 0; i <  data.imag.length; i++) {
		context.lineTo(
			i * canvas.width / data.imag.length,
			canvas.height/2 - (canvas.height/2 * data.imag[i])
		)
	}
    context.stroke();

    context.strokeStyle = 'blue';
    context.beginPath();
    for(var i = 0; i < data.real.length; i++) {
		context.lineTo(
			i * canvas.width / data.real.length,
			canvas.height/2 - (canvas.height/2 * data.real[i])
		)
	}
    context.stroke()
}




const SAMPLES = 1024;
const SAMPLERATE = 48000;
const FREQ0 = 1085;
const FREQ1 = 915;
const BPS = 45;
const CHUNKSPERBIT = 4;

var RTTYMode = { letters: 1, symbols: 2 };
var mode = RTTYMode.letters;
var RTTYLetters = [ "<", "E", "\n", "A", " ", "S", "I", "U", "\n", "D", "R", "J", "N", "F", "C", "K", "T", "Z", "L", "W", "H", "Y", "P", "Q", "O", "B", "G", "^", "M", "X", "V", "^" ];
var RTTYSymbols = [ "<", "3", "\n", "-", " ", ",", "8", "7", "\n", "$", "4", "#", ",", ".", ":", "(", "5", "+", ")", "2", ".", "6", "0", "1", "9", "7", ".", "^", ".", "/", "=", "^" ];


var oldChunkVal = 0;

var samplesPerChunk;
var binOfFreq0, binOfFreq1;

function start(sampleRate) {
	samplesPerChunk = Math.round(sampleRate / BPS / CHUNKSPERBIT);
	binOfFreq0 = Math.round(FREQ0/SAMPLERATE * samplesPerChunk);
	binOfFreq1 = Math.round(FREQ1/SAMPLERATE * samplesPerChunk);

	run();
}



function demodulator() {
	return readChunk()
		.then(function(fftData) {
			drawToCanvas(window.canvasOriginal, fftData)

			fftData = fftData.FFT();

			drawToCanvas(window.canvasFFT, fftData)

			var real0 = fftData.real[binOfFreq0],
				imag0 = fftData.imag[binOfFreq0],
				real1 = fftData.real[binOfFreq1],
				imag1 = fftData.imag[binOfFreq1];
			var PWRFreq0 = Math.sqrt(real0 * real0 + imag0 * imag0);
			var PWRFreq1 = Math.sqrt(real1 * real1 + imag1 * imag1);

			if (PWRFreq0 < PWRFreq1) {
//				console.log(1)
				return 1;
			} else if(PWRFreq0 > PWRFreq1) {
//				console.log(0)
				return 0;
			} else {
				return -1;
			}
		})
}

function getBitDPLL() {
	var chunkPhaseChanged = false;
	var chunkVal = -1;
	var chunkPhase = 0;

	return Promise.resolve()
		.then(function callee() {
			if(chunkPhase < CHUNKSPERBIT)
				return demodulator().then(function(_chunkVal) {
					chunkVal = _chunkVal;
					
					if(chunkVal === -1) { return -1; }

					if(!chunkPhaseChanged && chunkVal != oldChunkVal) {
						if(chunkPhase < CHUNKSPERBIT/2)
							chunkPhase++; // early
						else
							chunkPhase--; // late
						chunkPhaseChanged = true;
					}
					oldChunkVal = chunkVal;
					chunkPhase++;
					return Promise.resolve().then(callee);
				});

			return chunkVal;
		})
}

function waitForStartBit() {
	return Promise.resolve()

	.then(function callee() {	
		var promise = Promise.resolve()

		.then(demodulator)
		.then(function callee(bitResult) {
			if(bitResult == 0 || bitResult == -1)
				return demodulator().then(callee);
		})
		
		.then(demodulator)
		.then(function callee(bitResult) {
			if(bitResult == 1 || bitResult == -1)
				return demodulator().then(callee);
		})
		
		for(var i = 0; i < CHUNKSPERBIT/2; i++) {
			promise = promise.then(demodulator)
		}
		
		return promise.then(function(bitResult) {
			if(bitResult === 0);
			else return Promise.resolve().then(callee);
		});
	})
}

function run() {
	var byteResult = 0;
	var byteResultp = 1;
	
	return waitForStartBit()
	
	// reading 7 more bits
	.then(function callee() {
		return getBitDPLL().then(function(bitResult) {
			if(bitResult == -1) {
				byteResult = -1;
				return;
			}
		
			switch(byteResultp) {
			case 6: // stop bit 1
				break;
			case 7: // stop bit 2
				break;
			default:
				byteResult += bitResult << (byteResultp-1);
			}
			
			if(++byteResultp < 8) {
				return Promise.resolve().then(callee);
			} else {
		//		console.log(byteResult.toString(2));
			}
		})
	})
	.then(function() {
		if(byteResult === -1) return;
		
		switch (byteResult) {
		case 0x1F:
			mode = RTTYMode.letters;
			break;
		case 0x1B:
			mode = RTTYMode.symbols;
			break;
		default:
			switch(mode) {
			case RTTYMode.letters:
				txtResult.value += RTTYLetters[byteResult]
				break;
			case RTTYMode.symbols:
				txtResult.value += RTTYSymbols[byteResult]
				break;
			}
		}
	})
	.then(run);
}


var chunks = [ ];
var inputResolve = null;

function readChunk() {
	if(chunks[0] && chunks[0].end === samplesPerChunk) {
		var chunk = chunks.shift().data;
		return Promise.resolve(chunk)
	} else {
		return new Promise(function(resolve) {
			inputResolve = resolve;
		})
		.then(readChunk);
	}
}

window.addEventListener('load', function() {
	var onaudioprogress = function onaudioprogress(e) {
		var leftChannel = e.inputBuffer.getChannelData(0);
		var rightChannel = e.inputBuffer.getChannelData(1);

		var len = chunks.length;

		var index = len && chunks[len-1].end < samplesPerChunk ? len - 1 : len;

		for (var i = 0; i < SAMPLES; i++) {
			var chunk = chunks[index];
			if(!chunk) {
				chunk = {
					data: new FFTData(samplesPerChunk),
					end: 0
				};
				chunks.push(chunk);
			}

			console.assert(chunk.end < samplesPerChunk);
			chunk.data.real[chunk.end++] = (leftChannel[i] + rightChannel[i]) / 2;
			if(chunk.end === samplesPerChunk) index++;
		}

		console.assert(inputResolve);
		console.assert(chunks.length < 10);
		
		if (inputResolve) {
			var resolve = inputResolve;
			inputResolve = null;
			resolve();
		}
	};
	
	if(typeof navigator.getUserMedia === 'undefined' && typeof navigator.webkitGetUserMedia === 'function')
		navigator.getUserMedia = navigator.webkitGetUserMedia;
	
	navigator.getUserMedia({ audio: true }, function(e) {
		var context = new (window.AudioContext || window.webkitAudioContext);

	    var audioInput = context.createMediaStreamSource(e);

		var processor = context.createScriptProcessor(SAMPLES, 2, 2);

		processor.onaudioprocess = onaudioprogress;
	
	    audioInput.connect(processor);

		processor.connect(context.destination);

		start(context.sampleRate);
		
	}, function(e) { console.error('Error: ', e); });
});

