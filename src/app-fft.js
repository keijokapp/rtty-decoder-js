'use strict';

import 'babel-regenerator-runtime';
import FFT from './fft';
import FFTData from './FFTData';
import Baudot from './Baudot'

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
	
 	context.stroke();
}

const SAMPLES = 1024;
const SAMPLERATE = 48000;
const FREQ0 = 1085;
const FREQ1 = 915;
const BPS = 45;
const CHUNKSPERBIT = 4;

var baudot = new Baudot;
var oldChunkVal = 0;

var samplesPerChunk;
var binOfFreq0, binOfFreq1;

var chunks = [ ];
var inputResolve = null;

function readChunk() {
	if(chunks[0] && chunks[0].end === samplesPerChunk) {
		var chunk = chunks.shift().data;
		return Promise.resolve(chunk);
	} else {
		return (new Promise(resolve => { inputResolve = resolve; })).then(readChunk);
	}
}

async function demodulator() {
	var fftData = await readChunk();
	
	drawToCanvas(window.canvasOriginal, fftData);

	fftData = fftData.FFT();

	drawToCanvas(window.canvasFFT, fftData)

	var real0 = fftData.real[binOfFreq0],
	    imag0 = fftData.imag[binOfFreq0],
	    real1 = fftData.real[binOfFreq1],
	    imag1 = fftData.imag[binOfFreq1];
	var PWRFreq0 = Math.sqrt(real0 * real0 + imag0 * imag0),
	    PWRFreq1 = Math.sqrt(real1 * real1 + imag1 * imag1);

	if(PWRFreq0 < PWRFreq1) return 1;
	else if(PWRFreq0 > PWRFreq1) return 0;
	else return -1;
}

async function getBitDPLL() {
	var chunkPhaseChanged = false;
	var chunkVal = -1;
	var chunkPhase = 0;

	while(chunkPhase < CHUNKSPERBIT) {
		chunkVal = await demodulator();
		if(chunkVal === -1)
			break;
			
		if(!chunkPhaseChanged && chunkVal !== oldChunkVal) {
			if(chunkPhase < CHUNKSPERBIT/2)
				chunkPhase++; // early
			else
				chunkPhase--; // late
			chunkPhaseChanged = true;
		}

		oldChunkVal = chunkVal;
		chunkPhase++;
	}

	return chunkVal;
}

async function waitForStartBit() {
	var bitResult;
	
	while(1) {
		do {
			bitResult = await demodulator();
		} while(bitResult === 0 || bitResult === -1);

		do {
			bitResult = await demodulator();
		} while(bitResult === 1 || bitResult === -1);
	
		for(var i = 0; i < CHUNKSPERBIT/2; i++) {
			bitResult = await demodulator();
		}
		
		if(bitResult === 0)
			break;
	}
}

async function getByte() {

	await waitForStartBit();

	var bitResult, byteResult = 0, byteResultp = 0;

	for(var byteResultp = 1, byteResult = 0; byteResultp < 8; byteResultp++) {
		bitResult = await getBitDPLL();
		if(bitResult === -1) {
			byteResult = -1;
			break;
		}

		switch(byteResultp) {
		case 6: // stop bit 1
	//		console.log('Stop bit 1');
			break;
		case 7: // stop bit 2
	//		console.log('Stop bit 2');
			break;
		default:
			byteResult += bitResult << (byteResultp - 1)
		}
	}

	return byteResult;
}

async function start() {
	
	var media = await navigator.mediaDevices.getUserMedia({ audio: true });
	
	var context = new (window.AudioContext || window.webkitAudioContext);

	var audioInput = context.createMediaStreamSource(media);

	var processor = context.createScriptProcessor(SAMPLES, 2, 2);

	processor.onaudioprocess = function(e) {
		if(chunks.length > 5) {
			console.error('Buffer overflow');
			return; // buffer overflow
		}
		
		var leftChannel = e.inputBuffer.getChannelData(0);
		var rightChannel = e.inputBuffer.getChannelData(1);

		var chunksCount = chunks.length;
		var index = chunksCount && chunks[chunksCount - 1].end < samplesPerChunk ? chunksCount - 1 : chunksCount;

		for(var i = 0; i < SAMPLES; i++) {
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
		
		if(inputResolve) {
			var resolve = inputResolve;
			inputResolve = null;
			resolve();
		}
	};
	
	audioInput.connect(processor);

	processor.connect(context.destination);

	console.log('Sample rate: %d', context.sampleRate)

	samplesPerChunk = Math.round(context.sampleRate / BPS / CHUNKSPERBIT);
	binOfFreq0 = Math.round(FREQ0/SAMPLERATE * samplesPerChunk);
	binOfFreq1 = Math.round(FREQ1/SAMPLERATE * samplesPerChunk);
	
	while(1) {

		var byte = await getByte();
	
		txtResult.value += baudot.char(byte) || '';
		txtResult.scrollTop = txtResult.scrollHeight;

	}
}


// main

// navigator.mediaDevices.getUserMedia polyfill based on example at MDN
var promisifiedOldGUM = function(constraints, successCallback, errorCallback) {

	var getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

  if(!getUserMedia) {
		return Promise.reject(new Error('getUserMedia is not implemented in this browser'));
  }

	return new Promise((successCallback, errorCallback) => {
		getUserMedia.call(navigator, constraints, successCallback, errorCallback);
	});
}

if(!('mediaDevices' in navigator)) {
	navigator.mediaDevices = { };
}

if(!('getUserMedia' in navigator.mediaDevices)) {
  navigator.mediaDevices.getUserMedia = promisifiedOldGUM;
}


window.addEventListener('load', () => {
	start().then(() => { console.assert(false); }).catch(e => { console.error(e); })
});

