#!/bin/bash

DEBIAN_FRONTEND=noninteractive apt-get install -y expect

timeout=-1
command="apt-get install -y xfce4"
country="54"
keyboard="1"
geographic="6"
timezone="79"

expect -c "
    set timeout ${timeout}
    spawn ${command}
    expect \"Country\"
    send \"${country}\n\"
    expect \"Keyboard\"
    send \"${keyboard}\n\"
    expect \"Geographic\"
    send \"${geographic}\n\"
    expect \"Time\"
    send \"${timezone}\n\"
    expect \"$\"
    exit 0
"
exit 0