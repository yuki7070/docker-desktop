const Splitter = require('stream-split')
const EventEmitter = require('events').EventEmitter

const NALseparator = Buffer.from([ 0, 0, 0, 1 ])

module.exports = class WebSocketServer extends EventEmitter {
    constructor (wss, width, height, options = {}) {
        super()

        this.options = {
            width: width,
            height: height,
            ...options,
        }

        this.clients = new Set()

        this.broadcast = this.broadcast.bind(this)
        this.new_client = this.new_client.bind(this)
        this.client_events = new EventEmitter()
        if (wss) {
            wss.on('connection', this.new_client)
        }


    }

    setVideoStream (readStream) {
        this.readStream = readStream
        readStream = readStream.pipe(new Splitter(NALseparator))
        readStream.on('data', this.broadcast(sendVideoFrame))

        this.broadcast('stream_active', true )

        readStream.on('end', () => this.broadcast('stream_active', false ))

    }

    setAudioStream (readStream) {
        this.readStream = readStream
        readStream.on('data', this.broadcast(sendAudioFrame))

        this.broadcast('stream_active', true )

        readStream.on('end', () => this.broadcast('stream_active', false ))

    }

    broadcast (action, payload) {
        if (typeof action === 'function') {
            return data => this.clients.forEach(socket => action(socket, data))
        } else {
            return this.clients.forEach(socket => socket.send(JSON.stringify({ action, payload })))
        }
    }

    new_client (socket) {
        this.clients.add(socket)
        this.emit('client_connected', socket)
        // console.log(`currently there are ${ this.clients.size } connected clients`)
        socket.on('close', () => {
            this.clients.delete(socket)
            this.emit('client_disconnected', socket)
            // console.log(`currently there are ${ this.clients.size } connected clients`)
        })
        socket.send(JSON.stringify({
            action: 'initalize',
            payload: {
                width: this.options.width,
                height: this.options.height,
                stream_active: !!(this.readStream && this.readStream.readable),
            },
        }))

        socket.send(JSON.stringify({ action: 'stream_active', payload: !!(this.readStream && this.readStream.readable) }))

        socket.on('message', m => {
            const { action, payload } = JSON.parse(m)
            this.client_events.emit(action, payload)
        })
    }
}

function sendVideoFrame (socket, frame) {
    if (socket.buzy)
        return

    socket.buzy = true
    socket.buzy = false

    socket.send(Buffer.concat([ NALseparator, frame ]), { binary: true }, function ack () {
        socket.buzy = false
    })
}

function sendAudioFrame (socket, frame) {
    if (socket.buzy)
        return

    socket.buzy = true
    socket.buzy = false

    socket.send(frame, { binary: true }, function ack () {
        socket.buzy = false
    })
}
