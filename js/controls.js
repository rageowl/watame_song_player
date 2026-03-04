function playButton_onClick() {
	if (playState.popupWnd) {
		common_pauseVideo()
		return
	}
	const currentPlayingItem = playState.currentViewContext.currentPlayingItem
	const playOrder = playState.currentViewContext.playOrder
	let state = player_getPlayerState()
	if (state == YT.PlayerState.PLAYING || state == YT.PlayerState.BUFFERING) {
		player.pauseVideo()
	} else if (state == YT.PlayerState.PAUSED) {
		player.playVideo()
	} else if (currentPlayingItem != undefined) {
		playListItemsTable_play(currentPlayingItem.key)
	} else if (playListItemsTable.selectedDataKey != undefined) {
		playListItemsTable_play(playListItemsTable.selectedDataKey)
	} else if (playOrder.length > 0) {
		playListItemsTable_play(playOrder[0].key)
	}
}
function prevButton_onClick() {
	playListItems_prev()
}

function playListItems_prev() {
	const state = player_getPlayerState()
	if (state == YT.PlayerState.BUFFERING) {
		return
	}
	while (playState.playContextStack.length != 0) {
		const isLast = playState.playContextStack.length == 1
		var ctx = playState.playContextStack[playState.playContextStack.length - 1]
		const currentPlayingItem = ctx.currentPlayingItem
		if (!currentPlayingItem) {
			playState.playContextStack.pop()
			continue
		}
		const playOrder = ctx.playOrder
		const playOrderMap = ctx.playOrderMap
		let orderIdx = playOrderMap.get(currentPlayingItem.key)
		if (orderIdx == undefined) {
			playState.playContextStack.pop()
			continue
		}
		const playList = ctx.data
			--orderIdx
			if (orderIdx < 0) {
			ctx.currentPlayingItem = undefined
			if (isLast) {
				const sufflePlayList = ctx.shuffled
				if (sufflePlayList) {
					orderIdx = 0
				} else {
					orderIdx = playOrder.length - 1
				}
			} else {
				playState.playContextStack.pop()
				continue
			}
		}
		ctx.currentPlayingItem = playOrder[orderIdx]
		if (!playList.entirePlay && !isLast) {
			playState.playContextStack.pop()
			continue
		}
		if (playContext_play_r(ctx)) {
			break
		}
	}
}
function playListItems_next(videoFinished) {
	const state = player_getPlayerState()
	if (state == YT.PlayerState.BUFFERING) {
		return
	}
	if (playState.playContextStack.length == 0)
	{
		player.stopVideo();
		return;
	}
	while (playState.playContextStack.length != 0) {
		const isLast = playState.playContextStack.length == 1
		var ctx = playState.playContextStack[playState.playContextStack.length - 1]
		const currentPlayingItem = ctx.currentPlayingItem
		if (!currentPlayingItem) {
			playState.playContextStack.pop()
			continue
		}
		const playOrder = ctx.playOrder
		const playOrderMap = ctx.playOrderMap
		let orderIdx = playOrderMap.get(currentPlayingItem.key)
		if (orderIdx == undefined) {
			playState.playContextStack.pop()
			continue
		}
		const playList = ctx.data
		if (videoFinished && playState.modePlayList == PLAYMODE_REPEAT_ONE) {
		} else {
			++orderIdx
		}
		if (playOrder.length <= orderIdx) {
			ctx.currentPlayingItem = undefined
			if (!isLast) {
				if (videoFinished && ctx.shuffled) {
					playContext_shufflePlayOrder(ctx)
				}
				playState.playContextStack.pop()
				continue
			} else if (videoFinished) {
				if (playState.modePlayList == PLAYMODE_NORMAL) {
					playState.playContextStack.pop()
					continue
			}
				if (ctx.shuffled) {
					playContext_shufflePlayOrder(ctx)
				}
			}
			orderIdx = 0
		}
		ctx.currentPlayingItem = playOrder[orderIdx]
		if (!playList.entirePlay && !isLast) {
			playState.playContextStack.pop()
			continue
		}
		if (playContext_play_r(ctx)) {
			break
		}
	}
}
function nextButton_onClick() {
	playListItems_next(false)
}
function playListItemsTable_updatePlayOrder() {
	const sufflePlayList = playState.currentViewContext ? playState.currentViewContext.shuffled : false
	if (!sufflePlayList) {
		playList_resetPlayOrder()
	}
}
function playListItemsTable_moveToFront() {
	playListItemsTable.moveSelectionToFront()
	playListItemsTable.focus()
	playListItemsTable_updatePlayOrder()
	setDataChanged()
	}
function playListItemsTable_moveToBack() {
	playListItemsTable.moveSelectionToBack()
	playListItemsTable.focus()
	playListItemsTable_updatePlayOrder()
	setDataChanged()
}
function playListItemsTable_moveUp() {
	playListItemsTable.moveSelectedItemUp()
	playListItemsTable.focus()
	playListItemsTable_updatePlayOrder()
	setDataChanged()
	}
function playListItemsTable_moveDown() {
	playListItemsTable.moveSelectedItemDown()
	playListItemsTable.focus()
	playListItemsTable_updatePlayOrder()
	setDataChanged()
}
function playListItemsTable_modify() {
	let keys = playListItemsTable.selectedDataKeys
	if (keys.length > 0) {
		modifyPlayListDetailDialog_ShufflePriority.value = '0'
		modifyPlayListDetailDialog.onclose = function() {
			if (modifyPlayListDetailDialog.returnValue == 'ok') {
				let ShufflePriority = Number(modifyPlayListDetailDialog_ShufflePriority.value)
				for (let i = 0; i < keys.length; ++i) {
					let data = playListItemsTable.getDataByKey(keys[i])
					data.shufflePriority = ShufflePriority
				}
				playListItemsTable.updateList()
				setDataChanged()
			}
		}
		if (typeof modifyPlayListDetailDialog.showModal === "function") {
			modifyPlayListDetailDialog.showModal();
		} else {
			alert("The <dialog> API is not supported by this browser");
		}
	}
}
function totalList_Search() {
	let keyWord = searchTotallist.value
	if (keyWord == '') {
		videoClipTable.filterFunction = null
	} else {
		let dataOrder = []
		if (totalListSearchCaseInsensitive.checked) {
			keyWord = keyWord.toLowerCase()
			videoClipTable.filterFunction = function(data) {
				let searchTexts = data.searchLowerCaseTexts
				for (let j = 0; j < searchTexts.length; ++j) {
					if (searchTexts[j].indexOf(keyWord) != -1) {
						return true
					}
				}
				return false
			}
		} else {
			videoClipTable.filterFunction = function(data) {
				let searchTexts = data.searchTexts
				for (let j = 0; j < searchTexts.length; ++j) {
					if (searchTexts[j].indexOf(keyWord) != -1) {
						return true
					}
				}
				return false
			}
		}
	}
	videoClipTable.scrollToRowByDataKey(videoClipTable.selectedDataKey, true)
}
function playListTable_Search() {
	let keyWord = playListButton_search.value
	if (keyWord == '') {
		playListTable.filterFunction = null
	} else {
		if (playListSearchCaseInsensitive.checked) {
			keyWord = keyWord.toLowerCase()
			playListTable.filterFunction = function(data) {
				let searchTexts = data.searchLowerCaseTexts
				for (let j = 0; j < searchTexts.length; ++j) {
					if (searchTexts[j].indexOf(keyWord) != -1) {
						return true
					}
				}
				return false
			}
		} else {
			playListTable.filterFunction = function(data) {
				let searchTexts = data.searchTexts
				for (let j = 0; j < searchTexts.length; ++j) {
					if (searchTexts[j].indexOf(keyWord) != -1) {
						return true
					}
				}
				return false
			}
		}
	}
	playListTable.scrollToRowByDataKey(playListTable.selectedDataKey, true)
}
function playListTable_SearchByKey(searchItemKey) {
	if (!searchItemKey) {
		console.error("No itemKey ID provided");
		return;
	}
	playListTable.filterFunction = function(data) {
		return data.key === searchItemKey;
	};
	playListTable.updateList();
}
function playListTable_SearchContaining(searchItemKey) {
	if (!searchItemKey) {
		console.error("No itemKey ID provided");
		return;
	}
	playListTable.filterFunction = function(data) {
		return data.items.some(item => item.data.key === searchItemKey);
	};
	playListTable.updateList();
}
function playListItemsTable_Search() {
	let keyWord = playListItemsButton_search.value
	if (keyWord == '') {
		playListItemsTable.filterFunction = null
	} else {
		if (playListItemsSearchCaseInsensitive.checked) {
			keyWord = keyWord.toLowerCase()
			playListItemsTable.filterFunction = function(data) {
				let searchTexts = data.data.searchLowerCaseTexts
				for (let j = 0; j < searchTexts.length; ++j) {
					if (searchTexts[j].indexOf(keyWord) != -1) {
						return true
					}
				}
				return false
			}
		} else {
			playListItemsTable.filterFunction = function(data) {
				let searchTexts = data.data.searchTexts
				for (let j = 0; j < searchTexts.length; ++j) {
					if (searchTexts[j].indexOf(keyWord) != -1) {
						return true
					}
				}
				return false
			}
		}
	}
	playListItemsTable.scrollToRowByDataKey(playListItemsTable.selectedDataKey, true)
}
function searchTotallist_onKeyUp() {
	if (event.keyCode == 13) {
		totalList_Search()
	}
}
function searchPlayList_onKeyUp() {
	if (event.keyCode == 13) {
		playListTable_Search()
	}
}
function searchPlayListItems_onKeyUp() {
	if (event.keyCode == 13) {
		playListItemsTable_Search()
	}
}
function totalList_copyTitle(list) {
	let options = list.selectedOptions
	let text = ''
	for (let i = 0; i < options.length; ++i) {
		text += videoClipList[options[i].value].title
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
function list_onKeyDown(list) {
	if (event.keyCode == 17) {
	} else if (event.keyCode == 67) {
		totalList_copyTitle(list)
	}
}
function list_onKeyUp(list) {
	if (event.keyCode == 17) {
	}
}
function totalList_onKeyDown() {
	if (event.keyCode == 13 && showPlaylist.checked) {
		totalList_addSelectedToPlaylist()
	} else {
		list_onKeyDown(videoClipTable)
	}
}
function videoControl_oninput(value) {
	videoControl.isChanging = true
	//console.log(value)
}
function videoControl_onchange(value) {
	const state = player_getPlayerState()
	if (state == YT.PlayerState.PLAYING || state == YT.PlayerState.PAUSED) {
		player.seekTo(value, true)
		playState.LastVideoTime = value
	}
	videoControl.isChanging = false
	//console.log('changed:'+value)
}
function suffleButton_onClick() {
	if (playState.currentViewContext) {
		playState.currentViewContext.shuffled = !playState.currentViewContext.shuffled
	}
	playList_shuffle()
	refreshControlPanel()
}
function modeButton_onClick() {
	playState.modePlayList = (playState.modePlayList + 1) % 3
	refreshControlPanel()
}
function individualVolume_save(key, relVolume) {
	const curVolume = individualVolumeMap.get(key)
	if (curVolume != relVolume) {
		individualVolumeMap.set(key, relVolume)
		console.log('individualVolume_save' + ';key:' + key + ';relVolume:' + relVolume)
		volume_save()
	}
}
function volumeControl_update(value) {
	if (individualVolume.checked && playState.currentVideoClip) {
		if (individualVolumeControl.value != value) {
			individualVolumeControl.value = value
			individualVolumeText.innerHTML = value + "%"
			const relVolume = Number(value) - Number(volumeControl.value)
			individualVolume_save(playState.currentVideoClip.key, relVolume)
		}
	} else if (volumeControl.value != value) {
		volumeControl.value = value
		individualVolumeControl.value = value
		volumeText.innerHTML = value + "%"
		individualVolumeText.innerHTML = value + "%"
	}
}
function volumeControl_set(value) {
	if (individualVolume.checked && playState.currentVideoClip) {
		const relVolume = individualVolumeMap.get(playState.currentVideoClip.key)
		if (relVolume != undefined) {
			volumeText.innerHTML = value + "%"
			value = Number(value) + relVolume
			individualVolumeControl.value = value
			individualVolumeText.innerHTML = value + "%"
			player.setVolume(value)
		}
	} else {
		player.setVolume(value)
		individualVolumeControl.value = value
		volumeText.innerHTML = value + "%"
		individualVolumeText.innerHTML = value + "%"
	}
}
function volumeControl_oninput(value) {
	volumeControl.isChanging = true
	volumeControl_set(value)
}
function volumeControl_onchange(value) {
	volumeControl.isChanging = false
	volumeControl_set(value)
}
function volumeControl_onWheel(value) {
	let volume = player_getVolume()
	if (individualVolume.checked && playState.currentVideoClip) {
		const relVolume = individualVolumeMap.get(playState.currentVideoClip.key)
		if (relVolume != undefined) {
			volume -= relVolume
		}
	}
	let newVolume = volume - Math.sign(value) * 5
	newVolume = newVolume < 0 ? 0 : newVolume > 100 ? 100 : newVolume
	volumeControl.value = newVolume
	volumeControl_set(newVolume)
	event.preventDefault()
}
function individualVolumeControl_set(value) {
	if (individualVolume.checked && playState.currentVideoClip) {
		player.setVolume(value)
		let relVolume = Number(value) - Number(volumeControl.value)
		individualVolume_save(playState.currentVideoClip.key, relVolume)
		individualVolumeText.innerHTML = value + "%"
	}
}
function individualVolumeControl_oninput(value) {
	volumeControl.isChanging = true
	individualVolumeControl_set(value)
}
function individualVolumeControl_onchange(value) {
	volumeControl.isChanging = false
	individualVolumeControl_set(value)
}
function individualVolumeControl_onWheel(value) {
	let newVolume = player_getVolume() - Math.sign(value) * 5
	newVolume = newVolume < 0 ? 0 : newVolume > 100 ? 100 : newVolume
	individualVolumeControl_set(newVolume)
	event.preventDefault()
}
function playListTable_moveToFront() {
	playListTable.moveSelectionToFront()
	playListTable.focus()
	setDataChanged()
}
function playListTable_moveToBack() {
	playListTable.moveSelectionToBack()
	playListTable.focus()
	setDataChanged()
}
function playListTable_moveUp() {
	playListTable.moveSelectedItemUp()
	playListTable.focus()
	setDataChanged()
}
function playListTable_moveDown() {
	playListTable.moveSelectedItemDown()
	playListTable.focus()
	setDataChanged()
}
function playList_saveCheckboxes() {
	const playList = playState.currentViewContext.data
	playList.shuffle = playList_checkBoxShuffle.checked
	playList.entirePlay = playList_checkBoxPlayEntireList.checked
	setDataChanged()
}
function playList_updateCheckboxes() {
	const playList = playState.currentViewContext.data
	playList_checkBoxShuffle.checked = playList.shuffle
	playList_checkBoxPlayEntireList.checked = playList.entirePlay
}
function individualVolume_onClick() {
	if (playState.currentVideoClip) {
		if (individualVolume.checked) {
			individualVolumeMap.set(playState.currentVideoClip.key, 0)
			individualVolumeControl.disabled = false
			volume_save()
		} else {
			individualVolumeMap.delete(playState.currentVideoClip.key)
			individualVolumeControl.disabled = true
			volume_save()
			volumeControl_set(volumeControl.value)
		}
	} else {
		individualVolume.checked = false
	}
}
