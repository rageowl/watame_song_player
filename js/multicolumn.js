class MultiColumnList {
	constructor(div) {
		this._selectedDataKey = undefined
		this._selectedDataStartKey = undefined
		this._selectedDataKeys = []
		this._headers = []
		this._headerinfos = []
		this._data = []
		this._dataOrder = null
		this._dataIndexMap = new Map()
		this._minWidth = 0
		this._rowPerPage = 10
		this._rowOrderMap = new Map()
		this._deferredRefresh = 0
		this.draggable = false
		this._pointerPressed = false
		this._isDragged = false
		this._canDragStart = false
		this._pointerDownElement = null
		this._divEnterCount = 0
		this._rowEnterCount = 0
		this._rowDropped = false
		this._currentHeaderInfo = null
		this._headerFilterItems = []
		this._filterFunction = null
		this.selectMode = false
	  
		let obj = this
		let tblWrap = document.createElement('div')
		tblWrap.tabIndex = -1
		tblWrap.onkeydown = this.getOnKeyDown()
		div.parentNode.replaceChild(tblWrap, div)
		
		let userTblHead = document.createElement('div');
		tblWrap.appendChild(userTblHead)
		
		let tblHeader = document.createElement('table');
		userTblHead.appendChild(tblHeader)
		
		this.tblHeaderColGroup = document.createElement('colgroup');
		tblHeader.appendChild(this.tblHeaderColGroup)
		
		let th = tblHeader.createTHead()
		this.headerRow = th.insertRow()
		
		let userTbl = document.createElement('div');
		
		userTbl.ondrop = function(ev) {
			this.setAttribute('dragHover', 0)
			--obj._divEnterCount
			if (obj.ondrop && !obj._rowDropped) {
				obj.ondrop(ev, null, false)
			}
			obj._rowDropped = false
		}
		userTbl.ondragover = function(ev) {
			if (obj._divEnterCount == 1 && obj._rowEnterCount == 0) {
				if (obj.ondragover && obj.ondragover(ev, null)) {
					this.setAttribute('dragHover', 1)
				}
			}
		}
		userTbl.ondragenter = function(ev) {
			++obj._divEnterCount
			if (obj.ondragenter) {
				obj.ondragenter(ev, null)
			}
		}
		userTbl.ondragleave = function(ev) {
			--obj._divEnterCount
			if (obj.ondragleave) {
				obj.ondragleave(ev, null)
			}
			this.setAttribute('dragHover', 0)
		}
		
		let tblBody = document.createElement('table');
		userTbl.appendChild(tblBody)
		tblWrap.appendChild(userTbl)
		
		let sl = 0
		userTbl.onscroll = function(event) {
			if (sl != userTbl.scrollLeft) {
				sl = userTbl.scrollLeft;
				userTblHead.scrollTo(sl, 0);
			}
		}
		tblBody.ondblclick = function(e) {
			/*
			let element = document.elementFromPoint(e.clientX, e.clientY)
			while (true) {
				if (!element) {
					return
				}
				if (element instanceof HTMLTableRowElement) {
					break
				}
				element = element.parentElement
			}
			
			let event = new MouseEvent('dblclick')
			element.dispatchEvent(event);
			*/
			if (obj.ondblclick) {
				obj.ondblclick(e)
			}
		}
		tblBody.onpointerdown = function(e) {
			let element = document.elementFromPoint(e.clientX, e.clientY)
			while (true) {
				if (!element) {
					return
				}
				if (element instanceof HTMLTableRowElement) {
					break
				}
				element = element.parentElement
			}
			
			const rowIndex = element.rowIndex
			if (!obj.isValidRowIndex(rowIndex) || obj.rows[rowIndex] != element) {
				return
			}
			const dataKey = obj.getDataKeyByRowIndex(rowIndex)
			obj._pointerDownElement = element
			obj._pointerPressed = true
			obj._isDragged = false
			obj._canDragStart = obj.isSelectedRow(dataKey)
			this.setPointerCapture(e.pointerId)
		}
		tblBody.onmousemove = function(e) {
			if (obj._pointerPressed && !obj._canDragStart) {
				if (!obj._isDragged && obj._pointerDownElement) {
					const rowIndex = obj._pointerDownElement.rowIndex
					const dataKey = obj.getDataKeyByRowIndex(rowIndex)
					obj._selectRow(dataKey, rowIndex, e.shiftKey, e.ctrlKey || obj.selectMode)
				}
				let element = document.elementFromPoint(e.clientX, e.clientY)
				while (true) {
					if (!element) {
						return
					}
					if (element instanceof HTMLTableRowElement) {
						break
					}
					element = element.parentElement
				}
				const rowIndex = element.rowIndex
				if (!obj.isValidRowIndex(rowIndex) || obj.rows[rowIndex] != element) {
					return
				}
				const dataKey = obj.getDataKeyByRowIndex(rowIndex)
				obj._selectRow(dataKey, rowIndex, true, e.ctrlKey)
				obj._isDragged = true
			}
		}
		tblBody.onpointerup = function(e) {
			if (obj._pointerPressed) {
				if (!obj._isDragged && obj._pointerDownElement) {
					let rc = obj._pointerDownElement.getBoundingClientRect()
					if (rc.left <= e.clientX && e.clientX < rc.right && rc.top <= e.clientY && e.clientY < rc.bottom) {
						const rowIndex = obj._pointerDownElement.rowIndex
						const dataKey = obj.getDataKeyByRowIndex(rowIndex)
						if (e.button == 2 && obj.isSelectedRow(dataKey)) {
							obj._selectedDataKey = dataKey
						} else if (!obj.selectMode) {
							obj._selectRow(dataKey, rowIndex, e.shiftKey, e.ctrlKey)
						}
					}
				}
				obj._pointerPressed = false
				obj._isDragged = false
				obj._pointerDownElement = null
				obj._canDragStart = false
				this.setPointerCapture(e.pointerId)
			}
		}
		
		this.tblBodyColGroup = document.createElement('colgroup');
		tblBody.appendChild(this.tblBodyColGroup)
		tblBody.style.minHeight = 1
		
		this.tblWrap = tblWrap
		this.userTblHead = userTblHead
		this.userTbl = userTbl
		this.tblHeader = tblHeader
		this.tblBody = tblBody
		
		let _divFilter = document.createElement('div')
		document.body.appendChild(_divFilter);
		_divFilter.style.position = 'absolute'
		_divFilter.style.display = 'none'
		_divFilter.style.flexDirection = 'column'
		_divFilter.style.alignItems = 'stretch'
		_divFilter.tabIndex = -1
		
		let sortAsc = document.createElement('button');
		sortAsc.style.width = '100%'
		sortAsc.textContent = 'Sort, A->Z'
		let sortDsc = document.createElement('button');
		sortDsc.style.width = '100%'
		sortDsc.textContent = 'Sort, Z->A'
		let selectAll = document.createElement('button');
		selectAll.style.width = '50%'
		selectAll.textContent = 'SelectAll'
		let clearAll = document.createElement('button');
		clearAll.style.width = '50%'
		clearAll.textContent = 'ClearAll'
		let search = document.createElement('input');
		search.style.width = '100%'
		search.style.boxSizing = 'border-box'
		search.type = 'text'
		let _divFilterItems = document.createElement('div');
		_divFilterItems.style.width = 300 + 'px'
		_divFilterItems.style.overflow = 'hidden'
		_divFilterItems.style.display = 'flex'
		_divFilterItems.style.flexDirection = 'column'
		_divFilterItems.style.alignItems = 'stretch'
		let divListPanel = document.createElement('div');
		divListPanel.style.height = 150 + 'px'
		divListPanel.style.overflowY = 'auto'
		divListPanel.appendChild(_divFilterItems)
		let cancel = document.createElement('button');
		cancel.style.width = '50%'
		cancel.textContent = 'Cancel'
		let confirm = document.createElement('button');
		confirm.style.width = '50%'
		confirm.textContent = 'OK'
		
		_divFilter.appendChild(sortAsc)
		_divFilter.appendChild(sortDsc)
		let _divTemp = document.createElement('div');
		_divTemp.style.width = '100%'
		_divTemp.appendChild(selectAll)
		_divTemp.appendChild(clearAll)
		_divFilter.appendChild(_divTemp)
		_divFilter.appendChild(search)
		_divFilter.appendChild(divListPanel)
		_divTemp = document.createElement('div');
		_divTemp.style.width = '100%'
		_divTemp.appendChild(cancel)
		_divTemp.appendChild(confirm)
		_divFilter.appendChild(_divTemp)
		
		this._divFilter = _divFilter
		this._divFilterItems = _divFilterItems
		this._divListPanel = divListPanel
		this._filterSearch = search
		this._sortAsc = sortAsc
		this._sortDsc = sortDsc
		
		_divFilter.onkeydown = function(e) {
			if (e.keyCode == 27) {
				obj.closeHeaderFilterDiv()
			}
		}
		sortAsc.onclick = function() {
			let header = obj._currentHeaderInfo.header
			obj._data.sort(function(a,b) {
				a = header_getData(header, a)
				b = header_getData(header, b)
				return a < b ? -1 : a > b ? 1 : 0
			})
			obj.refreshDataIndexMap()
			obj.refreshList()
			obj.closeHeaderFilterDiv()
			if (obj.onSorted) {
				obj.onSorted(1)
			}
		}
		sortDsc.onclick = function() {
			let header = obj._currentHeaderInfo.header
			obj._data.sort(function(a,b) {
				a = header_getData(header, a)
				b = header_getData(header, b)
				return a < b ? 1 : a > b ? -1 : 0
			})
			obj.refreshDataIndexMap()
			obj.refreshList()
			obj.closeHeaderFilterDiv()
			if (obj.onSorted) {
				obj.onSorted(2)
			}
		}
		selectAll.onclick = function() {
			obj.setAllHeaderFilterItemsFlag(true)
		}
		clearAll.onclick = function() {
			obj.setAllHeaderFilterItemsFlag(false)
		}
		cancel.onclick = function() {
			obj.closeHeaderFilterDiv()
		}
		confirm.onclick = function() {
			let _headerFilterItems = obj._headerFilterItems
			let info = obj._currentHeaderInfo
			let filterMap = info.filterMap
			let checkedAll = true
			for (let i = 0; i < _headerFilterItems.length; ++i) {
				let item = _headerFilterItems[i]
				let checked = item.checkbox.checked
				filterMap.get(item.text).checked = checked
				checkedAll = checkedAll && checked
			}
			info.checkedAll = checkedAll
			info.button.textContent = info.header.name + (checkedAll ? '🔽' : '⏬')
			obj.closeHeaderFilterDiv()
			obj.updateFilter()
		}
		search.oninput = function(e) {
			obj.refreshHeaderFilterItems(search.value.toLowerCase())
		}
		_divFilter.onpointerdown = function(e) {
			e.stopPropagation()
		}
		document.addEventListener('pointerdown', function(e) {
			obj.closeHeaderFilterDiv()
		})
	}
	updateFilter() {
		let dataList = this.dataList
		let newDataOrder = []
		for (let i = 0; i < dataList.length; ++i) {
			let data = dataList[i]
			let dataKey = data.key
			let succeeded = true
			if (this._filterFunction) {
				succeeded = this._filterFunction(data)
			}
			if (succeeded) {
				for (let j = 0; j < this._headerinfos.length; ++j) {
					let info = this._headerinfos[j]
					if (info.checkedAll) {
						continue
					}
					let text = header_getData(info.header, data).toString().toLowerCase()
					let result = info.filterMap.get(text).checked
					if (!result) {
						succeeded = false
						break
					}
				}
			}
			if (succeeded) {
				newDataOrder.push(dataKey)
			}
		}
		if (newDataOrder.length == dataList.length) {
			this.setDataOrder(null)
		} else {
			this.setDataOrder(newDataOrder)
		}
	}
	set filterFunction(func) {
		if (this._filterFunction != func) {
			this._filterFunction = func
			this.updateFilter()
		}
	}
	closeHeaderFilterDiv() {
		this._divFilter.style.display = 'none'
		this._currentHeaderInfo = null
	}
	get mainDivClassName() {
		return this.tblWrap.className
	}
	get headerDivClassName() {
		return this.userTblHead.className
	}
	get bodyDivClassName() {
		return this.userTbl.className
	}
	set mainDivClassName(className) {
		this.tblWrap.className = className
	}
	set headerDivClassName(className) {
		this.userTblHead.className = className
	}
	set bodyDivClassName(className) {
		this.userTbl.className = className
	}
	getOnKeyDown() {
		let obj = this
		return function(e) {
			let dataKey = obj.selectedDataKey
			let rowIndex;			
			//console.log(e.keyCode)
			let startKey = obj._selectedDataStartKey
			let startIdx = startKey != undefined ? obj.getRowIndex(startKey) : 0
			if (e.keyCode == 38) {
				if (dataKey == undefined) {
					rowIndex = obj.rowCount - 1
				} else {
					rowIndex = obj.getRowIndex(dataKey) - 1
				}
			} else if (e.keyCode == 40) {
				++rowIndex
				if (dataKey == undefined) {
					rowIndex = 0
				} else {
					rowIndex = obj.getRowIndex(dataKey) + 1
				}
			} else if (e.keyCode == 36) {
				rowIndex = 0
			} else if (e.keyCode == 35) {
				rowIndex = obj.rowCount - 1
			} else if (e.keyCode == 33) {
				if (dataKey == undefined) {
					rowIndex = 0
				} else {
					rowIndex = obj.getRowIndex(dataKey) - obj._rowPerPage
				}
			} else if (e.keyCode == 34) {
				if (dataKey == undefined) {
					rowIndex = 0
				} else {
					rowIndex = obj.getRowIndex(dataKey)
				}
				rowIndex += obj._rowPerPage
			} else if (e.ctrlKey && e.keyCode == 65) {
				startIdx = 0
				rowIndex = obj.rowCount - 1
				obj.clearSelection()
				for (let i = startIdx; i <= rowIndex; ++i) {
					obj._setRowSelection(obj.getDataKeyByRowIndex(i), i)
				}
				e.preventDefault()
				return
			} else {
				if (obj.onkeydown) {
					obj.onkeydown(e)
				}
				return
			}
			
			e.preventDefault()
			rowIndex = obj.clampRowIndex(rowIndex)
			dataKey = obj.getDataKeyByRowIndex(rowIndex)
			if (e.ctrlKey && e.shiftKey) {
			} else if (e.shiftKey) {
				obj.clearSelection()
				let endIdx = rowIndex
				obj._selectedDataStartKey = obj.getDataKeyByRowIndex(startIdx)
				obj._selectedDataKey = dataKey
				if (startIdx > endIdx) {
					[endIdx, startIdx] = [startIdx, endIdx]
				}
				for (let i = startIdx; i <= endIdx; ++i) {
					obj._setRowSelection(obj.getDataKeyByRowIndex(i), i)
				}
				obj.scrollToRow(endIdx, false)
			} else if (e.ctrlKey) {
			} else {
				obj.setRowSelection(dataKey, false)
			}
		}
	}
	clampRowIndex(idx) {
		let len = this.tblBody.rows.length
		if (idx < 0) {
			return 0
		} else if (len <= idx) {
			if (len == 0) {
				return 0
			}
			return len - 1
		}
		return idx
	}
	get rowCount() {
		return this.tblBody.rows.length
	}
	get length() {
		return this._data.length
	}
	get selectedDataKey() {
		return this._selectedDataKey
	}
	get selectedData() {
		return this.getDataByKey(this._selectedDataKey)
	}
	set selectedDataKey(dataKey) {
		let rowIdx = this.getRowIndex(dataKey)
		if (rowIdx != -1) {
			this.clearSelection()
			this.setRowSelection(dataKey, rowIdx)
		}
	}
	get selectedDataIndex() {
		let val = this._dataIndexMap.get(this._selectedDataKey)
		return val != undefined ? val : -1
	}
	get selectedRowIndex() {
		return this.getRowIndex(this._selectedDataKey)
	}
	setRowSelection(dataKey, focusOption) {
		let rowIdx = this.getRowIndex(dataKey)
		if (rowIdx < 0 || this.tblBody.rows.length <= rowIdx) {
			this._selectedDataKey = undefined
		} else {
			this.clearSelection()
			this._setRowSelection(dataKey, rowIdx)
			this._selectedDataKey = dataKey
			this._selectedDataStartKey = dataKey
			this.scrollToRow(rowIdx, focusOption)
		}
	}
	set selectedDataIndex(dataIdx) {
		this.setRowSelection(dataIdx, true)
	}
	set selectedRowIndex(rowIdx) {
		this.setRowSelection(this.getDataKeyByRowIndex(rowIdx), true)
	}
	scrollToRow(rowIdx, option) {
		if (rowIdx < 0) {
			rowIdx = this.tblBody.rows.length + rowIdx
		}
		this.tblBody.rows[rowIdx].scrollIntoViewIfNeeded(option)
	}
	scrollToRowByDataKey(dataKey, option) {
		let rowIdx = this.getRowIndex(dataKey)
		if (rowIdx != -1) {
			this.scrollToRow(rowIdx, option)
		}
	}
	get rows() {
		return this.tblBody.rows
	}
	setHeader(headers) {
		this._headers = headers
		//removeAllChildNodes(this.tblHeaderColGroup)
		//removeAllChildNodes(this.tblBodyColGroup)
		this.tblHeaderColGroup.replaceChildren()
		this.tblBodyColGroup.replaceChildren()
		
		let width = 0
		let len = headers.length
		for (let i = 0; i < len; ++i) {
			let header = headers[i]
			let w = header.width
			width += w
			let col1 = document.createElement('col')
			this.tblHeaderColGroup.appendChild(col1)
			let col2 = document.createElement('col')
			this.tblBodyColGroup.appendChild(col2)
			
			if (header.autoSize) {
				col1.style.minWidth = w + 'px'
				col2.style.minWidth = w + 'px'
			} else {
				col1.style.width = w + 'px'
				col2.style.width = w + 'px'
			}
		}
		
		let col = document.createElement('col')
		this.tblHeaderColGroup.appendChild(col)
		this._lastHeaderColumn = col
		
		this.tblBody.style.minWidth = width + 'px'
		this.tblHeader.style.minWidth = width + 'px'
		this._minWidth = width + 'px'
		//removeAllChildNodes(this.headerRow)
		this.headerRow.replaceChildren()
		
		this._headerinfos = []
		let obj = this
		for (let i = 0; i < headers.length; ++i) {
			let cell = document.createElement('th');
			this.headerRow.appendChild(cell)
			let header = headers[i]
			if (header.title) {
				cell.setAttribute('title', header.title)
			}
			let info = { idx:i, header:header, checkedAll:true, initFilter:true, sorted:true, filterList:[], filterMap:new Map() }
			this._headerinfos.push(info)
			if (header.filter) {
				let button = document.createElement('button');
				info.button = button
				cell.appendChild(button)
				button.textContent = header.name + '🔽'
				button.style = "font-size:14px;font-weight:bold"
				button.onclick = this.getToggleSortFunction(i)
			} else {
				let newText = document.createTextNode(header.name);
				cell.appendChild(newText);
			}
		}
		let cell = document.createElement('th');
		this.headerRow.appendChild(cell)
		
		this.adjustScroll()
		this.refreshList()
	}
	selectHeader(names) {
		let result = []
		for (let i = 0; i < names.length; ++i) {
			const name = names[i]
			for (let j = 0; j < this._headers.length; ++j) {
				const header = this._headers[j]
				if (header.id == name) {
					result.push(header)
					break
				}
			}
		}
		return result
	}
	static addDataToFilter(headerinfo, data) {
		let filterList = headerinfo.filterList
		let filterMap = headerinfo.filterMap
		let text = header_getData(headerinfo.header, data)
		text = isUndefined(text, '').toString().toLowerCase()
		let filterData = filterMap.get(text)
		if (filterData == undefined) {
			filterData = { data:[data], text:text, checked:true }
			filterList.push(filterData)
			filterMap.set(text, filterData)
			headerinfo.sorted = false
		} else {
			filterData.data.push(data)
		}
	}
	addDataToFilters(data) {
		for (let j = 0; j < this._headerinfos.length; ++j) {
			MultiColumnList.addDataToFilter(this._headerinfos[j], data)
		}
	}
	getToggleSortFunction(index) {
		let obj = this
		let info = this._headerinfos[index]
		return function(e) {
			let filterList = info.filterList
			let filterMap = info.filterMap
			let header = info.header
			if (info.initFilter) {
				array_clear(filterList)
				filterMap.clear()
				let dataList = obj._data
				for (let i = 0; i < dataList.length; ++i) {
					MultiColumnList.addDataToFilter(info, dataList[i])
				}
				info.initFilter = false
				info.sorted = false
			}
			
			if (!info.sorted) {
				if (header.numeric) {
					filterList.sort(function(a, b) { return a.text - b.text })
				} else {
					filterList.sort()
				}
				info.sorted = true
			}
			
			let _divFilterItems = obj._divFilterItems
			//removeAllChildNodes(_divFilterItems)
			_divFilterItems.replaceChildren()
			obj._headerFilterItems = []
			for (let i = 0; i < filterList.length; ++i) {
				let text = filterList[i].text
				let label = document.createElement('label')
				let checkbox = document.createElement('input')
				checkbox.type = 'checkbox'
				checkbox.style.cursor = 'pointer'
				checkbox.checked = filterMap.get(text).checked
				label.appendChild(checkbox)
				label.appendChild(document.createTextNode(text.length ? text : '(empty)'))
				label.style.textOverflow = 'ellipsis'
				label.style.whiteSpace = 'nowrap'
				label.style.overflow = 'hidden'
				label.style.display = 'inline-block'
				label.style.width = '100%'
				label.style.userSelect = 'none'
				label.style.cursor = 'pointer'
				label.title = text
				_divFilterItems.appendChild(label)
				let found = true
				if (obj._filterFunction) {
					let data = filterList[i].data
					found = false
					for (let j = 0; j < data.length; ++j) {
						if (obj._filterFunction(data[j])) {
							found = true
							break
						}
					}
				}
				if (!found) {
					label.style.display = 'none'
				}
				obj._headerFilterItems.push({ text:text, label:label, checkbox:checkbox, enabled:found, display:found })
			}

			let style = obj._divFilter.style
			let viewportOffset = this.getBoundingClientRect();
			let offsetX = viewportOffset.left, offsetY = viewportOffset.bottom
			if (document.documentElement && (document.documentElement.scrollTop || document.documentElement.scrollLeft))
			{
				offsetX += document.documentElement.scrollLeft;
				offsetY += document.documentElement.scrollTop;
			}
			else if (document.body && (document.body.scrollTop || document.body.scrollLeft))
			{
				offsetX += document.body.scrollLeft;
				offsetY += document.body.scrollTop;
			}
			else if (window.pageXOffset || window.pageYOffset)
			{
				offsetX += window.pageXOffset;
				offsetY += window.pageYOffset;
			}
			
			style.left = offsetX + 'px'
			style.top = offsetY + 'px'
			style.background = 'white'
			style.display = 'flex'
			style.zIndex = 100

			let rc = obj._divFilter.getBoundingClientRect()
			if (rc.right > window.innerWidth) {
				style.left = (window.innerWidth - rc.width - 20) + 'px'
			}
			obj._sortAsc.style.display = header.sort ? '' : 'none'
			obj._sortDsc.style.display = header.sort ? '' : 'none'
			obj._divListPanel.scrollTo(0, 0)
			
			obj._divFilter.focus()
			obj._filterSearch.value = ''
			obj._currentHeaderInfo = info
		}
	}
	setAllHeaderFilterItemsFlag(val) {
		let _headerFilterItems = this._headerFilterItems
		for (let i = 0; i < _headerFilterItems.length; ++i) {
			let item = _headerFilterItems[i]
			if (item.display) {
				item.checkbox.checked = val
			}
		}
	}
	refreshHeaderFilterItems(text) {
		let _headerFilterItems = this._headerFilterItems
		for (let i = 0; i < _headerFilterItems.length; ++i) {
			let item = _headerFilterItems[i]
			if (!item.enabled) {
				continue
			}
			let display = text.length == 0 || item.text.indexOf(text) != -1
			item.display = display
			item.label.style.display = display ? '' : 'none'
		}
	}
	resetFilterCache() {
		for (let j = 0; j < this._headerinfos.length; ++j) {
			let info = this._headerinfos[j]
			info.checkedAll = true
			info.initFilter = true
		}
	}
	setData(data) {
		this._data = data
		this.refreshDataIndexMap()
		this.resetFilterCache()
		this.rebuildList()
	}
	_getCellHoverFunction(text) {
		return function (e) {
			if (this.offsetWidth < this.scrollWidth) {
				this.setAttribute('title', text)
			}
		}
	}
	adjustScroll() {
		let width = this._minWidth
		//console.log(this.userTbl.scrollHeight, this.userTbl.clientHeight)
		if ((this.userTbl.scrollHeight == 0 && this.userTbl.clientHeight == 0) || (this.userTbl.scrollHeight > this.userTbl.clientHeight)) {
			this._lastHeaderColumn.style.width = 17 + 'px'
			width += 17
		} else {
			this._lastHeaderColumn.style.width = 0 + 'px'
		}
		this.tblHeader.style.minWidth = width + 'px'
	}
	getOnDblClick() {
		let obj = this
		return function(e) {
			if (obj.ondblclick) {
				obj.ondblclick(e)
			}
		}
	}
	getRowIndex(dataKey) {
		let idx = this._rowOrderMap.get(dataKey)
		return idx != undefined ? idx : -1
	}
	getDataKeyByRowIndex(rowIdx) {
		if (rowIdx < 0) {
			return undefined
		}
		if (this._dataOrder) {
			return rowIdx < this._dataOrder.length ? this._dataOrder[rowIdx] : undefined
		}
		return rowIdx < this._data.length ? this._data[rowIdx].key : undefined
	}
	getDataIndexByRowIndex(rowIdx) {
		let key = this.getDataKeyByRowIndex(rowIdx)
		return key != undefined ? this._dataIndexMap.get(key) : -1
	}
	getDataIndexByKey(dataKey) {
		let idx = this._dataIndexMap.get(dataKey)
		return idx != undefined ? idx : -1
	}
	_selectRow(dataKey, rowIndex, shiftKey, ctrlKey) {
		if (ctrlKey && shiftKey) {
			if (this._selectedDataStartKey == undefined) {
				this._setRowSelection(dataKey, rowIndex)
				this._selectedDataKey = dataKey
				this._selectedDataStartKey = dataKey
			} else {
				let startIdx = this._selectedDataStartKey
				if (this.isSelectedRow(startIdx)) {
					startIdx = this.getRowIndex(startIdx)
					let endIdx = rowIndex
					if (startIdx > endIdx) {
						[endIdx, startIdx] = [startIdx, endIdx]
					}
					for (let i = startIdx; i <= endIdx; ++i) {
						this._setRowSelection(this.getDataKeyByRowIndex(i), i)
					}
					this._selectedDataKey = dataKey
				} else {
					this._selectedDataStartKey = dataKey
				}
			}
		} else if (shiftKey) {
			let startKey = this._selectedDataStartKey
			this.clearSelection()
			if (startKey == undefined) {
				this._setRowSelection(dataKey, rowIndex)
				this._selectedDataKey = dataKey
				this._selectedDataStartKey = dataKey
			} else {
				let startIdx = this.getRowIndex(startKey)
				let endIdx = rowIndex
				if (startIdx > endIdx) {
					[endIdx, startIdx] = [startIdx, endIdx]
				}
				for (let i = startIdx; i <= endIdx; ++i) {
					this._setRowSelection(this.getDataKeyByRowIndex(i), i)
				}
				this._selectedDataStartKey = startKey
				this._selectedDataKey = dataKey
			}
		} else if (ctrlKey) {
			let idx = this._selectedDataKeys.indexOf(dataKey)
			if (idx == -1) {
				this._setRowSelection(dataKey, rowIndex)
				this._selectedDataKey = dataKey
			} else {
				this._selectedDataKeys.splice(idx, 1)
				this.clearRowSelectionStyle(rowIndex)
			}
			this._selectedDataStartKey = dataKey
		} else {
			this.clearSelection()
			this._setRowSelection(dataKey, rowIndex)
			this._selectedDataKey = dataKey
			this._selectedDataStartKey = dataKey
		}
	}
	get selectedDataKeys() {
		return this._selectedDataKeys
	}
	get headers() {
		return this._headers
	}
	isSelectedRow(dataKey) {
		return this._selectedDataKeys.indexOf(dataKey) != -1
	}
	_setRowSelection(dataKey, rowIdx) {
		this.setRowSelectionStyle(rowIdx)
		if (this._selectedDataKeys.indexOf(dataKey) == -1) {
			this._selectedDataKeys.push(dataKey)
		}
	}
	isValidRowIndex(rowIdx) {
		return 0 <= rowIdx && rowIdx < this.rowCount
	}
	setDataRowSelection(dataKey, select) {
		let rowIdx = this.getRowIndex(dataKey)
		if (rowIdx == -1) {
			return
		}
		let idx = this._selectedDataKeys.indexOf(dataKey)
		if (select && idx == -1) {
			this.setRowSelectionStyle(rowIdx)
			this._selectedDataKeys.push(dataKey)
		} else if (idx != -1) {
			this.clearRowSelectionStyle(rowIdx)
			this._selectedDataKeys.splice(idx, 1)
		}
	}
	setRowSelectionStyle(rowIdx) {
		this.tblBody.rows[rowIdx].setAttribute('selected', true)
	}
	clearRowSelectionStyle(rowIdx) {
		this.tblBody.rows[rowIdx].setAttribute('selected', false)
	}
	selectAll() {
		if (this._data.length <= 0) {
			return
		}
		this._selectedDataKeys = []
		for (let i = 0; i < this._data.length; ++i) {
			this._selectedDataKeys.push(this._data[i].key)
			this.setRowSelectionStyle(i)
		}

		this._selectedDataKey = this._data[0].key
		this._selectedDataStartKey = this._data[0].key
	}
	clearSelection() {
		for (let i = 0; i < this._selectedDataKeys.length; ++i) {
			this.clearRowSelectionStyle(this.getRowIndex(this._selectedDataKeys[i]))
		}
		this._selectedDataKeys = []
		this._selectedDataKey = undefined
		this._selectedDataStartKey = undefined
	}
	refreshSelection() {
		for (let i = 0; i < this._selectedDataKeys.length; ++i) {
			this.setRowSelectionStyle(this.getRowIndex(this._selectedDataKeys[i]))
		}
	}
	get dataList() {
		return this._data
	}
	getData(dataIndex) {
		return this._data[dataIndex]
	}
	getDataByKey(dataKey) {
		if (Array.isArray(dataKey)) {
			let items = []
			for (let i = 0; i < dataKey.length; ++i) {
				let idx = this.getDataIndexByKey(dataKey[i])
				if (idx != -1) {
					items.push(this._data[idx])
				}
			}
			return items
		} else {
			let idx = this.getDataIndexByKey(dataKey)
			return idx != -1 ? this._data[idx] : null
		}
	}
	get dataOrder() {
		return this._dataOrder
	}
	rebuildList() {
		this._dataOrder = null
		this.refreshList()
	}
	copyDataOrder() {
		if (this._dataOrder) {
			return this._dataOrder.slice()
		}
		let dataOrder = []
		let dataList = this._data
		for (let i = 0; i < dataList.length; ++i) {
			dataOrder.push(dataList[i].key)
		}
		return dataOrder
	}
	setDataOrder(newDataOrder) {
		if (this._deferredRefresh) {
			this._dataOrder = newDataOrder
			return 
		}
		if (this._dataOrder == newDataOrder || newDataOrder == null) {
			this._dataOrder = newDataOrder
			this.refreshList()
			return
		}
		if (this._dataOrder == null) {
			this._dataOrder = newDataOrder
			this.refreshList()
			return
		}
		let selectedDataKeys = this._selectedDataKeys
		this._selectedDataKeys = []
		
		this._rowOrderMap.clear()
		let oldDataOrder = this._dataOrder
		this._dataOrder = newDataOrder
		let len = Math.min(newDataOrder.length, oldDataOrder.length)
		for (let i = 0; i < len; ++i) {
			let key = newDataOrder[i]
			this._rowOrderMap.set(key, i)
			if (oldDataOrder[i] == key) {
				this.updateRow(key, i)
				continue
			}
			this.tblBody.deleteRow(i)
			let dataIdx = this._dataIndexMap.get(key)
			if (dataIdx != undefined) {
				this._insertRow(key, dataIdx, i)
			}
		}
		
		for (let i = this.rowCount - 1; i >= len; --i) {
			this.tblBody.deleteRow(i)
		}
		for (let i = len; i < newDataOrder.length; ++i) {
			let key = newDataOrder[i]
			this._rowOrderMap.set(key, i)
			let dataIdx = this._dataIndexMap.get(key)
			if (dataIdx != undefined) {
				this._insertRow(key, dataIdx, i)
			}
		}
		this.adjustScroll()
		for (let i = 0; i < selectedDataKeys.length; ++i) {
			let key = selectedDataKeys[i]
			let idx = this.getRowIndex(key)
			if (idx != -1) {
				this._setRowSelection(key, idx)
			}
		}
	}
	refreshDataIndexMap() {
		const _dataIndexMap = this._dataIndexMap
		const dataList = this._data
		
		_dataIndexMap.clear()
		for (let i = 0; i < dataList.length; ++i) {
			_dataIndexMap.set(dataList[i].key, i)
			
		}
	}
	refreshRowIndexMap() {
		const _rowOrderMap = this._rowOrderMap
		_rowOrderMap.clear()
		if (this._dataOrder) {
			const _dataOrder = this._dataOrder
			for (let i = 0; i < _dataOrder.length; ++i) {
				_rowOrderMap.set(_dataOrder[i], i)
			}
		} else {
			const _data = this._data
			for (let i = 0; i < _data.length; ++i) {
				_rowOrderMap.set(_data[i].key, i)
			}
		}
	}
	refreshList() {
		if (this._deferredRefresh) {
			return
		}
		let selectedDataKeys = this._selectedDataKeys
		this._selectedDataKeys = []
		
		let rows = this.rows
		for (let i = rows.length - 1; i >= 0; --i) {
			this.tblBody.deleteRow(i)
		}
		this._rowOrderMap.clear()
		
		if (this._dataOrder) {
			let dataOrder = this._dataOrder
			let newDataOrder = []
			let rowIdx = 0
			for (let i = 0; i < dataOrder.length; ++i) {
				let key = dataOrder[i]
				let dataIdx = this._dataIndexMap.get(key)
				if (dataIdx != undefined) {
					this._rowOrderMap.set(key, rowIdx)
					this._insertRow(key, dataIdx, rowIdx)
					newDataOrder.push(key)
					++rowIdx
				}
			}
			this._dataOrder = newDataOrder
		} else {
			let data = this._data
			for (let i = 0; i < data.length; ++i) {
				let key = data[i].key
				this._rowOrderMap.set(key, i)
				this._insertRow(key, i, i)
			}
		}
		this.adjustScroll()
		for (let i = 0; i < selectedDataKeys.length; ++i) {
			let key = selectedDataKeys[i]
			let idx = this.getRowIndex(key)
			if (idx != -1) {
				this._setRowSelection(key, idx)
			}
		}
	}
	getDataIndexesByKeys(keys) {
		let dataIndexes = []
		for (let i = 0; i < keys.length; ++i) {
			dataIndexes.push(this.getDataIndexByKey(keys[i]))
		}
		dataIndexes.sort(function(a,b) { return a - b; })
		return dataIndexes
	}
	getRowIndexesByKeys(keys) {
		let rowIndexes = []
		for (let i = 0; i < keys.length; ++i) {
			rowIndexes.push(this.getRowIndex(keys[i]))
		}
		rowIndexes.sort(function(a,b) { return a - b; })
		return rowIndexes
	}
	beginUpdate() {
		++this._deferredRefresh
	}
	endUpdate() {
		if (--this._deferredRefresh <= 0) {
			this._deferredRefresh = 0
			this.refreshList()
		}
	}
	deleteDataByKeys(keys) {
		let dataIndexes = this.getDataIndexesByKeys(keys)
		let rowIndexes = this.getRowIndexesByKeys(keys)
		let data = this._data
		let deletedDataList = []
		for (let i = dataIndexes.length - 1; i >= 0; --i) {
			let idx = dataIndexes[i]
			deletedDataList.push(data[idx])
			data.splice(idx, 1)
		}
		this.refreshDataIndexMap()
		if (this.dataOrder) {
			let dataOrder = this.dataOrder
			for (let i = rowIndexes.length - 1; i >= 0; --i) {
				dataOrder.splice(rowIndexes[i], 1)
			}
		}
		this.refreshRowIndexMap()
		this.refreshList()
		this.resetFilterCache()
		deletedDataList.reverse()
		return deletedDataList
	}
	deleteDataByKey(key) {
		let dataIndex = this.getDataIndexByKey(key)
		let rowIdx = this.getRowIndex(key)
		let dataList = this.dataList
		let deletedData = dataList[dataIndex]
		dataList.splice(dataIndex, 1)
		this.refreshDataIndexMap()
		if (this.dataOrder && rowIdx != -1) {
			this.dataOrder.splice(rowIdx, 1)
		}
		this.refreshRowIndexMap()
		this.resetFilterCache()
		this.refreshList()
		return deletedData
	}
	clampDataIndex(idx) {
		let len = this.length
		if (idx < 0) {
			return 0
		} else if (len <= idx) {
			if (len == 0) {
				return 0
			}
			return len - 1
		}
		return idx
	}
	insertDataList(dataList, atDataKey=null, front=false) {
		let _data = this._data
		if (atDataKey == null) {
			if (front) {
				for (let i = 0; i < dataList.length; ++i) {
					const data = dataList[i]
					this.addDataToFilters(data)
					_data.splice(i, 0, data)
					if (this._dataOrder) {
						this._dataOrder.splice(i, 0, data.key)
					}
				}
			} else {
				for (let i = 0; i < dataList.length; ++i) {
					const data = dataList[i]
					this.addDataToFilters(data)
					_data.push(data)
					if (this._dataOrder) {
						this._dataOrder.push(data.key)
					}
				}
			}
		} else {
			let idx = this.getDataIndexByKey(atDataKey)
			if (idx == -1) {
				for (let i = 0; i < dataList.length; ++i) {
					const data = dataList[i]
					this.addDataToFilters(data)
					_data.push(data)
					if (this._dataOrder) {
						this._dataOrder.push(data.key)
					}
				}
			} else {
				let rowIdx = this.getRowIndex(atDataKey)
				if (!front) {
					++idx
					if (rowIdx != -1) {
						++rowIdx
					}
				}
				for (let i = 0; i < dataList.length; ++i) {
					const data = dataList[i]
					this.addDataToFilters(data)
					_data.splice(idx + i, 0, data)
					if (this._dataOrder && rowIdx != -1) {
						this._dataOrder.splice(rowIdx + i, 0, data.key)
					}
				}
			}
		}
		this.refreshDataIndexMap()
		this.refreshRowIndexMap()
		this.refreshList()
	}
	insertData(data, atDataKey=null, front=false) {
		this.addDataToFilters(data)
		if (atDataKey == null) {
			if (front) {
				this._data.splice(0, 0, data)
				if (this._dataOrder) {
					this._dataOrder.splice(0, 0, data.key)
				}
				this.refreshDataIndexMap()
				this.refreshRowIndexMap()
			} else {
				this._dataIndexMap.set(data.key, this._data.length)
				this._data.push(data)
				if (this._dataOrder) {
					this._dataOrder.push(data.key)
				}
			}
		} else {
			let idx = this.getDataIndexByKey(atDataKey)
			if (idx == -1) {
				this._dataIndexMap.set(data.key, this._data.length)
				this._data.push(data)
				if (this._dataOrder) {
					this._dataOrder.push(data.key)
				}
			} else {
				let rowIdx = this.getRowIndex(atDataKey)
				if (!front) {
					++idx
					if (rowIdx != -1) {
						++rowIdx
					}
				}
				this._data.splice(idx, 0, data)
				if (this._dataOrder && rowIdx != -1) {
					this._dataOrder.splice(rowIdx, 0, data.key)
				}
				this.refreshDataIndexMap()
				this.refreshRowIndexMap()
			}
		}
		this.refreshList()
	}
	moveSelectionToFront() {
		if (this.selectedDataKeys.length == 0) {
			return
		}
		
		let rowIndexes = this.getRowIndexesByKeys(this.selectedDataKeys)
		let reselectRowIdx = -1;
		for (let i = 0; i < rowIndexes.length; ++i) {
			const idx = rowIndexes[i] + 1
			if (idx < this.rowCount && rowIndexes.indexOf(idx) == -1) {
				reselectRowIdx = idx
				break
			}
		}
		if (reselectRowIdx == -1) {
			reselectRowIdx = rowIndexes[0] - 1
		}
		let reselectDataKey = this.getDataKeyByRowIndex(reselectRowIdx)
		let dataList = this.deleteDataByKeys(this.selectedDataKeys)
		let dataKey = this.getDataKeyByRowIndex(0)
		this.insertDataList(dataList, dataKey, true)
		this.selectedDataKey = reselectDataKey
	}
	moveSelectionToBack() {
		if (this.selectedDataKeys.length == 0) {
			return
		}
		
		let rowIndexes = this.getRowIndexesByKeys(this.selectedDataKeys)
		let reselectRowIdx = -1;
		for (let i = 0; i < rowIndexes.length; ++i) {
			const idx = rowIndexes[i] + 1
			if (idx < this.rowCount && rowIndexes.indexOf(idx) == -1) {
				reselectRowIdx = idx
				break
			}
		}
		if (reselectRowIdx == -1) {
			reselectRowIdx = rowIndexes[0] - 1
		}
		let reselectDataKey = this.getDataKeyByRowIndex(reselectRowIdx)
		let dataList = this.deleteDataByKeys(this.selectedDataKeys)
		let dataKey = this.getDataKeyByRowIndex(this.rowCount - 1)
		this.insertDataList(dataList, dataKey, false)
		this.selectedDataKey = reselectDataKey
	}
	moveSelectedItemUp() {
		let selectedDataKey = this._selectedDataKey
		if (selectedDataKey == undefined) {
			return
		}
		let rowIndex = this.getRowIndex(selectedDataKey) - 1
		if (0 <= rowIndex) {
			let dataKey = this.getDataKeyByRowIndex(rowIndex)
			let data = this.deleteDataByKey(selectedDataKey)
			this.insertData(data, dataKey, true)
			this.selectedDataKey = data.key
		}
	}
	moveSelectedItemDown() {
		let selectedDataKey = this._selectedDataKey
		if (selectedDataKey == undefined) {
			return
		}
		let rowIndex = this.getRowIndex(selectedDataKey) + 1
		if (rowIndex < this.rowCount) {
			let dataKey = this.getDataKeyByRowIndex(rowIndex)
			let data = this.deleteDataByKey(selectedDataKey)
			this.insertData(data, dataKey, false)
			this.selectedDataKey = data.key
		}
	}
	deleteSelection() {
		if (this.selectedDataKeys.length == 0) {
			return []
		}
		
		const selectedKeys = this.selectedDataKeys.slice()
		let rowIndexes = this.getRowIndexesByKeys(selectedKeys)
		let reselectRowIdx = -1;
		for (let i = 0; i < rowIndexes.length; ++i) {
			const idx = rowIndexes[i] + 1
			if (idx < this.rowCount && rowIndexes.indexOf(idx) == -1) {
				reselectRowIdx = idx
				break
			}
		}
		if (reselectRowIdx == -1) {
			reselectRowIdx = rowIndexes[0] - 1
		}
		let reselectDataKey = this.getDataKeyByRowIndex(reselectRowIdx)
		this.selectedDataKey = reselectDataKey
		let result = this.deleteDataByKeys(selectedKeys)
		this.refreshList()
		return result
	}
	getOnClick(dataKey) {
		let obj = this
		return function(e) {
			obj.tblWrap.focus()
			obj._selectRow(dataKey, this.rowIndex, e.shiftKey, e.ctrlKey || obj.selectMode)
		}
	}
	_insertRow(dataKey, dataIdx, rowIdx) {
		let obj = this
		let data = this._data[dataIdx]
		let row = this.tblBody.insertRow(rowIdx)			
		row.style.fontSize = 14
		row.onclick = this.getOnClick(dataKey)
		row.ondblclick = this.getOnDblClick()
		row.draggable = this.draggable
		row.ondragstart = function(ev) {
			if (!obj._canDragStart || !obj.isSelectedRow(dataKey)) {
				ev.preventDefault()
				return
			}
			if (obj.ondragstart) {
				obj.ondragstart(ev, dataKey)
			}
		}
		row.ondrop = function(ev) {
			--obj._rowEnterCount
			this.setAttribute('dragHover', 0)
			if (obj.ondrop) {
				obj.ondrop(ev, dataKey, ev.offsetY < this.offsetHeight / 2)
			}
			obj._rowDropped = true
		}
		row.ondragover = function(ev) {
			if (obj.ondragover) {
				const style = obj.ondragover(ev, dataKey)
				if (style) {
					if (style == 2) {
						this.setAttribute('dragHover', 3)
					} else if (ev.offsetY < this.offsetHeight / 2) {
						this.setAttribute('dragHover', 1)
					} else {
						this.setAttribute('dragHover', 2)
					}
				}
			}
		}
		row.ondragenter = function(ev) {
			++obj._rowEnterCount
			if (obj.ondragenter) {
				obj.ondragenter(ev, dataKey)
			}
		}
		row.ondragleave = function(ev) {
			--obj._rowEnterCount
			if (obj.ondragleave) {
				obj.ondragleave(ev, dataKey)
			}
			this.setAttribute('dragHover', 0)
		}
		row.addEventListener('contextmenu', function(event) {
			if (obj.oncontextmenu) {
				if (!obj.isSelectedRow(dataKey)) {
					obj._selectRow(dataKey, rowIdx, event.shiftKey, event.ctrlKey)
				}
				obj.oncontextmenu(event, dataKey)
			}
		})
		for (let j = 0; j < this._headers.length; ++j) {
			let cell = row.insertCell(j)
			let header = this._headers[j]
			let text = header_getData(header, data)
			let textElement = document.createTextNode(text);
			cell.appendChild(textElement);
			cell.onmouseenter = this._getCellHoverFunction(text)
		}
	}
	updateDataRow(dataKey) {
		let rowIdx = this.getRowIndex(dataKey)
		if (rowIdx != -1) {
			this.updateRow(dataKey, rowIdx)
		}
	}
	updateRow(dataKey, rowIdx) {
		let row = this.tblBody.rows[rowIdx]
		let cells = row.cells
		let dataIdx = this.getDataIndexByKey(dataKey)
		let data = this.getData(dataIdx)
		for (let j = 0; j < this._headers.length; ++j) {
			let cell = cells[j]
			let header = this._headers[j]
			//removeAllChildNodes(cell)
			cell.replaceChildren()
			let text = header_getData(header, data)
			let textElement = document.createTextNode(text);
			cell.appendChild(textElement);
			cell.onmouseenter = this._getCellHoverFunction(text)
		}
		if (this.isSelectedRow(dataKey)) {
			this.setRowSelectionStyle(rowIdx)
		} else {
			this.clearRowSelectionStyle(rowIdx)
		}
	}
	updateList() {
		let rows = this.tblBody.rows
		for (let i = 0; i < rows.length; ++i) {
			this.updateRow(this.getDataKeyByRowIndex(i), i)
		}
	}
	focus() {
		this.tblWrap.focus()
	}
}
