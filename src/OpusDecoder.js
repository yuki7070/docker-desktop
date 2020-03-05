const Module = require('../build/libopus.js')
const EventEmitter = require('events')

class OpusDecoder extends EventEmitter {
    constructor (sampling_rate, channels) {
        super()
        this.sampling_rate = sampling_rate
        this.channels = channels
        
        this.handle = 0
        this.frame_size = 0
    }

    setup () {
        let err = Module._malloc(4)
        this.handle = Module._opus_decoder_create(this.sampling_rate, this.channels, err)
        const err_num = Module.getValue(err, 'i32')
        if (err_num != 0) {
            throw err_num
        }

        this.frame_size = this.sampling_rate * 60 / 1000
        const buf_size = 1024*1024*2
        const pcm_samples = this.frame_size * this.channels
        this.buf_ptr = Module._malloc(buf_size);
        this.pcm_ptr = Module._malloc(4 * pcm_samples)
        this.buf = Module.HEAPU8.subarray(this.buf_ptr, this.buf_ptr + buf_size)
        this.pcm = Module.HEAPF32.subarray(this.pcm_ptr / 4, this.pcm_ptr / 4 + pcm_samples)

        this.emit('initialized')
    }

    decode (packet) {
        this.buf.set(new Uint8Array(packet.data))
        const ret = Module._opus_decode_float(this.handle, this.buf_ptr, packet.data.byteLength,
                                            this.pcm_ptr, this.frame_size, 0)
        if (ret < 0) {
            let message
            if (ret === -1) {
                message = 'One or more invalid/out of range arguments'
            } else if (ret === -2) {
                message = 'Not enough bytes allocated in the buffer'
            } else if (ret === -3) {
                message = 'An internal error was detected'
            } else if (ret === -4) {
                message = 'The compressed data passed is corrupted'
            } else {
                message = 'Unknown error'
            }
            const obj = {
                type: "error",
                errorCode: ret,
                data: message
            }
            this.emit('decode_error', obj)
            return obj
        } else {
            return {
                type: 'packet',
                data: new Float32Array(this.pcm.subarray(0, ret * this.channels))
            }
        }
    }
}

Module["onRuntimeInitialized"] = () => {
    let decoder = null
    self.onmessage = (e) => {
        const payload = e.data
        if (payload.type === 'init') {
            decoder = new OpusDecoder(payload.sampling_rate, payload.channels)
            decoder.on('decode_error', () => {})
            decoder.on('initialized', () => {
                self.postMessage({
                    type: "info",
                    code: 1,
                    data: 'Complete initialize'
                })
            })
            decoder.setup()
        } else if (payload.type === 'packet') {
            self.postMessage(decoder.decode(e.data))
        }
    }
}
