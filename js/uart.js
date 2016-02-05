

// encoder

export class UARTTransmitter {

	/**
	 * @constructor
	 * @param keyer {Keyer} Keyer to be used for transmitting
	 * @param options {object} Options
         * @param options.byteSize {number} Number of bits in byte
         * @param options.bitSize {number} length of bit in keyers time scale
         * @param options.stopBits {number} Number of stop bits
	 */
	constructor(keyer, options) {
		this._keyer = keyer;
		this._byteSize = options.byteSize;
		this._bitSize = options.bitSize;
		this._stopBits = options.stopBits;
	}

	/**
	 * Sends single byte
	 * @param byte {number} integer byte value
	 */
	send(byte) {
		const standbyTime = .1

		const bits = [ ];
		if(this._keyer.currentValue !== -1) {
			bits.push({ timestamp: 0, value: -1 }) // standby value, high
		}

		bits.push({ timestamp: standbyTime, value: 1 }) // start bit, low

		var time = standbyTime + this._bitSize;
		var mask = 1 << (this._byteSize - 1);
		while(mask) {
			if(byte & mask) { // mark
				bits.push({ timestamp: time, value: -1 })
			} else { // space
				bits.push({ timestamp: time, value: 1 })
			}
			time += this._bitSize;
			mask >>= 1;
		}

		bits.push({ timestamp: time, value: -1 }); // stop bit, high
		bits.push({ timestamp: time + this._stopBits * this._bitSize, value: 0 }); // silence

		console.log(bits);

		return this._keyer.queue(bits);
	}

}


// decoder
/*
const States = {
	WAIT_HIGH: 0,
	WAIT_START: 1,
}

export default class {

	constructor(samplesPerBit, fskInput) {
		this.fskInput = fskInput;

		this._bitLength = 44100 / 10;
		this._startBitSize = 1 * this._bitLength;
		this._stopBits = 2;
		this._bitsPerByte = 5;
		this._byteSize = this._bitsPerSite * this._bitSize;
		this._startBitTime = NaN;
		this._bitTime = NaN;
		this._state = States.WAIT_HIGH;
		
		fskInput.on('change', this._change.bind(this));
	}

	_change(value, sample) {
		if(value === 0) {
			this._state = States.WAIT_HIGH;
		} else if(this._states === States.WAIT_HIGH && value === 1) {
			this._state = States.WAIT_START;
		} else if(this._state === States.WAIT_START && value === -1) {
			this.fskInput.on(sample + this.startBitSize / 2 + '', this._checkStartBit.bind(this));
		} else {
			this._sync(sample);
		}
	}

	_checkStartBit(value, sample) {
		if(value === -1)
	}















	_change(value, sample) {

		if(value === 0) {
			this._state = States.WAIT_HIGH;
			return;
		}
		
		


		switch(this._state) {
		case States.WAIT_HIGH:
			if(value === -1) {
				this._state = States.WAIT_START;
			}
			break;
		case States.WAIT_START:
			if(value !== -1) {
				throw new Error('Unexpected value: ' + value);
			}
			
			// Got start bit
			this._startBitTime = sample;
			this._state = States.WAIT_FIRST_BIT;
			break;
		case States.WAIT_FIRST_BIT: // same as WAIT_BIT but start bit length dependendent
			const samplesSinceStartBit = sample - this._startBitTime;
			const samplesSinceByteStart = samplesSinceStartBit - this._startBitSize;

			if(value === 1 && samplesSinceStartBit < this._startBitSize / 2) {
					// Start bit ended too early
					this._state = States.WAIT_START;
			} else if(samplesSinceByteStart < this._byteSize + this._bitSize / 2) { // bitSize / 2 - include half stop bit for error resistance 
				const numberOfBits = Math.round(samplesSinceByteStart / this._bitSize);
//				console.log('Got %d bits with value %d', numberOfBits, value);
				if(value === 1) {
					this._byte = (1 << (numberOfBits + 1)) - 1;
				} else { // value === -1
					this._byte = 0;
				}
				this._state = States.WAIT_BIT;
			} else if(value !== 1) { // error conditions
				this._state = States.WAIT_HIGH;
			} else {
				this._state = States.WAIT_START;
			}
			break;
		case States.WAIT_BIT:
			const samplesSinceStartBit = sample - this._startBitTime;
			const samplesSinceByteStart = samplesSinceStartBit - this._startBitSize;

			} else if(value !== 0 && samplesSinceStartBit < this._startBitSize + this._byteSize) {
				const samplesSinceByteStart = samplesSinceStartBit - this._startBitSize;
				const numberOfBits = Math.round(samplesSinceByteStart / this._bitSize);
//				console.log('Got %d bits with value %d', numberOfBits, value);
				if(value === 1) {
					this._byte = (1 << (numberOfBits + 1)) - 1;
				} else { // value === -1
					this._byte = 0;
				}
				this._state = States.WAIT_BIT;
			} else if(value !== 1) { // error conditions
				this._state = States.WAIT_HIGH;
			} else {
				this._state = States.WAIT_START;
			}
			break;
		}
	}

}

*/

/*	This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>. */
/*
package com.nonoo.rttydecoder.iir;

import java.io.BufferedReader;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStreamReader;

import javax.sound.sampled.AudioFileFormat;
import javax.sound.sampled.AudioFormat;
import javax.sound.sampled.AudioInputStream;
import javax.sound.sampled.AudioSystem;
import javax.sound.sampled.DataLine;

	private final static int SAMPLERATE = 48000;
	private final static int BUFFERSIZE = SAMPLERATE;
	//private final static int FREQ0 = 915;
	//private final static int FREQ1 = 1085;
	private final static double BITSPERSEC = 45.45;

	private int oneBitSampleCount;
	private int DPLLOldVal = 0;
	private int DPLLBitPhase = 0;

	// this function returns at the half of a bit with the bit's value
	public int getBitDPLL() {
		boolean phaseChanged = false;
		int val = 0;

		while (DPLLBitPhase < oneBitSampleCount) {
			val = demodulator();

			if (!phaseChanged && val != DPLLOldVal) {
				if (DPLLBitPhase < oneBitSampleCount/2)
					DPLLBitPhase += oneBitSampleCount/8; // early
				else
					DPLLBitPhase -= oneBitSampleCount/8; // late
				phaseChanged = true;
			}
			DPLLOldVal = val;
			DPLLBitPhase++;
		}
		DPLLBitPhase -= oneBitSampleCount;

		return val;
	}

	// this function returns only when the start bit is successfully received
	public void waitForStartBit() {
		int bitResult;

		while (!Thread.interrupted()) {
			// waiting for a falling edge
			do {
				bitResult = demodulator();
			} while (bitResult == 0 && !Thread.interrupted());
			
			do {
				bitResult = demodulator();
			} while (bitResult == 1 && !Thread.interrupted());

			// waiting half bit time
			for (int i = 0; i < oneBitSampleCount/2; i++)
				bitResult = demodulator();

			if (bitResult == 0)
				break;
		}
	}
	
	@Override
	public void run() {
		tdl.start();

		int byteResult = 0;
		int byteResultp = 0;
		int bitResult;
		
		while (!Thread.interrupted()) {
			waitForStartBit();

			System.out.print("0 "); // first bit is the start bit, it's zero

			// reading 7 more bits
			for (byteResultp = 1, byteResult = 0; byteResultp < 8; byteResultp++) {
				bitResult = getBitDPLL();

				switch (byteResultp) {
					case 6: // stop bit 1
						System.out.print(" " + bitResult);
						break;
					case 7: // stop bit 2
						System.out.print(bitResult);
						break;
					default:
						System.out.print(bitResult);
						byteResult += bitResult << (byteResultp-1);
				}
			}

			switch (byteResult) {
				case 31:
					mode = RTTYMode.letters;
					System.out.println(" ^L^");
					break;
				case 27:
					mode = RTTYMode.symbols;
					System.out.println(" ^F^");
					break;
				default:
					switch (mode) {
						case letters:
							System.out.println(" *** " + RTTYLetters[byteResult] + "(" + byteResult + ")");
							break;
						case symbols:
							System.out.println(" *** " + RTTYSymbols[byteResult] + "(" + byteResult + ")");
							break;
					}
			}
		}

		tdl.stop();
		tdl.close();
	}
*/
