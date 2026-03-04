// ── 초기 데이터 (Google Charts 로드 전 필요) ──────────────────────────────────
var playListData = undefined
var individualVolumeData = undefined
const SheetHeader = "http://spreadsheets.google.com/tq?key="
let defaultClipSpreadSheetURL = ['1vpbCjP0UorTAiEHx9sOTGF1oNfpwW1jIZ6v1npQExEk']
var settingsData = { clipSpreadSheetURL:defaultClipSpreadSheetURL }
let videoClipList = []

// ── 플레이어 상태 ─────────────────────────────────────────────────────────────
let popupWnd = null
let playerLoaded = false
let videoClipMap = new Map()
const videoWidth = 800
const videoHeight = 450

// ── 재생 모드 상수 ────────────────────────────────────────────────────────────
const PLAYMODE_NORMAL = 0
const PLAYMODE_REPEAT_TRACK = 1
const PLAYMODE_REPEAT_ONE = 2
let modePlayList = PLAYMODE_REPEAT_TRACK

// ── 재생 컨텍스트 ─────────────────────────────────────────────────────────────
let currentViewContext = null
let playContextMap = new Map()
let playContextStack = []
let viewContextStack = []
let currentVideoClip = null
let individualVolumeMap = new Map()

// ── 재생 시퀀스 카운터 ────────────────────────────────────────────────────────
let playListSN = 1
let nextPlayItemSN = 1
let interval = null
let playCounter = 0
let testPlayerEndTime = -1
let ReservedStartTime = undefined
let LastVideoTime = 0
let LastExecFinishVideoTime = 0

// ── UI 상태 ───────────────────────────────────────────────────────────────────
let dataChanged = false
let totalListContextMenu = null
let playListContextMenu = null
let playListItemsContextMenu = null
let spreadsheetsFormList = []
let isLoading = false
var ReservedVolume = undefined

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
