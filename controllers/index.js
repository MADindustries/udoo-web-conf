var ifconfig = require('wireless-tools/ifconfig');
var exec = require('child_process').exec;
var fs = require('fs');
var isOnline = require('is-online');

io.on('connection', function(socket) {
    var clientconnected = true;
    if (clientconnected) {
        getMotionSensors();
    }
    
    getsysteminfos();
    socket.on('getnetworkstatus', function () {
        getsysteminfos();
    });

    socket.on('disconnect', function () {
        clientconnected = false;
        console.log('Client Disconnected');
    });
});

function getsysteminfos() {
    var ethip = 'Not Connected';
    var wlanip = 'Not Connected';
    var usbip = 'Not Connected';
    var bt = 'Not Connected';
    var name = ' ';
    var model = ' ';
    var wlansssid = ' ';

    ifconfig.status('eth0', function(err, status) {
        if (status && status.ipv4_address != undefined ) {
            ethip = status.ipv4_address;
            io.emit('ethstatus', ethip);
        } else {
            io.emit('ethstatus', 'Not Available');
        }
    });

    ifconfig.status('wlan', function(err, status) {
        if (status && status.ipv4_address != undefined ) {
            console.log("addre");
            wlanip = status.ipv4_address;
            io.emit('wlanstatus', wlanip);
            exec("iw dev wlan0 link | grep SSID",  function (error, stdout, stderr) {
                if (error !== null) {
                    console.log('Cannot Get Network SSID : ' +error);
                }
                else {
                    out = stdout.toString();
                    wlanssid = out.substring(out.indexOf(":")+1)
                    io.emit('wlansssid', wlanssid);
                }
            });
        } else {
            io.emit('wlanstatus', 'Not Available');
        }
    });

    ifconfig.status('usb0', function(err, status) {
        if (status && status.ipv4_address != undefined ) {
            usbip = status.ipv4_address;
            io.emit('usbstatus', usbip);
        } else {
            io.emit('usbstatus', 'Not Available');
        }
    });
    
    // not implemented
    io.emit('btstatus', 'Not Available');

    exec("/opt/udoo-web-conf/shscripts/model.sh",  function (error, stdout, stderr) {
        if (error !== null) {
            console.log('Cannot Launch model script: ' +error);
        } else {
            model = stdout.toString();
            io.emit('model', 'UDOO NEO ' +model);
        }
    });

    require('getmac').getMac(function(err,macAddress) {
        if (err)  throw err
        io.emit('macaddress', macAddress);
    });
    
    isOnline(function(err, online) {
        var online= 'NO';
        if (online = 'TRUE') {
            isonline= 'YES'
        }

        io.emit('online', isonline);
    });

    fs.readFile('/etc/hostname', 'utf8', function (err,data) {
        if (err) {
            return console.log(err);
        }
        io.emit('boardname', data)
    });
}

function getMotionSensors() {
    console.log('Reading Motion Sensors Values');

    exec("echo 1 > /sys/class/misc/FreescaleGyroscope/enable", function (error, stdout, stderr) {
        if (error !== null) {
            console.log('Cannot Enable Gyroscope: '+error);
        }
    });
    exec("echo 1 > /sys/class/misc/FreescaleAccelerometer/enable", function (error, stdout, stderr) {
        if (error !== null) {
            console.log('Cannot Enable Accelerometer: '+error);
        }
    });
    exec("echo 1 > /sys/class/misc/FreescaleMagnetometer/enable", function (error, stdout, stderr) {
        if (error !== null) {
            console.log('Cannot Enable Magnetometer: '+error);
        }
    });
    
    var zero = {
        modulus: 0,
        axis: [0, 0, 0]
    };
        
    var acc  = zero,
        gyro = zero,
        magn = zero;
  
    setInterval(function () {
        fs.readFile('/sys/class/misc/FreescaleAccelerometer/data', 'utf8', function (err, data) {
            if (err) {
                acc = zero;
                return;
            }
            var axis = data.split(",");
            axis = [parseInt(axis[0]), parseInt(axis[1]), parseInt(axis[2])];
            var modulus = Math.sqrt(axis[0]*axis[0] + axis[1]*axis[1] + axis[2]*axis[2]);
            
            acc = {
                modulus: modulus,
                axis: axis
            };
        });
        
        fs.readFile('/sys/class/misc/FreescaleGyroscope/data', 'utf8', function (err, data) {
            if (err) {
                gyro = zero;
                return;
            }
            var axis = data.split(",");
            axis = [parseInt(axis[0]), parseInt(axis[1]), parseInt(axis[2])];
            var modulus = Math.sqrt(axis[0]*axis[0] + axis[1]*axis[1] + axis[2]*axis[2]);
            
            gyro = {
                modulus: modulus,
                axis: axis
            };
        });

        fs.readFile('/sys/class/misc/FreescaleMagnetometer/data', 'utf8', function (err, data) {
            if (err) {
                magn = zero;
                return;
            }
            var axis = data.split(",");
            axis = [parseInt(axis[0]), parseInt(axis[1]), parseInt(axis[2])];
            var modulus = Math.sqrt(axis[0]*axis[0] + axis[1]*axis[1] + axis[2]*axis[2]);
            
            magn = {
                modulus: modulus,
                axis: axis
            };
        });

        io.emit('motion', {
            accelerometer: acc,
            gyroscope: gyro,
            magnetometer: magn
        });
    }, 300);

}