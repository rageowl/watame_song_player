// playlist-playback.js - YouTube 재생 제어 + 플레이어 이벤트

function common_pauseVideo(refresh = true) {
	playButton.innerText = '\u25b6'
	if (playState.playerLoaded) {
		player.pauseVideo()
		}
	if (playState.popupWnd) {
		playState.popupWnd.close()
		playState.popupWnd = null
	}
	if (playState.interval) {
		clearInterval(playState.interval)
		playState.interval = null
	}
	if (refresh) {
		refreshControlPanel()
}
}
function common_stopVideo(refresh = true) {
	for (let i = 0; i < playState.playContextStack.length; ++i) {
		playState.playContextStack[i].currentPlayingItem = undefined
	}
	array_clear(playState.playContextStack)
	playState.currentVideoClip = null
	if (playState.playerLoaded) {
		player.stopVideo()
	}
	common_pauseVideo(refresh)
}
function player_getVolume() {
	return playState.ReservedVolume != undefined
	? playState.ReservedVolume
	: playState.playerLoaded
		? player.getVolume()
		: 100
}
function getLink(value) {
	let start = getSeconds(value.start, 0)
	let url = ["https://www.youtube.com/watch?v=", value.ID]
	if (start > 0) {
		url.push("&t=", start)
	}
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
	return playState.playerLoaded ? player.getPlayerState() : YT.PlayerState.ENDED
}
function refreshPlayButton() {
	if (playState.popupWnd) {
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
	if (!playContext_play_r(ctx)) {
		common_stopVideo()
	}
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

	if (playState.viewContextStack.length) {
		let lastCtx = playState.viewContextStack[playState.viewContextStack.length - 1]
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

	if (playState.popupWnd) {
		playState.popupWnd.close()
		playState.popupWnd = null
	}
	if (playState.interval) {
		clearInterval(playState.interval)
		playState.interval = null
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

	playState.currentVideoClip = data
	let beginTime = Date.now()
	console.log('[' + beginTime + ']playVideoData: ' + playState.currentVideoClip.key)
	TestClipTime_Start.value = data.start
	if (data.start.length == 0)
	{
		TestClipTime_Start.placeholder = "00:00:00"
	}
	TestClipTime_End.value = data.end
	let startTime = getSeconds(data.start, 0)
	let endtime = getSeconds(data.end, -1)
	playState.testPlayerEndTime = -1
	let playingKey = ++playState.playCounter

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
		playState.popupWnd = openWindow(data)
		if (playState.popupWnd == null) {
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

	playState.interval = setInterval(function() {
		curTime = Date.now()
		if (playState.popupWnd) {
			if (endtime >= 0) {
				let restMilliseconds = (beginTime + (endtime - startTime + 10) * 1000) - curTime
				if (restMilliseconds <= 0 && !playState.popupWnd.closed && playingKey == playState.playCounter) {
					onFinishVideo(false)
				}
				let value = (curTime - beginTime) / 1000 + startTime
				videoControl.value = value
			}
			if ((curTime - beginTime) > 5000 && playState.popupWnd && playState.popupWnd.closed && playingKey == playState.playCounter) {
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
					if (playState.ReservedStartTime != undefined)
					{
						let diff = Math.abs(currentTime - playState.ReservedStartTime);
						if (diff > 1)
						{
							player.seekTo(playState.ReservedStartTime, true);
						}
						else
						{
							//console.log('OnInterval.setVolume' + ';currentTime:' + currentTime)
							player.setVolume(playState.ReservedVolume)
							playState.ReservedStartTime = undefined
							playState.LastVideoTime = currentTime
						}
					}
					else
					{
						let diff = Math.abs(playState.LastVideoTime - currentTime)
						if (diff > 1.5 && (curTime - beginTime) <= 10000)
						{
							console.log('OnInterval.ForcedRefresh: ' + playState.currentVideoClip.key)
							player.seekTo(playState.LastVideoTime, true);
						}
						else if (playState.testPlayerEndTime >= 0 && playState.testPlayerEndTime < currentTime)
						{
							player.pauseVideo()
							playState.testPlayerEndTime = -1
						}
						else if (endtime < currentTime)
						{
							//console.log('OnInterval.FinishVideo' + ';currentTime:' + currentTime + ';endtime:' + endtime)
							console.log('OnInterval.FinishVideo: ' + playState.currentVideoClip.key)
							onFinishVideo(false)
						}
						else
						{
							playState.LastVideoTime = currentTime;
						}
					}
					if (TestClipTime_End.value.length == 0)
					{
						TestClipTime_End.placeholder = secondsToTime(currentTime)
					}
				}
				if (!volumeControl.isChanging) {
					if (playState.ReservedStartTime == undefined)
					{
						let CurrentVolume = player.getVolume();
						if (playState.ReservedVolume == undefined)
						{
							volumeControl_update(CurrentVolume)
						}
						else if (playState.ReservedVolume != CurrentVolume)
						{
							player.setVolume(playState.ReservedVolume)
						}
						else
						{
							playState.ReservedVolume = undefined;
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
	playState.playerLoaded = true
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
		if (playState.currentVideoClip && !playState.currentVideoClip.restricted) {
			playState.currentVideoClip.restricted = true
			playVideoData(playState.currentVideoClip)
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
	playState.ReservedStartTime = start
	playState.ReservedVolume = volume
	if (playState.ReservedVolume < 0)
	{
		playState.ReservedVolume = 0;
	}
	player.setVolume(0)
}
function onFinishVideo(bForce) {
	let CurTime = Date.now()
	if (bForce || CurTime - playState.LastExecFinishVideoTime > 1000)
	{
		playState.LastExecFinishVideoTime = CurTime
		playListItems_next(true)
	}
}
