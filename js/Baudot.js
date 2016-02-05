
const RTTYLetters = [ "<", "E", "\n", "A", " ", "S", "I", "U", "\n", "D", "R", "J", "N", "F", "C", "K", "T", "Z", "L", "W", "H", "Y", "P", "Q", "O", "B", "G", "^", "M", "X", "V", "^" ];
const RTTYSymbols = [ "<", "3", "\n", "-", " ", ",", "8", "7", "\n", "$", "4", "#", ",", ".", ":", "(", "5", "+", ")", "2", ".", "6", "0", "1", "9", "7", ".", "^", ".", "/", "=", "^" ];

export default class {
	constructor(shift) {
		this.shift = Boolean(shift);
	}

	reset() {
		this.shift = false;
	}

	decode(byte) {
		switch(byte) {
		case 0x1F:
			this.shift = false;
			return null;
		case 0x1B:
			this.shift = true;
			return null;
		default:
			return this.shift ? RTTYSymbols[byte] : RTTYLetters[byte]
		}
	}

	encode(char) {
		throw new Error('Not implemented');
	}
}

