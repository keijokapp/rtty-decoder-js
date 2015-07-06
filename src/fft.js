/**
 * based on
 * https://github.com/dntj/jsfft/blob/master/lib/fft.js
 */

'use strict';

import FFTData from './FFTData.js';
export { FFTData };

var PI = Math.PI,
    SQRT1_2 = Math.SQRT1_2,
    sqrt = Math.sqrt,
    cos = Math.cos,
    sin = Math.sin;

export default function FFT(input, inverse) {
	var n = input.length;
    return n & (n - 1) ? FFT_Recursive(input, inverse) : FFT_2_Iterative(input, inverse);
}

function FFT_Recursive(input, inverse) {
    var n = input.length;

    if(n === 1) return input;

    var output = new FFTData (n, input.ArrayType);

    // Use the lowest odd factor, so we are able to use FFT_2_Iterative in the
    // recursive transforms optimally.
    var p = LowestOddFactor(n),
        m = n / p;
    var normalisation = 1 / sqrt(p);
    var recursive_result = new FFTData(m, input.ArrayType);

    // Loops go like O(n Σ p_i), where p_i are the prime factors of n.
    // for a power of a prime, p, this reduces to O(n p log_p n)
    for(var j = 0; j < p; j++) {
      for(var i = 0; i < m; i++) {
        recursive_result.real[i] = input.real[i * p + j];
        recursive_result.imag[i] = input.imag[i * p + j];
      }
      // Don't go deeper unless necessary to save allocs.
      if (m > 1) {
        recursive_result = FFT(recursive_result, inverse);
      }

      var del_f_r = cos(2*PI*j/n),
          del_f_i = (inverse ? -1 : 1) * sin(2*PI*j/n),
          f_r = 1,
          f_i = 0;

      for(i = 0; i < n; i++) {
        var _real = recursive_result.real[i % m],
            _imag = recursive_result.imag[i % m];

        output.real[i] += f_r * _real - f_i * _imag;
        output.imag[i] += f_r * _imag + f_i * _real;

        var _swap = f_r * del_f_r - f_i * del_f_i;
        f_i = f_r * del_f_i + f_i * del_f_r;
        f_r = _swap;
      }
    }

    // Copy back to input to match FFT_2_Iterative in-placeness
    // TODO: faster way of making this in-place?
    for(i = 0; i < n; i++) {
      input.real[i] = normalisation * output.real[i];
      input.imag[i] = normalisation * output.imag[i];
    }

    return input
}

function FFT_2_Iterative(input, inverse) {
    var output = BitReverseFFTData(input);
    var output_r = output.real,
        output_i = output.imag;

    // Loops go like O(n log n):
    //   width ~ log n; i,j ~ n
    var width = 1;
    var n = input.length;

    while(width < n) {
      var del_f_r = cos(PI/width),
          del_f_i = (inverse ? -1 : 1) * sin(PI/width);
      for(var i = 0; i < n/(2*width); i++) {
        var f_r = 1,
            f_i = 0;
        for(var j = 0; j < width; j++) {
          var l_index = 2*i*width + j,
              r_index = l_index + width;

          var left_r = output_r[l_index],
              left_i = output_i[l_index],
              right_r = f_r * output_r[r_index] - f_i * output_i[r_index],
              right_i = f_i * output_r[r_index] + f_r * output_i[r_index];

          output_r[l_index] = SQRT1_2 * (left_r + right_r);
          output_i[l_index] = SQRT1_2 * (left_i + right_i);
          output_r[r_index] = SQRT1_2 * (left_r - right_r);
          output_i[r_index] = SQRT1_2 * (left_i - right_i);

          var temp = f_r * del_f_r - f_i * del_f_i;
          f_i = f_r * del_f_i + f_i * del_f_r;
          f_r = temp
        }
      }
      width <<= 1
    }

    return output
}

function BitReverseIndex(index, n) {
    var bitreversed_index = 0;

    while (n > 1) {
      bitreversed_index <<= 1;
      bitreversed_index += index & 1;
      index >>= 1;
      n >>= 1
    }
    return bitreversed_index
}

function BitReverseFFTData(array) {
    var flips = {};

    for(var i = 0, n = array.length; i < n; i++) {
      var r_i = BitReverseIndex(i, n);

      if (flips.hasOwnProperty(i) || flips.hasOwnProperty(r_i)) continue;

      var swap = array.real[r_i];
      array.real[r_i] = array.real[i];
      array.real[i] = swap;

      swap = array.imag[r_i];
      array.imag[r_i] = array.imag[i];
      array.imag[i] = swap;

      flips[i] = flips[r_i] = true
    }

    return array;
}

function LowestOddFactor(n) {
    var factor = 3,
        sqrt_n = sqrt(n);

    while(factor <= sqrt_n) {
      if (n % factor === 0) return factor;
      factor = factor + 2
    }
    return n
}

