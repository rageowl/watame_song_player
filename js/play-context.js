// play-context.js - 재생 컨텍스트 + 재생 순서 관리

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
