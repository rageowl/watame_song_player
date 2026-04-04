function init() {
	window.addEventListener('beforeunload', (event) => {
		let state = player_getPlayerState()
		if (state == YT.PlayerState.PLAYING || state == YT.PlayerState.BUFFERING) {
			if (!confirm('Are you sure you want close window?')) {
				event.preventDefault();
				event.returnValue = '';
			}
		}
	});
/*
	const urlParameter = window.location.search;
	const urlParams = new URLSearchParams(urlParameter);
	const importStr = urlParams.get('a');
	if (importStr != null && importStr.length)
	{
		const importBinaryStr = base64UrlDecode(importStr);
		const DataBinary = StringToArray(importBinaryStr);
		const decoder = new TextDecoder();
		const DataStr = decoder.decode(DataBinary);

		let importData = {
			"playListData" : {},
			"individualVolumeData" : {},
			"settings" : {}
		};
		
		try {
			importData = JSON.parse(DataStr)
		} catch(err) {
		}
		localStorage.setItem("watamePlayer_PlayList", JSON.stringify(importData["playListData"]))
		localStorage.setItem("watamePlayer_Volumes", JSON.stringify(importData["individualVolumeData"]))
		localStorage.setItem("watamePlayer_settings", JSON.stringify(importData["settings"]))
	}
*/
	readData()
	//alert(navigator.userAgent)
	//alert(isMobile.any() != null)
	prevButton.innerHTML = '\u23ea'
	nextButton.innerText = '\u23e9'

	let totalListHeaders = [
		{ name:'Ordinal', width:88, id:'ordinal', filter:true, sort:true, numeric:true },
		{ name:'Date', width:110, id:'date', filter:true, sort:true },
		{ name:'Track Name', width:400, id:'trackName', filter:true, sort:true, autoSize:true },
		{ name:'Original Artist', width:160, id:'originalArtist', filter:true, sort:true },
		{ name:'Covered By', width:128, id:'coveredBy', filter:true, sort:true },
		{ name:'Category', width:120, id:'category', filter:true, sort:true },
		{ name:'Start', width:80, id:'start' },
		{ name:'End', width:80, id:'end' },
		{ name:'Used', width:80, id:'refCount', filter:true, sort:true },
		{ name:'ID', width:120, id:'ID', filter:true, sort:true },
		{ name:'Link', width:120, getter:function(d) { return getLink(d) } },
		{ name:'IndividualVolume', width:150, filter:true, sort:true, numeric:true, getter:function(d) { return isUndefined(individualVolumeMap.get(d.key), 0) } },
	]
	videoClipTable = new MultiColumnList(totalList)
	videoClipTable.selectMode = isMobile.any() != null
	videoClipTable.mainDivClassName = 'tblWrap'
	videoClipTable.headerDivClassName = 'userTblHead'
	videoClipTable.bodyDivClassName = 'userTbl'
	videoClipTable.ondblclick = function(e) {
		totalList_playVideo(this.selectedDataIndex)
	}

	videoClipTable.onkeydown = function(e) {
		if (e.keyCode == 13 && playState.activePanel) {
		   totalList_addSelectedToPlaylist()
		} else if (e.ctrlKey && e.keyCode == 67) {
			copySelectedItemsToClipboard(videoClipTable)
		}
	}
	videoClipTable.draggable = true
	videoClipTable.ondragstart = function(e, dataKey) {
		let keys = videoClipTable.selectedDataKeys
		let data = JSON.stringify(keys)
		e.dataTransfer.setData("wnfvideoclip", data);
		e.dataTransfer.dropEffect = "copy"
	}
	videoClipTable.oncontextmenu = function(event, d) {
		event.preventDefault()
		totalListContextMenu.show(event.clientX, event.clientY)
	}
	
let playListHeaders = [
		{ name:'', width:40, getter:function(d) {
			if (playState.currentViewContext && d.key == playState.currentViewContext.data.key) {
				for (let i = 0; i < playState.playContextStack.length; ++i) {
					if (d.key == playState.playContextStack[i].data.key) {
						return '\u25b6'
					}
				}
			}
			return ''
		}},
		{ name:'Date', width:110, id:'date', filter:true, sort:true },
		{ name:'Track Name', width:400, filter:true, sort:true, id:'trackName', autoSize:true },
		{ name:'Category', width:120, filter:true, sort:true, id:'category' },
		{ name:'Original Artist', width:160, filter:true, sort:true, id:'originalArtist' },
		{ name:'Covered By', width:128, id:'coveredBy', filter:true, sort:true },
		{ name:'Shuffle', width:88, filter:true, sort:false, getter:function(d) { return d.shuffle ? '1' : '0' } },
		{ name:'PlayAll', width:88, filter:true, sort:false, getter:function(d) { return d.entirePlay ? '1' : '0' } },
		{ name:'Count', width:100, filter:true, sort:true, numeric:true, getter:function(d) { return d.items.length } },
		{ name:'Used', width:80, id:'refCount', filter:true, sort:true },
	]
	playListTable = new MultiColumnList(playList)
	playListTable.selectMode = isMobile.any() != null
	playListTable.mainDivClassName = 'tblWrap'
	playListTable.headerDivClassName = 'userTblHead'
	playListTable.bodyDivClassName = 'userTbl'
	playListTable.ondblclick = function(e) {
		playList_open(this.getDataByKey(this.selectedDataKey))
	}
	
	playListTable.onkeydown = function(e) {
		if (e.keyCode == 46) {
			playListTable_deleteSelected()
		} else if (e.keyCode == 13) {
		   playList_addSelectedToPlayListItems()
		} else if (e.ctrlKey && e.keyCode == 67) {
			copySelectedItemsToClipboard(playListTable)
		}
	}
	playListTable.draggable = true
	playListTable.ondragstart = function(e, dataKey) {
		let keys = playListTable.selectedDataKeys
		let data = JSON.stringify(keys)
		e.dataTransfer.setData("wnfplaylist", data);
		e.dataTransfer.dropEffect = "copy"
	}
	playListTable.ondrop = function(e, dataKey, front) {
		e.preventDefault();
		let data
		if (data = e.dataTransfer.getData("wnfvideoclip")) {
			let keys = JSON.parse(data)
			if (keys.length == 0) {
				return
			}
			const playList = playListTable.getDataByKey(dataKey)
			playListItemsTable.beginUpdate()
			for (let i = 0; i < keys.length; ++i) {
				let data = videoClipTable.getDataByKey(keys[i])
				let item = playList_insertItem(playList, data)
			}
			playListItemsTable.endUpdate()
			videoClipTable.updateList()
			playListTable.updateList()
			setDataChanged()
		} else if (data = e.dataTransfer.getData("wnfplayitem")) {
			let keys = JSON.parse(data)
			if (keys.length == 0) {
				return
			}
			const playList = playListTable.getDataByKey(dataKey)
			if (playListItemsTable && playState.currentViewContext && playList != playState.currentViewContext.data) {
				playListItemsTable.beginUpdate()
				for (let i = 0; i < keys.length; ++i) {
					let item = playListItemsTable.getDataByKey(keys[i])
					playList_insertItem(playList, item.data)
				}
				playListItemsTable.endUpdate()
				videoClipTable.updateList()
				playListTable.updateList()
				setDataChanged()
				updatePlayerOrder()
			}
		} else if (data = e.dataTransfer.getData("wnfplaylist")) {
			let keys = JSON.parse(data)
			removeItemOnce(keys, dataKey)
			if (keys.length == 0) {
				return
			}
			//console.log(keys)
			playListTable.beginUpdate()
			let deletedDataList = playListTable.deleteDataByKeys(keys)
			playListTable.insertDataList(deletedDataList, dataKey, front)
			playListTable.endUpdate()
			setDataChanged()
		}
		playListItemsTable_updatePlayOrder()
	}
	playListTable.ondragover = function(e, dataKey) {
		let types = e.dataTransfer.types
		for (let i = 0; i < types.length; ++i) {
			if (types[i] == "wnfvideoclip" || types[i] == 'wnfplayitem') {
				e.preventDefault()
				return 2
			}
			if (types[i] == 'wnfplaylist') {
				e.preventDefault()
				return 1
			}
		}
		return false
	}
	playListTable.ondragenter = function(e, dataKey) {
		let types = e.dataTransfer.types
		for (let i = 0; i < types.length; ++i) {
			if (types[i] == "wnfvideoclip" || types[i] == 'wnfplayitem' || types[i] == 'wnfplaylist') {
				e.preventDefault()
				return
			}
		}
	}
	playListTable.ondragleave = function(e, dataKey) {
		let types = e.dataTransfer.types
		for (let i = 0; i < types.length; ++i) {
			if (types[i] == "wnfvideoclip" || types[i] == 'wnfplayitem' || types[i] == 'wnfplaylist') {
				e.preventDefault()
				return
			}
		}
	}
	playListTable.oncontextmenu = function(event, d) {
		event.preventDefault()
		playListContextMenu.show(event.clientX, event.clientY)
	}
	videoClipTable.setHeader(totalListHeaders)
	playListTable.setHeader(playListHeaders)
	
	updateDivVisible()
	videoControl.step = 1
	volumeControl.min = 0
	volumeControl.max = 100
	volumeControl.step = 1
	individualVolume.min = 0
	individualVolume.max = 100
	individualVolume.step = 1				
	
	{
		totalListContextMenu = new PopupMenu()
		totalListContextMenu.className = 'contextMenuDiv'
		totalListContextMenu.itemNormalClassName = 'contextMenuDivItemNormal'
		totalListContextMenu.itemHoverClassName = 'contextMenuDivItemHover'
		let itemPlay = totalListContextMenu.addItem()
		itemPlay.setElements('Play')
		itemPlay.onclick = function() {
			totalList_playVideo(videoClipTable.selectedDataIndex)
		}

		let itemSearchContaining = totalListContextMenu.addItem()
		itemSearchContaining.setElements('Search for Playlists Containing Item')
		itemSearchContaining.onclick = function() {
			showPlaylist.checked = true
			updateDivVisible()
			playListTable_SearchContaining(videoClipTable.getDataByKey(videoClipTable.selectedDataKey).key)
		}

		let itemCopyToClipboard = totalListContextMenu.addItem()
		itemCopyToClipboard.setElements('CopyToClipboard')
		itemCopyToClipboard.onclick = function() {
			showCopyToClipboardDialog(videoClipTable)
		}
	}
	{
		playListContextMenu = new PopupMenu()
		playListContextMenu.className = 'contextMenuDiv'
		playListContextMenu.itemNormalClassName = 'contextMenuDivItemNormal'
		playListContextMenu.itemHoverClassName = 'contextMenuDivItemHover'
		let itemSelect = playListContextMenu.addItem()
		itemSelect.setElements('Select')
		itemSelect.onclick = function() {
			playList_open(playListTable.getDataByKey(playListTable.selectedDataKey))
		}
		let itemOpenInNewPanel = playListContextMenu.addItem()
		itemOpenInNewPanel.setElements('Open in New Panel')
		itemOpenInNewPanel.onclick = function() {
			playList_openInNewPanel(playListTable.getDataByKey(playListTable.selectedDataKey))
		}
		let itemSearchContaining = playListContextMenu.addItem()
		itemSearchContaining.setElements('Search for Playlists Containing Item')
		itemSearchContaining.onclick = function() {
			let data = playListTable.getDataByKey(playListTable.selectedDataKey)
			playListTable_SearchContaining(data.key)
		}
		let itemEdit = playListContextMenu.addItem()
		itemEdit.setElements('Edit')
		itemEdit.onclick = function() {
			playList_editPanel()
		}
		let itemClone = playListContextMenu.addItem()
		itemClone.setElements('Clone')
		itemClone.onclick = function() {
			playList_clonePanel()
		}
		let itemDelete = playListContextMenu.addItem()
		itemDelete.setElements('Delete')
		itemDelete.onclick = function() {
			playListTable_deleteSelected()
		}
		let itemMoveToFront = playListContextMenu.addItem()
		itemMoveToFront.setElements('Move to front')
		itemMoveToFront.onclick = function() {
			playListTable_moveToFront()
		}
		let itemMoveToBack = playListContextMenu.addItem()
		itemMoveToBack.setElements('Move to back')
		itemMoveToBack.onclick = function() {
			playListTable_moveToBack()
		}
		
		let itemPlaylistTask = playListContextMenu.addItem()
		itemPlaylistTask.setElements(createSpan('Playlist Task', 'flex:1;'), createSpan('>', 'flex:none;'))
		let menuPlaylistTask = itemPlaylistTask.setSubMenu()
		let itemCheckShuffle = menuPlaylistTask.addItem()
		itemCheckShuffle.setElements('Set shuffle on')
		itemCheckShuffle.onclick = function() {
			playListTable_ForeachSelection(function(data) {
				data.shuffle = true
			})
			playList_updateCheckboxes()
		}
		let itemUncheckShuffle = menuPlaylistTask.addItem()
		itemUncheckShuffle.setElements('Set shuffle off')
		itemUncheckShuffle.onclick = function() {
			playListTable_ForeachSelection(function(data) {
				data.shuffle = false
			})
			playList_updateCheckboxes()
		}
		let itemCheckPlayEntire = menuPlaylistTask.addItem()
		itemCheckPlayEntire.setElements('Set playEntireItems on')
		itemCheckPlayEntire.onclick = function() {
			playListTable_ForeachSelection(function(data) {
				data.entirePlay = true
			})
			playList_updateCheckboxes()
		}
		let itemUncheckPlayEntire = menuPlaylistTask.addItem()
		itemUncheckPlayEntire.setElements('Set playEntireItems off')
		itemUncheckPlayEntire.onclick = function() {
			playListTable_ForeachSelection(function(data) {
				data.entirePlay = false
			})
			playList_updateCheckboxes()
		}

		let itemCopyToClipboard = playListContextMenu.addItem()
		itemCopyToClipboard.setElements('CopyToClipboard')
		itemCopyToClipboard.onclick = function() {
			showCopyToClipboardDialog(playListTable)
		}
	}
	{
		playListItemsContextMenu = new PopupMenu()
		playListItemsContextMenu.className = 'contextMenuDiv'
		playListItemsContextMenu.itemNormalClassName = 'contextMenuDivItemNormal'
		playListItemsContextMenu.itemHoverClassName = 'contextMenuDivItemHover'
		let itemPlay = playListItemsContextMenu.addItem()
		itemPlay.setElements('Play')
		itemPlay.onclick = function() {
			playListItemsTable_play(playListItemsTable.selectedDataKey)
		}
		let itemOpen = playListItemsContextMenu.addItem()
		itemOpen.setElements('Open')
		itemOpen.onclick = function() {
			playListItemsTable_playOrOpen(playListItemsTable.selectedDataKey, false)
		}
		let itemOpenInNewPanel = playListItemsContextMenu.addItem()
		itemOpenInNewPanel.setElements('Open in New Panel')
		itemOpenInNewPanel.onclick = function() {
			const item = playListItemsTable.getDataByKey(playListItemsTable.selectedDataKey)
			if (item && item.data.type == 2) {
				playList_openInNewPanel(item.data)
			}
		}
		let itemSearch = playListItemsContextMenu.addItem()
		itemSearch.setElements('Search Playlists')
		itemSearch.onclick = function() {
			let data = playListItemsTable.getDataByKey(playListItemsTable.selectedDataKey).data
			showPlaylist.checked = true
			updateDivVisible()
			playListTable_SearchByKey(data.key)
		}
		let itemSearchContaining = playListItemsContextMenu.addItem()
		itemSearchContaining.setElements('Search for Playlists Containing Item')
		itemSearchContaining.onclick = function() {
			let data = playListItemsTable.getDataByKey(playListItemsTable.selectedDataKey).data
			showPlaylist.checked = true
			updateDivVisible()
			playListTable_SearchContaining(data.key)
		}
		let itemSelect = playListItemsContextMenu.addItem()
		itemSelect.setElements('Select')
		itemSelect.onclick = function() {
			let data = playListItemsTable.getDataByKey(playListItemsTable.selectedDataKey).data
			if (data.type == 1)
			{
				showTotallist.checked = true
			}
			else if (data.type == 2)
			{
				showPlaylist.checked = true
			}
			updateDivVisible()
			if (data.type == 1)
			{
				videoClipTable.scrollToRowByDataKey(data.key, true)
				videoClipTable.selectedDataKey = data.key
			}
			else if (data.type == 2)
			{
				playListTable.scrollToRowByDataKey(data.key, true)
				playListTable.selectedDataKey = data.key
			}
		}
		let itemDelete = playListItemsContextMenu.addItem()
		itemDelete.setElements('Delete')
		itemDelete.onclick = function() {
			playListItemsTable_deleteSelected()
		}
		let itemMoveToFront = playListItemsContextMenu.addItem()
		itemMoveToFront.setElements('Move to front')
		itemMoveToFront.onclick = function() {
			playListItemsTable_moveToFront()
		}
		let itemMoveToBack = playListItemsContextMenu.addItem()
		itemMoveToBack.setElements('Move to back')
		itemMoveToBack.onclick = function() {
			playListItemsTable_moveToBack()
		}
	
		let itemPlayOrderTask = playListItemsContextMenu.addItem()
		itemPlayOrderTask.setElements(createSpan('PlayOrder Task', 'flex:1;'), createSpan('>', 'flex:none;'))
		let menuPlayOrderTask = itemPlayOrderTask.setSubMenu()
		let itemShuffleSelections = menuPlayOrderTask.addItem()
		itemShuffleSelections.setElements('Shuffle Selection')
		itemShuffleSelections.onclick = function() {
			let selectedDataKeys = playListItemsTable.selectedDataKeys
			if (selectedDataKeys.length <= 1) {
				return
			}
			let ctx = playState.currentViewContext
			const playOrder = ctx.playOrder
			const playOrderMap = ctx.playOrderMap
			const currentPlayingItem = ctx.currentPlayingItem
			let currentPlayingKeyIndex = undefined
			let indexes = []
			for (let i = 0; i < selectedDataKeys.length; ++i) {
				const key = selectedDataKeys[i]
				let orderIdx = playOrderMap.get(key)
				if (orderIdx != undefined) {
					if (currentPlayingItem.key == key) {
						currentPlayingKeyIndex = i
					}
					indexes.push(orderIdx)
				}
			}
			
			ctx.shuffled = true
			shuffle(indexes)
			if (currentPlayingKeyIndex != undefined) {
				let minValue = indexes[0]
				let minIndex = 0
				for (let i = 1; i < indexes.length; ++i) {
					if (minValue > indexes[i]) {
						minValue = indexes[i]
						minIndex = i
					}
				}
				let temp = indexes[minIndex]
				indexes[minIndex] = indexes[currentPlayingKeyIndex]
				indexes[currentPlayingKeyIndex] = temp
			}
			for (let i = 0; i < selectedDataKeys.length; ++i) {
				const key = selectedDataKeys[i]
				playOrder[indexes[i]] = playListItemsTable.getDataByKey(key)
				playOrderMap.set(key, indexes[i])
			}
		
			playListItemsTable.updateList()
			refreshControlPanel()
		}
		let itemReorderSelections = menuPlayOrderTask.addItem()
		itemReorderSelections.setElements('Reorder Selection')
		itemReorderSelections.onclick = function() {
			let selectedDataKeys = playListItemsTable.selectedDataKeys
			if (selectedDataKeys.length <= 1) {
				return
			}
			let ctx = playState.currentViewContext
			const playOrder = ctx.playOrder
			const playOrderMap = ctx.playOrderMap
			let items = []
			let indexes = []
			for (let i = 0; i < selectedDataKeys.length; ++i) {
				const key = selectedDataKeys[i]
				let orderIdx = playOrderMap.get(key)
				if (orderIdx != undefined) {
					const rowIdx = playListItemsTable.getRowIndex(key)
					indexes.push(orderIdx)
					items.push({ key:key, rowIdx:rowIdx })
				}
			}
			
			items.sort(function(a,b) {
				return a.rowIdx - b.rowIdx
			})
			indexes.sort((a,b)=>a-b)
			for (let i = 0; i < items.length; ++i) {
				const key = items[i].key
				playOrder[indexes[i]] = playListItemsTable.getDataByKey(key)
				playOrderMap.set(key, indexes[i])
			}
		
			playListItemsTable.updateList()
			refreshControlPanel()
		}

		let itemPlayOrderMoveToFront = menuPlayOrderTask.addItem()
		itemPlayOrderMoveToFront.setElements('Move to front')
		itemPlayOrderMoveToFront.onclick = function() {
			let selectedDataKeys = playListItemsTable.selectedDataKeys
			if (selectedDataKeys.length <= 0) {
				return
			}

			let ctx = playState.currentViewContext
			const playOrder = ctx.playOrder
			const playOrderMap = ctx.playOrderMap
			let items = []
			let indexes = []
			for (let i = 0; i < selectedDataKeys.length; ++i) {
				const key = selectedDataKeys[i]
				let orderIdx = playOrderMap.get(key)
				if (orderIdx != undefined) {
					const rowIdx = playListItemsTable.getRowIndex(key)
					indexes.push(orderIdx)
					items.push({ key:key, rowIdx:rowIdx })
				}
			}
			
			items.sort(function(a,b) {
				return b.rowIdx - a.rowIdx
			})

			indexes.sort((a,b)=>a-b)
			const movedItems = []
			for (let i = indexes.length - 1; i >= 0; --i) {
				let idx = indexes[i]
				playOrder.splice(idx, 1)
				movedItems.push(playListItemsTable.getDataByKey(items[i].key))
			}

			ctx.playOrder = movedItems.concat(playOrder)
			playContext_refreshPlayerOrderMap(ctx)
			
			playListItemsTable.updateList()
			refreshControlPanel()
		}
		let itemPlayOrderMoveToBack = menuPlayOrderTask.addItem()
		itemPlayOrderMoveToBack.setElements('Move to back')
		itemPlayOrderMoveToBack.onclick = function() {
			let selectedDataKeys = playListItemsTable.selectedDataKeys
			if (selectedDataKeys.length <= 0) {
				return
			}

			let ctx = playState.currentViewContext
			const playOrder = ctx.playOrder
			const playOrderMap = ctx.playOrderMap
			let items = []
			let indexes = []
			for (let i = 0; i < selectedDataKeys.length; ++i) {
				const key = selectedDataKeys[i]
				let orderIdx = playOrderMap.get(key)
				if (orderIdx != undefined) {
					const rowIdx = playListItemsTable.getRowIndex(key)
					indexes.push(orderIdx)
					items.push({ key:key, rowIdx:rowIdx })
				}
			}
			
			items.sort(function(a,b) {
				return b.rowIdx - a.rowIdx
			})

			indexes.sort((a,b)=>a-b)
			const movedItems = []
			for (let i = indexes.length - 1; i >= 0; --i) {
				let idx = indexes[i]
				playOrder.splice(idx, 1)
				movedItems.push(playListItemsTable.getDataByKey(items[i].key))
			}

			ctx.playOrder = playOrder.concat(movedItems)
			playContext_refreshPlayerOrderMap(ctx)
			
			playListItemsTable.updateList()
			refreshControlPanel()
		}

		let itemPlaylistTask = playListItemsContextMenu.addItem()
		itemPlaylistTask.setElements(createSpan('Playlist Task', 'flex:1;'), createSpan('>', 'flex:none;'))
		let menuPlaylistTask = itemPlaylistTask.setSubMenu()
		let itemCheckShuffle = menuPlaylistTask.addItem()
		itemCheckShuffle.setElements('Set shuffle on')
		itemCheckShuffle.onclick = function() {
			playListItemsTable_ForeachSelection(function(item) {
				if (item.data.type == 2) {
					item.data.shuffle = true
				}
			})
			playList_updateCheckboxes()
		}
		let itemUncheckShuffle = menuPlaylistTask.addItem()
		itemUncheckShuffle.setElements('Set shuffle off')
		itemUncheckShuffle.onclick = function() {
			playListItemsTable_ForeachSelection(function(item) {
				if (item.data.type == 2) {
					item.data.shuffle = false
				}
			})
			playList_updateCheckboxes()
		}
		let itemCheckPlayEntire = menuPlaylistTask.addItem()
		itemCheckPlayEntire.setElements('Set playEntireItems on')
		itemCheckPlayEntire.onclick = function() {
			playListItemsTable_ForeachSelection(function(item) {
				if (item.data.type == 2) {
					item.data.entirePlay = true
				}
			})
			playList_updateCheckboxes()
		}
		let itemUncheckPlayEntire = menuPlaylistTask.addItem()
		itemUncheckPlayEntire.setElements('Set playEntireItems off')
		itemUncheckPlayEntire.onclick = function() {
			playListItemsTable_ForeachSelection(function(item) {
				if (item.data.type == 2) {
					item.data.entirePlay = false
				}
			})
			playList_updateCheckboxes()
		}
		
		let itemCopyToClipboard = playListItemsContextMenu.addItem()
		itemCopyToClipboard.setElements('CopyToClipboard')
		itemCopyToClipboard.onclick = function() {
			showCopyToClipboardDialog(playListItemsTable)
		}
		/*
		let itemTest1 = playListItemsContextMenu.addItem()
		itemTest1.setElements(createSpan('Test1 Task', 'flex:1;'), createSpan('>', 'flex:none;'))

		let menuTest1Task = itemTest1.setSubMenu()
		let menuTest1 = menuTest1Task.addItem()
		menuTest1.setElements(createSpan('Test2 Task', 'flex:1;'), createSpan('>', 'flex:none;'))
		let menuTest2Task = menuTest1.setSubMenu()
		let menuSubTest1 = menuTest2Task.addItem()
		menuSubTest1.setElements('Set playEntireItems on')

		let menuTest3 = menuTest1Task.addItem()
		menuTest3.setElements(createSpan('Test3 Task', 'flex:1;'), createSpan('>', 'flex:none;'))
		let menuTest3Task = menuTest3.setSubMenu()
		let menuSubTest2 = menuTest3Task.addItem()
		menuSubTest2.setElements('Set playEntireItems on')
		*/
	}
}
