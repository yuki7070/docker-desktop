//const wsavc = new WSAvcPlayer.default({ useWorker: true});
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

const videoUri = document.location.protocol === 'https:' ?
    `wss://${document.location.host}/wsvideo` : `ws://${document.location.host}/wsvideo`
const audioUri = document.location.protocol === 'https:' ?
    `wss://${document.location.host}/wsaudio` : `ws://${document.location.host}/wsaudio`
const dataUri = document.location.protocol === 'https:' ?
    `wss://${document.location.host}/wsdata` : `ws://${document.location.host}/wsdata`

//connect video
//wsavc.connect(videoUri)

//connect video 
const videoPlayer = new VideoPlayer({width: 1280, height: 720})

//canvas
document.getElementById('video-box').appendChild(videoPlayer.Player.canvas)
document.oncontextmenu = () => { return false }

videoPlayer.start(videoUri, '500k', 15)
/*
const el = document.querySelector('#frame_shift')
videoPlayer.on('frame_shift', (e) => {
    el.innerHTML = e
})
*/

//connect audio
let audioPlayer = new AudioPlayer(48000, 1)
window.addEventListener('click', () => {
    if (!audioPlayer.playing) {
        audioPlayer.start(audioUri, 'opus')
    }
},{ once: true })
//audioPlayer.start(audioUri, 'opus')

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
        //console.debug(e)
        ws.send(JSON.stringify({ action: 'mousedown',
            payload: { x: Math.floor(e.offsetX/box.offsetWidth*height),
                y: Math.floor(e.offsetY/box.offsetHeight*width),
                button: e.button }}))
        return false
    }
    const mouseup = function (e) {
        //console.debug(e)
        ws.send(JSON.stringify({ action: 'mouseup',
            payload: { x: Math.floor(e.offsetX/box.offsetWidth*height),
                y: Math.floor(e.offsetY/box.offsetHeight*width),
                button: e.button }}))
        return false
    }
    const mousemove = (function () {
        const interval = 50
        let lastTime = performance.now() - interval
        return function (e) {
            if ((lastTime + interval) <= performance.now()) {
                lastTime = performance.now()
                if (isTouch) return
                //console.debug(e)
                ws.send(JSON.stringify({ action: 'mousemove',
                    payload: { x: Math.floor(e.offsetX/box.offsetWidth*height),
                        y: Math.floor(e.offsetY/box.offsetHeight*width) }}))
            }
        }
    })()
    const keydown = function (e) {
        console.debug(e)
        ws.send(JSON.stringify({ action: 'keydown',
            payload: {key: e.key}}))
    }
    const mousewheel = function (e) {
        //console.debug(e)
        ws.send(JSON.stringify({ action: 'mousewheel',
            payload: {deltaX: e.deltaX, deltaY: e.deltaY}}))
    }
    let isTouch = false
    let TouchPos = {
        x: 0, y: 0
    }
    let canMove = null
    const touchstart = function (e) {
        //console.log(e)
        isTouch = true
        TouchPos = { y: e.touches[0].pageY, x: e.touches[0].pageX }
    }
    const touchmove = function (e) {
        if (canMove) return
        canMove = setTimeout(() => {
            canMove = 0
            const pre = TouchPos
            if (isTouch) {
                TouchPos = { y: e.touches[e.touches.length-1].pageY, x: e.touches[e.touches.length-1].pageX }
            }
            if (e.touches.length === 1) {            
                console.log(e)
                currentY = e.touches[0].pageY
                currentX = e.touches[0].pageX
                ws.send(JSON.stringify({ action: 'touchmove',
                    payload: { x: Math.floor(currentX/box.offsetWidth*height) - Math.floor(pre.x/box.offsetWidth*height),
                        y: Math.floor(currentY/box.offsetHeight*width) - Math.floor(pre.y/box.offsetHeight*width) }}))
            } else if (e.touches.length === 2) {
                ws.send(JSON.stringify({ action: 'mousewheel',
                    payload: {deltaX: pre.x - TouchPos.x, deltaY: pre.y - TouchPos.y}}))
            }
        }, 50)
        
    }

    const touchend = function (e) {
        //isTouch = false
    }

    ws.onopen = () => {
        useData = true
        console.log("ws connected data")
        box.addEventListener('mousedown', mousedown)
        box.addEventListener('mouseup', mouseup)
        box.addEventListener('mousemove', mousemove)
        window.addEventListener('keydown', keydown)
        window.addEventListener('mousewheel', mousewheel)
        // touch move
        window.addEventListener('touchstart', touchstart)
        window.addEventListener('touchmove', touchmove)
        window.addEventListener('touchend', touchend)
    }

    ws.onclose = () => {
        console.log('disconnected data')
        box.removeEventListener('mousedown', mousedown)
        box.removeEventListener('mouseup', mouseup)
        box.removeEventListener('mousemove', mousemove)
        window.removeEventListener('keydown', keydown)
        window.removeEventListener('mousewheel', mousewheel)
        // touch move
        window.removeEventListener('touchstart', touchstart)
        window.removeEventListener('touchmove', touchmove)
        window.removeEventListener('touchend', touchend)

        if (useData) {
            //dataConnect(dataWs, dataUri)
        }
    }

    ws.onerror = () => {
        dataConnect(dataWs, dataUri)
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