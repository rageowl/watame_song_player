// playlist-ui.js - UI 뷰, 다이얼로그, 컨트롤 패널

function playList_getOrdinal(playList) {
	return playList.items.length == 0
		? ''
		: playListItem_getOrdinal(playList.items[0])
}
function playListItem_getOrdinal(item) {
	return item.data.type == 2
		? playList_getOrdinal(item.data)
		: item.data.ordinal
}
// ── 동적 패널 관리 ──────────────────────────────────────────────────────────────

let _panelIdCounter = 0

function panel_getCurrentContext(panel) {
	const stack = panel.viewContextStack
	return stack.length > 0 ? stack[stack.length - 1] : null
}

function panel_createHeaders(panel) {
	return [
		{ name:'', width:40, getter:function(d) {
			for (let i = 0; i < playState.playContextStack.length; ++i) {
				const ctx = playState.playContextStack[i]
				if (ctx.currentPlayingItem && d.key == ctx.currentPlayingItem.key) {
					return '\u25b6'
				}
			}
			const vStack = panel.viewContextStack
			if (vStack.length > 0 && vStack[vStack.length - 1].currentPlayingItem && d.key == vStack[vStack.length - 1].currentPlayingItem.key) {
				return '\u25b7'
			}
			return ''
		}},
		{ name:'Order', width:80, title:"Play Order", filter:true, sort:true, numeric:true, getter:function(d) {
			const vStack = panel.viewContextStack
			if (vStack.length == 0) return ''
			const ctx = vStack[vStack.length - 1]
			const idx = ctx.playOrderMap.get(d.key)
			return idx !== undefined ? idx + 1 : ''
		}},
		{ name:'Type', width:80, filter:true, sort:true, getter:function(d) { return d.data.type == 1 ? '🎶' : '📁' } },
		{ name:'Date', width:110, filter:true, sort:true, getter:function(d) { return d.data.date } },
		{ name:'Track Name', width:400, filter:true, sort:true, getter:function(d) { return d.data.trackName }, autoSize:true },
		{ name:'Original Artist', width:160, filter:true, sort:true, getter:function(d) { return d.data.originalArtist } },
		{ name:'Covered By', width:128, filter:true, sort:true, getter:function(d) { return d.data.coveredBy } },
		{ name:'Category', width:120, filter:true, sort:true, getter:function(d) { return d.data.category } },
		{ name:'ShufflePriority', width:150, filter:true, sort:true, numeric:true, getter:function(d) { return d.shufflePriority } },
		{ name:'Ordinal', width:88, id:'ordinal', filter:true, sort:true, numeric:true, getter:function(item) { return playListItem_getOrdinal(item) } },
	]
}

function panel_initTableHandlers(panel, table) {
	table.ondblclick = function(e) {
		playListItemsTable_playOrOpen(this.selectedDataKey, true)
	}
	table.onkeydown = function(e) {
		if (e.keyCode == 46) {
			playListItemsTable_deleteSelected()
		} else if (e.ctrlKey && e.keyCode == 67) {
			copySelectedItemsToClipboard(playListItemsTable)
		}
	}
	table.draggable = true
	table.ondragstart = function(e, dataKey) {
		let keys = playListItemsTable.selectedDataKeys
		let data = JSON.stringify(keys)
		e.dataTransfer.setData("wnfplayitem", data);
		e.dataTransfer.dropEffect = "move"
	}
	table.ondrop = function(e, dataKey, front) {
		e.preventDefault();
		const ctx = panel_getCurrentContext(panel)
		if (!ctx) return
		const playList = ctx.data
		let data
		if (data = e.dataTransfer.getData("wnfvideoclip")) {
			let keys = JSON.parse(data)
			if (keys.length == 0) {
				return
			}
			playListItemsTable.beginUpdate()
			for (let i = 0; i < keys.length; ++i) {
				let data = videoClipTable.getDataByKey(keys[i])
				let item = playList_insertItem(playList, data, dataKey, front)
				dataKey = item.key
				front = false
			}
			playListItemsTable.endUpdate()
			playListTable.updateList()
			videoClipTable.updateList()
			setDataChanged()
		} else if (data = e.dataTransfer.getData("wnfplayitem")) {
			let keys = JSON.parse(data)
			removeItemOnce(keys, dataKey)
			if (keys.length == 0) {
				return
			}
			playListItemsTable.beginUpdate()
			let deletedDataList = playListItemsTable.deleteDataByKeys(keys)
			playListItemsTable.insertDataList(deletedDataList, dataKey, front)
			playListItemsTable.endUpdate()
			setDataChanged()
		} else if (data = e.dataTransfer.getData("wnfplaylist")) {
			let keys = JSON.parse(data)
			if (keys.length == 0) {
				return
			}
			playListItemsTable.beginUpdate()
			for (let i = 0; i < keys.length; ++i) {
				let data = playListTable.getDataByKey(keys[i])
				let item = playList_insertItem(playList, data, dataKey, front)
				dataKey = item.key
				front = false
			}
			playListItemsTable.endUpdate()
			playListTable.updateList()
			videoClipTable.updateList()
			setDataChanged()
		}
		playListItemsTable_updatePlayOrder()
	}
	table.ondragover = function(e, dataKey) {
		let types = e.dataTransfer.types
		for (let i = 0; i < types.length; ++i) {
			if (types[i] == "wnfvideoclip" || types[i] == 'wnfplayitem' || types[i] == 'wnfplaylist') {
				e.preventDefault()
				return true
			}
		}
		return false
	}
	table.ondragenter = function(e, dataKey) {
		let types = e.dataTransfer.types
		for (let i = 0; i < types.length; ++i) {
			if (types[i] == "wnfvideoclip" || types[i] == 'wnfplayitem' || types[i] == 'wnfplaylist') {
				e.preventDefault()
				return
			}
		}
	}
	table.ondragleave = function(e, dataKey) {
		let types = e.dataTransfer.types
		for (let i = 0; i < types.length; ++i) {
			if (types[i] == "wnfvideoclip" || types[i] == 'wnfplayitem' || types[i] == 'wnfplaylist') {
				e.preventDefault()
				return
			}
		}
	}
	table.onSorted = function(t) {
		playListItemsTable_updatePlayOrder()
		setDataChanged()
	}
	table.oncontextmenu = function(event, d) {
		event.preventDefault()
		playListItemsContextMenu.show(event.clientX, event.clientY)
	}
}

function panel_create(playList) {
	const panelId = 'panel_' + (++_panelIdCounter)

	// 패널 외곽 div
	const panelDiv = document.createElement('div')
	panelDiv.style.cssText = 'flex: 1 1 500px; min-width: 300px; overflow: hidden; display: flex; flex-direction: column; margin-right: 4px; border: 1px solid #555;'

	// 타이틀 바
	const titleBar = document.createElement('div')
	titleBar.style.cssText = 'flex: none; display: flex; align-items: center; background: #446688; padding: 2px 4px; gap: 4px;'
	const pathEl = document.createElement('div')
	pathEl.style.cssText = 'flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 0.9em;'
	const closeBtn = document.createElement('button')
	closeBtn.textContent = '✕'
	closeBtn.style.cssText = 'flex: none; cursor: pointer; padding: 0 4px;'
	titleBar.appendChild(pathEl)
	titleBar.appendChild(closeBtn)

	// 테이블 컨테이너
	const tableContainer = document.createElement('div')
	tableContainer.style.cssText = 'flex: 1; overflow: hidden; display: flex;'
	const tableDiv = document.createElement('div')
	tableDiv.style.cssText = 'flex: 1; overflow: hidden;'
	tableContainer.appendChild(tableDiv)

	panelDiv.appendChild(titleBar)
	panelDiv.appendChild(tableContainer)

	// 테이블 생성
	const table = new MultiColumnList(tableDiv)
	table.selectMode = isMobile.any() != null
	table.mainDivClassName = 'tblWrap'
	table.headerDivClassName = 'userTblHead'
	table.bodyDivClassName = 'userTbl'

	const panel = {
		id: panelId,
		div: panelDiv,
		table: table,
		pathEl: pathEl,
		viewContextStack: [],
	}

	panel_initTableHandlers(panel, table)
	table.setHeader(panel_createHeaders(panel))

	// 클릭 시 활성화
	panelDiv.addEventListener('mousedown', function() {
		if (playState.activePanel !== panel) {
			panel_activate(panel)
		}
	})

	// 닫기 버튼
	closeBtn.onclick = function(e) {
		e.stopPropagation()
		panel_close(panel)
	}

	dynamicPanelsRow.appendChild(panelDiv)
	playState.openPanels.push(panel)

	return panel
}

function panel_close(panel) {
	panel.div.remove()
	const idx = playState.openPanels.indexOf(panel)
	if (idx >= 0) playState.openPanels.splice(idx, 1)

	if (playState.activePanel === panel) {
		const last = playState.openPanels[playState.openPanels.length - 1]
		if (last) {
			panel_activate(last)
		} else {
			playState.activePanel = null
			playListItemsTable = null
			playState.viewContextStack = []
			playState.currentViewContext = null
			updateDivVisible()
			refreshControlPanel()
		}
	}
}

function panel_activate(panel) {
	playState.activePanel = panel
	playListItemsTable = panel.table
	playState.viewContextStack = panel.viewContextStack
	playState.currentViewContext = panel.viewContextStack.length > 0
		? panel.viewContextStack[panel.viewContextStack.length - 1]
		: null

	// 활성 패널 강조
	for (let p of playState.openPanels) {
		p.div.style.outline = p === panel ? '2px solid #4af' : 'none'
	}

	// 글로벌 체크박스 동기화
	if (playState.currentViewContext) {
		const pl = playState.currentViewContext.data
		playList_checkBoxShuffle.checked = pl.shuffle
		playList_checkBoxPlayEntireList.checked = pl.entirePlay
	}

	updateDivVisible()
	refreshControlPanel()
}

// ── 패널 열기 ──────────────────────────────────────────────────────────────────

function playList_openInNewPanel(playList) {
	const panel = panel_create(playList)
	panel_activate(panel)
	array_clear(playState.viewContextStack)
	playList_push(playList)
}

function playList_open(playList) {
	if (!playState.activePanel) {
		const panel = panel_create(playList)
		panel_activate(panel)
	}
	array_clear(playState.viewContextStack)
	playList_push(playList)
}
function playList_selectAll() {
	playListTable.selectAll()
}
function playList_clearAll() {
	playListTable.clearSelection()
}
function playList_push(playList) {
	playState.viewContextStack.push(playContext_get(playList))
	playList_setPage(playList)
}
function playList_setPage(playList) {
	playState.currentViewContext = playContext_get(playList)
	playListItemsTable.setData(playList.items)
	playList_checkBoxShuffle.checked = playList.shuffle
	playList_checkBoxPlayEntireList.checked = playList.entirePlay
	playListTable.updateList()
	refreshControlPanel()
}
function playListTable_ForeachSelection(func) {
	let selectedDataKeys = playListTable.selectedDataKeys
	if (selectedDataKeys.length == 0) {
		return
	}
	for (let i = 0; i < selectedDataKeys.length; ++i) {
		let item = playListTable.getDataByKey(selectedDataKeys[i])
		func(item)
	}
	playListTable.updateList()
	refreshControlPanel()
	setDataChanged()
}
function playListItemsTable_ForeachSelection(func) {
	let selectedDataKeys = playListItemsTable.selectedDataKeys
	if (selectedDataKeys.length == 0) {
		return
	}
	for (let i = 0; i < selectedDataKeys.length; ++i) {
		let item = playListItemsTable.getDataByKey(selectedDataKeys[i])
		func(item)
	}
	playListItemsTable.updateList()
	refreshControlPanel()
	setDataChanged()
}
function playListTable_deleteSelected() {
	let selectedDataKeys = playListTable.selectedDataKeys
	if (selectedDataKeys.length == 0) {
		return
	}
	playListTable.beginUpdate()
	let dataList = playListTable.deleteSelection()
	for (let i = 0; i < dataList.length; ++i) {
		dataList[i].deleted = true
		playList_itemsDeleted(dataList[i].items)
		playState.playContextMap.delete(dataList[i].key)
	}
	playListTable.endUpdate()

	const playLists = playListTable.dataList
	for (let i = 0; i < playLists.length; ++i) {
		const items = playLists[i].items
		for (let j = items.length - 1; j >= 0; --j) {
			const item = items[j]
			if (item.data.deleted) {
				playList_itemsDeleted(item)
				items.splice(j, 1)
			}
		}
	}

	let deleted = false
	for (let i = 0; i < playState.viewContextStack.length; ++i) {
		if (playState.viewContextStack[i].data.deleted) {
			if (i > 0) {
				playState.viewContextStack.splice(i, playState.viewContextStack.length)
				const ctx = playState.viewContextStack[playState.viewContextStack.length - 1]
				playList_setPage(ctx.data)
				if (ctx.currentViewingItem && playListItemsTable) {
					playListItemsTable.selectedDataKey = ctx.currentViewingItem.key
				}
			} else {
				array_clear(playState.viewContextStack)
				playListItemsTable.setData([])
			}
			deleted = true
			break
		}
	}
	if (!deleted) {
		if (playListItemsTable) playListItemsTable.refreshList()
	}
	videoClipTable.updateList()

	for (let i = 0; i < playState.playContextStack.length; ++i) {
		if (playState.playContextStack[i].data.deleted) {
			common_stopVideo(false)
			break
		}
	}
	playListTable.focus()
	refreshControlPanel()
	setDataChanged()
}
function refreshControlPanel() {
	const sufflePlayList = playState.currentViewContext ? playState.currentViewContext.shuffled : false
	suffleIcon.style.opacity = sufflePlayList ? 1 : .4
	suffleButton.title = sufflePlayList ? 'shuffled' : 'not shuffled'
	if (playState.modePlayList == 0) {
		modeIcon.innerHTML = '🔁'
		modeIcon.style.opacity = .4
		modeButton.title = 'no repeat'
	} else if (playState.modePlayList == 1) {
		modeIcon.innerHTML = '🔁'
		modeIcon.style.opacity = 1
		modeButton.title = 'repeat track'
	} else if (playState.modePlayList == 2) {
		modeIcon.innerHTML = '🔂'
		modeIcon.style.opacity = 1
		modeButton.title = 'repeat video'
	}

	let isPlayingContext = false
	for (let i = 0; i < playState.playContextStack.length; ++i) {
		if (playState.playContextStack[i] == playState.currentViewContext) {
			isPlayingContext = true
			break
		}
	}
	if (isPlayingContext && playState.currentViewContext.currentPlayingItem) {
		const currentPlayingItem = playState.currentViewContext.currentPlayingItem
		const playOrder = playState.currentViewContext.playOrder
		const playOrderMap = playState.currentViewContext.playOrderMap
		const idx = playOrderMap.get(currentPlayingItem.key)
		currentOrder.innerHTML = '(' + (idx + 1) + ' / ' + playOrder.length + ')'
	} else {
		currentOrder.innerHTML = ''
	}

	if (playState.currentVideoClip) {
		currentSong.innerHTML = playState.currentVideoClip.trackName + ' / ' + playState.currentVideoClip.originalArtist
	} else {
		currentSong.innerHTML = ''
	}

	const pathEl = playState.activePanel ? playState.activePanel.pathEl : null
	if (pathEl) {
		pathEl.replaceChildren()
		const panel = playState.activePanel
		for (let i = 0; i < playState.viewContextStack.length; ++i) {
			if (i != 0) {
				const label = document.createElement('label')
				label.appendChild(document.createTextNode('->'))
				pathEl.appendChild(label)
			}
			let data = playState.viewContextStack[i].data
			let anchor = document.createElement('a')
			anchor.innerHTML = `[${data.trackName} / ${data.originalArtist}]`
			anchor.href = '#'
			anchor.onclick = (function(idx) {
				return function(e) {
					e.preventDefault()
					panel_activate(panel)
					if (panel.viewContextStack.length >= idx) {
						panel.viewContextStack.splice(idx, panel.viewContextStack.length)
						const ctx = panel.viewContextStack[panel.viewContextStack.length - 1]
						playList_setPage(ctx.data)
						if (ctx.currentViewingItem) {
							playListItemsTable.selectedDataKey = ctx.currentViewingItem.key
						}
					}
				}
			})(i + 1)
			pathEl.appendChild(anchor)
		}
	}

	//removeAllChildNodes(divPlayPath)
	divPlayPath.replaceChildren()
	for (let i = 0; i < playState.playContextStack.length; ++i) {
		if (i != 0) {
			const label = document.createElement('label')
			label.appendChild(document.createTextNode('->'))
			divPlayPath.appendChild(label)
		}
		let data = playState.playContextStack[i].data
		let anchor = document.createElement('a')
		anchor.innerHTML = `[${data.trackName} / ${data.originalArtist}]`
		anchor.href = '#'
		anchor.onclick = (function(idx) {
			return function(e) {
				e.preventDefault()
				playContext_copyFromPlay()
				if (playState.viewContextStack.length >= idx) {
					playState.viewContextStack.splice(idx, playState.viewContextStack.length)
					const ctx = playState.viewContextStack[playState.viewContextStack.length - 1]
					playList_setPage(ctx.data)
					if (ctx.currentViewingItem && playListItemsTable) {
						playListItemsTable.selectedDataKey = ctx.currentViewingItem.key
					}
				}
			}
		})(i + 1)
		divPlayPath.appendChild(anchor)
	}

	const useIndividualVolume = playState.currentVideoClip && individualVolumeMap.has(playState.currentVideoClip.key)
	individualVolume.checked = useIndividualVolume
	individualVolumeControl.disabled = !useIndividualVolume
	volumeText.innerHTML = volumeControl.value + "%"
	if (!useIndividualVolume) {
		individualVolumeControl.value = volumeControl.value
		individualVolumeText.innerHTML = volumeControl.value + "%"
	}
	refreshPlayButton()
}
function copySelectedItemsToClipboard(list, selectedColumnNames=null) {
	let keys = list.selectedDataKeys
	let headers = list.headers
	if (selectedColumnNames) {
		newHeaders = []
		for (let i = 0; i < selectedColumnNames.length; ++i) {
			for (let j = 0; j < headers.length; ++j) {
				if (headers[j].name == selectedColumnNames[i]) {
					newHeaders.push(headers[j]);
					break;
				}
			}
		}
		headers = newHeaders;
	}
	let text = ''
	for (let i = 0; i < keys.length; ++i) {
		let key = keys[i]
		let data = list.getDataByKey(key)
		for (let j = 0; j < headers.length; ++j) {
			if (j != 0) {
				text += '\t'
			}
			let header = headers[j]
			let value = header_getData(header, data)
			text += value
		}
		text += '\n'
	}
	if (text.length == 0) {
		return
	}
	navigator.clipboard.writeText(text).then(() => list.focus())
}
function playListItemsTable_selectAll() {
	playListItemsTable.selectAll()
}
function playListItemsTable_clearAll() {
	playListItemsTable.clearSelection()
}
function playList_onKeyDown() {
	if (event.keyCode == 46) {
		playListItemsTable_deleteSelected()
	} else {
		list_onKeyDown(playListItemsTable)
	}
}
function playListItemsTable_deleteSelected() {
	let selectedDataKeys = playListItemsTable.selectedDataKeys
	if (selectedDataKeys.length == 0) {
		return
	}
	playListItemsTable.beginUpdate()
	let items = playListItemsTable.deleteSelection()
	playList_itemsDeleted(items)
	updatePlayerOrder()
	playListItemsTable.endUpdate()
	playListTable.updateList()
	videoClipTable.updateList()

	for (let i = 0; i < playState.playContextStack.length; ++i) {
		const ctx = playState.playContextStack[i]
		if (ctx.currentPlayingItem && ctx.playOrderMap.get(ctx.currentPlayingItem.key) == undefined) {
			common_stopVideo()
			break
		}
	}
	playListItemsTable.focus()
	setDataChanged()
}
function playListItemsTable_deleteAll() {
	if (playState.playContextStack.length != 0) {
		common_stopVideo(false)
	}
	playState.currentViewContext.playOrder = []
	playState.currentViewContext.playOrderMap.clear()
	playList_itemsDeleted(playState.currentViewContext.data.items)
	array_clear(playState.currentViewContext.data.items)
	videoClipTable.updateList()
	playListItemsTable.refreshList()
	playListItemsTable.focus()
	refreshControlPanel()
	setDataChanged()
}
function updateDivVisible() {
	divTotallist.style.display = showTotallist.checked ? 'flex' : 'none'
	divPlaylistPanel.style.display = showPlaylist.checked ? 'flex' : 'none'
	const hasPanels = playState.openPanels.length > 0
	divPlaylistItemsControls.style.display = hasPanels ? 'flex' : 'none'
	dynamicPanelsRow.style.display = hasPanels ? 'flex' : 'none'
	divClipSpreadSheet.style.display = showClipTableURL.checked ? 'flex' : 'none'
	divTestClipTime.style.display = showTestClipTime.checked ? 'flex' : 'none'
}

function playListItemsTable_scrollToCurrent() {
	if (playListItemsTable && playState.currentViewContext && playState.currentViewContext.currentPlayingItem) {
		playListItemsTable.scrollToRowByDataKey(playState.currentViewContext.currentPlayingItem.key, true)
	}
}
function playList_newPanel() {
	playListDialog_Category.value = ''
	playListDialog_Date.value = date_today()
	playListDialog_TrackName.value = ''
	playListDialog_OriginalArtist.value = ''
	playListDialog_CoveredBy.value = ''
	playListDialog_cbShuffle.checked = false
	playListDialog_cbPlayEntireVideo.checked = false
	playListDialog.onclose = function() {
		if (playListDialog.returnValue == 'ok') {
			let playList = playList_new()
			playList.category = playListDialog_Category.value
			playList.date = playListDialog_Date.value
			playList.trackName = playListDialog_TrackName.value
			playList.originalArtist = playListDialog_OriginalArtist.value
			playList.coveredBy = playListDialog_CoveredBy.value
			playList.shuffle = playListDialog_cbShuffle.checked
			playList.entirePlay = playListDialog_cbPlayEntireVideo.checked
			makeSearchText(playList)
			playListTable.insertData(playList)
			playListTable.selectedDataKey = playList.key
			setDataChanged()
	}
	}
	if (typeof playListDialog.showModal === "function") {
		playListDialog.showModal();
	} else {
		alert("The <dialog> API is not supported by this browser");
	}
}
function playList_editPanel() {
	let data = playListTable.selectedData
	if (data) {
		playListDialog_Category.value = isUndefined(data.category, '')
		playListDialog_Date.value = isUndefined(data.date, '')
		playListDialog_TrackName.value = isUndefined(data.trackName, '')
		playListDialog_OriginalArtist.value = isUndefined(data.originalArtist, '')
		playListDialog_CoveredBy.value = isUndefined(data.coveredBy, '')
		playListDialog_cbShuffle.checked = isUndefined(data.shuffle, false)
		playListDialog_cbPlayEntireVideo.checked = isUndefined(data.entirePlay, false)
		playListDialog.onclose = function() {
			if (playListDialog.returnValue == 'ok') {
				data.category = playListDialog_Category.value
				data.date = playListDialog_Date.value
				data.trackName = playListDialog_TrackName.value
				data.originalArtist = playListDialog_OriginalArtist.value
				data.coveredBy = playListDialog_CoveredBy.value
				data.shuffle = playListDialog_cbShuffle.checked
				data.entirePlay = playListDialog_cbPlayEntireVideo.checked
				makeSearchText(data)
				playListTable.updateList()
				playListItemsTable.updateList()
				setDataChanged()
				playList_updateCheckboxes()
			}
		}
		if (typeof playListDialog.showModal === "function") {
			playListDialog.showModal();
		} else {
			alert("The <dialog> API is not supported by this browser");
		}
	}
}
function playList_clonePanel() {
	let data = playListTable.selectedData
	if (data) {
		playListDialog_Category.value = isUndefined(data.category, '')
		playListDialog_Date.value = isUndefined(data.date, '')
		playListDialog_TrackName.value = isUndefined(data.trackName, '')
		playListDialog_OriginalArtist.value = isUndefined(data.originalArtist, '')
		playListDialog_CoveredBy.value = isUndefined(data.coveredBy, '')
		playListDialog_cbShuffle.checked = isUndefined(data.shuffle, false)
		playListDialog_cbPlayEntireVideo.checked = isUndefined(data.entirePlay, false)
		playListDialog.onclose = function() {
			if (playListDialog.returnValue == 'ok') {
				let playList = playList_new()
				playList.category = playListDialog_Category.value
				playList.date = playListDialog_Date.value
				playList.trackName = playListDialog_TrackName.value
				playList.originalArtist = playListDialog_OriginalArtist.value
				playList.coveredBy = playListDialog_CoveredBy.value
				playList.shuffle = playListDialog_cbShuffle.checked
				playList.entirePlay = playListDialog_cbPlayEntireVideo.checked
				playList.items = data.items.slice()
				makeSearchText(playList)
				playListTable.insertData(playList)
				playListTable.selectedDataKey = playList.key
				setDataChanged()
			}
		}
		if (typeof playListDialog.showModal === "function") {
			playListDialog.showModal();
		} else {
			alert("The <dialog> API is not supported by this browser");
		}
	}
}
function isBoolean(val) {
   return val === false || val === true;
}
function Select_getBool(e) {
	let index = Number(e.selectedIndex)
	let value = e.options[index].value
	if (value.length == 0) {
		return null
	}
	let intValue = Number(value)
	return intValue != 0
}
function playListTable_modify() {
	let keys = playListTable.selectedDataKeys
	if (keys.length > 0) {
		modifyPlayListDialog_Shuffle.selectedIndex = 0
		modifyPlayListDialog_PlayEntireVideo.selectedIndex = 0
		modifyPlayListDialog.onclose = function() {
			if (modifyPlayListDialog.returnValue == 'ok') {
				let bShuffle = Select_getBool(modifyPlayListDialog_Shuffle)
				let bPlayEntireVideo = Select_getBool(modifyPlayListDialog_PlayEntireVideo)
				let bIsShuffleBool = isBoolean(bShuffle)
				let bIsPlayEntireVideoBool = isBoolean(bPlayEntireVideo)
				if (bIsShuffleBool || bIsPlayEntireVideoBool) {
					for (let i = 0; i < keys.length; ++i) {
						let data = playListTable.getDataByKey(keys[i])
						if (bIsShuffleBool) {
							data.shuffle = bShuffle
						}
						if (bIsPlayEntireVideoBool) {
							data.entirePlay = bPlayEntireVideo
						}
					}
					playListTable.updateList()
					setDataChanged()
					playList_updateCheckboxes()
				}
			}
		}
		if (typeof modifyPlayListDialog.showModal === "function") {
			modifyPlayListDialog.showModal();
		} else {
			alert("The <dialog> API is not supported by this browser");
		}
	}
}
function totalList_addToPlaylist(selected) {
	let keys = selected ? videoClipTable.selectedDataKeys.slice() : videoClipTable.copyDataOrder()
	if (keys.length == 0) {
		return
	}
	let itmeKeys = []
	playListItemsTable.beginUpdate()
	for (let i = 0; i < keys.length; ++i) {
		let data = videoClipTable.getDataByKey(keys[i])
		let item = playList_insertItem(null, data)
		itmeKeys.push(item.key)
	}
	playListItemsTable.endUpdate()
	videoClipTable.updateList()
	playListItemsTable.clearSelection()
	for (let i = 0; i < itmeKeys.length; ++i) {
		playListItemsTable.setDataRowSelection(itmeKeys[i], true)
	}
	setDataChanged()
}
function totalList_selectAll() {
	videoClipTable.selectAll()
}
function totalList_clearAll() {
	videoClipTable.clearSelection()
}
function totalList_modify() {
	let keys = videoClipTable.selectedDataKeys
	if (keys.length > 0) {
		modifyVideoClipDialog_IndividualVolume.value = '0'
		modifyVideoClipDialog.onclose = function() {
			if (modifyVideoClipDialog.returnValue == 'ok') {
				let volume = Number(modifyVideoClipDialog_IndividualVolume.value)
				if (volume == 0) {
					for (let i = 0; i < keys.length; ++i) {
						individualVolumeMap.delete(keys[i])
					}
				} else {
					for (let i = 0; i < keys.length; ++i) {
						individualVolumeMap.set(keys[i], volume)
					}
				}
				videoClipTable.updateList()
				volume_save()
			}
		}
		if (typeof modifyVideoClipDialog.showModal === "function") {
			modifyVideoClipDialog.showModal();
		} else {
			alert("The <dialog> API is not supported by this browser");
		}
	}
}
function totalList_makePlayListPanel(selectedClip) {
	let keys = selectedClip ? videoClipTable.selectedDataKeys.slice() : videoClipTable.copyDataOrder()
	if (keys.length == 0) {
		return
	}
	playListDialog_Category.value = ''
	playListDialog_Date.value = date_today()
	playListDialog_TrackName.value = ''
	playListDialog_OriginalArtist.value = ''
	playListDialog_CoveredBy.value = ''
	playListDialog_cbShuffle.checked = false
	playListDialog_cbPlayEntireVideo.checked = false

	const commonCategory = 'Various Category'
	const commonTrackName = 'Various Track'
	const commonOriginalArtist = 'Various Artist'
	const commonCoveredBy = 'Various Artist'

	let items = videoClipTable.getDataByKey(keys)
	for (let i = 0; i < items.length; ++i) {
		const item = items[i]
		playListDialog_Category.value = totalList_selectRepresentText(playListDialog_Category.value, item.category, commonCategory)
		playListDialog_TrackName.value = totalList_selectRepresentText(playListDialog_TrackName.value, item.trackName, commonTrackName)
		playListDialog_OriginalArtist.value = totalList_selectRepresentText(playListDialog_OriginalArtist.value, item.originalArtist, commonOriginalArtist)
		playListDialog_CoveredBy.value = totalList_selectRepresentText(playListDialog_CoveredBy.value, item.coveredBy, commonCoveredBy)
	}

	playListDialog.onclose = function() {
		if (playListDialog.returnValue == 'ok') {
			let playList = playList_new()
			playList.category = playListDialog_Category.value
			playList.date = playListDialog_Date.value
			playList.trackName = playListDialog_TrackName.value
			playList.originalArtist = playListDialog_OriginalArtist.value
			playList.coveredBy = playListDialog_CoveredBy.value
			playList.shuffle = playListDialog_cbShuffle.checked;
			playList.entirePlay = playListDialog_cbPlayEntireVideo.checked;

			for (let i = 0; i < keys.length; ++i) {
				let data = videoClipTable.getDataByKey(keys[i])
				playList_insertItem(playList, data)
			}

			makeSearchText(playList)
			playListTable.insertData(playList)
			playListTable.selectedDataKey = playList.key
			videoClipTable.updateList()
			setDataChanged()
		}
	}
	if (typeof playListDialog.showModal === "function") {
		playListDialog.showModal();
	} else {
		alert("The <dialog> API is not supported by this browser");
	}
}
function totalList_makeGroupedPlayListPanel(selectedClip) {
	totalListHeaderSelect_cbCategory.checked = true
	totalListHeaderSelect_cbDate.checked = true
	totalListHeaderSelect_cbTitle.checked = true
	totalListHeaderSelect_cbOriSinger.checked = true
	totalListHeaderSelect_cbSinger.checked = true
	totalListHeaderSelect_cbShuffle.checked = true
	totalListHeaderSelect_cbPlayEntireVideo.checked = false
	totalListHeaderSelect_cbAppendIfExists.checked = false
	totalListHeaderSelect_cbAppendToFront.checked = true
	totalListHeaderSelect_cbAppendToFront.disabled = true
	totalListHeaderSelect_CommonCategory.value = "Various Category"
	totalListHeaderSelect_CommonTrackName.value = "Various Track"
	totalListHeaderSelect_CommonOriginalArtist.value = "Various Artist"
	totalListHeaderSelect_CommonCoveredBy.value = "Various Artist"
	totalListHeaderSelectDialog.onclose = function() {
		if (totalListHeaderSelectDialog.returnValue == 'ok') {
			const headerNames = []
			if (totalListHeaderSelect_cbCategory.checked) {
				headerNames.push('category')
			}
			if (totalListHeaderSelect_cbDate.checked) {
				headerNames.push('date')
			}
			if (totalListHeaderSelect_cbTitle.checked) {
				headerNames.push('trackName')
			}
			if (totalListHeaderSelect_cbOriSinger.checked) {
				headerNames.push('originalArtist')
			}
			if (totalListHeaderSelect_cbSinger.checked) {
				headerNames.push('coveredBy')
			}

			if (headerNames.length == 0) {
				return
			}
			const headers = videoClipTable.selectHeader(headerNames)
			if (headers.length == 0) {
				return
			}
			const shuffle = totalListHeaderSelect_cbShuffle.checked
			const playEntireVideo = totalListHeaderSelect_cbPlayEntireVideo.checked
			const commonCategory = totalListHeaderSelect_CommonCategory.value
			const commonTrackName = totalListHeaderSelect_CommonTrackName.value
			const commonOriginalArtist = totalListHeaderSelect_CommonOriginalArtist.value
			const commonCoveredBy = totalListHeaderSelect_CommonCoveredBy.value
			let option = {
				selectedClip : selectedClip,
				shuffle : shuffle,
				playEntireVideo : playEntireVideo,
				appendIfExists : totalListHeaderSelect_cbAppendIfExists.checked,
				appendtoFront : totalListHeaderSelect_cbAppendToFront.checked,
				commonTextMap : { category:commonCategory, trackName:commonTrackName, originalArtist:commonOriginalArtist, coveredBy:commonCoveredBy },
			}
			const playListData = totalList_makeGroupedPlayList(headers, option)
			if (playListData.length) {
				playListTable.clearSelection()
				playListTable.insertDataList(playListData)
				for (let i = 0; i < playListData.length; ++i) {
					playListTable.setDataRowSelection(playListData[i].key, true)
				}
				playListTable.scrollToRowByDataKey(playListData[0].key, true)
			} else {
				playListTable.updateList()
			}
			videoClipTable.updateList()
			setDataChanged()
		}
	}
	if (typeof totalListHeaderSelectDialog.showModal === "function") {
		totalListHeaderSelectDialog.showModal();
	} else {
		alert("The <dialog> API is not supported by this browser");
	}
}
function totalList_selectRepresentText(a, b, def) {
	if (a == b) {
		return a
	}
	if (a == null || a == '') {
		return b
	}
	return def
}
function totalList_selectRepresentDate(a, b) {
	if (a == null) {
		return b
	}
	if (a < b) {
		return b
	}
	return a
}
function dataList_groupBy(dataList, headers) {
	let groupMap = new Map()
	for (let i = 0; i < dataList.length; ++i) {
		let data = dataList[i]
		let key = ''
		for (let j = 0; j < headers.length; ++j) {
			if (j != 0) {
				key += '|'
			}
			key += header_getData(headers[j], data)
		}
		let items = groupMap.get(key)
		if (!items) {
			items = []
			groupMap.set(key, items)
		}
		items.push(data)
	}
	return groupMap
}
function totalList_makeGroupedPlayList(headers, options) {
	let dataList = []
	let dataOrder = options.selectedClip ? videoClipTable.selectedDataKeys : videoClipTable.copyDataOrder()
	for (let i = 0; i < dataOrder.length; ++i) {
		dataList.push(videoClipTable.getDataByKey(dataOrder[i]))
	}
	return makeGroupedPlayListByDataList(dataList, headers, options)
}
function makeGroupedPlayListByDataList(dataList, headers, options) {
	let dataGroup = dataList_groupBy(dataList, headers)
	let playListGroup = dataList_groupBy(playListTable.dataList, headers)

	let playListItems = []
	const shuffle = options.shuffle
	const playEntireVideo = options.playEntireVideo
	const appendIfExists = options.appendIfExists
	const appendtoFront = options.appendtoFront
	const commonTextMap = options.commonTextMap
	let commonCategory = isUndefined(commonTextMap.category, 'Various Category')
	let commonTrackName = isUndefined(commonTextMap.trackName, 'Various Track')
	let commonOriginalArtist = isUndefined(commonTextMap.originalArtist, 'Various Artist')
	let commonCoveredBy = isUndefined(commonTextMap.coveredBy, 'Various Artist')
	for (let kv of dataGroup) {
		let key = kv[0]
		let items = kv[1]

		if (appendIfExists) {
			let playLists = playListGroup.get(key)
			if (playLists) {
				for (let i = 0; i < playLists.length; ++i) {
					let playList = playLists[i]
					playList_insertItems(playList, items, null, appendtoFront)
					for (let i = 0; i < items.length; ++i) {
						const item = items[i]
						playList.date = totalList_selectRepresentDate(playList.date, item.date)
					}
				}
				continue
			}
		}

		let subplayList = playList_new()
		subplayList.category = null
		subplayList.trackName = null
		subplayList.originalArtist = null
		subplayList.coveredBy = null
		subplayList.date = null
		subplayList.shuffle = shuffle
		subplayList.entirePlay = playEntireVideo
		for (let i = 0; i < items.length; ++i) {
			const item = items[i]
			playList_newItem(subplayList, item, 0)
			subplayList.category = totalList_selectRepresentText(subplayList.category, item.category, commonCategory)
			subplayList.trackName = totalList_selectRepresentText(subplayList.trackName, item.trackName, commonTrackName)
			subplayList.originalArtist = totalList_selectRepresentText(subplayList.originalArtist, item.originalArtist, commonOriginalArtist)
			subplayList.coveredBy = totalList_selectRepresentText(subplayList.coveredBy, item.coveredBy, commonCoveredBy)
			subplayList.date = totalList_selectRepresentDate(subplayList.date, item.date)
		}
		makeSearchText(subplayList)
		playListItems.push(subplayList)
	}
	return playListItems
}
