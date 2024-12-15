/**
 * @typedef {Object} WindowConfig
 * @property {number} width - Default window width
 * @property {number} height - Default window height
 * @property {string} icon - Icon path
 * @property {string} title - Window title
 * @property {string} content - Window content
 * @property {Object} [styles] - Styles for the window
 * @property {Object.<string, Function[]>} [events] - Event listeners & callbacks
 * @property {Object} [savedState] - Saved window state
 */


/**
 * Base event emitter class for handling window events
 */
class EventEmitter {
  /**
     * @private
     * @type {object.<string, Function[]>}
     */
  #listeners = {}

  /**
   * Register an event listener
   * @param {string} event - The event name to listen for
   * @param {Function} callback - The callback function to execute
   */
  on (event, callback) {
    if (!this.#listeners[event]) this.#listeners[event] = []
    this.#listeners[event].push(callback)
  }

  /**
   * Emit an event to all registered listeners
   * @param {string} event - The event name to emit
   * @param {*} [data] - Optional data to pass to the listeners
   */
  emit (event, data) {
    if (this.#listeners[event]) this.#listeners[event].forEach(callback => callback(data))
  }
}

/**
 * Represents a draggable window component with a title bar and content area
 * @extends EventEmitter
 * @fires Window#close
 * @fires Window#focus
 * @fires Window#dragStart
 * @fires Window#drag
 * @fires Window#dragEnd
 * @fires Window#minimize
 */
export default class Window extends EventEmitter {

  /**
	 * @private
	 * @property WindowConfig
	 */
	#config

  /**
   * Create a new Window instance with the provided configuration.
   * @param {string} id - The window identifier
   * @param {WindowConfig} config - The window configuration
   */
  constructor (Id, config) {
    super()
		this.#config = config
		this.id = Id
		this.width = this.#config.width
		this.height = this.#config.height
    this.title = this.#config.title
    this.content = this.#config.content
    this.zIndex = this.#config.zIndex || 1
		this.isMinimized = config.isMinimized || false
		this.icon = config.icon || null
    this.isDragging = false
		this.isResizing = false
    this.initialX = 0
    this.initialY = 0
    this.initialMouseX = 0
    this.initialMouseY = 0


		this.x = config.x ||  Math.min(
			Math.max(0,
							 Math.random() * (window.innerWidth - this.width - 100)),
							 window.innerWidth - this.width
			)

		this.y = config.y || Math.min(
			Math.max(100,
							 Math.random() * (window.innerHeight - this.height) - 100),
							 window.innerHeight - this.height
			)

		this.#createElement()

		if (this.isMinimized) this.minimize()

		window.addEventListener('resize', this.handleResize.bind(this))
		this.createResizeHandles()
  }

  /**
   * Creates the DOM elements for the window
   * @private
   */
  #createElement () {
		this.element = document.createElement('div')
    this.element.className = 'window'
    this.element.style.position = 'fixed'
    this.element.style.left = `${this.x}px`
    this.element.style.top = `${this.y}px`
    this.element.style.width = `${this.width}px`
    this.element.style.height = `${this.height}px`
    this.element.style.overflow = 'hidden'

    this.titleBar = document.createElement('div')
    this.titleBar.className = 'window-title-bar title-bar'
    this.titleBar.style.cursor = 'move'
    this.titleBar.style.userSelect = 'none'
    this.titleBar.style.display = 'flex'
    this.titleBar.style.justifyContent = 'space-between'
		this.titleBar.style.padding = '5px 8px'
    this.titleBar.style.alignItems = 'center'

    this.titleText = document.createElement('div')
    this.titleText.className = 'window-title-bar-text title-bar-text'
    this.titleText.textContent = this.title
    this.titleText.style.fontSize = this.#config.styles.titlebar_fontsize || '12px'
    this.titleBar.appendChild(this.titleText)

		const buttonContainer = document.createElement('div')
    buttonContainer.className = 'title-bar-controls'
    buttonContainer.style.display = 'flex'

    this.minimizeButton = document.createElement('button')
    this.minimizeButton.className = 'window-minimize-button'
    this.minimizeButton.ariaLabel = 'Minimize'

    this.minimizeButton.onclick = e => {
      e.stopPropagation()
      this.toggleMinimize()
    }

    buttonContainer.appendChild(this.minimizeButton)

		this.closeButton = document.createElement('button')
    this.closeButton.className = 'window-close-button'
    this.closeButton.ariaLabel = 'Close'
    
    this.closeButton.onclick = e => {
      e.stopPropagation()
      this.emit('close', this)
    }
    buttonContainer.appendChild(this.closeButton)
    this.titleBar.appendChild(buttonContainer)

		this.contentArea = document.createElement('div')
    this.contentArea.className = 'window-content window-body'
    this.contentArea.innerHTML = this.content

    this.titleBar.onmousedown = e => {
      e.preventDefault()
      this.startDrag(e)
    }

    this.element.appendChild(this.titleBar)
    this.element.appendChild(this.contentArea)

    this.element.onclick = () => this.emit('focus', this)
	}
  
  /**
   * Creates resize handles for the window
   * @private
   */
  createResizeHandles () {
    const resizeHandles = [
      { cursor: 'nwse-resize', position: 'top-left', dx: -1, dy: -1 },
      { cursor: 'nesw-resize', position: 'top-right', dx: 1, dy: -1 },
      { cursor: 'nesw-resize', position: 'bottom-left', dx: -1, dy: 1 },
      { cursor: 'nwse-resize', position: 'bottom-right', dx: 1, dy: 1 }
    ]

    resizeHandles.forEach(handle => {
      const resizeHandle = document.createElement('div')
      resizeHandle.className = `resize-handle resize-${handle.position}`
      resizeHandle.style.cssText = `
        position: absolute;
        background: transparent;
        z-index: 10;
        cursor: ${handle.cursor};
      `

      // Position and size the resize handles
      switch (handle.position) {
        case 'top-left':
          resizeHandle.style.top = '-5px'
          resizeHandle.style.left = '-5px'
          resizeHandle.style.width = '15px'
          resizeHandle.style.height = '15px'
          break
        case 'top-right':
          resizeHandle.style.top = '-5px'
          resizeHandle.style.right = '-5px'
          resizeHandle.style.width = '15px'
          resizeHandle.style.height = '15px'
          break
        case 'bottom-left':
          resizeHandle.style.bottom = '-5px'
          resizeHandle.style.left = '-5px'
          resizeHandle.style.width = '15px'
          resizeHandle.style.height = '15px'
          break
        case 'bottom-right':
          resizeHandle.style.bottom = '-5px'
          resizeHandle.style.right = '-5px'
          resizeHandle.style.width = '15px'
          resizeHandle.style.height = '15px'
          break
      }

      // Add resize event listener
      resizeHandle.addEventListener('mousedown', (e) => this.startResize(e, handle.dx, handle.dy))

      this.element.appendChild(resizeHandle)
    })
  }

  /**
   * Handles window repositioning when browser window is resized
   * @private
   */
  handleResize () {
    // Ensure the window stays within the new viewport boundaries
    const maxX = Math.max(0, window.innerWidth - this.width)
    const maxY = Math.max(0, window.innerHeight - this.height)

    // Adjust x and y coordinates if they're now out of bounds
    this.x = Math.min(this.x, maxX)
    this.y = Math.min(this.y, maxY)

    // Update the window's position
    this.updatePosition()
  }

  /**
   * Initiates window dragging
   * @param {MouseEvent} event - The mousedown event
   * @fires Window#dragStart
   * @private
   */
  startDrag (event) {
    this.isDragging = true
    this.initialX = this.x
    this.initialY = this.y
    this.initialMouseX = event.clientX
    this.initialMouseY = event.clientY
    this.emit('dragStart', this)
  }

  /**
   * Updates window position during drag
   * @param {MouseEvent} event - The mousemove event
   * @fires Window#drag
   */
  drag (event) {
    if (!this.isDragging) return

    // Calculate the distance moved
    const deltaX = event.clientX - this.initialMouseX
    const deltaY = event.clientY - this.initialMouseY

    // Calculate new position
    let newX = this.initialX + deltaX
    let newY = this.initialY + deltaY

    // Constrain to viewport bounds
    newX = Math.max(0, Math.min(newX, window.innerWidth - this.width))
    newY = Math.max(0, Math.min(newY, window.innerHeight - this.height))

    this.x = newX
    this.y = newY
    this.updatePosition()
    /**
     * @event Window#drag
     * @type {Window}
     * @property {Window} window - The window instance that is being dragged
     */
    this.emit('drag', this)
  }

  /**
   * Ends the window dragging operation
   * @fires Window#dragEnd
   */
  dragEnd () {
    if (!this.isDragging) return
    this.isDragging = false
    /**
     * @event Window#dragEnd
     * @type {Window}
     * @property {Window} window - The window instance that was dragged
     */
    this.emit('dragEnd', this)
  }

  /**
   * Toggles the window's minimized state
   * @fires Window#minimize
   */
  toggleMinimize () {
    if (this.isMinimized) {
      this.restore()
    } else {
      this.minimize()
    }
    /**
     * @event Window#minimize
     * @type {Window}
     * @property {Window} window - The window instance that was minimized
     */
    this.emit('minimize', this)
  }

  /**
   * Minimizes the window
   */
  minimize () {
    this.isMinimized = true
    this.element.style.display = 'none'
  }

  /**
   * Restores the window from minimized state
   */
  restore () {
    this.isMinimized = false
    this.element.style.display = 'block'
  }

  /**
   * Updates the window's position on screen
   * @private
   */
  updatePosition () {
    this.element.style.left = `${this.x}px`
    this.element.style.top = `${this.y}px`
  }

  /**
   * Sets the window's z-index
   * @param {number} index - The z-index value
   */
  setZIndex (index) {
    this.zIndex = index
    this.element.style.zIndex = index
  }

  /**
	 * Get the window state as a WindowConfig object
	 * @returns {WindowConfig}
	 */
	getState () {
		return {
			width: this.width,
			height: this.height,
			x: this.x,
			y: this.y,
			zIndex: this.zIndex,
			isMinimized: this.isMinimized,
			icon: this.icon,
			title: this.title,
			content: this.content,
			styles: this.#config.styles,
			events: this.#config.events,
		}
	}

  /**
   * Removes the window from the DOM
   */
  destroy () {
    this.element.remove()
  }

  /**
   * Initiates window resizing
   * @param {MouseEvent} event - The mousedown event
   * @param {number} dx - Horizontal resize direction (-1, 0, or 1)
   * @param {number} dy - Vertical resize direction (-1, 0, or 1)
   * @private
   */
  startResize (event, dx, dy) {
    event.stopPropagation()
    
    // Prevent text selection during resize
    event.preventDefault()

    // Store initial window state
    this.isResizing = true
    this.initialWidth = this.width
    this.initialHeight = this.height
    this.initialX = this.x
    this.initialY = this.y
    this.initialMouseX = event.clientX
    this.initialMouseY = event.clientY
    this.resizeDirX = dx
    this.resizeDirY = dy

    // Add global event listeners for resize
    document.addEventListener('mousemove', this.resize.bind(this))
    document.addEventListener('mouseup', this.endResize.bind(this))
  }

  /**
   * Handles window resizing
   * @param {MouseEvent} event - The mousemove event
   * @private
   */
  resize (event) {
    if (!this.isResizing) return

    // Calculate the distance moved
    const deltaX = event.clientX - this.initialMouseX
    const deltaY = event.clientY - this.initialMouseY

    // Calculate new dimensions and position
    let newWidth = this.initialWidth
    let newHeight = this.height
    let newX = this.x
    let newY = this.y

    // Horizontal resize
    if (this.resizeDirX !== 0) {
      newWidth = Math.max(200, this.initialWidth + (deltaX * this.resizeDirX))
      
      // Adjust X position for left-side resize
      if (this.resizeDirX < 0) {
        newX = this.initialX + (this.initialWidth - newWidth)
      }
    }

    // Vertical resize
    if (this.resizeDirY !== 0) {
      newHeight = Math.max(100, this.initialHeight + (deltaY * this.resizeDirY))
      
      // Adjust Y position for top-side resize
      if (this.resizeDirY < 0) {
        newY = this.initialY + (this.initialHeight - newHeight)
      }
    }

    // Constrain to viewport bounds
    newX = Math.max(0, Math.min(newX, window.innerWidth - newWidth))
    newY = Math.max(0, Math.min(newY, window.innerHeight - newHeight))

    // Update window properties
    this.width = newWidth
    this.height = newHeight
    this.x = newX
    this.y = newY

    // Update window styling
    this.element.style.width = `${this.width}px`
    this.element.style.height = `${this.height}px`
    this.updatePosition()

    // Adjust content area
    this.contentArea.style.height = `calc(100% - 37px)`
  }

  /**
   * Ends the window resizing operation
   * @private
   */
  endResize () {
    if (!this.isResizing) return

    this.isResizing = false

    // Emit resize event if needed
    this.emit('resize', this)
  }
}
