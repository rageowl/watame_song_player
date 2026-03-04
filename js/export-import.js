function exportList() {
	let exportData = {}
	exportData["playListData"] = playList_getJson()
	exportData["individualVolumeData"] = volume_getJson()
	exportData["settings"] = settings_getJson()
	let text = JSON.stringify(exportData)

	const zip = new JSZip();
	zip.file("sample.txt", text, { compression: "DEFLATE", compressionOptions: { level: 9 } });

	zip.generateAsync({ type: "base64" })
		.then(function (base64) {
			exportimportDialogEdit.value = JSON.stringify({ version: 1, data : base64 })
		})
		.catch(function (err) {
			console.error("Error generating zip file:", err);
		});

	if (typeof exportimportDialog.showModal === "function") {
		exportimportDialog.showModal();
	} else {
		alert("The <dialog> API is not supported by this browser");
	}
}
function base64ToArrayBuffer(base64)
{
	const binaryString = atob(base64);
	const len = binaryString.length;
	const bytes = new Uint8Array(len);
	for (let i = 0; i < len; i++) {
		bytes[i] = binaryString.charCodeAt(i);
	}
	return bytes.buffer;
}
function importList() {
	exportimportDialogEdit.value = ''
	exportimportDialog.onclose = function() {
		if (exportimportDialog.returnValue == 'ok') {
			playListTable_deleteAll()

			let importData = {
				"playListData" : {},
				"individualVolumeData" : {},
				"settings" : {}
			};
			
			try {
				let Text = exportimportDialogEdit.value
				importData = JSON.parse(Text)
			} catch(err) {
			}
			
			if (importData["version"] == 1)
			{
				let data = importData["data"];
				const arrayBuffer = base64ToArrayBuffer(data);
				const zip = new JSZip();

				zip.loadAsync(arrayBuffer)
					.then(function (zip) {
						return zip.file("sample.txt").async("text");
					})
					.then(function (text) {
						try {
							importData = JSON.parse(text)
						} catch(err) {
						}
						localStorage.setItem("watamePlayer_PlayList", JSON.stringify(importData["playListData"]))
						localStorage.setItem("watamePlayer_Volumes", JSON.stringify(importData["individualVolumeData"]))
						localStorage.setItem("watamePlayer_settings", JSON.stringify(importData["settings"]))

						readData();
					})
					.catch(function (err) {
						console.error("Error decompressing zip file:", err);
					});
			}
			else
			{
				localStorage.setItem("watamePlayer_PlayList", JSON.stringify(importData["playListData"]))
				localStorage.setItem("watamePlayer_Volumes", JSON.stringify(importData["individualVolumeData"]))
				localStorage.setItem("watamePlayer_settings", JSON.stringify(importData["settings"]))

				readData();
			}

		}
	}
	if (typeof exportimportDialog.showModal === "function") {
		exportimportDialog.showModal();
	} else {
		alert("The <dialog> API is not supported by this browser");
	}
}
function TestClipTime_Start_onClick()
{
	let startTime = TestClipTime_Start.value
	if (startTime.length == 0)
	{
		startTime = "00:00:00"
	}
	startTime = getSeconds(startTime);
	videoControl_oninput(startTime);
	videoControl_onchange(startTime);
	let state = player_getPlayerState()
	if (state == YT.PlayerState.PAUSED) {
		player.playVideo()
	}
}
function TestClipTime_End_onClick()
{
	let endTime = TestClipTime_End.value;
	if (endTime.length == 0)
	{
		let currenTime = player.getCurrentTime();
		endTime = secondsToTime(currenTime);
		TestClipTime_End.value = endTime;
	}
	endTime = getSeconds(endTime);
	let restartTime = endTime - 5;
	videoControl_oninput(restartTime);
	videoControl_onchange(restartTime);
	playState.testPlayerEndTime = endTime;
	let state = player_getPlayerState()
	if (state == YT.PlayerState.PAUSED) {
		player.playVideo()
	}
}
function TestClipTime_End_onFocus(input)
{
	let state = player_getPlayerState()
    if (input.value === '' && (state == YT.PlayerState.PLAYING || state == YT.PlayerState.PAUSED))
	{
        input.value = input.placeholder;
        input.select();
    }
}
