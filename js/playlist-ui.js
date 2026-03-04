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
