const path = require('path')
const http = require('http')
const spawn = require('child_process').spawn
const express = require('express')
const WebSocketServer = require('ws').Server
const VideoServer = require('./WebSocket.js')
const AudioServer = require('./WebSocket.js')
const DataServer = require('./WebSocket.js')
const SetDataEvent = require('./DataEvent.js')

const height = 720
const width = 1280

const useDocker = process.argv.includes('docker')

const app = express()
app.use(express.static(path.resolve(__dirname, 'html')))
app.use(express.static(path.resolve(__dirname, 'lib')))

const server = http.createServer(app)

const videoWs = new WebSocketServer({ port: 9001 })
const audioWs = new WebSocketServer({ port: 9002 })
const dataWs = new WebSocketServer({ port: 9003 })

const video = new VideoServer(videoWs, width, height)
const audio = new AudioServer(audioWs, width, height)
const dataS = new DataServer(dataWs)
SetDataEvent(dataS)

if (!useDocker) {
    
    //launhc Xvfb
    const Xfvb = spawn('Xvfb', [':1', '-screen', '0', '1280x720x24'])
    Xfvb.stderr.on('data', (data) => {
        console.log(`Xfvb stderr: ${data}`)
    })
    
    //launch pulseaudio
    const launchPulseAudio = () => {
        const pulseaudio = spawn('pulseaudio', [], { env: { DISPLAY: ':1' } })
        pulseaudio.stderr.on('data', (data) => {
            console.log(`pulseaudio stderr: ${data}`)
        })
        pulseaudio.on('close', () => {
            launchPulseAudio()
        })
    }
    launchPulseAudio()
    

    /*
    このプログラム上でxfce4を起動すると音声を取れない。
    なぜかは調査中。
    プログラム上でXvfbとaudiopulseを起動してターミナルからxfce4を起動すると
    音声も取ることが出来る。
    */
    /*
    //launch xfce4
    const xfce4 = spawn('startxfce4', [], { env: { DISPLAY: ':1' }})
    xfce4.stderr.on('data', (data) => {
        console.log(`startxfce4 stderr: ${data}`)
    })
    */
    
    /*
    なぜかわからないがこの方法でxfce4を起動すると音も取れる
    */
    const setup = spawn('/bin/bash', ['./setup.sh'])
    setup.stderr.on('data', (data) => {
        console.log(`setup stderr: ${data}`)
    })
    

    let videoStream, audioStream = null

    const startVideoStream = () => {
        console.log('starting video stream ffmpeg')
        videoStream = spawn('ffmpeg', [ '-framerate', '30',
                                    '-video_size', '1280x720',
                                    '-f', 'x11grab',
                                    '-i', ':1',
                                    '-vcodec', 'libx264',
                                    '-b:v', '1M',
                                    '-vprofile', 'baseline',
                                    '-tune', 'zerolatency',
                                    '-pix_fmt', 'yuv420p',
                                    '-r', '30',
                                    '-g', '30',
                                    '-f', 'rawvideo',
                                    'pipe:1.raw'])
        videoStream.on('close', () => {
            videoStream = null
        })
        videoStream.stderr.on('data', (data) => {
            console.error(`videoStream stderr: ${data}`);
        })
        video.setVideoStream(videoStream.stdout)
    }

    const errmsg = 'Application provided invalid, non monotonically increasing dts to muxer in stream 0'
    let err = false

    const startAudioStream = () => {
        console.log('starting audio stream ffmpeg')
        audioStream = spawn('ffmpeg', [ '-f', 'pulse',
                                    '-ac', '2',
                                    '-i', 'default',
                                    '-ac', '1',
                                    '-c:a', 'libopus',
                                    '-application', 'lowdelay',
                                    '-map', '0:a',
                                    '-f', 'data',
                                    'pipe:1'])
        audioStream.on('close', () => {
            audioStream = null
        })
        audioStream.stderr.on('data', (data) => {
            if (data.indexOf(errmsg) != -1) {
                err = true
            } else if (err) {
                err = false
                audio.broadcast('audioerror', 'err')
            }
            console.error(`audioStream stderr: ${data}`);
        })
        audio.setAudioStream(audioStream.stdout)
    }

    video.on('client_connected', () => {
        if (!videoStream && video.clients.size == 1) {
            startVideoStream()
        }
    })

    audio.on('client_connected', () => {
        if (!audioStream && audio.clients.size == 1) {
            startAudioStream()
        }
    })

    video.on('client_disconnected', () => {
        console.log('video stream client disconnected')
        if (video.clients.size < 1) {
            if (!videoStream) {
                console.log('video ffmpeg not running')
                return
            }
            console.log('stopping video ffmpeg')
            videoStream.kill('SIGTERM')
        }
    })

    audio.on('client_disconnected', () => {
        console.log('audio stream client disconnected')
        if (audio.clients.size < 1) {
            if (!audioStream) {
                console.log('audio ffmpeg not running')
                return
            }
            console.log('stopping audio ffmpeg')
            audioStream.kill('SIGTERM')
        }
    })
} else {
    this.videoTCPServer = net.createServer((socket) => {
        socket.on('error', e => {
            console.log('video downstream error:', e)
        })
        video.setVideoStream(socket)
    })
    this.audioTCPServer = net.createServer((socket) => {
        socket.on('error', e => {
            console.log('audio downstream error:', e)
        })
        audio.setAudioStream(socket)
    })
    this.videoTCPServer.listen(5000, '0.0.0.0')
    this.audioTCPServer.listen(5001, '0.0.0.0')
}

server.listen(9000)