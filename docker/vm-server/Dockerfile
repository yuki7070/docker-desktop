FROM ubuntu:trusty

RUN apt-get update && apt-get install -y \
    wget \
    xz-utils \
    firefox \
    Xvfb \
    xdotool \
    xfce4

WORKDIR /tmp

RUN wget https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz \
      && tar Jxvf ./ffmpeg-release-amd64-static.tar.xz \
      && cp ./ffmpeg*-static/ffmpeg /usr/local/bin/

COPY startup.sh /startup.sh
RUN chmod 744 /startup.sh
