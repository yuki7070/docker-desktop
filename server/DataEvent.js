const spawn = require('child_process').spawn
const exec = require('child_process').exec
const keymap = require('./setting.js').keymap
const mousemap = require('./setting.js').mousemap

module.exports = function (ws) {
    ws.client_events.on('mousedown', e => {
        if (e.button == 3) {
            exec(`xdotool key Alt_L+Left`, { env: { DISPLAY: ':1' }})
        } else if (e.button == 4) {
            exec(`xdotool key Alt_L+Right`, { env: { DISPLAY: ':1' }})
        } else if (mousemap[e.button]) {
            exec(`xdotool mousedown ${mousemap[e.button]}`, { env: { DISPLAY: ':1' }})
        }
    })
    
    ws.client_events.on('mouseup', e => {
        if (!mousemap[e.button]) return
        exec(`xdotool mouseup ${mousemap[e.button]}`, { env: { DISPLAY: ':1' }})
    })
    
    ws.client_events.on('mousemove', e => {
        exec(`xdotool mousemove ${e.x} ${e.y}`, { env: { DISPLAY: ':1' }})
    })
    
    ws.client_events.on('keydown', e => {
        if (keymap[e.key]) {
            exec(`xdotool key ${keymap[e.key]}`, { env: { DISPLAY: ':1' }})
        } else {
            exec(`xdotool key ${e.key}`, { env: { DISPLAY: ':1' }})
        }
    })
    
    ws.client_events.on('mousewheel', e => {
        if (e.deltaY > 0) {
            exec(`xdotool click 5`, { env: { DISPLAY: ':1' }})
        } else {
            exec(`xdotool click 4`, { env: { DISPLAY: ':1' }})
        }
    })
    
    ws.client_events.on('app', e => {
        spawn(e.app, [], { env: { DISPLAY: ':1' }})
    })
}
