// ── 범용 유틸리티 ─────────────────────────────────────────────────────────────

function isUndefined(val, def) {
	return val != undefined ? val : def
}

function array_clear(a) {
	a.splice(0, a.length)
}

function header_getData(header, data) {
	return isUndefined(header.getter ? header.getter(data) : data[header.id], '')
}

function removeItemOnce(arr, value) {
	let index = arr.indexOf(value);
	if (index > -1) {
		arr.splice(index, 1);
	}
	return index;
}

function isBoolean(val) {
	return val === true || val === false
}

function Select_getBool(e) {
	if (e.value === 'true') {
		return true
	} else if (e.value === 'false') {
		return false
	}
	return undefined
}

function fillCharacter(text, len, ch) {
	text = text.toString()
	while (text.length < len) {
		text = ch + text
	}
	return text
}

function date_today() {
	let d = new Date()
	return d.getFullYear() + '-' + fillCharacter(d.getMonth() + 1, 2, '0') + '-' + fillCharacter(d.getDate(), 2, '0')
}

// ── 시간 변환 ─────────────────────────────────────────────────────────────────

function getSeconds(value, defaultVal) {
	if (typeof value == 'string' || value instanceof String) {
		let tokens = value.split(':')
		if (tokens.length != 3) {
			return defaultVal
		}
		let hours = Number(tokens[0])
		let minutes = Number(tokens[1])
		let seconds = Number(tokens[2])
		return hours * 3600 + minutes * 60 + seconds
	}
	return defaultVal
}

function secondsToTime(seconds)
{
	seconds = parseInt(seconds)
	let hours = parseInt(seconds / 3600)
	seconds -= hours * 3600
	let minutes = parseInt(seconds / 60)
	seconds -= minutes * 60
	return `${fillCharacter(hours, 2, '0')}:${fillCharacter(minutes, 2, '0')}:${fillCharacter(seconds, 2, '0')}`
}

// ── 바이트/Base64 변환 ────────────────────────────────────────────────────────

function StringToArray(str)
{
	const length = str.length;
	const Array = new Uint8Array(length);
	for (let i = 0; i < length; i++) {
		Array[i] = str.charCodeAt(i);
	}
	return Array;
}

function ArrayToString(uint8Array) {
  let str = '';
  for (let i = 0; i < uint8Array.length; i++) {
    str += String.fromCharCode(uint8Array[i]);
  }
  return str;
}

function base64UrlEncode(input) {
  var base64 = btoa(input);
  return base64.replace(/\+/g, '.').replace(/\//g, '_').replace(/=/g, '-');
}

function base64UrlDecode(input) {
  input = input.replace(/\./g, '+').replace(/_/g, '/').replace(/-/g, '=');
  while (input.length % 4) {
    input += '=';
  }
  return atob(input);
}

function base64ToArrayBuffer(base64)
{
	const binaryString = atob(base64);
	const len = binaryString.length;
	const bytes = new Uint8Array(len);
	for (let i = 0; i < len; i++) {
		bytes[i] = binaryString.charCodeAt(i);
	}
	return bytes.buffer;
}

// ── 배열 셔플 ─────────────────────────────────────────────────────────────────

function shuffle(array, start, end) {
	for (let i = end - 1; i > start; i--) {
		const j = Math.floor(Math.random() * (i - start + 1)) + start;
		[array[i], array[j]] = [array[j], array[i]];
	}
}
