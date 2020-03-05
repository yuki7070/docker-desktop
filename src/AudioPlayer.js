const EventEmitter = require('events')

class AudioPlayer extends EventEmitter {
    constructor (sampling_rate, channels) {
        super()
        this.sampling_rate = sampling_rate
        this.channels = channels
        this.codec = null
        this.ws = null

        this.initialize = false
        this.playing = false
        
        this.ctx = new AudioContext({
            latencyHint: 'balanced',
            sampleRate: this.sampling_rate})
        this.scheduledTime = 0
        this.initialDelay = 0

        this.worker = null

        this.framesList = []
        this.running = false
        this.shiftFrameTimeout = null
        this.now = null
    }

    setup = () => {
        this.worker = new Worker('OpusDecoder.js')
            
        this.worker.postMessage({
            type: 'init',
            sampling_rate: this.sampling_rate,
            channels: this.channels
        })
            
        this.worker.onerror = (e) => {
            console.error(e)
            this.stop()
        }

        this.worker.onmessage = (e) => {
            const payload = e.data
            if (payload.type === 'error') {
                if (payload.errorCode === -4) {
                    //console.log(payload)
                    this.scheduledTime = this.ctx.currentTime
                } else {
                    console.error(payload)
                }
            } else if (payload.type === 'packet') {
                this.framesList.push(payload)
                if (!this.running) {
                    this.running = true
                    clearTimeout(this.shiftFrameTimeout)
                    this.shiftFrameTimeout = null
                    this.shiftFrameTimeout = setTimeout(this.shiftFrame, 1)
                }
                this.shiftFrame()
            } else if (payload.type === 'info' && payload.code === 1) {
                this.initialize = true
            }
        }
    }

    shiftFrame = () => {
        if (!this.running)
            return
        
        const frame = this.framesList.shift()
        this.emit('frame_shift', this.framesList.length)

        if (frame)
            this.playAudioStream(frame)
        
        setTimeout(this.shiftFrame, 30)
    }

    start = (url, codec) => {
        this.codec = codec

        if (this.codec === 'opus' && this.worker === null) {
            this.setup()
        }

        if (this.ws !== null) {
            this.ws.close()
            this.ws = null
        }
        this.ws = new WebSocket(url)
        this.ws.binaryType = 'arraybuffer'

        this.ws.onopen = () => {
            console.log('audio player connected')
            this.emit('connected', url)
            this.send('start_audio', {codec: this.codec})
            this.playing = true
        }

        this.ws.onmessage = (e) => {
            if (e.data.constructor !== ArrayBuffer) {
                this.scheduledTime = this.ctx.currentTime
                return this.recieve(JSON.parse(e.data))
            }
            if (this.codec === 'opus') {
                if (this.initialize) {
                    this.worker.postMessage({
                        type: 'packet',
                        data: e.data
                    })
                    this.now = performance.now()
                }
            } else {
                this.playAudioStream({
                    data: new Float32Array(e.data)
                })
            }
        }
    }

    playAudioStream = (e) => {
        const ctx = this.ctx
        const audioBuf = ctx.createBuffer(this.channels, e.data.length, this.sampling_rate)
        const audioSrc = ctx.createBufferSource()
        const currentTime = ctx.currentTime
        audioBuf.getChannelData(0).set(e.data)
        audioSrc.buffer = audioBuf
        audioSrc.connect(ctx.destination)
        if (currentTime < this.scheduledTime) {
            this.playChunk(audioSrc, this.scheduledTime)
            this.scheduledTime += audioBuf.duration
        } else {
            /*console.log('delay! currentTime: ', currentTime,
                'scheduleTime', this.scheduledTime,
                'bufferDuration', audioBuf.duration)*/
            this.playChunk(audioSrc, currentTime)
            this.scheduledTime = currentTime + audioBuf.duration + this.initialDelay
        }
    }

    playChunk = (audioSrc, scheduledTime) => {
        if (audioSrc.start) {
            audioSrc.start(scheduledTime)
        } else {
            console.log(scheduledTime)
            audioSrc.noteOn(scheduledTime)
        }
        //console.log(this.now - performance.now())
    }

    send = (action, payload) => {
        return this.ws.send(JSON.stringify({ action, payload }))
    }

    recieve = () => {

    }

    stop = () => {
        if (this.ws !== null) {
            this.ws.close()
            this.ws = null
        }
        
        if (this.codec === 'opus') {
            this.worker.terminate()
            this.worker = null
        }
        
        this.initialize = false
        this.playing = false
    }
}

window['AudioPlayer'] = AudioPlayer