// playlist-playback.js - YouTube 재생 제어 + 플레이어 이벤트

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
function playListItems_play(playItem) {
	const playList = playItem.playList
	const ctx = playContext_get(playList)
	const data = playList.data

	playContext_copyFromView()
	ctx.currentPlayingItem = playItem
	playContext_play_r(ctx)
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
	if (event.data === 101 || event.data === 150 || event.data === 153) {
		if (currentVideoClip && !currentVideoClip.restricted) {
			currentVideoClip.restricted = true
			playVideoData(currentVideoClip)
		}
	}
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
