// playlist-data.js - 재생목록 데이터 CRUD + 저장/로드

function makeSearchText(value) {
	value.searchTexts = [isUndefined(value.category, ''), isUndefined(value.date, ''), isUndefined(value.trackName, ''), isUndefined(value.originalArtist, ''), isUndefined(value.coveredBy, '')]
	value.searchLowerCaseTexts = []
	for (let i = 0; i < value.searchTexts.length; ++i) {
		value.searchLowerCaseTexts.push(value.searchTexts[i].toLowerCase())
	}
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
function playList_getItem(playList, key) {
	for (let i = 0; i < playList.items.length; ++i) {
		const item = playList.items[i]
		if (item.key == key) {
			return item
		}
	}
	return null
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
function setDataChanged() {
	dataChanged = true
	playList_save()
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
function playList_save() {
	localStorage.setItem("watamePlayer_PlayList", JSON.stringify(playList_getJson()))
	dataChanged = false
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
function volume_save() {
	localStorage.setItem("watamePlayer_Volumes", JSON.stringify(volume_getJson()))
	dataChanged = false
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
