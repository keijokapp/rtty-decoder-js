

const RTTYLetters = [ "<", "E", "\n", "A", " ", "S", "I", "U", "\n", "D", "R", "J", "N", "F", "C", "K", "T", "Z", "L", "W", "H", "Y", "P", "Q", "O", "B", "G", "^", "M", "X", "V", "^" ];
const RTTYSymbols = [ "<", "3", "\n", "-", " ", ",", "8", "7", "\n", "$", "4", "#", ",", ".", ":", "(", "5", "+", ")", "2", ".", "6", "0", "1", "9", "7", ".", "^", ".", "/", "=", "^" ];


export default function(byte, shift) {
	switch(byte) {
	case 0x1F:
//		this.shift = false;
		return '';
	case 0x1B:
//		this.shift = true;
		return '';
	default:
		return shift ? RTTYSymbols[byte] : RTTYLetters[byte]
	}
}


