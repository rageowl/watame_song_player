// ── 초기 데이터 (Google Charts 로드 전 필요) ──────────────────────────────────
var playListData = undefined
var individualVolumeData = undefined
const SheetHeader = "http://spreadsheets.google.com/tq?key="
let defaultClipSpreadSheetURL = ['1vpbCjP0UorTAiEHx9sOTGF1oNfpwW1jIZ6v1npQExEk']
var settingsData = { clipSpreadSheetURL:defaultClipSpreadSheetURL }
let videoClipList = []

// ── 플레이어 상태 ─────────────────────────────────────────────────────────────
let videoClipMap = new Map()
const videoWidth = 800
const videoHeight = 450

// ── 재생 모드 상수 ────────────────────────────────────────────────────────────
const PLAYMODE_NORMAL = 0
const PLAYMODE_REPEAT_TRACK = 1
const PLAYMODE_REPEAT_ONE = 2

// ── 데이터 관련 ───────────────────────────────────────────────────────────────
let individualVolumeMap = new Map()
let playListSN = 1
let nextPlayItemSN = 1
let dataChanged = false
let isLoading = false
let spreadsheetsFormList = []
let totalListContextMenu = null
let playListContextMenu = null
let playListItemsContextMenu = null

// ── 공유 재생 상태 (여러 파일이 읽고 씀) ─────────────────────────────────────
const playState = {
	// 뷰/컨텍스트
	currentViewContext: null,
	playContextMap: new Map(),
	playContextStack: [],
	viewContextStack: [],
	currentVideoClip: null,
	modePlayList: PLAYMODE_REPEAT_TRACK,
	// YouTube 플레이어
	playerLoaded: false,
	popupWnd: null,
	interval: null,
	playCounter: 0,
	testPlayerEndTime: -1,
	ReservedStartTime: undefined,
	ReservedVolume: undefined,
	LastVideoTime: 0,
	LastExecFinishVideoTime: 0,
}

// ── DOM 헬퍼 ─────────────────────────────────────────────────────────────────
function createSpan(element, style='') {
	let span = document.createElement('span')
	span.replaceChildren(element)
	span.style = style
	return span
}

// ── 모바일 감지 ───────────────────────────────────────────────────────────────
let isMobile = {
	Android: function() {
		return navigator.userAgent.match(/Android/i);
	},
	BlackBerry: function() {
		return navigator.userAgent.match(/BlackBerry/i);
	},
	iOS: function() {
		return navigator.userAgent.match(/iPhone|iPad|iPod/i);
	},
	Opera: function() {
		return navigator.userAgent.match(/Opera Mini/i);
	},
	Windows: function() {
		return navigator.userAgent.match(/IEMobile/i) || navigator.userAgent.match(/WPDesktop/i);
	},
	any: function() {
		return (isMobile.Android() || isMobile.BlackBerry() || isMobile.iOS() || isMobile.Opera() || isMobile.Windows());
	}
};
