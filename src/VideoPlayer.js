const Player = require('../lib/Broadway/Player/Player.js')
const EventEmitter = require('events')

class VideoPlayer extends EventEmitter {
    constructor (size = { width: 1280, height: 720 }) {
        super()

        this.now = new Date().getTime()

        this.Player = new Player({
            useWorker: true,
            workerFile: 'Decoder.js',
            webgl: true,
            size: size
        })
        this.width = size.width
        this.height = size.height
        this.playing = false

        this.Player.onPictureDecoded = (_, w, h) => {
            if (w !== this.width || h !== this.height) {
                this.emit('resized', {
                    width: w,
                    height: h
                })
                this.width = w
                this.height = h
            }
        }

        this.ws = null
        this.pktnum = 0
        this.framesList = []
        this.running = false
        this.shiftFrameTimeout = null
    }

    shiftFrame = () => {
        if (!this.running)
            return

        if (this.framesList.length > 30) {
            const vI = this.framesList.findIndex(e => (e[4] & 0x1f) === 7)
            //console.log('Dropping frames', this.framesList.length, vI)
            if (vI >= 0) {
                this.framesList = this.framesList.slice(vI)
            }
        }

        const frame = this.framesList.shift()
        this.emit('frame_shift', this.framesList.length)

        if (frame)
            this.Player.decode(frame)

        requestAnimationFrame(this.shiftFrame)
    }

    start = (url, bitrate, fps) => {
        if (this.ws !== null) {
            this.ws.close()
            this.ws = null
        }
        this.fps = fps
        this.bitrate = bitrate
        this.ws = new WebSocket(url)
        this.ws.binaryType = 'arraybuffer'

        this.ws.onopen = () => {
            console.log(bitrate)
            this.emit('connected', url)
            this.send('start_video', {
                width: this.width,
                height: this.height,
                bitrate: this.bitrate,
                fps: this.fps
            })
            this.playing = true
        }

        this.framesList = []

        this.ws.onmessage = (e) => {
            if (e.data.constructor !== ArrayBuffer) {
                return this.recieve(JSON.parse(e.data))
            }

            this.pktnum++
            const frame = new Uint8Array(e.data)

            this.framesList.push(frame)
            if (!this.running) {
                
                this.running = true
                clearTimeout(this.shiftFrameTimeout)
                this.shiftFrameTimeout = null
                this.shiftFrameTimeout = setTimeout(this.shiftFrame, 1)
            }
        }

        this.ws.onclose = () => {
            this.running = false
            this.emit('disconnected')
        }
    }

    recieve = (e) => {
        console.log(e)
    }

    stop = () => {
        if (this.ws !== null) {
            this.ws.close()
            this.ws = null
        }
    }

    send (action, payload) {
        return this.ws.send(JSON.stringify({ action, payload }))
    }
}

window['VideoPlayer'] = VideoPlayer