const wsavc = new WSAvcPlayer.default({ useWorker: true});
let audioWs, dataWs = null;
let useVideo, useData = true
let useAudio = false
const height = 1280
const width = 720
let audioCodec = 'opus'

//disable history back
//because of mouse forth button event
window.addEventListener("popstate", function (e) {
    history.pushState(null, null, null)
})
history.pushState(null, null, null)

//canvas
document.getElementById('video-box').appendChild(wsavc.AvcPlayer.canvas)
document.oncontextmenu = () => { return false }

//
window.wsavc = wsavc
const videoUri = document.location.protocol === 'https:' ?
    `wss://${document.location.host}/wsvideo` : `ws://${document.location.host}/wsvideo`
const audioUri = document.location.protocol === 'https:' ?
    `wss://${document.location.host}/wsaudio` : `ws://${document.location.host}/wsaudio`
const dataUri = document.location.protocol === 'https:' ?
    `wss://${document.location.host}/wsdata` : `ws://${document.location.host}/wsdata`

//connect video
wsavc.connect(videoUri)

//connect audio function

let ctx = new AudioContext({latencyHint: 'interactive',
    sampleRate: 44100,}),
    initial_delay_sec = 0,
    scheduled_time = 0
window.ctx = ctx

const playChunk = function (audio_src, scheduled_time) {
    if (audio_src.start) {
        audio_src.start(scheduled_time)
    } else {
        console.log(scheduled_time)
        audio_src.noteOn(scheduled_time)
    }
}

const playAudioStream = function (audio_f32) {
    var audio_buf = ctx.createBuffer(1, audio_f32.length, 44100),
        audio_src = ctx.createBufferSource(),
        current_time = ctx.currentTime

    audio_buf.getChannelData(0).set(audio_f32)

    audio_src.buffer = audio_buf
    audio_src.connect(ctx.destination)
    if (current_time < scheduled_time) {
        playChunk(audio_src, scheduled_time)
        scheduled_time += audio_buf.duration
    } else {
        playChunk(audio_src, current_time)
        scheduled_time = current_time + audio_buf.duration + initial_delay_sec
    }
}
const audioDecoder = new Worker('audio-decoder.min.js')

const audioConnect = (ws, url) => {
    if (ws !== undefined && ws !== null) {
        ws.close()
        ws = null
    }
    ws = new WebSocket(url)
    audioWs = ws
    ws.binaryType = 'arraybuffer'

    ws.onclose = () => {
        audioWs = null
    }   
}

audioConnect(audioWs, audioUri)

const audioPlay = (ws, codec) => {
    if (audioWs === null) {
        audioConnect(audioWs, audioUri)
        ws = audioWs
        ws.onopen = () => {
            console.log('are')
            audioPlay(audioWs, codec)
        }
        return
    }
    audioCodec = codec
    if (codec === 'opus') {
        ws.onmessage = (e) => {
            if (e.data.constructor !== ArrayBuffer) {
                console.log(e.data)
                scheduled_time = ctx.currentTime
            } else {
                audioDecoder.postMessage(e.data)
            }
        }
        audioDecoder.onmessage = (e) => {
            playAudioStream(e.data)
        }
    } else {
        ws.onmessage = (e) => {
            if (e.data.constructor !== ArrayBuffer) {
                console.log(e.data)
                scheduled_time = ctx.currentTime
            } else {
                playAudioStream(new Float32Array(e.data))
            }
        }
    }
    ws.send(JSON.stringify({ action: 'start_audio',
        payload: { codec: codec }}))
}

const aduioStop = () => {
    audioWs.close()
    //audioConnect(audioWs, audioUri)
}

//connect data function
const dataConnect = (ws, url) => {
    if (ws !== undefined && ws !== null) {
        ws.close()
        ws = null
    }
    ws = new WebSocket(url)
    dataWs = ws
    ws.binaryType = 'arraybuffer'

    // Event Listener
    let currentY, currentX;
    const box = document.getElementById('video-box')
    
    const mousedown = function (e) {
        console.debug(e)
        ws.send(JSON.stringify({ action: 'mousedown',
            payload: { x: Math.floor(e.offsetX/box.offsetWidth*height),
                y: Math.floor(e.offsetY/box.offsetHeight*width),
                button: e.button }}))
        return false
    }
    const mouseup = function (e) {
        console.debug(e)
        ws.send(JSON.stringify({ action: 'mouseup',
            payload: { x: Math.floor(e.offsetX/box.offsetWidth*height),
                y: Math.floor(e.offsetY/box.offsetHeight*width),
                button: e.button }}))
        return false
    }
    const mousemove = function (e) {
        ws.send(JSON.stringify({ action: 'mousemove',
            payload: { x: Math.floor(e.offsetX/box.offsetWidth*height),
                y: Math.floor(e.offsetY/box.offsetHeight*width) }}))
    }
    /*
    let dummy;
    const mousemove = function (e) {
        if (dummy) return

        dummy = setTimeout(() => {
            dummy = 0
            ws.send(JSON.stringify({ action: 'mousemove',
                payload: { x: Math.floor(e.offsetX/box.offsetWidth*height),
                    y: Math.floor(e.offsetY/box.offsetHeight*width) }}))
        }, 10)
    }
    */
    const keydown = function (e) {
        ws.send(JSON.stringify({ action: 'keydown',
            payload: {key: e.key}}))
    }
    const mousewheel = function (e) {
        ws.send(JSON.stringify({ action: 'mousewheel',
            payload: {deltaX: e.deltaX, deltaY: e.deltaY}}))
    }
    const touchstart = function (e) {
        currentY = e.touches[0].clientY
        currentX = e.touches[0].clientX
        ws.send(JSON.stringify({ action: 'mousemove',
            payload: { x: Math.floor(currentX/box.offsetWidth*height),
                y: Math.floor(currentY/box.offsetHeight*width) }}))
    }
    const touchmove = function (e) {
        ws.send(JSON.stringify({ action: 'mousewheel',
            payload: {deltaX: currentX - e.touches[0].clientX,
                deltaY: currentY - e.touches[0].clientY}}))
        currentY = e.touches[0].clientY
        currentX = e.touches[0].clientX
        ws.send(JSON.stringify({ action: 'mousemove',
            payload: { x: Math.floor(currentX/box.offsetWidth*height),
                y: Math.floor(currentY/box.offsetHeight*width) }}))
    }
    ws.onopen = () => {
        useData = true
        console.log("ws connected data")
        box.addEventListener('mousedown', mousedown)
        box.addEventListener('mouseup', mouseup)
        box.addEventListener('mousemove', mousemove)
        window.addEventListener('keydown', keydown)
        window.addEventListener('mousewheel', mousewheel)
        box.addEventListener('touchstart', touchstart)
        box.addEventListener('touchmove', touchmove)
    }

    ws.onclose = () => {
        console.log('disconnected data')
        box.removeEventListener('mousedown', mousedown)
        box.removeEventListener('mouseup', mouseup)
        box.removeEventListener('mousemove', mousemove)
        window.removeEventListener('keydown', keydown)
        window.removeEventListener('mousewheel', mousewheel)
        box.removeEventListener('touchstart', touchstart)
        box.removeEventListener('touchmove', touchmove)

        if (useData) {
            dataConnect(dataWs, dataUri)
        }
    }

    ws.onmessage = (e) => {
        console.log(e.data)
    }
}

const dataDisconnect = () => {
    if (dataWs !== undefined && dataWs !== null) {
        dataWs.close()
        dataWs = null
    }
    useData = false
}

//connect data
dataConnect(dataWs, dataUri)