/**
 * based on
 * https://github.com/dntj/jsfft/blob/master/lib/complex_array.js
 */

'use strict';

import FFT from './fft';

export default function FFTData(other, opt_array_type){
	if(other && other.hasOwnProperty && other.hasOwnProperty('real') && other.hasOwnProperty('imag')) {
		// Copy constuctor.
		this.ArrayType = other.ArrayType;
		this.real = new this.ArrayType(other.real);
		this.imag = new this.ArrayType(other.imag)
	} else {
		this.ArrayType = opt_array_type || Float32Array;
		// other can be either an array or a number.
		this.real = new this.ArrayType(other);
		this.imag = new this.ArrayType(this.real.length);
	}

	this.length = this.real.length;
};

Object.defineProperty(FFTData.prototype, 'toString', {
	enumerable: false,
	value: function() {
		var components = [ ];

		this.forEach(function(c_value, i) {
			components.push('(' + c_value.real.toFixed(2) + ',' + c_value.imag.toFixed(2) + ')');
		});

		return '[' + components.join(',') + ']';
	}
});

Object.defineProperty(FFTData.prototype, 'map', {
	enumerable: false,
	value: function(mapper) {
		for (var i = 0, n = this.length, c_value = { }; i < n; i++) {
			c_value.real = this.real[i];
			c_value.imag = this.imag[i];
			mapper(c_value, i, n);
			this.real[i] = c_value.real;
			this.imag[i] = c_value.imag;
		}

		return this;
	}
});

Object.defineProperty(FFTData.prototype, 'forEach', {
	enumerable: false,
	value: function (iterator) {
		for (var i = 0, n = this.length, c_value = {}; i < n; i++) {
			c_value.real = this.real[i];
			c_value.imag = this.imag[i];
			iterator(c_value, i, n);
		}
	}
});

Object.defineProperty(FFTData.prototype, 'FFT', {
	enumerable: false,
	value: function() {
		return FFT(this)
	}
});

Object.defineProperty(FFTData.prototype, 'invFFT', {
	enumerable: false,
	value: function() {
		return FFT(this, true);
	}
});
