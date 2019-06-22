'use strict';

import 'babel-regenerator-runtime';
import drawCanvasService from './services/drawCanvas'
import Baudot from './Baudot'

const SAMPLES = 256;
const SAMPLERATE = 48000;
const BPS = 45;

const samplesPerBit = Math.round(SAMPLERATE/BPS);
console.log('One bit length: ' + 1/BPS + ' seconds, ' + samplesPerBit + ' samples');


var DPLLOldVal = 0;
var DPLLBitPhase = 0;

var baudot = new Baudot;

var samples = [ ];

var inputResolve = null;

function getSample() {
	if(typeof samples[0] === 'number') {
		inputResolve = null;
		return Promise.resolve(samples.shift());
	} else {
		return (new Promise(resolve => { inputResolve = resolve; })).then(getSample);
	}
}

// for filter designing, see http://www-users.cs.york.ac.uk/~fisher/mkfilter/
// order 2 Butterworth, freqs: 865-965 Hz

var xvBP0 = [ 0, 0, 0, 0, 0 ],
    yvBP0 = [ 0, 0, 0, 0, 0 ];
function bandPassFreq0(sampleIn) {
	xvBP0[0] = xvBP0[1]; xvBP0[1] = xvBP0[2]; xvBP0[2] = xvBP0[3]; xvBP0[3] = xvBP0[4]; 
	xvBP0[4] = sampleIn / 2.356080041e+04;
	yvBP0[0] = yvBP0[1]; yvBP0[1] = yvBP0[2]; yvBP0[2] = yvBP0[3]; yvBP0[3] = yvBP0[4]; 
	yvBP0[4] = (xvBP0[0] + xvBP0[4]) - 2 * xvBP0[2]
	         + (-0.9816582826 * yvBP0[0]) + (3.9166274264 * yvBP0[1])
	         + (-5.8882201843 * yvBP0[2]) + (3.9530488323 * yvBP0[3]);
	return yvBP0[4];
}

// order 2 Butterworth, freqs: 1035-1135 Hz
var xvBP1 = [ 0, 0, 0, 0, 0 ],
    yvBP1 = [ 0, 0, 0, 0, 0 ];
function bandPassFreq1(sampleIn) {
	xvBP1[0] = xvBP1[1]; xvBP1[1] = xvBP1[2]; xvBP1[2] = xvBP1[3]; xvBP1[3] = xvBP1[4]; 
	xvBP1[4] = sampleIn / 2.356080365e+04;
	yvBP1[0] = yvBP1[1]; yvBP1[1] = yvBP1[2]; yvBP1[2] = yvBP1[3]; yvBP1[3] = yvBP1[4]; 
	yvBP1[4] = (xvBP1[0] + xvBP1[4]) - 2 * xvBP1[2]
	         + (-0.9816582826 * yvBP1[0]) + (3.9051693660 * yvBP1[1])
	         + (-5.8653953990 * yvBP1[2]) + (3.9414842213 * yvBP1[3]);
	return yvBP1[4];
}

// order 2 Butterworth, freq: 50 Hz
var xvLP  = [ 0, 0, 0 ],
    yvLP  = [ 0, 0, 0 ];
function lowPass(sampleIn) {
	xvLP[0] = xvLP[1]; xvLP[1] = xvLP[2]; 
	xvLP[2] = sampleIn / 9.381008646e+04;
	yvLP[0] = yvLP[1]; yvLP[1] = yvLP[2]; 
	yvLP[2] = (xvLP[0] + xvLP[2]) + 2 * xvLP[1]
	        + (-0.9907866988 * yvLP[0]) + (1.9907440595 * yvLP[1]);
	return yvLP[2];
}

async function demodulator() {
		var sample = await getSample();

		var line0 = bandPassFreq0(sample),
		    line1 = bandPassFreq1(sample);

		// calculating the RMS of the two lines (squaring them)
		line0 *= line0;
		line1 *= line1;

		// inverting line 1
		line1 *= -1;

		// summing the two lines
		line0 += line1;

		// lowpass filtering the summed line
		line0 = lowPass(line0);

		if(line0 > 0) return 0;
		else return 1;
}

// this function returns at the half of a bit with the bit's value
async function getBitDPLL() {
	var phaseChanged = false;
	var val = 0;

	while(DPLLBitPhase < samplesPerBit) {
		val = await demodulator();

		if(!phaseChanged && val != DPLLOldVal) {
			if(DPLLBitPhase < samplesPerBit/2)
				DPLLBitPhase += samplesPerBit/8; // early
			else
				DPLLBitPhase -= samplesPerBit/8; // late
			phaseChanged = true;
		}
		DPLLOldVal = val;
		DPLLBitPhase++;
	}
	DPLLBitPhase -= samplesPerBit;

	return val;
}

// this function returns only when the start bit is successfully received
async function waitForStartBit() {
	var bitResult;

	while(1) {
		
		// waiting for a falling edge
//		console.log('waiting for 1')
		while(await demodulator() === 0);

//		console.log('waiting for 0')			
		while(await demodulator() === 1);

//		console.log('waiting half bit');
		
		// waiting half bit time
		for(var i = 0; i < samplesPerBit / 2; i++)
			bitResult = await demodulator();

		if(bitResult == 0)
			break;
	}
}
	
async function getByte() {

	await waitForStartBit();

//	console.log(samples.length);
//	console.log('Got start bit')

	var byteResult = 0;

	for(var byteResultp = 0; byteResultp < 7; byteResultp++) {
		var bitResult = await getBitDPLL();
		if(bitResult === -1) {
			byteResult = -1;
			break;
		}

		switch(byteResultp) {
//		case 6: // stop bit 1
	//		console.log('Stop bit 1');
//			break;
//		case 7: // stop bit 2
	//		console.log('Stop bit 2');
	//		break;
		default:
			byteResult |= bitResult << byteResultp
		}
	}

//	console.log(byteResult.toString(2))

	return byteResult;
}

async function start() {
	
	var media = await navigator.mediaDevices.getUserMedia({ audio: true });
	
	var context = new (window.AudioContext || window.webkitAudioContext);

	var audioInput = context.createMediaStreamSource(media);

	var processor = context.createScriptProcessor(SAMPLES, 1, 1);

	processor.onaudioprocess = function(e) {
		if(typeof samples[0] !== 'undefined') {
			console.error('Buffer overflow');
			return; // buffer overflow
		}
		
		var channelData = e.inputBuffer.getChannelData(0);

		for(var i = 0; i < SAMPLES; i++) {
			samples.push(channelData[i]);
		}
		
		console.log(samples.length);
		
	//	drawCanvasService(document.getElementById('original'), samples);

		var resolve = inputResolve;
		inputResolve = null;
		resolve();
	};
	
	// some routing
	audioInput.connect(processor);
	processor.connect(context.destination);

	console.log('Sample rate: %d', context.sampleRate)
	
	
	var prev = -1;
	while(1) {
		var demod = await demodulator();
		/*
		if(prev !== demod) {
			prev = demod;
	//		console.log(demod);
		}*/
	
/*		var byte = await getByte();
	
		txtResult.value += baudot.char(byte) || '';
		txtResult.scrollTop = txtResult.scrollHeight;*/
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

