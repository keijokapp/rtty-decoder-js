import FFT, { FFTData } from './fft';
import AudioInput from './AudioInput';


var SAMPLES = 256;
var WIDTH = 512;
var HEIGHT = 128;

var canvasOriginal, canvasFFT, canvasFFTFiltered, canvasOriginalFiltered;
var frequency, amplitute;


function drawToCanvas(canvas, data) {
	if(canvas === null) throw undefined;
    var context = canvas.getContext('2d');

    canvas.width = WIDTH;
    canvas.height = HEIGHT;

    context.strokeStyle = 'red';
    context.beginPath();
    for(var i = 0; i < SAMPLES; i++) {
		context.lineTo(
			i * WIDTH / SAMPLES,
			HEIGHT/2 - (HEIGHT/2 * data.imag[i])
		)
	}
    context.stroke();

    context.strokeStyle = 'blue';
    context.beginPath();
    for(var i = 0; i < SAMPLES; i++) {
		context.lineTo(
			i * WIDTH / SAMPLES,
			HEIGHT/2 - (HEIGHT/2 * data.real[i])
		)
	}
    context.stroke()
}

function run(rawdata) {
	var data = new FFTData(SAMPLES);
	for(var i = 0; i < SAMPLES; i++) {
		data.real[i] = rawdata[i];
		data.imag[i] = 0;
	}

    drawToCanvas(canvasOriginal, data);

    data = data.FFT();

    drawToCanvas(canvasFFT, data);

    var maxValue = 0;
    var maxFreq = 0;
    data.map(function(freq, i, n) {
        var imag = freq.imag;
        var real = freq.real;
        freq.real = Math.sqrt(real * real + imag * imag);
        freq.imag = 0;
        var tmp = [];
        if(i > SAMPLES/2) {
        	//
        } else if(freq.real > maxValue && freq.real > .0001) {
            tmp[i] = freq.real;
            maxFreq = i;
            maxValue = freq.real
        }
    });
    drawToCanvas(canvasFFTFiltered, data);
    drawToCanvas(canvasOriginalFiltered, data.invFFT());
    return {
        freq: maxFreq,
        value: maxValue
    }
}

window.addEventListener('DOMContentLoaded', function() {
	canvasOriginal = document.getElementById('original');
	canvasFFT = document.getElementById('fft');
	canvasFFTFiltered = document.getElementById('fft-filtered');
	canvasOriginalFiltered = document.getElementById('original-filtered');
	frequency = document.getElementById('frequency');
	amplitute = document.getElementById('amplitute');
});


window.addEventListener('load', function() {
	var sampleRate = null;
	
	var onaudioprogress = function(e) {
		var d = new Float32Array(SAMPLES);
		var leftChannel = e.inputBuffer.getChannelData(0);
		var rightChannel = e.inputBuffer.getChannelData(1);
		for(var i = 0; i < SAMPLES; i++) {
			var left = leftChannel[i];
			var right = rightChannel[i];
			d[i] = (left + right) / 2;
		}
	
		var max = run(d);
		frequency.value = (max.freq * sampleRate / SAMPLES).toFixed(0);
		amplitute.style.backgroundColor = 'hsl(' + (255 - parseInt(max.value * 32)) + ', 50%, 50%)'
		amplitute.value = max.value.toFixed(4);
	}
	
	navigator.getUserMedia({ audio: true }, function(e) {
		var context = new (window.AudioContext || window.webkitAudioContext);

	    var audioInput = context.createMediaStreamSource(e);

		sampleRate = context.sampleRate;

		var recorder = context.createScriptProcessor(SAMPLES, 2, 2);

		recorder.onaudioprocess = onaudioprogress;
	
	    audioInput.connect(recorder);

		recorder.connect(context.destination);
	}, function(e) { console.log('Error: ', e); });
});

