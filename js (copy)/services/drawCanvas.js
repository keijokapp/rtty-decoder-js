
export default function drawToCanvas(canvas, data) {
	if(canvas === null) throw undefined;

	var context = canvas.getContext('2d');

	context.clearRect(0, 0, canvas.width, canvas.height);

	if(data instanceof Array) {
		context.strokeStyle = 'blue';
		context.beginPath();
		for(var i = 0; i < data.length; i++) {
			context.lineTo(
				i * canvas.width / data.length,
				canvas.height/2 - (canvas.height/2 * data[i])
			)
		}
		context.stroke();
	} else {
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
}
