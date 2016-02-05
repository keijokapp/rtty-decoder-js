import { EventEmitter } from 'events';

const config = {
	afskOutput: true,
	afskFrq: 2125,
	afskShift: 170,
//	fftSize: 16384
//	fftSize: 8192
//	fftSize: 4096
	fftSize: 512
};

export const events = new EventEmitter;

function resize() {
	const WIDTH = document.body.clientWidth;

	for(const canvas of document.querySelectorAll('.canvasContainer > canvas.full-width')) {
		canvas.width = WIDTH;
		canvas.height = 128;
	}

	for(const canvas of document.querySelectorAll('.canvasContainer > canvas.half-width')) {
		canvas.width = WIDTH / 2 - 3;
		canvas.height = 128;
	}

//	const txtResult = document.getElementById('result');
//	const txtMessage = document.getElementById('message');
//	txtResult.style.width = txtMessage.style.width = WIDTH + 'px';
}

/*function configure() {
	const cfrq = document.getElementById('cfrq').value;
	const shift = document.getElementById('shift').value;

	config.cfrq = cfrq;
	config.shift = shift;
}*/


window.addEventListener('resize', resize);
/*document.getElementById('cfrq').addEventListener('change', configure);
document.getElementById('shift').addEventListener('change', configure);
*/
resize();
//configure();

export default config;
