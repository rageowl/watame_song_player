function settings_AddURL(value)
{
	let div = document.createElement('div')
	div.style.display = 'flex'
	let edit = document.createElement('input');
	edit.type = 'text'
	edit.value = value
	edit.style.flex = '1'
	let openSheet = document.createElement('button');
	openSheet.style.flex = 'none'
	let deleteSheet = document.createElement('button');
	deleteSheet.style.flex = 'none'
	div.appendChild(edit)
	div.appendChild(openSheet)
	div.appendChild(deleteSheet)
	divClipSpreadSheetURL.appendChild(div);
	spreadsheetsFormList.push(edit);
	openSheet.textContent = 'OpenSheet'
	openSheet.onclick = function() {
		const url = 'https://docs.google.com/spreadsheets/d/' + edit.value;
		window.open(url, '_blank')
	}
	deleteSheet.textContent = 'Delete'
	deleteSheet.onclick = function() {
		divClipSpreadSheetURL.removeChild(div)
		const idx = spreadsheetsFormList.indexOf(edit)
		if (idx >= 0) {
			spreadsheetsFormList.splice(idx, 1)
		}
	}
}

function readData_Finalize()
{
	let videoClipIDMap = new Map()
	for (let i = 0; i < videoClipList.length; ++i) {
		let value = videoClipList[i]
		//console.log(value)
		makeSearchText(value)
		value.type = 1
		value.ordinal = i + 1
		const Counter = isUndefined(videoClipIDMap.get(value.ID), 1)
		value.key = value.ID + '_' + Counter;
		videoClipIDMap.set(value.ID, Counter + 1)
		value.refCount = 0
		videoClipMap.set(value.key, value)
	}

	videoClipTable.setData(videoClipList)
			
	let playListItems = []
	if (playListData != undefined && playListData.length > 0) {
		showTotallist.checked = false
		showPlaylist.checked = false
		let playListMap = new Map()
		for (let i = 0; i < playListData.length; ++i) {
			let playList = playList_load(playListData[i])
			playListItems.push(playList)
			playListMap.set(playList.key, playList)
		}
		for (let i = 0; i < playListData.length; ++i) {
			const playList = playListItems[i]
			const items = playListData[i].items
			for (let j = 0; j < items.length; ++j) {
				const item = items[j]
				const key = item.key
				let data = playListMap.get(key)
				if (data == undefined) {
					data = videoClipMap.get(key)
				}
				if (data != undefined) {
					playList_newItem(playList, data, item.shufflePriority)
					continue
				}
			}
		}
	} else {
		showTotallist.checked = false
		showPlaylist.checked = false

		const headers = videoClipTable.selectHeader(['trackName'])
		if (headers.length != 0) {
			const commonCategory = 'うた枠！わためぇ Night Feverとか🐏'
			const commonTrackName = 'Various Artist'
			const commonOriginalArtist = 'Various Artist'
			const commonCoveredBy = '角巻わため'
			let option = {
				selectedClip : false,
				shuffle : false,
				playEntireVideo : false,
				appendIfExists : totalListHeaderSelect_cbAppendIfExists.checked,
				appendtoFront : totalListHeaderSelect_cbAppendToFront.checked,
				commonTextMap : { category:commonCategory, trackName:commonTrackName, originalArtist:commonOriginalArtist, coveredBy:commonCoveredBy },
			}
			const groupedPlaylists = totalList_makeGroupedPlayList(headers, option)
			if (groupedPlaylists.length) {
				let playList = playList_new()
				playList.trackName = 'わためぇ Night Fever'
				playList.originalArtist = 'Various Artist'
				playList.coveredBy = 'Various Artist'
				playList.category = 'うた枠！わためぇ Night Feverとか🐏'
				playList.shuffle = false

				playListItems.push(playList)

				for (let i = 0; i < groupedPlaylists.length; ++i) {
					let data = groupedPlaylists[i]
					if (data != undefined) {
						playList_newItem(playList, data, 0)
						playListItems.push(data)
					}
				}
			}
		}
	}
	if (playListItems.length) {
		playList_open(playListItems[0])
	}
	playListTable.setData(playListItems)
	videoClipTable.updateList()
	refreshControlPanel()
	updateDivVisible()
	isLoading = false
}
function readData_LoadSheet(URL, dataTable, sheetIdx)
{
	if (dataTable) {
		var jsonData = dataTable.toJSON();
		jsonData = JSON.parse(jsonData);
		let idxMap = new Map()
		let header = jsonData.rows[0].c
		for (let i = 0; i < header.length; ++i) {
			let label = header[i]
			if (label == null) {
				continue
			}
			label = label.v
			if (label == null || label.length == 0) {
				continue
			}
			label = label.toUpperCase()
			idxMap[label] = i
		}

		let dateIdx = idxMap['DATE']
		let trackNameIdx = idxMap['TRACKNAME']
		let originalArtistIdx = idxMap['ORIGINALARTIST']
		let coveredByIdx = idxMap['COVEREDBY']
		let categoryIdx = idxMap['CATEGORY']
		let startIdx = idxMap['START']
		let endIdx = idxMap['END']
		let idIdx = idxMap['ID']
		
		function getVal(c, idx)
		{
			let m = c[idx]
			return m != null ? m.v : ''
		}
		for(var i=1; i < jsonData.rows.length; i++)
		{
			let c = jsonData.rows[i].c
			let row = { category:getVal(c, categoryIdx), ID:getVal(c, idIdx), start:getVal(c, startIdx), end:getVal(c, endIdx), date:getVal(c, dateIdx), trackName:getVal(c, trackNameIdx), coveredBy:getVal(c, coveredByIdx), originalArtist:getVal(c, originalArtistIdx) }
			videoClipList.push(row)
		}
	} else {
		alert('"' + URL + '" is wrong');
	}
	if (++sheetIdx == settingsData.clipSpreadSheetURL.length) {
		readData_Finalize()
	} else {
		const URL = SheetHeader + settingsData.clipSpreadSheetURL[sheetIdx]
		var query = new google.visualization.Query(URL);
		query.send(function(response) { readData_LoadSheet(URL, response.getDataTable(), sheetIdx) });
	}
}
function readData()
{
	if (isLoading) {
		return
	}
	isLoading = true;
	let playListDataText = localStorage.getItem('watamePlayer_PlayList')
	let individualVolumeDataText = localStorage.getItem('watamePlayer_Volumes')
	if (playListDataText) {
		try
		{
			playListData = JSON.parse(playListDataText)
		}
		catch (err)
		{
		}
	}
	if (individualVolumeDataText) {
		try
		{
			individualVolumeData = JSON.parse(individualVolumeDataText)
		}
		catch (err)
		{
		}
	}
	let settingsDataText = localStorage.getItem('watamePlayer_settings')
	if (settingsDataText) {
		try
		{
			settingsData = JSON.parse(settingsDataText)
		}
		catch (err)
		{
		}
		if (settingsData == null) {
			settingsData = {}
		}
		if (settingsData.clipSpreadSheetURL == undefined) {
			settingsData.clipSpreadSheetURL = defaultClipSpreadSheetURL
		}
		else if (typeof settingsData.clipSpreadSheetURL == 'string') {
			if (settingsData.clipSpreadSheetURL.startsWith(SheetHeader)) {
				settingsData.clipSpreadSheetURL = settingsData.clipSpreadSheetURL.substring(SheetHeader.length)
			}
			settingsData.clipSpreadSheetURL = [settingsData.clipSpreadSheetURL]
		}
	}
	
	divClipSpreadSheetURL.replaceChildren();
	spreadsheetsFormList = []
	for (let i = 0; i < settingsData.clipSpreadSheetURL.length; ++i) {
		settings_AddURL(settingsData.clipSpreadSheetURL[i])
	}

	if (individualVolumeData) {
		for (let i = 0; i < individualVolumeData.length; ++i) {
			let data = individualVolumeData[i]
			individualVolumeMap.set(data[0], data[1])
		}
	}

	if (settingsData.clipSpreadSheetURL.length > 0) {
		google.charts.load('current', { packages: ['corechart'] }).then(function () {
			videoClipList = new Array()
			const URL = SheetHeader + settingsData.clipSpreadSheetURL[0]
			var query = new google.visualization.Query(URL);
			query.send(function(response) { readData_LoadSheet(URL, response.getDataTable(), 0) });
		});
	} else {
		readData_Finalize();
	}
}
