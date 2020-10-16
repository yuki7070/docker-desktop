# Docker-Desktop
virtual desktop on docker with browser 

## Description
it can choose virtual desktop whether on docker or not.
if you use it directly, you must install requirement.

- Video
 - Canvas decoding h264 1920x1080
- Audio
 - WebAudioAPI

## Requirement
* docker
* xvfb
* nodejs
* xfce4
* ffmpeg

## Usage
#### use Docker
```sh
git clone git@github.com:yuki7070/docker-desktop.git
cd docker-desktop
docker-compose build
docker-compose up -d
```

#### not use docker
```sh
git clone git@github.com:yuki7070/docker-desktop.git
cd docker-desktop/server
npm install
nodejs index.js
```

and access ```http://host:9099``` on browser

## Build Library
```sh
make
```


## Link
* [Broadway.js](https://github.com/mbebenita/Broadway)
* [libopus](https://github.com/xiph/opus)
