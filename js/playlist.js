function makeSearchText(value) {
	value.searchTexts = [isUndefined(value.category, ''), isUndefined(value.date, ''), isUndefined(value.trackName, ''), isUndefined(value.originalArtist, ''), isUndefined(value.coveredBy, '')]
	value.searchLowerCaseTexts = []
	for (let i = 0; i < value.searchTexts.length; ++i) {
		value.searchLowerCaseTexts.push(value.searchTexts[i].toLowerCase())
	}
}
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
function playList_open(playList) {
	array_clear(viewContextStack)
	playList_push(playList)
}
function playList_selectAll() {
	playListTable.selectAll()
}
function playList_clearAll() {
	playListTable.clearSelection()
}
function playList_push(playList) {
	viewContextStack.push(playContext_get(playList))
	playList_setPage(playList)
}
function playList_setPage(playList) {
	currentViewContext = playContext_get(playList)
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
		playContextMap.delete(dataList[i].key)
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
	for (let i = 0; i < viewContextStack.length; ++i) {
		if (viewContextStack[i].data.deleted) {
			if (i > 0) {
				viewContextStack.splice(i, viewContextStack.length)
				const ctx = viewContextStack[viewContextStack.length - 1]
				playList_setPage(ctx.data)
				playListItemsTable.selectedDataKey = ctx.currentViewingItem.key
			} else {
				array_clear(viewContextStack)
				playListItemsTable.setData([])
			}
			deleted = true
			break
		}
	}
	if (!deleted) {
		playListItemsTable.refreshList()
	}
	videoClipTable.updateList()
	
	for (let i = 0; i < playContextStack.length; ++i) {
		if (playContextStack[i].data.deleted) {
			common_stopVideo(false)
			break
		}
	}
	playListTable.focus()
	refreshControlPanel()
	setDataChanged()
}
function playListTable_deleteAll(bSave = true) {
	if (playContextStack.length != 0) {
		common_stopVideo(false)
	}
	
	playListTable.setData([])
	playListItemsTable.setData([])
	playContextMap.clear()
	array_clear(playContextStack)
	array_clear(viewContextStack)
	for (let i = 0; i < videoClipList.length; ++i) {
		videoClipList[i].refCount = 0
	}
	videoClipTable.updateList()
	refreshControlPanel()
	if (bSave) {
		setDataChanged()
	}
}
function playContext_get(playList) {
	let ctx = playContextMap.get(playList.key)
	if (!ctx) {
		ctx = { data:playList, currentPlayingItem:undefined, currentViewingItem:undefined, playOrder:[], playOrderMap:new Map(), shuffled:false }
		playContext_resetPlayOrder(ctx)
		if (playList.shuffle) {
			ctx.shuffled = true
			playContext_shufflePlayOrder(ctx)
		}
		playContextMap.set(playList.key, ctx)
	}
	return ctx
}
function setDataChanged() {
	dataChanged = true
	playList_save()
}
function settings_getJson() {
	let newClipSpreadSheetURL = []
	for (let i = 0; i < spreadsheetsFormList.length; ++i) {
		const value = spreadsheetsFormList[i].value
		if (value.length == 0) {
			continue
		}
		newClipSpreadSheetURL.push(value)
	}
	let settings = {}
	if (newClipSpreadSheetURL.length == 0) {
		newClipSpreadSheetURL = defaultClipSpreadSheetURL
	}
	settings.clipSpreadSheetURL = newClipSpreadSheetURL
	return settings
}
function settings_save() {
	localStorage.setItem("watamePlayer_settings", JSON.stringify(settings_getJson()))
	playListTable_deleteAll(false)
	readData();
}
function settings_newURL() {
	settings_AddURL('')
}
function playList_new() {
	let key = Date.now() * 1000 + (playListSN++ % 1000)
	const item = { type:2, key:key.toString(16), items:[], category:"", trackName:"", originalArtist:"", coveredBy:"", date:'', shuffle:true, entirePlay:false, refCount:0 }
	makeSearchText(item)
	return item
}
function playList_load(data) {
	const item = { type:2, key:data.key, items:[], category:data.category, trackName:data.trackName, originalArtist:data.originalArtist, coveredBy:data.coveredBy, date:data.date, shuffle:data.shuffle, entirePlay:data.entirePlay, refCount:0 }
	if (item.singer == undefined) {
		item.singer = ''
	}
	makeSearchText(item)
	return item
}
function refreshControlPanel() {
	const sufflePlayList = currentViewContext ? currentViewContext.shuffled : false
	suffleIcon.style.opacity = sufflePlayList ? 1 : .4
	suffleButton.title = sufflePlayList ? 'shuffled' : 'not shuffled'
	if (modePlayList == 0) {
		modeIcon.innerHTML = '🔁'
		modeIcon.style.opacity = .4
		modeButton.title = 'no repeat'
	} else if (modePlayList == 1) {
		modeIcon.innerHTML = '🔁'
		modeIcon.style.opacity = 1
		modeButton.title = 'repeat track'
	} else if (modePlayList == 2) {
		modeIcon.innerHTML = '🔂'
		modeIcon.style.opacity = 1
		modeButton.title = 'repeat video'
	}

	let isPlayingContext = false
	for (let i = 0; i < playContextStack.length; ++i) {
		if (playContextStack[i] == currentViewContext) {
			isPlayingContext = true
			break
		}
	}
	if (isPlayingContext && currentViewContext.currentPlayingItem) {
		const currentPlayingItem = currentViewContext.currentPlayingItem
		const playOrder = currentViewContext.playOrder
		const playOrderMap = currentViewContext.playOrderMap
		const idx = playOrderMap.get(currentPlayingItem.key)
		currentOrder.innerHTML = '(' + (idx + 1) + ' / ' + playOrder.length + ')'
	} else {
		currentOrder.innerHTML = ''
	}

	if (currentVideoClip) {
		currentSong.innerHTML = currentVideoClip.trackName + ' / ' + currentVideoClip.originalArtist
	} else {
		currentSong.innerHTML = ''
	}
	
	//removeAllChildNodes(divViewPath)
	divViewPath.replaceChildren()
	for (let i = 0; i < viewContextStack.length; ++i) {
		if (i != 0) {
			const label = document.createElement('label')
			label.appendChild(document.createTextNode('->'))
			divViewPath.appendChild(label)
		}
		let data = viewContextStack[i].data
		let anchor = document.createElement('a')
		anchor.innerHTML = `[${data.trackName} / ${data.originalArtist}]`
		anchor.href = '#'
		anchor.onclick = function(e) {
			e.preventDefault()
			const idx = i + 1
			if (viewContextStack.length >= idx) {
				viewContextStack.splice(idx, viewContextStack.length)
				const ctx = viewContextStack[viewContextStack.length - 1]
				playList_setPage(ctx.data)
				playListItemsTable.selectedDataKey = ctx.currentViewingItem.key
			}
		}
		divViewPath.appendChild(anchor)
	}
	
	//removeAllChildNodes(divPlayPath)
	divPlayPath.replaceChildren()
	for (let i = 0; i < playContextStack.length; ++i) {
		if (i != 0) {
			const label = document.createElement('label')
			label.appendChild(document.createTextNode('->'))
			divPlayPath.appendChild(label)
		}
		let data = playContextStack[i].data
		let anchor = document.createElement('a')
		anchor.innerHTML = `[${data.trackName} / ${data.originalArtist}]`
		anchor.href = '#'
		anchor.onclick = function(e) {
			e.preventDefault()
			playContext_copyFromPlay()
			const idx = i + 1
			if (viewContextStack.length >= idx) {
				viewContextStack.splice(idx, viewContextStack.length)
				const ctx = viewContextStack[viewContextStack.length - 1]
				playList_setPage(ctx.data)
				playListItemsTable.selectedDataKey = ctx.currentViewingItem.key
			}
		}
		divPlayPath.appendChild(anchor)
	}				
	
	const useIndividualVolume = currentVideoClip && individualVolumeMap.has(currentVideoClip.key)
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
	const t = document.createElement("textarea");
	document.body.appendChild(t);
	t.value = text;
	t.select();
	document.execCommand('copy');
	document.body.removeChild(t);
	list.focus()
}
function playList_newItem(playList, data, shufflePriority) {
	let newKey = nextPlayItemSN++
	let item = { key:newKey, playList:playList, data:data, shufflePriority:isUndefined(shufflePriority, 0) }
	++data.refCount
	playList.items.push(item)
	return item
}
function playList_insertItem(playList, data, atDataKey=null, front=false) {
	let newKey = nextPlayItemSN++
	if (playList == null) {
		playList = currentViewContext.data
	}
	let item = { key:newKey, playList:playList, data:data, shufflePriority:0 }
	++data.refCount

	if (currentViewContext.data == playList) {
		let ctx = currentViewContext
		const playOrder = ctx.playOrder
		const playOrderMap = ctx.playOrderMap
		playOrderMap.set(item.key, playOrder.length)
		playOrder.push(item)
		playListItemsTable.insertData(item, atDataKey, front)
	} else {
		let ctx = playContext_get(playList)
		if (atDataKey != null) {
			const idx = playList.items.indexOf(atDataKey)
			if (idx == -1 || front) {
				playList.items.splice(idx, 0, item)
			} else {
				playList.items.splice(idx + 1, 0, item)
			}
		} else {
			playList.items.push(item)
		}
		const playOrder = ctx.playOrder
		const playOrderMap = ctx.playOrderMap
		playOrderMap.set(item.key, playOrder.length)
		playOrder.push(item)
	}
	
	return item
}
function playList_insertItems(playList, datas, atDataKey=null, front=false) {
	if (playList == null) {
		playList = currentViewContext.data
	}
	let items = []
	for (let i = 0; i < datas.length; ++i) {
		let data = datas[i]
		items.push({ key:nextPlayItemSN++, playList:playList, data:data, shufflePriority:0 })
		++data.refCount
		}
	
	if (currentViewContext.data == playList) {
		let ctx = currentViewContext
		const playOrder = ctx.playOrder
		const playOrderMap = ctx.playOrderMap
		playOrderMap.set(item.key, playOrder.length)
		playOrder.push(item)
		playListItemsTable.insertDataList(items, atDataKey, front)
	} else {
		let ctx = playContext_get(playList)
		if (atDataKey != null) {
			const idx = playList.items.indexOf(atDataKey)
			if (idx == -1) {
				for (let i = 0; i < items.length; ++i) {
					playList.items.push(items[i])
				}
			} else if (front) {
				for (let i = 0; i < items.length; ++i) {
					playList.items.splice(idx + i, 0, items[i])
				}
			} else {
				for (let i = 0; i < items.length; ++i) {
					playList.items.splice(idx + i + 1, 0, items[i])
				}
			}
		} else if (front) {
			for (let i = 0; i < items.length; ++i) {
				playList.items.splice(i, 0, item)
			}						
		} else {
			for (let i = 0; i < items.length; ++i) {
				playList.items.push(items[i])
			}
		}
		const playOrder = ctx.playOrder
		const playOrderMap = ctx.playOrderMap
		playOrderMap.set(item.key, playOrder.length)
		playOrder.push(item)
	}
	return item
}
function playList_insertItems(playList, mayDataList, atDataKey=null, front=false) {
	let ctx = currentViewContext
	let currentPlayList = currentViewContext.data
	if (playList == null) {
		playList = currentPlayList
	}
	let items = []
	if (Array.isArray(mayDataList)) {
		for (let i = 0; i < mayDataList.length; ++i) {
			let data = mayDataList[i]
			items.push({ key:nextPlayItemSN++, playList:playList, data:data, shufflePriority:0 })
			++data.refCount
			}
	} else {
		items.push({ key:nextPlayItemSN++, playList:playList, data:mayDataList, shufflePriority:0 })
		++mayDataList.refCount
	}
	
	if (currentPlayList == playList) {
		const playOrder = ctx.playOrder
		const playOrderMap = ctx.playOrderMap
		for (let i = 0; i < items.length; ++i) {
			const item = items[i]
			playOrderMap.set(item.key, playOrder.length)
			playOrder.push(item)
		}
		playListItemsTable.insertDataList(items, atDataKey, front)
	} else {
		if (atDataKey != null) {
			const idx = playList.items.indexOf(atDataKey)
			if (idx == -1) {
				for (let i = 0; i < items.length; ++i) {
					playList.items.push(items[i])
				}
			} else if (front) {
				for (let i = 0; i < items.length; ++i) {
					playList.items.splice(idx + i, 0, items[i])
				}
			} else {
				for (let i = 0; i < items.length; ++i) {
					playList.items.splice(idx + i + 1, 0, items[i])
				}
			}
		} else if (front) {
			for (let i = 0; i < items.length; ++i) {
				playList.items.splice(i, 0, items[i])
			}						
		} else {
			for (let i = 0; i < items.length; ++i) {
				playList.items.push(items[i])
			}
		}
		ctx = playContext_get(playList)
		const playOrder = ctx.playOrder
		const playOrderMap = ctx.playOrderMap
		for (let i = 0; i < items.length; ++i) {
			const item = items[i]
			playOrderMap.set(item.key, playOrder.length)
			playOrder.push(item)
		}
	}
	return items
}
function playList_itemsDeleted(items) {
	if (Array.isArray(items)) {
		for (let i = 0; i < items.length; ++i) {
			--items[i].data.refCount
		}
	} else {
		--items.data.refCount
	}
}
function removeItemOnce(arr, value) {
	let index = arr.indexOf(value);
	if (index > -1) {
		arr.splice(index, 1);
	}
	return index;
}
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
function common_pauseVideo(refresh = true) {
	playButton.innerText = '\u25b6'
	if (playerLoaded) {
		player.pauseVideo()
		}
	if (popupWnd) {
		popupWnd.close()
		popupWnd = null
	}
	if (interval) {
		clearInterval(interval)
		interval = null
	}
	if (refresh) {
		refreshControlPanel()
}
}
function common_stopVideo(refresh = true) {
	for (let i = 0; i < playContextStack.length; ++i) {
		playContextStack[i].currentPlayingItem = undefined
	}
	array_clear(playContextStack)
	currentVideoClip = null
	if (playerLoaded) {
		player.stopVideo()
	}
	common_pauseVideo(refresh)
}
function player_getVolume() {
	return ReservedVolume != undefined
	? ReservedVolume
	: playerLoaded
		? player.getVolume()
		: 100
}
function getLink(value) {
	let start = getSeconds(value.start, 0)
	//*/
	let url = ["https://www.youtube.com/watch?v=", value.ID]
	if (start > 0) {
		url.push("&t=", start)
	}
	/*/
	let url = ["https://www.youtube.com/embed/", value.ID, "?autoplay=1"]
	if (start > 0) {
		url.push("&start=", start)
	}
	let endtime = getSeconds(value.end, 0)
	if (endtime > 0) {
		url.push("&end=", endtime)
	}
	//*/
	return url.join('')
}
function openWindow(value) {
	let url = getLink(value)
	
	let viewportOffset = divPlayer.getBoundingClientRect()
	return window.open(url, '_blank', 'width=' + videoWidth + ',height=' + videoHeight + ',top=' + (viewportOffset.top + 108) + ',left=' +viewportOffset.left)
}
function tempAlert(msg,duration) {
	let el = document.createElement("div");
	el.setAttribute("style","position:absolute;top:40%;left:20%;width:300;height:100;background-color:yellow;text-align:center;");
	el.innerHTML = "<h3>" + msg + "</h3>"
	setTimeout(function(){
		el.parentNode.removeChild(el);
	},duration);
	document.body.appendChild(el);
}
function player_getPlayerState() {
	return playerLoaded ? player.getPlayerState() : YT.PlayerState.ENDED
}
function refreshPlayButton() {
	if (popupWnd) {
		if (!playButton.wnd) {
			playButton.wnd = true
			playButton.innerHTML = '\u23f9'
			playButton.title = 'Stop'
		}
	} else {
		let state = player_getPlayerState()
		if (playButton.state != state) {
			playButton.state = state
			if (state == YT.PlayerState.PLAYING) {
				playButton.innerHTML = '\u23f8'
				playButton.title = 'Pause'
			} else {
				playButton.innerText = '\u25b6'
				playButton.title = 'Play'
			}
			playButton.wnd = false
		}
	}
}
function playListItemsTable_selectAll() {
	playListItemsTable.selectAll()
}
function playListItemsTable_clearAll() {
	playListItemsTable.clearSelection()
}
function playListItemsTable_play(dataKey) {
	let dataIndex = playListItemsTable.getDataIndexByKey(dataKey)
	//console.log(dataKey, dataIndex)
	if (dataIndex == -1) {
		common_stopVideo()
		return
	}

	const playItem = playListItemsTable.getData(dataIndex)
	playListItems_play(playItem)
}
function playList_getItem(playList, key) {
	for (let i = 0; i < playList.items.length; ++i) {
		const item = playList.items[i]
		if (item.key == key) {
			return item
		}
	}
	return null
}
function playContext_copyFromView() {
	playContextStack = viewContextStack.slice()
	for (let i = 0; i < playContextStack.length; ++i) {
		playContextStack[i].currentPlayingItem = playContextStack[i].currentViewingItem
	}
}
function playContext_copyFromPlay() {
	viewContextStack = playContextStack.slice()
	for (let i = 0; i < viewContextStack.length; ++i) {
		viewContextStack[i].currentViewingItem = viewContextStack[i].currentPlayingItem
	}
}
function playListItems_play(playItem) {
	const playList = playItem.playList
	const ctx = playContext_get(playList)
	const data = playList.data
	
	playContext_copyFromView()
	ctx.currentPlayingItem = playItem
	playContext_play_r(ctx)
}
function playContext_getCurrentPlayKey(ctx) {
	if (ctx.currentPlayingItem == undefined) {
		ctx.currentPlayingItem = ctx.playOrder[0]
	}
	return ctx.currentPlayingItem.key
}
function playContext_getCurrentViewKey(ctx) {
	if (ctx.currentViewingItem == undefined) {
		ctx.currentViewingItem = ctx.playOrder[0]
	}
	return ctx.currentViewingItem.key
}
function playContext_play_r(ctx) {
	const key = playContext_getCurrentPlayKey(ctx)
	const data = playList_getItem(ctx.data, key).data
	if (data.type == 1) {
		playVideoData(data)
	} else if (data.type == 2) {
		const ctx = playContext_get(data)
		if (playContextStack.indexOf(ctx) != -1) {
			return false
		}
		if (ctx.playOrder.length == 0) {
			return false
		}
		playContextStack.push(ctx)
		return playContext_play_r(ctx)
	}
	return true
}
function playListItemsTable_playOrOpen(dataKey, doPlay) {
	let dataIndex = playListItemsTable.getDataIndexByKey(dataKey)
	//console.log(dataKey, dataIndex)
	if (dataIndex == -1) {
		return
	}

	const playItem = playListItemsTable.getData(dataIndex)				
	const playList = playItem.playList
	const ctx = playContext_get(playList)
	const data = playList.data
	
	if (viewContextStack.length) {
		let lastCtx = viewContextStack[viewContextStack.length - 1]
		if (ctx != lastCtx) {
			return
		}
	} else {
		return
	}
	ctx.currentViewingItem = playItem
	playContext_playOrOpen_r(ctx, doPlay)
}
function playContext_playOrOpen_r(ctx, doPlay) {
	const key = playContext_getCurrentViewKey(ctx)
	const data = playList_getItem(ctx.data, key).data
	if (data.type == 1) {
		if (doPlay) {
			playContext_copyFromView()
			playVideoData(data)
		}
	} else if (data.type == 2) {
		const ctx = playContext_get(data)
		if (viewContextStack.indexOf(ctx) != -1) {
			return false
		}
		playList_push(data)
		return true
	}
	return true
}

function playVideoData(data) {
	if (!data) {
		common_stopVideo()
		return
	}
	
	if (popupWnd) {
		popupWnd.close()
		popupWnd = null
	}
	if (interval) {
		clearInterval(interval)
		interval = null
	}
	
	let volume = Number(volumeControl.value)
	//console.log('volumeControl:' + volume)
	let relVolume = individualVolumeMap.get(data.key)
	if (relVolume != undefined) {
		volume += relVolume
	}
	if (player_getVolume() != volume) {
		//console.log('setVolume:' + volume + ';relVolume:' + relVolume)
		player.setVolume(volume)
	}
	
	currentVideoClip = data
	let beginTime = Date.now()
	console.log('[' + beginTime + ']playVideoData: ' + currentVideoClip.key)
	TestClipTime_Start.value = data.start
	if (data.start.length == 0)
	{
		TestClipTime_Start.placeholder = "00:00:00"
	}
	TestClipTime_End.value = data.end
	let startTime = getSeconds(data.start, 0)
	let endtime = getSeconds(data.end, -1)
	testPlayerEndTime = -1
	let playingKey = ++playCounter
	
	if (!data.restricted) {
		playVideo(data.ID, startTime, endtime, volume)
		videoControl.min = startTime
		if (endtime != -1) {
			videoControl.max = endtime
		} else {
			videoControl.max = startTime + 10
		}
		videoControl.value = 0
	} else {
		player.stopVideo()
		popupWnd = openWindow(data)
		if (popupWnd == null) {
			onFinishVideo(false)
			return
		}
		videoControl.min = startTime
		if (endtime != -1) {
			videoControl.max = endtime + 10
		} else {
			videoControl.max = startTime + 10
		}
		videoControl.value = 0
	}
	refreshControlPanel()
	playListTable.updateList()
	playListItemsTable.updateList()

	interval = setInterval(function() {
		curTime = Date.now()
		if (popupWnd) {
			if (endtime >= 0) {
				let restMilliseconds = (beginTime + (endtime - startTime + 10) * 1000) - curTime
				if (restMilliseconds <= 0 && !popupWnd.closed && playingKey == playCounter) {
					onFinishVideo(false)
				}
				let value = (curTime - beginTime) / 1000 + startTime
				videoControl.value = value
			}
			if ((curTime - beginTime) > 5000 && popupWnd && popupWnd.closed && playingKey == playCounter) {
				onFinishVideo(false)
			}
		} else {
			let state = player_getPlayerState()
			if (endtime == -1 && state == YT.PlayerState.PLAYING)
			{
				endtime = player.getDuration()
				videoControl.max = endtime
			}
			if (state == YT.PlayerState.PLAYING || state == YT.PlayerState.PAUSED)
			{
				if (!videoControl.isChanging) {
					let currentTime = player.getCurrentTime()
					videoControl.value = currentTime
					if (ReservedStartTime != undefined)
					{
						let diff = Math.abs(currentTime - ReservedStartTime);
						if (diff > 1)
						{
							player.seekTo(ReservedStartTime, true);
						}
						else
						{
							//console.log('OnInterval.setVolume' + ';currentTime:' + currentTime)
							player.setVolume(ReservedVolume)
							ReservedStartTime = undefined
							LastVideoTime = currentTime
						}
					}
					else
					{
						let diff = Math.abs(LastVideoTime - currentTime)
						if (diff > 1.5 && (curTime - beginTime) <= 10000)
						{
							console.log('OnInterval.ForcedRefresh: ' + currentVideoClip.key)
							player.seekTo(LastVideoTime, true);
						}
						else if (testPlayerEndTime >= 0 && testPlayerEndTime < currentTime)
						{
							player.pauseVideo()
							testPlayerEndTime = -1
						}
						else if (endtime < currentTime)
						{
							//console.log('OnInterval.FinishVideo' + ';currentTime:' + currentTime + ';endtime:' + endtime)
							console.log('OnInterval.FinishVideo: ' + currentVideoClip.key)
							onFinishVideo(false)
						}
						else
						{
							LastVideoTime = currentTime;
						}
					}
					if (TestClipTime_End.value.length == 0)
					{
						TestClipTime_End.placeholder = secondsToTime(currentTime)
					}
				}
				if (!volumeControl.isChanging) {
					if (ReservedStartTime == undefined)
					{
						let CurrentVolume = player.getVolume();
						if (ReservedVolume == undefined)
						{
							volumeControl_update(CurrentVolume)
						}
						else if (ReservedVolume != CurrentVolume)
						{
							player.setVolume(ReservedVolume)
						}
						else
						{
							ReservedVolume = undefined;
						}
					}
				}
			}
		}
		refreshPlayButton()
	}, 100)
	
	/*
	let url = ["https://www.youtube.com/embed/", value.ID, "?start=", getSeconds(value.start, 0), "&autoplay=1"]
	let endtime = getSeconds(value.end, -1)
	if (endtime >= 0) {
		url.push("&end=", endtime)
	}
	url = url.join('')
	
	alert(url)
	let frame = document.createElement("iframe")
	frame.src = url
	frame.allow = "autoplay"
	frame.width = "1280"
	frame.height = "720"
	
	let div = document.getElementById("Frame")
	div.innerHTML = ""
	document.getElementById("Frame").appendChild(frame)
	*/
}
function totalList_playVideo(selectedIndex) {
	if (selectedIndex < 0 || videoClipTable.length <= selectedIndex) {
		common_stopVideo()
		return
	}
	
	common_stopVideo(false)
	let value = videoClipTable.getData(selectedIndex)
	playVideoData(value)
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
function onYouTubeIframeAPIReady() {
	player = new YT.Player('player', {
		height: videoHeight,
		width: videoWidth,
		videoId: '',
		events: {
			'onReady': onPlayerReady,
			'onStateChange': onPlayerStateChange,
			'onError' : onError,
		}
	})
}
function onPlayerReady(event) {
	playerLoaded = true
	volumeControl_update(player_getVolume())
	refreshControlPanel()
}
function onPlayerStateChange(event) {
	//console.log(event.data)
	if (event.data === YT.PlayerState.ENDED){
		onFinishVideo(false)
	}
}
function onError(event) {
	console.log(event)
}
function playVideo(id, start, end, volume) {
	if (end < 0) {
		player.loadVideoById({
				'videoId': id,
				'startSeconds': start,
		});
	} else {
		player.loadVideoById({
			'videoId': id,
			'startSeconds': start,
			'endSeconds': end,
		});
	}
	ReservedStartTime = start
	ReservedVolume = volume
	if (ReservedVolume < 0)
	{
		ReservedVolume = 0;
	}
	player.setVolume(0)
}

function onFinishVideo(bForce) {
	let CurTime = Date.now()
	if (bForce || CurTime - LastExecFinishVideoTime > 1000)
	{
		LastExecFinishVideoTime = CurTime
		playListItems_next(true)
	}
}
function shuffle(array, start, end) {
	start = isUndefined(start, 0)
	end = isUndefined(end, array.length)
	for (let index = end - 1; index > start; index--) {
		const randomPosition = Math.floor(Math.random() * (index - start + 1) + start)
		const temporary = array[index]
		array[index] = array[randomPosition]
		array[randomPosition] = temporary
	}
}
function updatePlayerOrder() {
	const playOrder = currentViewContext.playOrder
	const playOrderMap = currentViewContext.playOrderMap
	const newPlayOrder = []
	for (let i = 0; i < playOrder.length; ++i) {
		if (playListItemsTable.getDataByKey(playOrder[i].key)) {
			newPlayOrder.push(playOrder[i])
		}
	}
	currentViewContext.playOrder = newPlayOrder
	playContext_refreshPlayerOrderMap(currentViewContext)
}
function playContext_refreshPlayerOrderMap(playContext) {
	const playOrder = playContext.playOrder
	const playOrderMap = playContext.playOrderMap
	playOrderMap.clear()
	for (let i = 0; i < playOrder.length; ++i) {
		playOrderMap.set(playOrder[i].key, i)
	}
}
function playContext_shuffleByPriority(playOrder) {
	if (playOrder.length <= 0) {
		return
	}
	playOrder.sort(function(a,b) {
		a = a.shufflePriority
		b = b.shufflePriority
		return a < b ? 1 : a > b ? -1 : 0
	})
	let prevPriority = playOrder[0].shufflePriority
	let startIndex = 0
	for (let i = 1; i < playOrder.length; ++i) {
		const currentPriority = playOrder[i].shufflePriority
		if (currentPriority != prevPriority) {
			shuffle(playOrder, startIndex, i)
			prevPriority = currentPriority
			startIndex = i
		}
	}

	if (startIndex < playOrder.length) {
		shuffle(playOrder, startIndex, playOrder.length)
	}
}
function playContext_shufflePlayOrder(playContext) {
	const playOrder = playContext.playOrder
	const playOrderMap = playContext.playOrderMap
	const currentPlayingItem = playContext.currentPlayingItem
	if (currentPlayingItem) {
		let orderIdx = playOrderMap.get(currentPlayingItem.key)
		playOrder.splice(orderIdx, 1)
		playContext_shuffleByPriority(playOrder)
		playOrder.unshift(currentPlayingItem)
	} else {
		playContext_shuffleByPriority(playOrder)
	}
	playContext_refreshPlayerOrderMap(playContext)
}
function playContext_resetPlayOrder(playContext) {
	const playOrder = playContext.playOrder
	const playOrderMap = playContext.playOrderMap
	array_clear(playOrder)
	const items = playContext.data.items;
	for (let i = 0; i < items.length; ++i) {
		playOrder.push(items[i])
	}
	playContext_refreshPlayerOrderMap(playContext)
}
function playList_shufflePlayOrder() {
	playContext_shufflePlayOrder(currentViewContext)
	playListItemsTable.updateList()
}
function playList_resetPlayOrder() {
	playContext_resetPlayOrder(currentViewContext)
	playListItemsTable.updateList()
	}
function playList_shuffle() {
	const sufflePlayList = currentViewContext ? currentViewContext.shuffled : false
	if (sufflePlayList) {
		playList_shufflePlayOrder()
	} else {
		playList_resetPlayOrder()
	}
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
	
	for (let i = 0; i < playContextStack.length; ++i) {
		const ctx = playContextStack[i]
		if (ctx.currentPlayingItem && ctx.playOrderMap.get(ctx.currentPlayingItem.key) == undefined) {
			common_stopVideo()
			break
		}
	}
	playListItemsTable.focus()
	setDataChanged()
}
function playListItemsTable_deleteAll() {
	if (playContextStack.length != 0) {
		common_stopVideo(false)
	}
	currentViewContext.playOrder = []
	currentViewContext.playOrderMap.clear()
	playList_itemsDeleted(currentViewContext.data.items)
	array_clear(currentViewContext.data.items)
	videoClipTable.updateList()
	playListItemsTable.refreshList()
	playListItemsTable.focus()
	refreshControlPanel()
	setDataChanged()
}
function updateDivVisible() {
	divTotallist.style.display = showTotallist.checked ? 'flex' : 'none'
	divPlaylistPanel.style.display = showPlaylist.checked ? 'flex' : 'none'
	divPlaylistItemsPanel.style.display = showPlaylistItems.checked ? 'flex' : 'none'
	divClipSpreadSheet.style.display = showClipTableURL.checked ? 'flex' : 'none'
	divTestClipTime.style.display = showTestClipTime.checked ? 'flex' : 'none'
	//playListItemsTable.adjustScroll()
}
function playList_getJson() {
	let playListSaveData = []				
	let playListData = playListTable.dataList
	for (let i = 0; i < playListData.length; ++i) {
		const data = playListData[i]
		const items = []
		for (let j = 0; j < data.items.length; ++j) {
			let item = data.items[j]
			let itemData = { key:item.data.key }
			if (item.shufflePriority != 0) {
				itemData.shufflePriority = item.shufflePriority
			}
			items.push(itemData)
		}
		playListSaveData.push({ key:data.key, category:data.category, date:data.date, trackName:data.trackName, originalArtist:data.originalArtist, coveredBy:data.coveredBy, items:items, shuffle:data.shuffle, entirePlay:data.entirePlay })
	}
	return playListSaveData
}
function volume_getJson() {
	let individualVolumeList = []
	for (let val of individualVolumeMap) {
		if (val[1] != 0) {
			individualVolumeList.push(val)
		}
	}

	return individualVolumeList
}
function playList_save() {
	localStorage.setItem("watamePlayer_PlayList", JSON.stringify(playList_getJson()))
	dataChanged = false
}
function volume_save() {
	localStorage.setItem("watamePlayer_Volumes", JSON.stringify(volume_getJson()))
	dataChanged = false
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
function playList_addToPlayListItemsByKeys(keys) {
	let itmeKeys = []
	playListItemsTable.beginUpdate()
	for (let i = 0; i < keys.length; ++i) {
		let data = playListTable.getDataByKey(keys[i])
		let item = playList_insertItem(null, data)
		itmeKeys.push(item.key)
	}
	playListItemsTable.endUpdate()
	playListTable.updateList()
	playListItemsTable.clearSelection()
	for (let i = 0; i < itmeKeys.length; ++i) {
		playListItemsTable.setDataRowSelection(itmeKeys[i], true)
	}
	setDataChanged()
}
function playList_addToPlayListItems() {
	let dataOrder = playListTable.copyDataOrder()
	playList_addToPlayListItemsByKeys(dataOrder)
}
function playList_addSelectedToPlayListItems() {
	let selectedDataKeys = playListTable.selectedDataKeys.slice()
	if (selectedDataKeys.length == 0) {
		return
	}
	playList_addToPlayListItemsByKeys(selectedDataKeys)
}
function fillCharacter(text, len, ch) {
	text = text.toString()
	if (text.length >= len) {
		return text
	}
	return ch.repeat(len - text.length) + text
}
function date_today() {
	const today = new Date()
	const year = today.getFullYear()
	const month = today.getMonth() + 1
	const date = today.getDate()
	return `${year}-${fillCharacter(month, 2, '0')}-${fillCharacter(date, 2, '0')}`
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
