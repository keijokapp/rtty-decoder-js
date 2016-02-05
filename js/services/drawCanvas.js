
export default function(canvas, samples, fft) {

	const areaHeight = canvas.height / 2;

	var context = canvas.getContext('2d');

	context.clearRect(0, 0, canvas.width, canvas.height);

	context.strokeStyle = 'gray';
	context.beginPath();
	context.moveTo(0, areaHeight / 2);
	context.lineTo(canvas.width, areaHeight / 2);
	context.stroke();

	context.strokeStyle = 'blue';

	// draw samples
	const samplesLength = samples.length;
	context.beginPath();
	for(let i = 0; i < samplesLength; i++) {
		context.lineTo(
			i * canvas.width / samplesLength,
			areaHeight / 2 - (areaHeight / 2 * samples[i])
		)
	}
	context.stroke();

	if(fft !== null) {
		// draw fft
		const fftLength = fft.length;
		context.beginPath();
		for(let i = 0; i < fftLength; i++) {
			context.lineTo(
				i * canvas.width / fftLength,
				areaHeight + areaHeight - (areaHeight / 2 * fft[i] / 256)
			)
		}
		context.stroke();
	}
}
