// ── UI 기반 클래스 ────────────────────────────────────────────────────────────

class DivBase {
	constructor() {
		let div = document.createElement('div')
		this.div = div
	}
	get className() {
		return this.div.className
	}
	set className(name) {
		this.div.className = name
	}
	getBoundingClientRect() {
		return this.div.getBoundingClientRect()
	}
}
class PopupMenuItem extends DivBase {
	constructor(menu) {
		super();
		this.menu = menu
		this.normalClassName = menu.itemNormalClassName
		this.hoverClassName = menu.itemHoverClassName
		this.subMenu = null
		this.div.className = this.normalClassName
		this.subMenuOffsetX = menu.subMenuOffsetX

		let obj = this
		this.div.addEventListener('mouseenter', function(event) {
			obj.div.className = obj.hoverClassName
			if (obj.subMenu) {
				if (obj.subMenu.isWaitingDismiss) {
					obj.subMenu.cancelDismiss()
				} else {
					obj.subMenuTimeoutID = setTimeout(function(){
						obj.subMenuTimeoutID = undefined
						obj.showMenu()
					}, 500);
				}
				obj.subMenu.incEnterCounter(1)
			}
		})
		this.div.addEventListener('mouseleave', function(event) {
			obj.div.className = obj.normalClassName
			if (obj.subMenu) {
				if (obj.subMenuTimeoutID) {
					clearTimeout(obj.subMenuTimeoutID)
					obj.subMenuTimeoutID = undefined
				} else {
					obj.subMenu.reserveDismiss(true)
				}
				obj.subMenu.incEnterCounter(-1)
			}
		})
		this.div.addEventListener('click', function(event) {
			if (obj.subMenu) {
				if (obj.subMenuTimeoutID) {
					clearTimeout(obj.subMenuTimeoutID)
					obj.subMenuTimeoutID = undefined
				}
				obj.showMenu()
			} else {
				if (obj.onclick) {
					obj.onclick(event)
				}
				let parent = obj.menu
				while (parent.parent) {
					parent = parent.parent
				}
				parent.dismiss()
			}
		})
	}
	showMenu() {
		let rect = this.div.getBoundingClientRect()
		if (!this.menu.showSubmenuLeft) {
			this.subMenu.showSubmenuLeft = false
			this.subMenu.show(rect.right - this.subMenuOffsetX, rect.top, false)

			let subRect = this.subMenu.getBoundingClientRect()
			if (subRect.right > window.innerWidth) {
				this.subMenu.showSubmenuLeft = true
				this.subMenu.show(rect.left + this.subMenuOffsetX, rect.top, false, 1, 0)
			}
		} else {
			this.subMenu.showSubmenuLeft = true
			this.subMenu.show(rect.left + this.subMenuOffsetX, rect.top, false, 1, 0)
			let subRect = this.subMenu.getBoundingClientRect()
			if (subRect.left < 0) {
				this.subMenu.showSubmenuLeft = false
				this.subMenu.show(rect.right - this.subMenuOffsetX, rect.top, false)
			}
		}
	}
	setElements(...elements) {
		this.div.replaceChildren(...elements)
	}
	setSubMenu() {
		let subMenu = new PopupMenu(this.menu)
		this.subMenu = subMenu
		return subMenu
	}
}
class PopupMenu extends DivBase {
	constructor(parent=null) {
		super();
		this.dismissOnMouseLeave = false
		this.itemNormalClassName = ''
		this.itemHoverClassName = ''
		this.parent = parent
		this.subMenuOffsetX = 2
		this.mouseEnterCounter = 0
		this.showSubmenuLeft = false
		if (parent) {
			this.className = parent.className
			this.itemNormalClassName = parent.itemNormalClassName
			this.itemHoverClassName = parent.itemHoverClassName
			this.subMenuOffsetX = parent.subMenuOffsetX
			this.showSubmenuLeft = parent.showSubmenuLeft
		}
		this.child = null
		document.body.appendChild(this.div);
		let style = this.div.style
		style.display = 'none'
		style.position = 'absolute'

		let obj = this
		this.div.addEventListener('mouseenter', function(event) {
			obj.incEnterCounter(1)
			if (obj.dismissOnMouseLeave && obj.isWaitingDismiss) {
				obj.cancelDismiss()
			}
		})
		this.div.addEventListener('mouseleave', function(event) {
			obj.incEnterCounter(-1)
			if (obj.dismissOnMouseLeave) {
				obj.reserveDismiss(true)
			}
		})
		this.div.addEventListener('pointerdown', function(event) {
			event.stopPropagation()
		})
		document.addEventListener('pointerdown', function(event) {
			obj.dismiss()
		})
	}
	addItem() {
		let item = new PopupMenuItem(this)
		this.div.appendChild(item.div)
		return item
	}
	show(x, y, autoAdjustment=true, hAlign=0, vAlign=0) {
		let style = this.div.style
		style.display = ''
		if (document.documentElement && (document.documentElement.scrollTop || document.documentElement.scrollLeft))
		{
			x += document.documentElement.scrollLeft;
			y += document.documentElement.scrollTop;
		}
		else if (document.body && (document.body.scrollTop || document.body.scrollLeft))
		{
			x += document.body.scrollLeft;
			y += document.body.scrollTop;
		}
		else if (window.pageXOffset || window.pageYOffset)
		{
			x += window.pageXOffset;
			y += window.pageYOffset;
		}
		let rect = this.div.getBoundingClientRect()
		if (autoAdjustment) {
			if (x + rect.width > window.innerWidth) {
				hAlign = 1
			}
			if (y + rect.height > window.innerHeight) {
				vAlign = 1
			}
		}
		style.left = (x - rect.width * hAlign) + 'px'
		style.top = (y - rect.height * vAlign) + 'px'
		style.zIndex = 100
		if (this.parent) {
			if (this.parent.child) {
				this.parent.child.dismissFromParent()
			}
			this.parent.child = this
		}
	}
	get isVisible() {
		return this.div.style.display != ''
	}
	dismiss() {
		let style = this.div.style
		style.display = 'none'
		this.cancelDismiss()
		if (this.child) {
			this.child.dismiss()
			this.child = null
		}
	}
	dismissFromParent() {
		if (this.mouseEnterCounter == 0) {
			let style = this.div.style
			style.display = 'none'
			this.cancelDismiss()
		}
		if (this.child) {
			this.child.dismissFromParent()
			this.child = null
		}
	}
	dismissToRoot() {
		if (this.child) {
			this.child.dismissFromParent()
			this.child = null
		}
		if (this.parent && this.mouseEnterCounter == 0) {
			let style = this.div.style
			style.display = 'none'
			this.cancelDismiss()
			this.parent.dismissToRoot()
		}
	}
	incEnterCounter(c) {
		this.mouseEnterCounter += c
		if (this.parent) {
			this.parent.incEnterCounter(c)
		}
	}
	get isWaitingDismiss() {
		return this.dismissTimeoutID != undefined
	}
	cancelDismiss() {
		if (this.dismissTimeoutID) {
			clearTimeout(this.dismissTimeoutID)
			this.dismissTimeoutID = undefined
		}
	}
	reserveDismiss(dismissOnMouseLeave) {
		let obj = this
		this.dismissTimeoutID = setTimeout(function(){
			obj.dismissToRoot()
		}, 500);
		obj.dismissOnMouseLeave = dismissOnMouseLeave
	}
}
