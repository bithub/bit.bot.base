/*
 * noVNC: HTML5 VNC client
 * Copyright (C) 2011 Joel Martin
 * Licensed under LGPL-3 (see LICENSE.txt)
 *
 * See README.md for usage and integration instructions.
 */

"use strict";
/*jslint bitwise: false, white: false */
/*global window, console, document, navigator, ActiveXObject */


var VNCCanvas = function()
{

// Globals defined here
var Util = {};


/*
 * Make arrays quack
 */

Util.push8 = function (arr,num) {
    arr.push(arr,num & 0xFF);
};

Util.push16 = function (arr,num) {
    arr.push((arr,num >> 8) & 0xFF,
              (arr,num     ) & 0xFF  );
};

Util.push32 = function (arr,num) {
    arr.push((arr,num >> 24) & 0xFF,
              (arr,num >> 16) & 0xFF,
              (arr,num >>  8) & 0xFF,
              (arr,num      ) & 0xFF  );
};



/* 
 * ------------------------------------------------------
 * Namespaced in Util
 * ------------------------------------------------------
 */

/*
 * Logging/debug routines
 */

Util._log_level = 'warn';
Util.init_logging = function (level) {
    if (typeof level === 'undefined') {
        level = Util._log_level;
    } else {
        Util._log_level = level;
    }
    if (typeof window.console === "undefined") {
        if (typeof window.opera !== "undefined") {
            window.console = {
                'log'  : window.opera.postError,
                'warn' : window.opera.postError,
                'error': window.opera.postError };
        } else {
            window.console = {
                'log'  : function(m) {},
                'warn' : function(m) {},
                'error': function(m) {}};
        }
    }

    Util.Debug = Util.Info = Util.Warn = Util.Error = function (msg) {};
    switch (level) {
        case 'debug': Util.Debug = function (msg) { console.log(msg); };
        case 'info':  Util.Info  = function (msg) { console.log(msg); };
        case 'warn':  Util.Warn  = function (msg) { console.warn(msg); };
        case 'error': Util.Error = function (msg) { console.error(msg); };
        case 'none':
            break;
        default:
            throw("invalid logging type '" + level + "'");
    }
};
Util.get_logging = function () {
    return Util._log_level;
};
// Initialize logging level
Util.init_logging();


// Set configuration default for Crockford style function namespaces
Util.conf_default = function(cfg, api, defaults, v, mode, type, defval, desc) {
    var getter, setter;

    // Default getter function
    getter = function (idx) {
        if ((type in {'arr':1, 'array':1}) &&
            (typeof idx !== 'undefined')) {
            return cfg[v][idx];
        } else {
            return cfg[v];
        }
    };

    // Default setter function
    setter = function (val, idx) {
        if (type in {'boolean':1, 'bool':1}) {
            if ((!val) || (val in {'0':1, 'no':1, 'false':1})) {
                val = false;
            } else {
                val = true;
            }
        } else if (type in {'integer':1, 'int':1}) {
            val = parseInt(val, 10);
        } else if (type === 'func') {
            if (!val) {
                val = function () {};
            }
        }
        if (typeof idx !== 'undefined') {
            cfg[v][idx] = val;
        } else {
            cfg[v] = val;
        }
    };

    // Set the description
    api[v + '_description'] = desc;

    // Set the getter function
    if (typeof api['get_' + v] === 'undefined') {
        api['get_' + v] = getter;
    }

    // Set the setter function with extra sanity checks
    if (typeof api['set_' + v] === 'undefined') {
        api['set_' + v] = function (val, idx) {
            if (mode in {'RO':1, 'ro':1}) {
                throw(v + " is read-only");
            } else if ((mode in {'WO':1, 'wo':1}) &&
                       (typeof cfg[v] !== 'undefined')) {
                throw(v + " can only be set once");
            }
            setter(val, idx);
        };
    }

    // Set the default value
    if (typeof defaults[v] !== 'undefined') {
        defval = defaults[v];
    } else if ((type in {'arr':1, 'array':1}) &&
            (! (defval instanceof Array))) {
        defval = [];
    }
    // Coerce existing setting to the right type
    //Util.Debug("v: " + v + ", defval: " + defval + ", defaults[v]: " + defaults[v]);
    setter(defval);
};

// Set group of configuration defaults
Util.conf_defaults = function(cfg, api, defaults, arr) {
    var i;
    for (i = 0; i < arr.length; i++) {
        Util.conf_default(cfg, api, defaults, arr[i][0], arr[i][1],
                arr[i][2], arr[i][3], arr[i][4]);
    }
}


/*
 * Cross-browser routines
 */

// Get DOM element position on page
Util.getPosition = function (obj) {
    var x = 0, y = 0;
    if (obj.offsetParent) {
        do {
            x += obj.offsetLeft;
            y += obj.offsetTop;
            obj = obj.offsetParent;
        } while (obj);
    }
    return {'x': x, 'y': y};
};

// Get mouse event position in DOM element
Util.getEventPosition = function (e, obj, scale) {
    var evt, docX, docY, pos;
    //if (!e) evt = window.event;
    evt = (e ? e : window.event);
    evt = (evt.changedTouches ? evt.changedTouches[0] : evt.touches ? evt.touches[0] : evt);
    if (evt.pageX || evt.pageY) {
        docX = evt.pageX;
        docY = evt.pageY;
    } else if (evt.clientX || evt.clientY) {
        docX = evt.clientX + document.body.scrollLeft +
            document.documentElement.scrollLeft;
        docY = evt.clientY + document.body.scrollTop +
            document.documentElement.scrollTop;
    }
    pos = Util.getPosition(obj);
    if (typeof scale === "undefined") {
        scale = 1;
    }
    return {'x': (docX - pos.x) / scale, 'y': (docY - pos.y) / scale};
};


// Event registration. Based on: http://www.scottandrew.com/weblog/articles/cbs-events
Util.addEvent = function (obj, evType, fn){
    if (obj.attachEvent){
        var r = obj.attachEvent("on"+evType, fn);
        return r;
    } else if (obj.addEventListener){
        obj.addEventListener(evType, fn, false); 
        return true;
    } else {
        throw("Handler could not be attached");
    }
};

Util.removeEvent = function(obj, evType, fn){
    if (obj.detachEvent){
        var r = obj.detachEvent("on"+evType, fn);
        return r;
    } else if (obj.removeEventListener){
        obj.removeEventListener(evType, fn, false);
        return true;
    } else {
        throw("Handler could not be removed");
    }
};

Util.stopEvent = function(e) {
    if (e.stopPropagation) { e.stopPropagation(); }
    else                   { e.cancelBubble = true; }

    if (e.preventDefault)  { e.preventDefault(); }
    else                   { e.returnValue = false; }
};


// Set browser engine versions. Based on mootools.
Util.Features = {xpath: !!(document.evaluate), air: !!(window.runtime), query: !!(document.querySelector)};

Util.Engine = {
    // Version detection break in Opera 11.60 (errors on arguments.callee.caller reference)
    //'presto': (function() {
    //         return (!window.opera) ? false : ((arguments.callee.caller) ? 960 : ((document.getElementsByClassName) ? 950 : 925)); }()),
    'presto': (function() { return (!window.opera) ? false : true; }()),

    'trident': (function() {
            return (!window.ActiveXObject) ? false : ((window.XMLHttpRequest) ? ((document.querySelectorAll) ? 6 : 5) : 4); }()),
    'webkit': (function() {
            try { return (navigator.taintEnabled) ? false : ((Util.Features.xpath) ? ((Util.Features.query) ? 525 : 420) : 419); } catch (e) { return false; } }()),
    //'webkit': (function() {
    //        return ((typeof navigator.taintEnabled !== "unknown") && navigator.taintEnabled) ? false : ((Util.Features.xpath) ? ((Util.Features.query) ? 525 : 420) : 419); }()),
    'gecko': (function() {
            return (!document.getBoxObjectFor && window.mozInnerScreenX == null) ? false : ((document.getElementsByClassName) ? 19 : 18); }())
};
if (Util.Engine.webkit) {
    // Extract actual webkit version if available
    Util.Engine.webkit = (function(v) {
            var re = new RegExp('WebKit/([0-9\.]*) ');
            v = (navigator.userAgent.match(re) || ['', v])[1];
            return parseFloat(v, 10);
        })(Util.Engine.webkit);
}

Util.Flash = (function(){
    var v, version;
    try {
        v = navigator.plugins['Shockwave Flash'].description;
    } catch(err1) {
        try {
            v = new ActiveXObject('ShockwaveFlash.ShockwaveFlash').GetVariable('$version');
        } catch(err2) {
            v = '0 r0';
        }
    }
    version = v.match(/\d+/g);
    return {version: parseInt(version[0] || 0 + '.' + version[1], 10) || 0, build: parseInt(version[2], 10) || 0};
}()); 

// SECTION: webutil
/*
 * noVNC: HTML5 VNC client
 * Copyright (C) 2011 Joel Martin
 * Licensed under LGPL-3 (see LICENSE.txt)
 *
 * See README.md for usage and integration instructions.
 */

"use strict";
/*jslint bitwise: false, white: false */
/*global window, document */

// Globals defined here
var WebUtil = {}, $D;

/*
 * Simple DOM selector by ID
 */
if (!window.$D) {
    $D = function (id) {
        if (document.getElementById) {
            return document.getElementById(id);
        } else if (document.all) {
            return document.all[id];
        } else if (document.layers) {
            return document.layers[id];
        }
        return undefined;
    };
}


/* 
 * ------------------------------------------------------
 * Namespaced in WebUtil
 * ------------------------------------------------------
 */

// init log level reading the logging HTTP param
WebUtil.init_logging = function() {
    Util._log_level = (document.location.href.match(
         /logging=([A-Za-z0-9\._\-]*)/) ||
         ['', Util._log_level])[1];
    
    Util.init_logging()
}
WebUtil.init_logging();


WebUtil.dirObj = function (obj, depth, parent) {
    var i, msg = "", val = "";
    if (! depth) { depth=2; }
    if (! parent) { parent= ""; }

    // Print the properties of the passed-in object 
    for (i in obj) {
        if ((depth > 1) && (typeof obj[i] === "object")) { 
            // Recurse attributes that are objects
            msg += WebUtil.dirObj(obj[i], depth-1, parent + "." + i);
        } else {
            //val = new String(obj[i]).replace("\n", " ");
            if (typeof(obj[i]) === "undefined") {
                val = "undefined";
            } else {
                val = obj[i].toString().replace("\n", " ");
            }
            if (val.length > 30) {
                val = val.substr(0,30) + "...";
            } 
            msg += parent + "." + i + ": " + val + "\n";
        }
    }
    return msg;
};

// Read a query string variable
WebUtil.getQueryVar = function(name, defVal) {
    var re = new RegExp('[?][^#]*' + name + '=([^&#]*)');
    if (typeof defVal === 'undefined') { defVal = null; }
    return (document.location.href.match(re) || ['',defVal])[1];
};


/*
 * Cookie handling. Dervied from: http://www.quirksmode.org/js/cookies.html
 */

// No days means only for this browser session
WebUtil.createCookie = function(name,value,days) {
    var date, expires;
    if (days) {
        date = new Date();
        date.setTime(date.getTime()+(days*24*60*60*1000));
        expires = "; expires="+date.toGMTString();
    }
    else {
        expires = "";
    }
    document.cookie = name+"="+value+expires+"; path=/";
};

WebUtil.readCookie = function(name, defaultValue) {
    var i, c, nameEQ = name + "=", ca = document.cookie.split(';');
    for(i=0; i < ca.length; i += 1) {
        c = ca[i];
        while (c.charAt(0) === ' ') { c = c.substring(1,c.length); }
        if (c.indexOf(nameEQ) === 0) { return c.substring(nameEQ.length,c.length); }
    }
    return (typeof defaultValue !== 'undefined') ? defaultValue : null;
};

WebUtil.eraseCookie = function(name) {
    WebUtil.createCookie(name,"",-1);
};

/*
 * Alternate stylesheet selection
 */
WebUtil.getStylesheets = function() { var i, links, sheets = [];
    links = document.getElementsByTagName("link");
    for (i = 0; i < links.length; i += 1) {
        if (links[i].title &&
            links[i].rel.toUpperCase().indexOf("STYLESHEET") > -1) {
            sheets.push(links[i]);
        }
    }
    return sheets;
};

// No sheet means try and use value from cookie, null sheet used to
// clear all alternates.
WebUtil.selectStylesheet = function(sheet) {
    var i, link, sheets = WebUtil.getStylesheets();
    if (typeof sheet === 'undefined') {
        sheet = 'default';
    }
    for (i=0; i < sheets.length; i += 1) {
        link = sheets[i];
        if (link.title === sheet) {    
            Util.Debug("Using stylesheet " + sheet);
            link.disabled = false;
        } else {
            //Util.Debug("Skipping stylesheet " + link.title);
            link.disabled = true;
        }
    }
    return sheet;
};
// SECTION: base64
// SECTION: websock
/*
 * Websock: high-performance binary WebSockets
 * Copyright (C) 2011 Joel Martin
 * Licensed under LGPL-3 (see LICENSE.txt)
 *
 * Websock is similar to the standard WebSocket object but Websock
 * enables communication with raw TCP sockets (i.e. the binary stream)
 * via websockify. This is accomplished by base64 encoding the data
 * stream between Websock and websockify.
 *
 * Websock has built-in receive queue buffering; the message event
 * does not contain actual data but is simply a notification that
 * there is new data available. Several rQ* methods are available to
 * read binary data off of the receive queue.
 */


// Load Flash WebSocket emulator if needed

if (window.WebSocket) {
    Websock_native = true;
} else if (window.MozWebSocket) {
    Websock_native = true;
    window.WebSocket = window.MozWebSocket;
} else {
    /* no builtin WebSocket so load web_socket.js */
    Websock_native = false;
    (function () {
        function get_INCLUDE_URI() {
            return (typeof INCLUDE_URI !== "undefined") ?
                INCLUDE_URI : "/desktop/include/";
        }

        var start = "<script src='" + get_INCLUDE_URI(),
            end = "'><\/script>", extra = "";

        WEB_SOCKET_SWF_LOCATION = get_INCLUDE_URI() +
                    "web-socket-js/WebSocketMain.swf";
        if (Util.Engine.trident) {
            Util.Debug("Forcing uncached load of WebSocketMain.swf");
            WEB_SOCKET_SWF_LOCATION += "?" + Math.random();
        }
        extra += start + "web-socket-js/swfobject.js" + end;
        extra += start + "web-socket-js/web_socket.js" + end;
        document.write(extra);
    }());
}


function Websock() {
"use strict";

var api = {},         // Public API
    websocket = null, // WebSocket object
    rQ = [],          // Receive queue
    rQi = 0,          // Receive queue index
    rQmax = 10000,    // Max receive queue size before compacting
    sQ = [],          // Send queue

    eventHandlers = {
        'message' : function() {},
        'open'    : function() {},
        'close'   : function() {},
        'error'   : function() {}
    },

    test_mode = false;


//
// Queue public functions
//

function get_sQ() {
    return sQ;
}

function get_rQ() {
    return rQ;
}
function get_rQi() {
    return rQi;
}
function set_rQi(val) {
    rQi = val;
};

function rQlen() {
    return rQ.length - rQi;
}

function rQpeek8() {
    return (rQ[rQi]      );
}
function rQshift8() {
    return (rQ[rQi++]      );
}
function rQunshift8(num) {
    if (rQi === 0) {
        rQ.unshift(num);
    } else {
        rQi -= 1;
        rQ[rQi] = num;
    }

}
function rQshift16() {
    return (rQ[rQi++] <<  8) +
           (rQ[rQi++]      );
}
function rQshift32() {
    return (rQ[rQi++] << 24) +
           (rQ[rQi++] << 16) +
           (rQ[rQi++] <<  8) +
           (rQ[rQi++]      );
}
function rQshiftStr(len) {
    var arr = rQ.slice(rQi, rQi + len);
    rQi += len;
    return arr.map(function (num) {
            return String.fromCharCode(num); } ).join('');

}
function rQshiftBytes(len) {
    rQi += len;
    return rQ.slice(rQi-len, rQi);
}

function rQslice(start, end) {
    if (end) {
        return rQ.slice(rQi + start, rQi + end);
    } else {
        return rQ.slice(rQi + start);
    }
}

// Check to see if we must wait for 'num' bytes (default to FBU.bytes)
// to be available in the receive queue. Return true if we need to
// wait (and possibly print a debug message), otherwise false.
function rQwait(msg, num, goback) {
    var rQlen = rQ.length - rQi; // Skip rQlen() function call
    if (rQlen < num) {
        if (goback) {
            if (rQi < goback) {
                throw("rQwait cannot backup " + goback + " bytes");
            }
            rQi -= goback;
        }
        //Util.Debug("   waiting for " + (num-rQlen) +
        //           " " + msg + " byte(s)");
        return true;  // true means need more data
    }
    return false;
}

//
// Private utility routines
//

function encode_message() {
    /* base64 encode */
    return Base64.encode(sQ);
}

function decode_message(data) {
    //Util.Debug(">> decode_message: " + data);
    /* base64 decode */
    rQ = rQ.concat(Base64.decode(data, 0));
    //Util.Debug(">> decode_message, rQ: " + rQ);
}


//
// Public Send functions
//

function flush() {
    if (websocket.bufferedAmount !== 0) {
        Util.Debug("bufferedAmount: " + websocket.bufferedAmount);
    }
    if (websocket.bufferedAmount < api.maxBufferedAmount) {
        //Util.Debug("arr: " + arr);
        //Util.Debug("sQ: " + sQ);
        if (sQ.length > 0) {
            websocket.send(encode_message(sQ));
            sQ = [];
        }
        return true;
    } else {
        Util.Info("Delaying send, bufferedAmount: " +
                websocket.bufferedAmount);
        return false;
    }
}

// overridable for testing
function send(arr) {
    //Util.Debug(">> send_array: " + arr);
    sQ = sQ.concat(arr);
    return flush();
}

function send_string(str) {
    //Util.Debug(">> send_string: " + str);
    api.send(str.split('').map(
        function (chr) { return chr.charCodeAt(0); } ) );
}

//
// Other public functions

function recv_message(e) {
    //Util.Debug(">> recv_message: " + e.data.length);

    try {
        decode_message(e.data);
        if (rQlen() > 0) {
            eventHandlers.message();
            // Compact the receive queue
            if (rQ.length > rQmax) {
                //Util.Debug("Compacting receive queue");
                rQ = rQ.slice(rQi);
                rQi = 0;
            }
        } else {
            Util.Debug("Ignoring empty message");
        }
    } catch (exc) {
        if (typeof exc.stack !== 'undefined') {
            Util.Warn("recv_message, caught exception: " + exc.stack);
        } else if (typeof exc.description !== 'undefined') {
            Util.Warn("recv_message, caught exception: " + exc.description);
        } else {
            Util.Warn("recv_message, caught exception:" + exc);
        }
        if (typeof exc.name !== 'undefined') {
            eventHandlers.error(exc.name + ": " + exc.message);
        } else {
            eventHandlers.error(exc);
        }
    }
    //Util.Debug("<< recv_message");
}


// Set event handlers
function on(evt, handler) { 
    eventHandlers[evt] = handler;
}

function init() {
    rQ         = [];
    rQi        = 0;
    sQ         = [];
    websocket  = null;
}

function open(uri) {
    init();

    if (test_mode) {
        websocket = {};
    } else {
        websocket = new WebSocket(uri, 'base64');
        // TODO: future native binary support
        //websocket = new WebSocket(uri, ['binary', 'base64']);
    }

    websocket.onmessage = recv_message;
    websocket.onopen = function() {
        Util.Debug(">> WebSock.onopen");
        if (websocket.protocol) {
            Util.Info("Server chose sub-protocol: " + websocket.protocol);
        }
        eventHandlers.open();
        Util.Debug("<< WebSock.onopen");
    };
    websocket.onclose = function(e) {
        Util.Debug(">> WebSock.onclose");
        eventHandlers.close(e);
        Util.Debug("<< WebSock.onclose");
    };
    websocket.onerror = function(e) {
        Util.Debug(">> WebSock.onerror: " + e);
        eventHandlers.error(e);
        Util.Debug("<< WebSock.onerror");
    };
}

function close() {
    if (websocket) {
        if ((websocket.readyState === WebSocket.OPEN) ||
            (websocket.readyState === WebSocket.CONNECTING)) {
            Util.Info("Closing WebSocket connection");
            websocket.close();
        }
        websocket.onmessage = function (e) { return; };
    }
}

// Override internal functions for testing
// Takes a send function, returns reference to recv function
function testMode(override_send) {
    test_mode = true;
    api.send = override_send;
    api.close = function () {};
    return recv_message;
}

function constructor() {
    // Configuration settings
    api.maxBufferedAmount = 200;

    // Direct access to send and receive queues
    api.get_sQ       = get_sQ;
    api.get_rQ       = get_rQ;
    api.get_rQi      = get_rQi;
    api.set_rQi      = set_rQi;

    // Routines to read from the receive queue
    api.rQlen        = rQlen;
    api.rQpeek8      = rQpeek8;
    api.rQshift8     = rQshift8;
    api.rQunshift8   = rQunshift8;
    api.rQshift16    = rQshift16;
    api.rQshift32    = rQshift32;
    api.rQshiftStr   = rQshiftStr;
    api.rQshiftBytes = rQshiftBytes;
    api.rQslice      = rQslice;
    api.rQwait       = rQwait;

    api.flush        = flush;
    api.send         = send;
    api.send_string  = send_string;

    api.on           = on;
    api.init         = init;
    api.open         = open;
    api.close        = close;
    api.testMode     = testMode;

    return api;
}

return constructor();

}
// SECTION: des
/*
 * Ported from Flashlight VNC ActionScript implementation:
 *     http://www.wizhelp.com/flashlight-calendar/
 *
 * Full attribution follows:
 *
 * -------------------------------------------------------------------------
 *
 * This DES class has been extracted from package Acme.Crypto for use in VNC.
 * The unnecessary odd parity code has been removed.
 *
 * These changes are:
 *  Copyright (C) 1999 AT&T Laboratories Cambridge.  All Rights Reserved.
 *
 * This software is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 *

 * DesCipher - the DES encryption method
 *
 * The meat of this code is by Dave Zimmerman <dzimm@widget.com>, and is:
 *
 * Copyright (c) 1996 Widget Workshop, Inc. All Rights Reserved.
 *
 * Permission to use, copy, modify, and distribute this software
 * and its documentation for NON-COMMERCIAL or COMMERCIAL purposes and
 * without fee is hereby granted, provided that this copyright notice is kept 
 * intact. 
 * 
 * WIDGET WORKSHOP MAKES NO REPRESENTATIONS OR WARRANTIES ABOUT THE SUITABILITY
 * OF THE SOFTWARE, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED
 * TO THE IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
 * PARTICULAR PURPOSE, OR NON-INFRINGEMENT. WIDGET WORKSHOP SHALL NOT BE LIABLE
 * FOR ANY DAMAGES SUFFERED BY LICENSEE AS A RESULT OF USING, MODIFYING OR
 * DISTRIBUTING THIS SOFTWARE OR ITS DERIVATIVES.
 * 
 * THIS SOFTWARE IS NOT DESIGNED OR INTENDED FOR USE OR RESALE AS ON-LINE
 * CONTROL EQUIPMENT IN HAZARDOUS ENVIRONMENTS REQUIRING FAIL-SAFE
 * PERFORMANCE, SUCH AS IN THE OPERATION OF NUCLEAR FACILITIES, AIRCRAFT
 * NAVIGATION OR COMMUNICATION SYSTEMS, AIR TRAFFIC CONTROL, DIRECT LIFE
 * SUPPORT MACHINES, OR WEAPONS SYSTEMS, IN WHICH THE FAILURE OF THE
 * SOFTWARE COULD LEAD DIRECTLY TO DEATH, PERSONAL INJURY, OR SEVERE
 * PHYSICAL OR ENVIRONMENTAL DAMAGE ("HIGH RISK ACTIVITIES").  WIDGET WORKSHOP
 * SPECIFICALLY DISCLAIMS ANY EXPRESS OR IMPLIED WARRANTY OF FITNESS FOR
 * HIGH RISK ACTIVITIES.
 *
 *
 * The rest is:
 *
 * Copyright (C) 1996 by Jef Poskanzer <jef@acme.com>.  All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 * 1. Redistributions of source code must retain the above copyright
 *    notice, this list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright
 *    notice, this list of conditions and the following disclaimer in the
 *    documentation and/or other materials provided with the distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY THE AUTHOR AND CONTRIBUTORS ``AS IS'' AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 * ARE DISCLAIMED.  IN NO EVENT SHALL THE AUTHOR OR CONTRIBUTORS BE LIABLE
 * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS
 * OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION)
 * HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT
 * LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY
 * OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF
 * SUCH DAMAGE.
 *
 * Visit the ACME Labs Java page for up-to-date versions of this and other
 * fine Java utilities: http://www.acme.com/java/
 */

"use strict";
/*jslint white: false, bitwise: false, plusplus: false */

function DES(passwd) {

// Tables, permutations, S-boxes, etc.
var PC2 = [13,16,10,23, 0, 4, 2,27,14, 5,20, 9,22,18,11, 3,
           25, 7,15, 6,26,19,12, 1,40,51,30,36,46,54,29,39,
           50,44,32,47,43,48,38,55,33,52,45,41,49,35,28,31 ],
    totrot = [ 1, 2, 4, 6, 8,10,12,14,15,17,19,21,23,25,27,28],
    z = 0x0, a,b,c,d,e,f, SP1,SP2,SP3,SP4,SP5,SP6,SP7,SP8,
    keys = [];

a=1<<16; b=1<<24; c=a|b; d=1<<2; e=1<<10; f=d|e;
SP1 = [c|e,z|z,a|z,c|f,c|d,a|f,z|d,a|z,z|e,c|e,c|f,z|e,b|f,c|d,b|z,z|d,
       z|f,b|e,b|e,a|e,a|e,c|z,c|z,b|f,a|d,b|d,b|d,a|d,z|z,z|f,a|f,b|z,
       a|z,c|f,z|d,c|z,c|e,b|z,b|z,z|e,c|d,a|z,a|e,b|d,z|e,z|d,b|f,a|f,
       c|f,a|d,c|z,b|f,b|d,z|f,a|f,c|e,z|f,b|e,b|e,z|z,a|d,a|e,z|z,c|d];
a=1<<20; b=1<<31; c=a|b; d=1<<5; e=1<<15; f=d|e;
SP2 = [c|f,b|e,z|e,a|f,a|z,z|d,c|d,b|f,b|d,c|f,c|e,b|z,b|e,a|z,z|d,c|d,
       a|e,a|d,b|f,z|z,b|z,z|e,a|f,c|z,a|d,b|d,z|z,a|e,z|f,c|e,c|z,z|f,
       z|z,a|f,c|d,a|z,b|f,c|z,c|e,z|e,c|z,b|e,z|d,c|f,a|f,z|d,z|e,b|z,
       z|f,c|e,a|z,b|d,a|d,b|f,b|d,a|d,a|e,z|z,b|e,z|f,b|z,c|d,c|f,a|e];
a=1<<17; b=1<<27; c=a|b; d=1<<3; e=1<<9; f=d|e;
SP3 = [z|f,c|e,z|z,c|d,b|e,z|z,a|f,b|e,a|d,b|d,b|d,a|z,c|f,a|d,c|z,z|f,
       b|z,z|d,c|e,z|e,a|e,c|z,c|d,a|f,b|f,a|e,a|z,b|f,z|d,c|f,z|e,b|z,
       c|e,b|z,a|d,z|f,a|z,c|e,b|e,z|z,z|e,a|d,c|f,b|e,b|d,z|e,z|z,c|d,
       b|f,a|z,b|z,c|f,z|d,a|f,a|e,b|d,c|z,b|f,z|f,c|z,a|f,z|d,c|d,a|e];
a=1<<13; b=1<<23; c=a|b; d=1<<0; e=1<<7; f=d|e;
SP4 = [c|d,a|f,a|f,z|e,c|e,b|f,b|d,a|d,z|z,c|z,c|z,c|f,z|f,z|z,b|e,b|d,
       z|d,a|z,b|z,c|d,z|e,b|z,a|d,a|e,b|f,z|d,a|e,b|e,a|z,c|e,c|f,z|f,
       b|e,b|d,c|z,c|f,z|f,z|z,z|z,c|z,a|e,b|e,b|f,z|d,c|d,a|f,a|f,z|e,
       c|f,z|f,z|d,a|z,b|d,a|d,c|e,b|f,a|d,a|e,b|z,c|d,z|e,b|z,a|z,c|e];
a=1<<25; b=1<<30; c=a|b; d=1<<8; e=1<<19; f=d|e;
SP5 = [z|d,a|f,a|e,c|d,z|e,z|d,b|z,a|e,b|f,z|e,a|d,b|f,c|d,c|e,z|f,b|z,
       a|z,b|e,b|e,z|z,b|d,c|f,c|f,a|d,c|e,b|d,z|z,c|z,a|f,a|z,c|z,z|f,
       z|e,c|d,z|d,a|z,b|z,a|e,c|d,b|f,a|d,b|z,c|e,a|f,b|f,z|d,a|z,c|e,
       c|f,z|f,c|z,c|f,a|e,z|z,b|e,c|z,z|f,a|d,b|d,z|e,z|z,b|e,a|f,b|d];
a=1<<22; b=1<<29; c=a|b; d=1<<4; e=1<<14; f=d|e;
SP6 = [b|d,c|z,z|e,c|f,c|z,z|d,c|f,a|z,b|e,a|f,a|z,b|d,a|d,b|e,b|z,z|f,
       z|z,a|d,b|f,z|e,a|e,b|f,z|d,c|d,c|d,z|z,a|f,c|e,z|f,a|e,c|e,b|z,
       b|e,z|d,c|d,a|e,c|f,a|z,z|f,b|d,a|z,b|e,b|z,z|f,b|d,c|f,a|e,c|z,
       a|f,c|e,z|z,c|d,z|d,z|e,c|z,a|f,z|e,a|d,b|f,z|z,c|e,b|z,a|d,b|f];
a=1<<21; b=1<<26; c=a|b; d=1<<1; e=1<<11; f=d|e;
SP7 = [a|z,c|d,b|f,z|z,z|e,b|f,a|f,c|e,c|f,a|z,z|z,b|d,z|d,b|z,c|d,z|f,
       b|e,a|f,a|d,b|e,b|d,c|z,c|e,a|d,c|z,z|e,z|f,c|f,a|e,z|d,b|z,a|e,
       b|z,a|e,a|z,b|f,b|f,c|d,c|d,z|d,a|d,b|z,b|e,a|z,c|e,z|f,a|f,c|e,
       z|f,b|d,c|f,c|z,a|e,z|z,z|d,c|f,z|z,a|f,c|z,z|e,b|d,b|e,z|e,a|d];
a=1<<18; b=1<<28; c=a|b; d=1<<6; e=1<<12; f=d|e;
SP8 = [b|f,z|e,a|z,c|f,b|z,b|f,z|d,b|z,a|d,c|z,c|f,a|e,c|e,a|f,z|e,z|d,
       c|z,b|d,b|e,z|f,a|e,a|d,c|d,c|e,z|f,z|z,z|z,c|d,b|d,b|e,a|f,a|z,
       a|f,a|z,c|e,z|e,z|d,c|d,z|e,a|f,b|e,z|d,b|d,c|z,c|d,b|z,a|z,b|f,
       z|z,c|f,a|d,b|d,c|z,b|e,b|f,z|z,c|f,a|e,a|e,z|f,z|f,a|d,b|z,c|e];

// Set the key.
function setKeys(keyBlock) {
    var i, j, l, m, n, o, pc1m = [], pcr = [], kn = [],
        raw0, raw1, rawi, KnLi;

    for (j = 0, l = 56; j < 56; ++j, l-=8) {
        l += l<-5 ? 65 : l<-3 ? 31 : l<-1 ? 63 : l===27 ? 35 : 0; // PC1
        m = l & 0x7;
        pc1m[j] = ((keyBlock[l >>> 3] & (1<<m)) !== 0) ? 1: 0;
    }

    for (i = 0; i < 16; ++i) {
        m = i << 1;
        n = m + 1;
        kn[m] = kn[n] = 0;
        for (o=28; o<59; o+=28) {
            for (j = o-28; j < o; ++j) {
                l = j + totrot[i];
                if (l < o) {
                    pcr[j] = pc1m[l];
                } else {
                    pcr[j] = pc1m[l - 28];
                }
            }
        }
        for (j = 0; j < 24; ++j) {
            if (pcr[PC2[j]] !== 0) {
                kn[m] |= 1<<(23-j);
            }
            if (pcr[PC2[j + 24]] !== 0) {
                kn[n] |= 1<<(23-j);
            }
        }
    }

    // cookey
    for (i = 0, rawi = 0, KnLi = 0; i < 16; ++i) {
        raw0 = kn[rawi++];
        raw1 = kn[rawi++];
        keys[KnLi] = (raw0 & 0x00fc0000) << 6;
        keys[KnLi] |= (raw0 & 0x00000fc0) << 10;
        keys[KnLi] |= (raw1 & 0x00fc0000) >>> 10;
        keys[KnLi] |= (raw1 & 0x00000fc0) >>> 6;
        ++KnLi;
        keys[KnLi] = (raw0 & 0x0003f000) << 12;
        keys[KnLi] |= (raw0 & 0x0000003f) << 16;
        keys[KnLi] |= (raw1 & 0x0003f000) >>> 4;
        keys[KnLi] |= (raw1 & 0x0000003f);
        ++KnLi;
    }
}

// Encrypt 8 bytes of text
function enc8(text) {
    var i = 0, b = text.slice(), fval, keysi = 0,
        l, r, x; // left, right, accumulator

    // Squash 8 bytes to 2 ints
    l = b[i++]<<24 | b[i++]<<16 | b[i++]<<8 | b[i++];
    r = b[i++]<<24 | b[i++]<<16 | b[i++]<<8 | b[i++];

    x = ((l >>> 4) ^ r) & 0x0f0f0f0f;
    r ^= x;
    l ^= (x << 4);
    x = ((l >>> 16) ^ r) & 0x0000ffff;
    r ^= x;
    l ^= (x << 16);
    x = ((r >>> 2) ^ l) & 0x33333333;
    l ^= x;
    r ^= (x << 2);
    x = ((r >>> 8) ^ l) & 0x00ff00ff;
    l ^= x;
    r ^= (x << 8);
    r = (r << 1) | ((r >>> 31) & 1);
    x = (l ^ r) & 0xaaaaaaaa;
    l ^= x;
    r ^= x;
    l = (l << 1) | ((l >>> 31) & 1);

    for (i = 0; i < 8; ++i) {
        x = (r << 28) | (r >>> 4);
        x ^= keys[keysi++];
        fval =  SP7[x & 0x3f];
        fval |= SP5[(x >>> 8) & 0x3f];
        fval |= SP3[(x >>> 16) & 0x3f];
        fval |= SP1[(x >>> 24) & 0x3f];
        x = r ^ keys[keysi++];
        fval |= SP8[x & 0x3f];
        fval |= SP6[(x >>> 8) & 0x3f];
        fval |= SP4[(x >>> 16) & 0x3f];
        fval |= SP2[(x >>> 24) & 0x3f];
        l ^= fval;
        x = (l << 28) | (l >>> 4);
        x ^= keys[keysi++];
        fval =  SP7[x & 0x3f];
        fval |= SP5[(x >>> 8) & 0x3f];
        fval |= SP3[(x >>> 16) & 0x3f];
        fval |= SP1[(x >>> 24) & 0x3f];
        x = l ^ keys[keysi++];
        fval |= SP8[x & 0x0000003f];
        fval |= SP6[(x >>> 8) & 0x3f];
        fval |= SP4[(x >>> 16) & 0x3f];
        fval |= SP2[(x >>> 24) & 0x3f];
        r ^= fval;
    }

    r = (r << 31) | (r >>> 1);
    x = (l ^ r) & 0xaaaaaaaa;
    l ^= x;
    r ^= x;
    l = (l << 31) | (l >>> 1);
    x = ((l >>> 8) ^ r) & 0x00ff00ff;
    r ^= x;
    l ^= (x << 8);
    x = ((l >>> 2) ^ r) & 0x33333333;
    r ^= x;
    l ^= (x << 2);
    x = ((r >>> 16) ^ l) & 0x0000ffff;
    l ^= x;
    r ^= (x << 16);
    x = ((r >>> 4) ^ l) & 0x0f0f0f0f;
    l ^= x;
    r ^= (x << 4);

    // Spread ints to bytes
    x = [r, l];
    for (i = 0; i < 8; i++) {
        b[i] = (x[i>>>2] >>> (8*(3 - (i%4)))) % 256;
        if (b[i] < 0) { b[i] += 256; } // unsigned
    }
    return b;
}

// Encrypt 16 bytes of text using passwd as key
function encrypt(t) {
    return enc8(t.slice(0,8)).concat(enc8(t.slice(8,16)));
}

setKeys(passwd);             // Setup keys
return {'encrypt': encrypt}; // Public interface

} // function DES
// SECTION: input
/*
 * noVNC: HTML5 VNC client
 * Copyright (C) 2011 Joel Martin
 * Licensed under LGPL-2 or any later version (see LICENSE.txt)
 */

/*jslint browser: true, white: false, bitwise: false */
/*global window, Util */


//
// Keyboard event handler
//

function Keyboard(defaults) {
"use strict";

var that           = {},  // Public API methods
    conf           = {},  // Configuration attributes

    keyDownList    = [];         // List of depressed keys 
                                 // (even if they are happy)

// Configuration attributes
Util.conf_defaults(conf, that, defaults, [
    ['target',      'wo', 'dom',  document, 'DOM element that captures keyboard input'],
    ['focused',     'rw', 'bool', true, 'Capture and send key events'],

    ['onKeyPress',  'rw', 'func', null, 'Handler for key press/release']
    ]);


// 
// Private functions
//

// From the event keyCode return the keysym value for keys that need
// to be suppressed otherwise they may trigger unintended browser
// actions
function getKeysymSpecial(evt) {
    var keysym = null;

    switch ( evt.keyCode ) {
        // These generate a keyDown and keyPress in Firefox and Opera
        case 8         : keysym = 0xFF08; break; // BACKSPACE
        case 13        : keysym = 0xFF0D; break; // ENTER

        // This generates a keyDown and keyPress in Opera
        case 9         : keysym = 0xFF09; break; // TAB
        default        :                  break;
    }

    if (evt.type === 'keydown') {
        switch ( evt.keyCode ) {
            case 27        : keysym = 0xFF1B; break; // ESCAPE
            case 46        : keysym = 0xFFFF; break; // DELETE

            case 36        : keysym = 0xFF50; break; // HOME
            case 35        : keysym = 0xFF57; break; // END
            case 33        : keysym = 0xFF55; break; // PAGE_UP
            case 34        : keysym = 0xFF56; break; // PAGE_DOWN
            case 45        : keysym = 0xFF63; break; // INSERT
                                                     // '-' during keyPress
            case 37        : keysym = 0xFF51; break; // LEFT
            case 38        : keysym = 0xFF52; break; // UP
            case 39        : keysym = 0xFF53; break; // RIGHT
            case 40        : keysym = 0xFF54; break; // DOWN
            case 16        : keysym = 0xFFE1; break; // SHIFT
            case 17        : keysym = 0xFFE3; break; // CONTROL
            //case 18        : keysym = 0xFFE7; break; // Left Meta (Mac Option)
            case 18        : keysym = 0xFFE9; break; // Left ALT (Mac Command)

            case 112       : keysym = 0xFFBE; break; // F1
            case 113       : keysym = 0xFFBF; break; // F2
            case 114       : keysym = 0xFFC0; break; // F3
            case 115       : keysym = 0xFFC1; break; // F4
            case 116       : keysym = 0xFFC2; break; // F5
            case 117       : keysym = 0xFFC3; break; // F6
            case 118       : keysym = 0xFFC4; break; // F7
            case 119       : keysym = 0xFFC5; break; // F8
            case 120       : keysym = 0xFFC6; break; // F9
            case 121       : keysym = 0xFFC7; break; // F10
            case 122       : keysym = 0xFFC8; break; // F11
            case 123       : keysym = 0xFFC9; break; // F12

            default        :                  break;
        }
    }

    if ((!keysym) && (evt.ctrlKey || evt.altKey)) {
        if ((typeof(evt.which) !== "undefined") && (evt.which > 0)) {
            keysym = evt.which;
        } else {
            // IE9 always
            // Firefox and Opera when ctrl/alt + special
            Util.Warn("which not set, using keyCode");
            keysym = evt.keyCode;
        }

        /* Remap symbols */
        switch (keysym) {
            case 186       : keysym = 59; break; // ;  (IE)
            case 187       : keysym = 61; break; // =  (IE)
            case 188       : keysym = 44; break; // ,  (Mozilla, IE)
            case 109       :                     // -  (Mozilla, Opera)
                if (Util.Engine.gecko || Util.Engine.presto) {
                            keysym = 45; }
                                        break;
            case 189       : keysym = 45; break; // -  (IE)
            case 190       : keysym = 46; break; // .  (Mozilla, IE)
            case 191       : keysym = 47; break; // /  (Mozilla, IE)
            case 192       : keysym = 96; break; // `  (Mozilla, IE)
            case 219       : keysym = 91; break; // [  (Mozilla, IE)
            case 220       : keysym = 92; break; // \  (Mozilla, IE)
            case 221       : keysym = 93; break; // ]  (Mozilla, IE)
            case 222       : keysym = 39; break; // '  (Mozilla, IE)
        }
        
        /* Remap shifted and unshifted keys */
        if (!!evt.shiftKey) {
            switch (keysym) {
                case 48        : keysym = 41 ; break; // )  (shifted 0)
                case 49        : keysym = 33 ; break; // !  (shifted 1)
                case 50        : keysym = 64 ; break; // @  (shifted 2)
                case 51        : keysym = 35 ; break; // #  (shifted 3)
                case 52        : keysym = 36 ; break; // $  (shifted 4)
                case 53        : keysym = 37 ; break; // %  (shifted 5)
                case 54        : keysym = 94 ; break; // ^  (shifted 6)
                case 55        : keysym = 38 ; break; // &  (shifted 7)
                case 56        : keysym = 42 ; break; // *  (shifted 8)
                case 57        : keysym = 40 ; break; // (  (shifted 9)

                case 59        : keysym = 58 ; break; // :  (shifted `)
                case 61        : keysym = 43 ; break; // +  (shifted ;)
                case 44        : keysym = 60 ; break; // <  (shifted ,)
                case 45        : keysym = 95 ; break; // _  (shifted -)
                case 46        : keysym = 62 ; break; // >  (shifted .)
                case 47        : keysym = 63 ; break; // ?  (shifted /)
                case 96        : keysym = 126; break; // ~  (shifted `)
                case 91        : keysym = 123; break; // {  (shifted [)
                case 92        : keysym = 124; break; // |  (shifted \)
                case 93        : keysym = 125; break; // }  (shifted ])
                case 39        : keysym = 34 ; break; // "  (shifted ')
            }
        } else if ((keysym >= 65) && (keysym <=90)) {
            /* Remap unshifted A-Z */
            keysym += 32;
        } else if (evt.keyLocation === 3) {
            // numpad keys
            switch (keysym) {
                case 96 : keysym = 48; break; // 0
                case 97 : keysym = 49; break; // 1
                case 98 : keysym = 50; break; // 2
                case 99 : keysym = 51; break; // 3
                case 100: keysym = 52; break; // 4
                case 101: keysym = 53; break; // 5
                case 102: keysym = 54; break; // 6
                case 103: keysym = 55; break; // 7
                case 104: keysym = 56; break; // 8
                case 105: keysym = 57; break; // 9
                case 109: keysym = 45; break; // -
                case 110: keysym = 46; break; // .
                case 111: keysym = 47; break; // /
            }
        }
    }

    return keysym;
}

/* Translate DOM keyPress event to keysym value */
function getKeysym(evt) {
    var keysym, msg;

    if (typeof(evt.which) !== "undefined") {
        // WebKit, Firefox, Opera
        keysym = evt.which;
    } else {
        // IE9
        Util.Warn("which not set, using keyCode");
        keysym = evt.keyCode;
    }

    if ((keysym > 255) && (keysym < 0xFF00)) {
        msg = "Mapping character code " + keysym;
        // Map Unicode outside Latin 1 to X11 keysyms
        keysym = unicodeTable[keysym];
        if (typeof(keysym) === 'undefined') {
           keysym = 0; 
        }
        Util.Debug(msg + " to " + keysym);
    }

    return keysym;
}

function show_keyDownList(kind) {
    var c;
    var msg = "keyDownList (" + kind + "):\n";
    for (c = 0; c < keyDownList.length; c++) {
        msg = msg + "    " + c + " - keyCode: " + keyDownList[c].keyCode +
              " - which: " + keyDownList[c].which + "\n";
    }
    Util.Debug(msg);
}

function copyKeyEvent(evt) {
    var members = ['type', 'keyCode', 'charCode', 'which',
                   'altKey', 'ctrlKey', 'shiftKey',
                   'keyLocation', 'keyIdentifier'], i, obj = {};
    for (i = 0; i < members.length; i++) {
        if (typeof(evt[members[i]]) !== "undefined") {
            obj[members[i]] = evt[members[i]];
        }
    }
    return obj;
}

function pushKeyEvent(fevt) {
    keyDownList.push(fevt);
}

function getKeyEvent(keyCode, pop) {
    var i, fevt = null;
    for (i = keyDownList.length-1; i >= 0; i--) {
        if (keyDownList[i].keyCode === keyCode) {
            if ((typeof(pop) !== "undefined") && (pop)) {
                fevt = keyDownList.splice(i, 1)[0];
            } else {
                fevt = keyDownList[i];
            }
            break;
        }
    }
    return fevt;
}

function ignoreKeyEvent(evt) {
    // Blarg. Some keys have a different keyCode on keyDown vs keyUp
    if (evt.keyCode === 229) {
        // French AZERTY keyboard dead key.
        // Lame thing is that the respective keyUp is 219 so we can't
        // properly ignore the keyUp event
        return true;
    }
    return false;
}


//
// Key Event Handling:
//
// There are several challenges when dealing with key events:
//   - The meaning and use of keyCode, charCode and which depends on
//     both the browser and the event type (keyDown/Up vs keyPress).
//   - We cannot automatically determine the keyboard layout
//   - The keyDown and keyUp events have a keyCode value that has not
//     been translated by modifier keys.
//   - The keyPress event has a translated (for layout and modifiers)
//     character code but the attribute containing it differs. keyCode
//     contains the translated value in WebKit (Chrome/Safari), Opera
//     11 and IE9. charCode contains the value in WebKit and Firefox.
//     The which attribute contains the value on WebKit, Firefox and
//     Opera 11.
//   - The keyDown/Up keyCode value indicates (sort of) the physical
//     key was pressed but only for standard US layout. On a US
//     keyboard, the '-' and '_' characters are on the same key and
//     generate a keyCode value of 189. But on an AZERTY keyboard even
//     though they are different physical keys they both still
//     generate a keyCode of 189!
//   - To prevent a key event from propagating to the browser and
//     causing unwanted default actions (such as closing a tab,
//     opening a menu, shifting focus, etc) we must suppress this
//     event in both keyDown and keyPress because not all key strokes
//     generate on a keyPress event. Also, in WebKit and IE9
//     suppressing the keyDown prevents a keyPress but other browsers
//     still generated a keyPress even if keyDown is suppressed.
//
// For safe key events, we wait until the keyPress event before
// calendarrting a key down event. For unsafe key events, we calendarrt a key
// down event when the keyDown event fires and we suppress any further
// actions (including keyPress).
//
// In order to calendarrt a key up event that matches what we calendarrted
// for the key down event, we keep a list of keys that are currently
// down. When the keyDown event happens, we add the key event to the
// list. If it is a safe key event, then we update the which attribute
// in the most recent item on the list when we received a keyPress
// event (keyPress should immediately follow keyDown). When we
// received a keyUp event we search for the event on the list with
// a matching keyCode and we calendarrt the character code using the value
// in the 'which' attribute that was stored with that key.
//

function onKeyDown(e) {
    if (! conf.focused) {
        return true;
    }
    var fevt = null, evt = (e ? e : window.event),
        keysym = null, suppress = false;
    //Util.Debug("onKeyDown kC:" + evt.keyCode + " cC:" + evt.charCode + " w:" + evt.which);

    fevt = copyKeyEvent(evt);

    keysym = getKeysymSpecial(evt);
    // Save keysym decoding for use in keyUp
    fevt.keysym = keysym;
    if (keysym) {
        // If it is a key or key combination that might trigger
        // browser behaviors or it has no corresponding keyPress
        // event, then send it immediately
        if (conf.onKeyPress && !ignoreKeyEvent(evt)) {
            Util.Debug("onKeyPress down, keysym: " + keysym +
                   " (onKeyDown key: " + evt.keyCode +
                   ", which: " + evt.which + ")");
            conf.onKeyPress(keysym, 1, evt);
        }
        suppress = true;
    }

    if (! ignoreKeyEvent(evt)) {
        // Add it to the list of depressed keys
        pushKeyEvent(fevt);
        //show_keyDownList('down');
    }

    if (suppress) {
        // Suppress bubbling/default actions
        Util.stopEvent(e);
        return false;
    } else {
        // Allow the event to bubble and become a keyPress event which
        // will have the character code translated
        return true;
    }
}

function onKeyPress(e) {
    if (! conf.focused) {
        return true;
    }
    var evt = (e ? e : window.event),
        kdlen = keyDownList.length, keysym = null;
    //Util.Debug("onKeyPress kC:" + evt.keyCode + " cC:" + evt.charCode + " w:" + evt.which);
    
    if (((evt.which !== "undefined") && (evt.which === 0)) ||
        (getKeysymSpecial(evt))) {
        // Firefox and Opera generate a keyPress event even if keyDown
        // is suppressed. But the keys we want to suppress will have
        // either:
        //     - the which attribute set to 0
        //     - getKeysymSpecial() will identify it
        Util.Debug("Ignoring special key in keyPress");
        Util.stopEvent(e);
        return false;
    }

    keysym = getKeysym(evt);

    // Modify the the which attribute in the depressed keys list so
    // that the keyUp event will be able to have the character code
    // translation available.
    if (kdlen > 0) {
        keyDownList[kdlen-1].keysym = keysym;
    } else {
        Util.Warn("keyDownList empty when keyPress triggered");
    }

    //show_keyDownList('press');
    
    // Send the translated keysym
    if (conf.onKeyPress && (keysym > 0)) {
        Util.Debug("onKeyPress down, keysym: " + keysym +
                   " (onKeyPress key: " + evt.keyCode +
                   ", which: " + evt.which + ")");
        conf.onKeyPress(keysym, 1, evt);
    }

    // Stop keypress events just in case
    Util.stopEvent(e);
    return false;
}

function onKeyUp(e) {
    if (! conf.focused) {
        return true;
    }
    var fevt = null, evt = (e ? e : window.event), keysym;
    //Util.Debug("onKeyUp   kC:" + evt.keyCode + " cC:" + evt.charCode + " w:" + evt.which);

    fevt = getKeyEvent(evt.keyCode, true);
    
    if (fevt) {
        keysym = fevt.keysym;
    } else {
        Util.Warn("Key event (keyCode = " + evt.keyCode +
                ") not found on keyDownList");
        keysym = 0;
    }

    //show_keyDownList('up');

    if (conf.onKeyPress && (keysym > 0)) {
        //Util.Debug("keyPress up,   keysym: " + keysym +
        //        " (key: " + evt.keyCode + ", which: " + evt.which + ")");
        Util.Debug("onKeyPress up, keysym: " + keysym +
                   " (onKeyPress key: " + evt.keyCode +
                   ", which: " + evt.which + ")");
        conf.onKeyPress(keysym, 0, evt);
    }
    Util.stopEvent(e);
    return false;
}

//
// Public API interface functions
//

that.grab = function() {
    //Util.Debug(">> Keyboard.grab");
    var c = conf.target;

    Util.addEvent(c, 'keydown', onKeyDown);
    Util.addEvent(c, 'keyup', onKeyUp);
    Util.addEvent(c, 'keypress', onKeyPress);

    //Util.Debug("<< Keyboard.grab");
};

that.ungrab = function() {
    //Util.Debug(">> Keyboard.ungrab");
    var c = conf.target;

    Util.removeEvent(c, 'keydown', onKeyDown);
    Util.removeEvent(c, 'keyup', onKeyUp);
    Util.removeEvent(c, 'keypress', onKeyPress);

    //Util.Debug(">> Keyboard.ungrab");
};

return that;  // Return the public API interface

}  // End of Keyboard()


//
// Mouse event handler
//

function Mouse(defaults) {
"use strict";

var that           = {},  // Public API methods
    conf           = {};  // Configuration attributes

// Configuration attributes
Util.conf_defaults(conf, that, defaults, [
    ['target',         'ro', 'dom',  document, 'DOM element that captures mouse input'],
    ['focused',        'rw', 'bool', true, 'Capture and send mouse clicks/movement'],
    ['scale',          'rw', 'float', 1.0, 'Viewport scale factor 0.0 - 1.0'],

    ['onMouseButton',  'rw', 'func', null, 'Handler for mouse button click/release'],
    ['onMouseMove',    'rw', 'func', null, 'Handler for mouse movement'],
    ['touchButton',    'rw', 'int', 1, 'Button mask (1, 2, 4) for touch devices (0 means ignore clicks)']
    ]);


// 
// Private functions
//

function onMouseButton(e, down) {
    var evt, pos, bmask;
    if (! conf.focused) {
        return true;
    }
    evt = (e ? e : window.event);
    pos = Util.getEventPosition(e, conf.target, conf.scale);
    if (e.touches || e.changedTouches) {
        // Touch device
        bmask = conf.touchButton;
        // If bmask is set
    } else if (evt.which) {
        /* everything except IE */
        bmask = 1 << evt.button;
    } else {
        /* IE including 9 */
        bmask = (evt.button & 0x1) +      // Left
                (evt.button & 0x2) * 2 +  // Right
                (evt.button & 0x4) / 2;   // Middle
    }
    //Util.Debug("mouse " + pos.x + "," + pos.y + " down: " + down +
    //           " bmask: " + bmask + "(evt.button: " + evt.button + ")");
    if (bmask > 0 && conf.onMouseButton) {
        Util.Debug("onMouseButton " + (down ? "down" : "up") +
                   ", x: " + pos.x + ", y: " + pos.y + ", bmask: " + bmask);
        conf.onMouseButton(pos.x, pos.y, down, bmask);
    }
    Util.stopEvent(e);
    return false;
}

function onMouseDown(e) {
    onMouseButton(e, 1);
}

function onMouseUp(e) {
    onMouseButton(e, 0);
}

function onMouseWheel(e) {
    var evt, pos, bmask, wheelData;
    if (! conf.focused) {
        return true;
    }
    evt = (e ? e : window.event);
    pos = Util.getEventPosition(e, conf.target, conf.scale);
    wheelData = evt.detail ? evt.detail * -1 : evt.wheelDelta / 40;
    if (wheelData > 0) {
        bmask = 1 << 3;
    } else {
        bmask = 1 << 4;
    }
    //Util.Debug('mouse scroll by ' + wheelData + ':' + pos.x + "," + pos.y);
    if (conf.onMouseButton) {
        conf.onMouseButton(pos.x, pos.y, 1, bmask);
        conf.onMouseButton(pos.x, pos.y, 0, bmask);
    }
    Util.stopEvent(e);
    return false;
}

function onMouseMove(e) {
    var evt, pos;
    if (! conf.focused) {
        return true;
    }
    evt = (e ? e : window.event);
    pos = Util.getEventPosition(e, conf.target, conf.scale);
    //Util.Debug('mouse ' + evt.which + '/' + evt.button + ' up:' + pos.x + "," + pos.y);
    if (conf.onMouseMove) {
        conf.onMouseMove(pos.x, pos.y);
    }
    Util.stopEvent(e);
    return false;
}

function onMouseDisable(e) {
    var evt, pos;
    if (! conf.focused) {
        return true;
    }
    evt = (e ? e : window.event);
    pos = Util.getEventPosition(e, conf.target, conf.scale);
    /* Stop propagation if inside canvas area */
    if ((pos.x >= 0) && (pos.y >= 0) &&
        (pos.x < conf.target.offsetWidth) &&
        (pos.y < conf.target.offsetHeight)) {
        //Util.Debug("mouse event disabled");
        Util.stopEvent(e);
        return false;
    }
    //Util.Debug("mouse event not disabled");
    return true;
}

//
// Public API interface functions
//

that.grab = function() {
    //Util.Debug(">> Mouse.grab");
    var c = conf.target;

    if ('ontouchstart' in document.documentElement) {
        Util.addEvent(c, 'touchstart', onMouseDown);
        Util.addEvent(c, 'touchend', onMouseUp);
        Util.addEvent(c, 'touchmove', onMouseMove);
    } else {
        Util.addEvent(c, 'mousedown', onMouseDown);
        Util.addEvent(c, 'mouseup', onMouseUp);
        Util.addEvent(c, 'mousemove', onMouseMove);
        Util.addEvent(c, (Util.Engine.gecko) ? 'DOMMouseScroll' : 'mousewheel',
                onMouseWheel);
    }

    /* Work around right and middle click browser behaviors */
    Util.addEvent(document, 'click', onMouseDisable);
    Util.addEvent(document.body, 'contextmenu', onMouseDisable);

    //Util.Debug("<< Mouse.grab");
};

that.ungrab = function() {
    //Util.Debug(">> Mouse.ungrab");
    var c = conf.target;

    if ('ontouchstart' in document.documentElement) {
        Util.removeEvent(c, 'touchstart', onMouseDown);
        Util.removeEvent(c, 'touchend', onMouseUp);
        Util.removeEvent(c, 'touchmove', onMouseMove);
    } else {
        Util.removeEvent(c, 'mousedown', onMouseDown);
        Util.removeEvent(c, 'mouseup', onMouseUp);
        Util.removeEvent(c, 'mousemove', onMouseMove);
        Util.removeEvent(c, (Util.Engine.gecko) ? 'DOMMouseScroll' : 'mousewheel',
                onMouseWheel);
    }

    /* Work around right and middle click browser behaviors */
    Util.removeEvent(document, 'click', onMouseDisable);
    Util.removeEvent(document.body, 'contextmenu', onMouseDisable);

    //Util.Debug(">> Mouse.ungrab");
};

return that;  // Return the public API interface

}  // End of Mouse()


/*
 * Browser keypress to X11 keysym for Unicode characters > U+00FF
 */
unicodeTable = {
    0x0104 : 0x01a1,
    0x02D8 : 0x01a2,
    0x0141 : 0x01a3,
    0x013D : 0x01a5,
    0x015A : 0x01a6,
    0x0160 : 0x01a9,
    0x015E : 0x01aa,
    0x0164 : 0x01ab,
    0x0179 : 0x01ac,
    0x017D : 0x01ae,
    0x017B : 0x01af,
    0x0105 : 0x01b1,
    0x02DB : 0x01b2,
    0x0142 : 0x01b3,
    0x013E : 0x01b5,
    0x015B : 0x01b6,
    0x02C7 : 0x01b7,
    0x0161 : 0x01b9,
    0x015F : 0x01ba,
    0x0165 : 0x01bb,
    0x017A : 0x01bc,
    0x02DD : 0x01bd,
    0x017E : 0x01be,
    0x017C : 0x01bf,
    0x0154 : 0x01c0,
    0x0102 : 0x01c3,
    0x0139 : 0x01c5,
    0x0106 : 0x01c6,
    0x010C : 0x01c8,
    0x0118 : 0x01ca,
    0x011A : 0x01cc,
    0x010E : 0x01cf,
    0x0110 : 0x01d0,
    0x0143 : 0x01d1,
    0x0147 : 0x01d2,
    0x0150 : 0x01d5,
    0x0158 : 0x01d8,
    0x016E : 0x01d9,
    0x0170 : 0x01db,
    0x0162 : 0x01de,
    0x0155 : 0x01e0,
    0x0103 : 0x01e3,
    0x013A : 0x01e5,
    0x0107 : 0x01e6,
    0x010D : 0x01e8,
    0x0119 : 0x01ea,
    0x011B : 0x01ec,
    0x010F : 0x01ef,
    0x0111 : 0x01f0,
    0x0144 : 0x01f1,
    0x0148 : 0x01f2,
    0x0151 : 0x01f5,
    0x0171 : 0x01fb,
    0x0159 : 0x01f8,
    0x016F : 0x01f9,
    0x0163 : 0x01fe,
    0x02D9 : 0x01ff,
    0x0126 : 0x02a1,
    0x0124 : 0x02a6,
    0x0130 : 0x02a9,
    0x011E : 0x02ab,
    0x0134 : 0x02ac,
    0x0127 : 0x02b1,
    0x0125 : 0x02b6,
    0x0131 : 0x02b9,
    0x011F : 0x02bb,
    0x0135 : 0x02bc,
    0x010A : 0x02c5,
    0x0108 : 0x02c6,
    0x0120 : 0x02d5,
    0x011C : 0x02d8,
    0x016C : 0x02dd,
    0x015C : 0x02de,
    0x010B : 0x02e5,
    0x0109 : 0x02e6,
    0x0121 : 0x02f5,
    0x011D : 0x02f8,
    0x016D : 0x02fd,
    0x015D : 0x02fe,
    0x0138 : 0x03a2,
    0x0156 : 0x03a3,
    0x0128 : 0x03a5,
    0x013B : 0x03a6,
    0x0112 : 0x03aa,
    0x0122 : 0x03ab,
    0x0166 : 0x03ac,
    0x0157 : 0x03b3,
    0x0129 : 0x03b5,
    0x013C : 0x03b6,
    0x0113 : 0x03ba,
    0x0123 : 0x03bb,
    0x0167 : 0x03bc,
    0x014A : 0x03bd,
    0x014B : 0x03bf,
    0x0100 : 0x03c0,
    0x012E : 0x03c7,
    0x0116 : 0x03cc,
    0x012A : 0x03cf,
    0x0145 : 0x03d1,
    0x014C : 0x03d2,
    0x0136 : 0x03d3,
    0x0172 : 0x03d9,
    0x0168 : 0x03dd,
    0x016A : 0x03de,
    0x0101 : 0x03e0,
    0x012F : 0x03e7,
    0x0117 : 0x03ec,
    0x012B : 0x03ef,
    0x0146 : 0x03f1,
    0x014D : 0x03f2,
    0x0137 : 0x03f3,
    0x0173 : 0x03f9,
    0x0169 : 0x03fd,
    0x016B : 0x03fe,
    0x1E02 : 0x1001e02,
    0x1E03 : 0x1001e03,
    0x1E0A : 0x1001e0a,
    0x1E80 : 0x1001e80,
    0x1E82 : 0x1001e82,
    0x1E0B : 0x1001e0b,
    0x1EF2 : 0x1001ef2,
    0x1E1E : 0x1001e1e,
    0x1E1F : 0x1001e1f,
    0x1E40 : 0x1001e40,
    0x1E41 : 0x1001e41,
    0x1E56 : 0x1001e56,
    0x1E81 : 0x1001e81,
    0x1E57 : 0x1001e57,
    0x1E83 : 0x1001e83,
    0x1E60 : 0x1001e60,
    0x1EF3 : 0x1001ef3,
    0x1E84 : 0x1001e84,
    0x1E85 : 0x1001e85,
    0x1E61 : 0x1001e61,
    0x0174 : 0x1000174,
    0x1E6A : 0x1001e6a,
    0x0176 : 0x1000176,
    0x0175 : 0x1000175,
    0x1E6B : 0x1001e6b,
    0x0177 : 0x1000177,
    0x0152 : 0x13bc,
    0x0153 : 0x13bd,
    0x0178 : 0x13be,
    0x203E : 0x047e,
    0x3002 : 0x04a1,
    0x300C : 0x04a2,
    0x300D : 0x04a3,
    0x3001 : 0x04a4,
    0x30FB : 0x04a5,
    0x30F2 : 0x04a6,
    0x30A1 : 0x04a7,
    0x30A3 : 0x04a8,
    0x30A5 : 0x04a9,
    0x30A7 : 0x04aa,
    0x30A9 : 0x04ab,
    0x30E3 : 0x04ac,
    0x30E5 : 0x04ad,
    0x30E7 : 0x04ae,
    0x30C3 : 0x04af,
    0x30FC : 0x04b0,
    0x30A2 : 0x04b1,
    0x30A4 : 0x04b2,
    0x30A6 : 0x04b3,
    0x30A8 : 0x04b4,
    0x30AA : 0x04b5,
    0x30AB : 0x04b6,
    0x30AD : 0x04b7,
    0x30AF : 0x04b8,
    0x30B1 : 0x04b9,
    0x30B3 : 0x04ba,
    0x30B5 : 0x04bb,
    0x30B7 : 0x04bc,
    0x30B9 : 0x04bd,
    0x30BB : 0x04be,
    0x30BD : 0x04bf,
    0x30BF : 0x04c0,
    0x30C1 : 0x04c1,
    0x30C4 : 0x04c2,
    0x30C6 : 0x04c3,
    0x30C8 : 0x04c4,
    0x30CA : 0x04c5,
    0x30CB : 0x04c6,
    0x30CC : 0x04c7,
    0x30CD : 0x04c8,
    0x30CE : 0x04c9,
    0x30CF : 0x04ca,
    0x30D2 : 0x04cb,
    0x30D5 : 0x04cc,
    0x30D8 : 0x04cd,
    0x30DB : 0x04ce,
    0x30DE : 0x04cf,
    0x30DF : 0x04d0,
    0x30E0 : 0x04d1,
    0x30E1 : 0x04d2,
    0x30E2 : 0x04d3,
    0x30E4 : 0x04d4,
    0x30E6 : 0x04d5,
    0x30E8 : 0x04d6,
    0x30E9 : 0x04d7,
    0x30EA : 0x04d8,
    0x30EB : 0x04d9,
    0x30EC : 0x04da,
    0x30ED : 0x04db,
    0x30EF : 0x04dc,
    0x30F3 : 0x04dd,
    0x309B : 0x04de,
    0x309C : 0x04df,
    0x06F0 : 0x10006f0,
    0x06F1 : 0x10006f1,
    0x06F2 : 0x10006f2,
    0x06F3 : 0x10006f3,
    0x06F4 : 0x10006f4,
    0x06F5 : 0x10006f5,
    0x06F6 : 0x10006f6,
    0x06F7 : 0x10006f7,
    0x06F8 : 0x10006f8,
    0x06F9 : 0x10006f9,
    0x066A : 0x100066a,
    0x0670 : 0x1000670,
    0x0679 : 0x1000679,
    0x067E : 0x100067e,
    0x0686 : 0x1000686,
    0x0688 : 0x1000688,
    0x0691 : 0x1000691,
    0x060C : 0x05ac,
    0x06D4 : 0x10006d4,
    0x0660 : 0x1000660,
    0x0661 : 0x1000661,
    0x0662 : 0x1000662,
    0x0663 : 0x1000663,
    0x0664 : 0x1000664,
    0x0665 : 0x1000665,
    0x0666 : 0x1000666,
    0x0667 : 0x1000667,
    0x0668 : 0x1000668,
    0x0669 : 0x1000669,
    0x061B : 0x05bb,
    0x061F : 0x05bf,
    0x0621 : 0x05c1,
    0x0622 : 0x05c2,
    0x0623 : 0x05c3,
    0x0624 : 0x05c4,
    0x0625 : 0x05c5,
    0x0626 : 0x05c6,
    0x0627 : 0x05c7,
    0x0628 : 0x05c8,
    0x0629 : 0x05c9,
    0x062A : 0x05ca,
    0x062B : 0x05cb,
    0x062C : 0x05cc,
    0x062D : 0x05cd,
    0x062E : 0x05ce,
    0x062F : 0x05cf,
    0x0630 : 0x05d0,
    0x0631 : 0x05d1,
    0x0632 : 0x05d2,
    0x0633 : 0x05d3,
    0x0634 : 0x05d4,
    0x0635 : 0x05d5,
    0x0636 : 0x05d6,
    0x0637 : 0x05d7,
    0x0638 : 0x05d8,
    0x0639 : 0x05d9,
    0x063A : 0x05da,
    0x0640 : 0x05e0,
    0x0641 : 0x05e1,
    0x0642 : 0x05e2,
    0x0643 : 0x05e3,
    0x0644 : 0x05e4,
    0x0645 : 0x05e5,
    0x0646 : 0x05e6,
    0x0647 : 0x05e7,
    0x0648 : 0x05e8,
    0x0649 : 0x05e9,
    0x064A : 0x05ea,
    0x064B : 0x05eb,
    0x064C : 0x05ec,
    0x064D : 0x05ed,
    0x064E : 0x05ee,
    0x064F : 0x05ef,
    0x0650 : 0x05f0,
    0x0651 : 0x05f1,
    0x0652 : 0x05f2,
    0x0653 : 0x1000653,
    0x0654 : 0x1000654,
    0x0655 : 0x1000655,
    0x0698 : 0x1000698,
    0x06A4 : 0x10006a4,
    0x06A9 : 0x10006a9,
    0x06AF : 0x10006af,
    0x06BA : 0x10006ba,
    0x06BE : 0x10006be,
    0x06CC : 0x10006cc,
    0x06D2 : 0x10006d2,
    0x06C1 : 0x10006c1,
    0x0492 : 0x1000492,
    0x0493 : 0x1000493,
    0x0496 : 0x1000496,
    0x0497 : 0x1000497,
    0x049A : 0x100049a,
    0x049B : 0x100049b,
    0x049C : 0x100049c,
    0x049D : 0x100049d,
    0x04A2 : 0x10004a2,
    0x04A3 : 0x10004a3,
    0x04AE : 0x10004ae,
    0x04AF : 0x10004af,
    0x04B0 : 0x10004b0,
    0x04B1 : 0x10004b1,
    0x04B2 : 0x10004b2,
    0x04B3 : 0x10004b3,
    0x04B6 : 0x10004b6,
    0x04B7 : 0x10004b7,
    0x04B8 : 0x10004b8,
    0x04B9 : 0x10004b9,
    0x04BA : 0x10004ba,
    0x04BB : 0x10004bb,
    0x04D8 : 0x10004d8,
    0x04D9 : 0x10004d9,
    0x04E2 : 0x10004e2,
    0x04E3 : 0x10004e3,
    0x04E8 : 0x10004e8,
    0x04E9 : 0x10004e9,
    0x04EE : 0x10004ee,
    0x04EF : 0x10004ef,
    0x0452 : 0x06a1,
    0x0453 : 0x06a2,
    0x0451 : 0x06a3,
    0x0454 : 0x06a4,
    0x0455 : 0x06a5,
    0x0456 : 0x06a6,
    0x0457 : 0x06a7,
    0x0458 : 0x06a8,
    0x0459 : 0x06a9,
    0x045A : 0x06aa,
    0x045B : 0x06ab,
    0x045C : 0x06ac,
    0x0491 : 0x06ad,
    0x045E : 0x06ae,
    0x045F : 0x06af,
    0x2116 : 0x06b0,
    0x0402 : 0x06b1,
    0x0403 : 0x06b2,
    0x0401 : 0x06b3,
    0x0404 : 0x06b4,
    0x0405 : 0x06b5,
    0x0406 : 0x06b6,
    0x0407 : 0x06b7,
    0x0408 : 0x06b8,
    0x0409 : 0x06b9,
    0x040A : 0x06ba,
    0x040B : 0x06bb,
    0x040C : 0x06bc,
    0x0490 : 0x06bd,
    0x040E : 0x06be,
    0x040F : 0x06bf,
    0x044E : 0x06c0,
    0x0430 : 0x06c1,
    0x0431 : 0x06c2,
    0x0446 : 0x06c3,
    0x0434 : 0x06c4,
    0x0435 : 0x06c5,
    0x0444 : 0x06c6,
    0x0433 : 0x06c7,
    0x0445 : 0x06c8,
    0x0438 : 0x06c9,
    0x0439 : 0x06ca,
    0x043A : 0x06cb,
    0x043B : 0x06cc,
    0x043C : 0x06cd,
    0x043D : 0x06ce,
    0x043E : 0x06cf,
    0x043F : 0x06d0,
    0x044F : 0x06d1,
    0x0440 : 0x06d2,
    0x0441 : 0x06d3,
    0x0442 : 0x06d4,
    0x0443 : 0x06d5,
    0x0436 : 0x06d6,
    0x0432 : 0x06d7,
    0x044C : 0x06d8,
    0x044B : 0x06d9,
    0x0437 : 0x06da,
    0x0448 : 0x06db,
    0x044D : 0x06dc,
    0x0449 : 0x06dd,
    0x0447 : 0x06de,
    0x044A : 0x06df,
    0x042E : 0x06e0,
    0x0410 : 0x06e1,
    0x0411 : 0x06e2,
    0x0426 : 0x06e3,
    0x0414 : 0x06e4,
    0x0415 : 0x06e5,
    0x0424 : 0x06e6,
    0x0413 : 0x06e7,
    0x0425 : 0x06e8,
    0x0418 : 0x06e9,
    0x0419 : 0x06ea,
    0x041A : 0x06eb,
    0x041B : 0x06ec,
    0x041C : 0x06ed,
    0x041D : 0x06ee,
    0x041E : 0x06ef,
    0x041F : 0x06f0,
    0x042F : 0x06f1,
    0x0420 : 0x06f2,
    0x0421 : 0x06f3,
    0x0422 : 0x06f4,
    0x0423 : 0x06f5,
    0x0416 : 0x06f6,
    0x0412 : 0x06f7,
    0x042C : 0x06f8,
    0x042B : 0x06f9,
    0x0417 : 0x06fa,
    0x0428 : 0x06fb,
    0x042D : 0x06fc,
    0x0429 : 0x06fd,
    0x0427 : 0x06fe,
    0x042A : 0x06ff,
    0x0386 : 0x07a1,
    0x0388 : 0x07a2,
    0x0389 : 0x07a3,
    0x038A : 0x07a4,
    0x03AA : 0x07a5,
    0x038C : 0x07a7,
    0x038E : 0x07a8,
    0x03AB : 0x07a9,
    0x038F : 0x07ab,
    0x0385 : 0x07ae,
    0x2015 : 0x07af,
    0x03AC : 0x07b1,
    0x03AD : 0x07b2,
    0x03AE : 0x07b3,
    0x03AF : 0x07b4,
    0x03CA : 0x07b5,
    0x0390 : 0x07b6,
    0x03CC : 0x07b7,
    0x03CD : 0x07b8,
    0x03CB : 0x07b9,
    0x03B0 : 0x07ba,
    0x03CE : 0x07bb,
    0x0391 : 0x07c1,
    0x0392 : 0x07c2,
    0x0393 : 0x07c3,
    0x0394 : 0x07c4,
    0x0395 : 0x07c5,
    0x0396 : 0x07c6,
    0x0397 : 0x07c7,
    0x0398 : 0x07c8,
    0x0399 : 0x07c9,
    0x039A : 0x07ca,
    0x039B : 0x07cb,
    0x039C : 0x07cc,
    0x039D : 0x07cd,
    0x039E : 0x07ce,
    0x039F : 0x07cf,
    0x03A0 : 0x07d0,
    0x03A1 : 0x07d1,
    0x03A3 : 0x07d2,
    0x03A4 : 0x07d4,
    0x03A5 : 0x07d5,
    0x03A6 : 0x07d6,
    0x03A7 : 0x07d7,
    0x03A8 : 0x07d8,
    0x03A9 : 0x07d9,
    0x03B1 : 0x07e1,
    0x03B2 : 0x07e2,
    0x03B3 : 0x07e3,
    0x03B4 : 0x07e4,
    0x03B5 : 0x07e5,
    0x03B6 : 0x07e6,
    0x03B7 : 0x07e7,
    0x03B8 : 0x07e8,
    0x03B9 : 0x07e9,
    0x03BA : 0x07ea,
    0x03BB : 0x07eb,
    0x03BC : 0x07ec,
    0x03BD : 0x07ed,
    0x03BE : 0x07ee,
    0x03BF : 0x07ef,
    0x03C0 : 0x07f0,
    0x03C1 : 0x07f1,
    0x03C3 : 0x07f2,
    0x03C2 : 0x07f3,
    0x03C4 : 0x07f4,
    0x03C5 : 0x07f5,
    0x03C6 : 0x07f6,
    0x03C7 : 0x07f7,
    0x03C8 : 0x07f8,
    0x03C9 : 0x07f9,
    0x23B7 : 0x08a1,
    0x2320 : 0x08a4,
    0x2321 : 0x08a5,
    0x23A1 : 0x08a7,
    0x23A3 : 0x08a8,
    0x23A4 : 0x08a9,
    0x23A6 : 0x08aa,
    0x239B : 0x08ab,
    0x239D : 0x08ac,
    0x239E : 0x08ad,
    0x23A0 : 0x08ae,
    0x23A8 : 0x08af,
    0x23AC : 0x08b0,
    0x2264 : 0x08bc,
    0x2260 : 0x08bd,
    0x2265 : 0x08be,
    0x222B : 0x08bf,
    0x2234 : 0x08c0,
    0x221D : 0x08c1,
    0x221E : 0x08c2,
    0x2207 : 0x08c5,
    0x223C : 0x08c8,
    0x2243 : 0x08c9,
    0x21D4 : 0x08cd,
    0x21D2 : 0x08ce,
    0x2261 : 0x08cf,
    0x221A : 0x08d6,
    0x2282 : 0x08da,
    0x2283 : 0x08db,
    0x2229 : 0x08dc,
    0x222A : 0x08dd,
    0x2227 : 0x08de,
    0x2228 : 0x08df,
    0x2202 : 0x08ef,
    0x0192 : 0x08f6,
    0x2190 : 0x08fb,
    0x2191 : 0x08fc,
    0x2192 : 0x08fd,
    0x2193 : 0x08fe,
    0x25C6 : 0x09e0,
    0x2592 : 0x09e1,
    0x2409 : 0x09e2,
    0x240C : 0x09e3,
    0x240D : 0x09e4,
    0x240A : 0x09e5,
    0x2424 : 0x09e8,
    0x240B : 0x09e9,
    0x2518 : 0x09ea,
    0x2510 : 0x09eb,
    0x250C : 0x09ec,
    0x2514 : 0x09ed,
    0x253C : 0x09ee,
    0x23BA : 0x09ef,
    0x23BB : 0x09f0,
    0x2500 : 0x09f1,
    0x23BC : 0x09f2,
    0x23BD : 0x09f3,
    0x251C : 0x09f4,
    0x2524 : 0x09f5,
    0x2534 : 0x09f6,
    0x252C : 0x09f7,
    0x2502 : 0x09f8,
    0x2003 : 0x0aa1,
    0x2002 : 0x0aa2,
    0x2004 : 0x0aa3,
    0x2005 : 0x0aa4,
    0x2007 : 0x0aa5,
    0x2008 : 0x0aa6,
    0x2009 : 0x0aa7,
    0x200A : 0x0aa8,
    0x2014 : 0x0aa9,
    0x2013 : 0x0aaa,
    0x2026 : 0x0aae,
    0x2025 : 0x0aaf,
    0x2153 : 0x0ab0,
    0x2154 : 0x0ab1,
    0x2155 : 0x0ab2,
    0x2156 : 0x0ab3,
    0x2157 : 0x0ab4,
    0x2158 : 0x0ab5,
    0x2159 : 0x0ab6,
    0x215A : 0x0ab7,
    0x2105 : 0x0ab8,
    0x2012 : 0x0abb,
    0x215B : 0x0ac3,
    0x215C : 0x0ac4,
    0x215D : 0x0ac5,
    0x215E : 0x0ac6,
    0x2122 : 0x0ac9,
    0x2018 : 0x0ad0,
    0x2019 : 0x0ad1,
    0x201C : 0x0ad2,
    0x201D : 0x0ad3,
    0x211E : 0x0ad4,
    0x2032 : 0x0ad6,
    0x2033 : 0x0ad7,
    0x271D : 0x0ad9,
    0x2663 : 0x0aec,
    0x2666 : 0x0aed,
    0x2665 : 0x0aee,
    0x2720 : 0x0af0,
    0x2020 : 0x0af1,
    0x2021 : 0x0af2,
    0x2713 : 0x0af3,
    0x2717 : 0x0af4,
    0x266F : 0x0af5,
    0x266D : 0x0af6,
    0x2642 : 0x0af7,
    0x2640 : 0x0af8,
    0x260E : 0x0af9,
    0x2315 : 0x0afa,
    0x2117 : 0x0afb,
    0x2038 : 0x0afc,
    0x201A : 0x0afd,
    0x201E : 0x0afe,
    0x22A4 : 0x0bc2,
    0x230A : 0x0bc4,
    0x2218 : 0x0bca,
    0x2395 : 0x0bcc,
    0x22A5 : 0x0bce,
    0x25CB : 0x0bcf,
    0x2308 : 0x0bd3,
    0x22A3 : 0x0bdc,
    0x22A2 : 0x0bfc,
    0x2017 : 0x0cdf,
    0x05D0 : 0x0ce0,
    0x05D1 : 0x0ce1,
    0x05D2 : 0x0ce2,
    0x05D3 : 0x0ce3,
    0x05D4 : 0x0ce4,
    0x05D5 : 0x0ce5,
    0x05D6 : 0x0ce6,
    0x05D7 : 0x0ce7,
    0x05D8 : 0x0ce8,
    0x05D9 : 0x0ce9,
    0x05DA : 0x0cea,
    0x05DB : 0x0ceb,
    0x05DC : 0x0cec,
    0x05DD : 0x0ced,
    0x05DE : 0x0cee,
    0x05DF : 0x0cef,
    0x05E0 : 0x0cf0,
    0x05E1 : 0x0cf1,
    0x05E2 : 0x0cf2,
    0x05E3 : 0x0cf3,
    0x05E4 : 0x0cf4,
    0x05E5 : 0x0cf5,
    0x05E6 : 0x0cf6,
    0x05E7 : 0x0cf7,
    0x05E8 : 0x0cf8,
    0x05E9 : 0x0cf9,
    0x05EA : 0x0cfa,
    0x0E01 : 0x0da1,
    0x0E02 : 0x0da2,
    0x0E03 : 0x0da3,
    0x0E04 : 0x0da4,
    0x0E05 : 0x0da5,
    0x0E06 : 0x0da6,
    0x0E07 : 0x0da7,
    0x0E08 : 0x0da8,
    0x0E09 : 0x0da9,
    0x0E0A : 0x0daa,
    0x0E0B : 0x0dab,
    0x0E0C : 0x0dac,
    0x0E0D : 0x0dad,
    0x0E0E : 0x0dae,
    0x0E0F : 0x0daf,
    0x0E10 : 0x0db0,
    0x0E11 : 0x0db1,
    0x0E12 : 0x0db2,
    0x0E13 : 0x0db3,
    0x0E14 : 0x0db4,
    0x0E15 : 0x0db5,
    0x0E16 : 0x0db6,
    0x0E17 : 0x0db7,
    0x0E18 : 0x0db8,
    0x0E19 : 0x0db9,
    0x0E1A : 0x0dba,
    0x0E1B : 0x0dbb,
    0x0E1C : 0x0dbc,
    0x0E1D : 0x0dbd,
    0x0E1E : 0x0dbe,
    0x0E1F : 0x0dbf,
    0x0E20 : 0x0dc0,
    0x0E21 : 0x0dc1,
    0x0E22 : 0x0dc2,
    0x0E23 : 0x0dc3,
    0x0E24 : 0x0dc4,
    0x0E25 : 0x0dc5,
    0x0E26 : 0x0dc6,
    0x0E27 : 0x0dc7,
    0x0E28 : 0x0dc8,
    0x0E29 : 0x0dc9,
    0x0E2A : 0x0dca,
    0x0E2B : 0x0dcb,
    0x0E2C : 0x0dcc,
    0x0E2D : 0x0dcd,
    0x0E2E : 0x0dce,
    0x0E2F : 0x0dcf,
    0x0E30 : 0x0dd0,
    0x0E31 : 0x0dd1,
    0x0E32 : 0x0dd2,
    0x0E33 : 0x0dd3,
    0x0E34 : 0x0dd4,
    0x0E35 : 0x0dd5,
    0x0E36 : 0x0dd6,
    0x0E37 : 0x0dd7,
    0x0E38 : 0x0dd8,
    0x0E39 : 0x0dd9,
    0x0E3A : 0x0dda,
    0x0E3F : 0x0ddf,
    0x0E40 : 0x0de0,
    0x0E41 : 0x0de1,
    0x0E42 : 0x0de2,
    0x0E43 : 0x0de3,
    0x0E44 : 0x0de4,
    0x0E45 : 0x0de5,
    0x0E46 : 0x0de6,
    0x0E47 : 0x0de7,
    0x0E48 : 0x0de8,
    0x0E49 : 0x0de9,
    0x0E4A : 0x0dea,
    0x0E4B : 0x0deb,
    0x0E4C : 0x0dec,
    0x0E4D : 0x0ded,
    0x0E50 : 0x0df0,
    0x0E51 : 0x0df1,
    0x0E52 : 0x0df2,
    0x0E53 : 0x0df3,
    0x0E54 : 0x0df4,
    0x0E55 : 0x0df5,
    0x0E56 : 0x0df6,
    0x0E57 : 0x0df7,
    0x0E58 : 0x0df8,
    0x0E59 : 0x0df9,
    0x0587 : 0x1000587,
    0x0589 : 0x1000589,
    0x055D : 0x100055d,
    0x058A : 0x100058a,
    0x055C : 0x100055c,
    0x055B : 0x100055b,
    0x055E : 0x100055e,
    0x0531 : 0x1000531,
    0x0561 : 0x1000561,
    0x0532 : 0x1000532,
    0x0562 : 0x1000562,
    0x0533 : 0x1000533,
    0x0563 : 0x1000563,
    0x0534 : 0x1000534,
    0x0564 : 0x1000564,
    0x0535 : 0x1000535,
    0x0565 : 0x1000565,
    0x0536 : 0x1000536,
    0x0566 : 0x1000566,
    0x0537 : 0x1000537,
    0x0567 : 0x1000567,
    0x0538 : 0x1000538,
    0x0568 : 0x1000568,
    0x0539 : 0x1000539,
    0x0569 : 0x1000569,
    0x053A : 0x100053a,
    0x056A : 0x100056a,
    0x053B : 0x100053b,
    0x056B : 0x100056b,
    0x053C : 0x100053c,
    0x056C : 0x100056c,
    0x053D : 0x100053d,
    0x056D : 0x100056d,
    0x053E : 0x100053e,
    0x056E : 0x100056e,
    0x053F : 0x100053f,
    0x056F : 0x100056f,
    0x0540 : 0x1000540,
    0x0570 : 0x1000570,
    0x0541 : 0x1000541,
    0x0571 : 0x1000571,
    0x0542 : 0x1000542,
    0x0572 : 0x1000572,
    0x0543 : 0x1000543,
    0x0573 : 0x1000573,
    0x0544 : 0x1000544,
    0x0574 : 0x1000574,
    0x0545 : 0x1000545,
    0x0575 : 0x1000575,
    0x0546 : 0x1000546,
    0x0576 : 0x1000576,
    0x0547 : 0x1000547,
    0x0577 : 0x1000577,
    0x0548 : 0x1000548,
    0x0578 : 0x1000578,
    0x0549 : 0x1000549,
    0x0579 : 0x1000579,
    0x054A : 0x100054a,
    0x057A : 0x100057a,
    0x054B : 0x100054b,
    0x057B : 0x100057b,
    0x054C : 0x100054c,
    0x057C : 0x100057c,
    0x054D : 0x100054d,
    0x057D : 0x100057d,
    0x054E : 0x100054e,
    0x057E : 0x100057e,
    0x054F : 0x100054f,
    0x057F : 0x100057f,
    0x0550 : 0x1000550,
    0x0580 : 0x1000580,
    0x0551 : 0x1000551,
    0x0581 : 0x1000581,
    0x0552 : 0x1000552,
    0x0582 : 0x1000582,
    0x0553 : 0x1000553,
    0x0583 : 0x1000583,
    0x0554 : 0x1000554,
    0x0584 : 0x1000584,
    0x0555 : 0x1000555,
    0x0585 : 0x1000585,
    0x0556 : 0x1000556,
    0x0586 : 0x1000586,
    0x055A : 0x100055a,
    0x10D0 : 0x10010d0,
    0x10D1 : 0x10010d1,
    0x10D2 : 0x10010d2,
    0x10D3 : 0x10010d3,
    0x10D4 : 0x10010d4,
    0x10D5 : 0x10010d5,
    0x10D6 : 0x10010d6,
    0x10D7 : 0x10010d7,
    0x10D8 : 0x10010d8,
    0x10D9 : 0x10010d9,
    0x10DA : 0x10010da,
    0x10DB : 0x10010db,
    0x10DC : 0x10010dc,
    0x10DD : 0x10010dd,
    0x10DE : 0x10010de,
    0x10DF : 0x10010df,
    0x10E0 : 0x10010e0,
    0x10E1 : 0x10010e1,
    0x10E2 : 0x10010e2,
    0x10E3 : 0x10010e3,
    0x10E4 : 0x10010e4,
    0x10E5 : 0x10010e5,
    0x10E6 : 0x10010e6,
    0x10E7 : 0x10010e7,
    0x10E8 : 0x10010e8,
    0x10E9 : 0x10010e9,
    0x10EA : 0x10010ea,
    0x10EB : 0x10010eb,
    0x10EC : 0x10010ec,
    0x10ED : 0x10010ed,
    0x10EE : 0x10010ee,
    0x10EF : 0x10010ef,
    0x10F0 : 0x10010f0,
    0x10F1 : 0x10010f1,
    0x10F2 : 0x10010f2,
    0x10F3 : 0x10010f3,
    0x10F4 : 0x10010f4,
    0x10F5 : 0x10010f5,
    0x10F6 : 0x10010f6,
    0x1E8A : 0x1001e8a,
    0x012C : 0x100012c,
    0x01B5 : 0x10001b5,
    0x01E6 : 0x10001e6,
    0x01D2 : 0x10001d1,
    0x019F : 0x100019f,
    0x1E8B : 0x1001e8b,
    0x012D : 0x100012d,
    0x01B6 : 0x10001b6,
    0x01E7 : 0x10001e7,
    0x01D2 : 0x10001d2,
    0x0275 : 0x1000275,
    0x018F : 0x100018f,
    0x0259 : 0x1000259,
    0x1E36 : 0x1001e36,
    0x1E37 : 0x1001e37,
    0x1EA0 : 0x1001ea0,
    0x1EA1 : 0x1001ea1,
    0x1EA2 : 0x1001ea2,
    0x1EA3 : 0x1001ea3,
    0x1EA4 : 0x1001ea4,
    0x1EA5 : 0x1001ea5,
    0x1EA6 : 0x1001ea6,
    0x1EA7 : 0x1001ea7,
    0x1EA8 : 0x1001ea8,
    0x1EA9 : 0x1001ea9,
    0x1EAA : 0x1001eaa,
    0x1EAB : 0x1001eab,
    0x1EAC : 0x1001eac,
    0x1EAD : 0x1001ead,
    0x1EAE : 0x1001eae,
    0x1EAF : 0x1001eaf,
    0x1EB0 : 0x1001eb0,
    0x1EB1 : 0x1001eb1,
    0x1EB2 : 0x1001eb2,
    0x1EB3 : 0x1001eb3,
    0x1EB4 : 0x1001eb4,
    0x1EB5 : 0x1001eb5,
    0x1EB6 : 0x1001eb6,
    0x1EB7 : 0x1001eb7,
    0x1EB8 : 0x1001eb8,
    0x1EB9 : 0x1001eb9,
    0x1EBA : 0x1001eba,
    0x1EBB : 0x1001ebb,
    0x1EBC : 0x1001ebc,
    0x1EBD : 0x1001ebd,
    0x1EBE : 0x1001ebe,
    0x1EBF : 0x1001ebf,
    0x1EC0 : 0x1001ec0,
    0x1EC1 : 0x1001ec1,
    0x1EC2 : 0x1001ec2,
    0x1EC3 : 0x1001ec3,
    0x1EC4 : 0x1001ec4,
    0x1EC5 : 0x1001ec5,
    0x1EC6 : 0x1001ec6,
    0x1EC7 : 0x1001ec7,
    0x1EC8 : 0x1001ec8,
    0x1EC9 : 0x1001ec9,
    0x1ECA : 0x1001eca,
    0x1ECB : 0x1001ecb,
    0x1ECC : 0x1001ecc,
    0x1ECD : 0x1001ecd,
    0x1ECE : 0x1001ece,
    0x1ECF : 0x1001ecf,
    0x1ED0 : 0x1001ed0,
    0x1ED1 : 0x1001ed1,
    0x1ED2 : 0x1001ed2,
    0x1ED3 : 0x1001ed3,
    0x1ED4 : 0x1001ed4,
    0x1ED5 : 0x1001ed5,
    0x1ED6 : 0x1001ed6,
    0x1ED7 : 0x1001ed7,
    0x1ED8 : 0x1001ed8,
    0x1ED9 : 0x1001ed9,
    0x1EDA : 0x1001eda,
    0x1EDB : 0x1001edb,
    0x1EDC : 0x1001edc,
    0x1EDD : 0x1001edd,
    0x1EDE : 0x1001ede,
    0x1EDF : 0x1001edf,
    0x1EE0 : 0x1001ee0,
    0x1EE1 : 0x1001ee1,
    0x1EE2 : 0x1001ee2,
    0x1EE3 : 0x1001ee3,
    0x1EE4 : 0x1001ee4,
    0x1EE5 : 0x1001ee5,
    0x1EE6 : 0x1001ee6,
    0x1EE7 : 0x1001ee7,
    0x1EE8 : 0x1001ee8,
    0x1EE9 : 0x1001ee9,
    0x1EEA : 0x1001eea,
    0x1EEB : 0x1001eeb,
    0x1EEC : 0x1001eec,
    0x1EED : 0x1001eed,
    0x1EEE : 0x1001eee,
    0x1EEF : 0x1001eef,
    0x1EF0 : 0x1001ef0,
    0x1EF1 : 0x1001ef1,
    0x1EF4 : 0x1001ef4,
    0x1EF5 : 0x1001ef5,
    0x1EF6 : 0x1001ef6,
    0x1EF7 : 0x1001ef7,
    0x1EF8 : 0x1001ef8,
    0x1EF9 : 0x1001ef9,
    0x01A0 : 0x10001a0,
    0x01A1 : 0x10001a1,
    0x01AF : 0x10001af,
    0x01B0 : 0x10001b0,
    0x20A0 : 0x10020a0,
    0x20A1 : 0x10020a1,
    0x20A2 : 0x10020a2,
    0x20A3 : 0x10020a3,
    0x20A4 : 0x10020a4,
    0x20A5 : 0x10020a5,
    0x20A6 : 0x10020a6,
    0x20A7 : 0x10020a7,
    0x20A8 : 0x10020a8,
    0x20A9 : 0x10020a9,
    0x20AA : 0x10020aa,
    0x20AB : 0x10020ab,
    0x20AC : 0x20ac,
    0x2070 : 0x1002070,
    0x2074 : 0x1002074,
    0x2075 : 0x1002075,
    0x2076 : 0x1002076,
    0x2077 : 0x1002077,
    0x2078 : 0x1002078,
    0x2079 : 0x1002079,
    0x2080 : 0x1002080,
    0x2081 : 0x1002081,
    0x2082 : 0x1002082,
    0x2083 : 0x1002083,
    0x2084 : 0x1002084,
    0x2085 : 0x1002085,
    0x2086 : 0x1002086,
    0x2087 : 0x1002087,
    0x2088 : 0x1002088,
    0x2089 : 0x1002089,
    0x2202 : 0x1002202,
    0x2205 : 0x1002205,
    0x2208 : 0x1002208,
    0x2209 : 0x1002209,
    0x220B : 0x100220B,
    0x221A : 0x100221A,
    0x221B : 0x100221B,
    0x221C : 0x100221C,
    0x222C : 0x100222C,
    0x222D : 0x100222D,
    0x2235 : 0x1002235,
    0x2245 : 0x1002248,
    0x2247 : 0x1002247,
    0x2262 : 0x1002262,
    0x2263 : 0x1002263,
    0x2800 : 0x1002800,
    0x2801 : 0x1002801,
    0x2802 : 0x1002802,
    0x2803 : 0x1002803,
    0x2804 : 0x1002804,
    0x2805 : 0x1002805,
    0x2806 : 0x1002806,
    0x2807 : 0x1002807,
    0x2808 : 0x1002808,
    0x2809 : 0x1002809,
    0x280a : 0x100280a,
    0x280b : 0x100280b,
    0x280c : 0x100280c,
    0x280d : 0x100280d,
    0x280e : 0x100280e,
    0x280f : 0x100280f,
    0x2810 : 0x1002810,
    0x2811 : 0x1002811,
    0x2812 : 0x1002812,
    0x2813 : 0x1002813,
    0x2814 : 0x1002814,
    0x2815 : 0x1002815,
    0x2816 : 0x1002816,
    0x2817 : 0x1002817,
    0x2818 : 0x1002818,
    0x2819 : 0x1002819,
    0x281a : 0x100281a,
    0x281b : 0x100281b,
    0x281c : 0x100281c,
    0x281d : 0x100281d,
    0x281e : 0x100281e,
    0x281f : 0x100281f,
    0x2820 : 0x1002820,
    0x2821 : 0x1002821,
    0x2822 : 0x1002822,
    0x2823 : 0x1002823,
    0x2824 : 0x1002824,
    0x2825 : 0x1002825,
    0x2826 : 0x1002826,
    0x2827 : 0x1002827,
    0x2828 : 0x1002828,
    0x2829 : 0x1002829,
    0x282a : 0x100282a,
    0x282b : 0x100282b,
    0x282c : 0x100282c,
    0x282d : 0x100282d,
    0x282e : 0x100282e,
    0x282f : 0x100282f,
    0x2830 : 0x1002830,
    0x2831 : 0x1002831,
    0x2832 : 0x1002832,
    0x2833 : 0x1002833,
    0x2834 : 0x1002834,
    0x2835 : 0x1002835,
    0x2836 : 0x1002836,
    0x2837 : 0x1002837,
    0x2838 : 0x1002838,
    0x2839 : 0x1002839,
    0x283a : 0x100283a,
    0x283b : 0x100283b,
    0x283c : 0x100283c,
    0x283d : 0x100283d,
    0x283e : 0x100283e,
    0x283f : 0x100283f,
    0x2840 : 0x1002840,
    0x2841 : 0x1002841,
    0x2842 : 0x1002842,
    0x2843 : 0x1002843,
    0x2844 : 0x1002844,
    0x2845 : 0x1002845,
    0x2846 : 0x1002846,
    0x2847 : 0x1002847,
    0x2848 : 0x1002848,
    0x2849 : 0x1002849,
    0x284a : 0x100284a,
    0x284b : 0x100284b,
    0x284c : 0x100284c,
    0x284d : 0x100284d,
    0x284e : 0x100284e,
    0x284f : 0x100284f,
    0x2850 : 0x1002850,
    0x2851 : 0x1002851,
    0x2852 : 0x1002852,
    0x2853 : 0x1002853,
    0x2854 : 0x1002854,
    0x2855 : 0x1002855,
    0x2856 : 0x1002856,
    0x2857 : 0x1002857,
    0x2858 : 0x1002858,
    0x2859 : 0x1002859,
    0x285a : 0x100285a,
    0x285b : 0x100285b,
    0x285c : 0x100285c,
    0x285d : 0x100285d,
    0x285e : 0x100285e,
    0x285f : 0x100285f,
    0x2860 : 0x1002860,
    0x2861 : 0x1002861,
    0x2862 : 0x1002862,
    0x2863 : 0x1002863,
    0x2864 : 0x1002864,
    0x2865 : 0x1002865,
    0x2866 : 0x1002866,
    0x2867 : 0x1002867,
    0x2868 : 0x1002868,
    0x2869 : 0x1002869,
    0x286a : 0x100286a,
    0x286b : 0x100286b,
    0x286c : 0x100286c,
    0x286d : 0x100286d,
    0x286e : 0x100286e,
    0x286f : 0x100286f,
    0x2870 : 0x1002870,
    0x2871 : 0x1002871,
    0x2872 : 0x1002872,
    0x2873 : 0x1002873,
    0x2874 : 0x1002874,
    0x2875 : 0x1002875,
    0x2876 : 0x1002876,
    0x2877 : 0x1002877,
    0x2878 : 0x1002878,
    0x2879 : 0x1002879,
    0x287a : 0x100287a,
    0x287b : 0x100287b,
    0x287c : 0x100287c,
    0x287d : 0x100287d,
    0x287e : 0x100287e,
    0x287f : 0x100287f,
    0x2880 : 0x1002880,
    0x2881 : 0x1002881,
    0x2882 : 0x1002882,
    0x2883 : 0x1002883,
    0x2884 : 0x1002884,
    0x2885 : 0x1002885,
    0x2886 : 0x1002886,
    0x2887 : 0x1002887,
    0x2888 : 0x1002888,
    0x2889 : 0x1002889,
    0x288a : 0x100288a,
    0x288b : 0x100288b,
    0x288c : 0x100288c,
    0x288d : 0x100288d,
    0x288e : 0x100288e,
    0x288f : 0x100288f,
    0x2890 : 0x1002890,
    0x2891 : 0x1002891,
    0x2892 : 0x1002892,
    0x2893 : 0x1002893,
    0x2894 : 0x1002894,
    0x2895 : 0x1002895,
    0x2896 : 0x1002896,
    0x2897 : 0x1002897,
    0x2898 : 0x1002898,
    0x2899 : 0x1002899,
    0x289a : 0x100289a,
    0x289b : 0x100289b,
    0x289c : 0x100289c,
    0x289d : 0x100289d,
    0x289e : 0x100289e,
    0x289f : 0x100289f,
    0x28a0 : 0x10028a0,
    0x28a1 : 0x10028a1,
    0x28a2 : 0x10028a2,
    0x28a3 : 0x10028a3,
    0x28a4 : 0x10028a4,
    0x28a5 : 0x10028a5,
    0x28a6 : 0x10028a6,
    0x28a7 : 0x10028a7,
    0x28a8 : 0x10028a8,
    0x28a9 : 0x10028a9,
    0x28aa : 0x10028aa,
    0x28ab : 0x10028ab,
    0x28ac : 0x10028ac,
    0x28ad : 0x10028ad,
    0x28ae : 0x10028ae,
    0x28af : 0x10028af,
    0x28b0 : 0x10028b0,
    0x28b1 : 0x10028b1,
    0x28b2 : 0x10028b2,
    0x28b3 : 0x10028b3,
    0x28b4 : 0x10028b4,
    0x28b5 : 0x10028b5,
    0x28b6 : 0x10028b6,
    0x28b7 : 0x10028b7,
    0x28b8 : 0x10028b8,
    0x28b9 : 0x10028b9,
    0x28ba : 0x10028ba,
    0x28bb : 0x10028bb,
    0x28bc : 0x10028bc,
    0x28bd : 0x10028bd,
    0x28be : 0x10028be,
    0x28bf : 0x10028bf,
    0x28c0 : 0x10028c0,
    0x28c1 : 0x10028c1,
    0x28c2 : 0x10028c2,
    0x28c3 : 0x10028c3,
    0x28c4 : 0x10028c4,
    0x28c5 : 0x10028c5,
    0x28c6 : 0x10028c6,
    0x28c7 : 0x10028c7,
    0x28c8 : 0x10028c8,
    0x28c9 : 0x10028c9,
    0x28ca : 0x10028ca,
    0x28cb : 0x10028cb,
    0x28cc : 0x10028cc,
    0x28cd : 0x10028cd,
    0x28ce : 0x10028ce,
    0x28cf : 0x10028cf,
    0x28d0 : 0x10028d0,
    0x28d1 : 0x10028d1,
    0x28d2 : 0x10028d2,
    0x28d3 : 0x10028d3,
    0x28d4 : 0x10028d4,
    0x28d5 : 0x10028d5,
    0x28d6 : 0x10028d6,
    0x28d7 : 0x10028d7,
    0x28d8 : 0x10028d8,
    0x28d9 : 0x10028d9,
    0x28da : 0x10028da,
    0x28db : 0x10028db,
    0x28dc : 0x10028dc,
    0x28dd : 0x10028dd,
    0x28de : 0x10028de,
    0x28df : 0x10028df,
    0x28e0 : 0x10028e0,
    0x28e1 : 0x10028e1,
    0x28e2 : 0x10028e2,
    0x28e3 : 0x10028e3, 
    0x28e4 : 0x10028e4,
    0x28e5 : 0x10028e5,
    0x28e6 : 0x10028e6,
    0x28e7 : 0x10028e7,
    0x28e8 : 0x10028e8,
    0x28e9 : 0x10028e9,
    0x28ea : 0x10028ea,
    0x28eb : 0x10028eb,
    0x28ec : 0x10028ec,
    0x28ed : 0x10028ed,
    0x28ee : 0x10028ee,
    0x28ef : 0x10028ef,
    0x28f0 : 0x10028f0,
    0x28f1 : 0x10028f1,
    0x28f2 : 0x10028f2,
    0x28f3 : 0x10028f3,
    0x28f4 : 0x10028f4,
    0x28f5 : 0x10028f5,
    0x28f6 : 0x10028f6,
    0x28f7 : 0x10028f7,
    0x28f8 : 0x10028f8,
    0x28f9 : 0x10028f9,
    0x28fa : 0x10028fa,
    0x28fb : 0x10028fb,
    0x28fc : 0x10028fc,
    0x28fd : 0x10028fd,
    0x28fe : 0x10028fe,
    0x28ff : 0x10028ff
};// SECTION: display
/*
 * noVNC: HTML5 VNC client
 * Copyright (C) 2011 Joel Martin
 * Licensed under LGPL-3 (see LICENSE.txt)
 *
 * See README.md for usage and integration instructions.
 */

/*jslint browser: true, white: false, bitwise: false */
/*global Util, Base64, changeCursor */

function Display(defaults) {
"use strict";

var that           = {},  // Public API methods
    conf           = {},  // Configuration attributes

    // Private Display namespace variables
    c_ctx          = null,
    c_forceCanvas  = false,

    // Predefine function variables (jslint)
    imageDataGet, rgbxImageData, cmapImageData,
    setFillColor, rescale,

    // The full frame buffer (logical canvas) size
    fb_width        = 0,
    fb_height       = 0,
    // The visible "physical canvas" viewport
    viewport       = {'x': 0, 'y': 0, 'w' : 0, 'h' : 0 },
    cleanRect      = {'x1': 0, 'y1': 0, 'x2': -1, 'y2': -1},

    c_prevStyle    = "",
    tile           = null,
    tile16x16      = null,
    tile_x         = 0,
    tile_y         = 0;


// Configuration attributes
Util.conf_defaults(conf, that, defaults, [
    ['target',      'wo', 'dom',  null, 'Canvas element for rendering'],
    ['context',     'ro', 'raw',  null, 'Canvas 2D context for rendering (read-only)'],
    ['logo',        'rw', 'raw',  null, 'Logo to display when cleared: {"width": width, "height": height, "data": data}'],
    ['true_color',  'rw', 'bool', true, 'Use true-color pixel data'],
    ['colourMap',   'rw', 'arr',  [], 'Colour map array (when not true-color)'],
    ['scale',       'rw', 'float', 1.0, 'Display area scale factor 0.0 - 1.0'],
    ['viewport',    'rw', 'bool', false, 'Use a viewport set with viewportChange()'],
    ['width',       'rw', 'int', null, 'Display area width'],
    ['height',      'rw', 'int', null, 'Display area height'],

    ['render_mode', 'ro', 'str', '', 'Canvas rendering mode (read-only)'],

    ['prefer_js',   'rw', 'str', null, 'Prefer Javascript over canvas methods'],
    ['cursor_uri',  'rw', 'raw', null, 'Can we render cursor using data URI']
    ]);

// Override some specific getters/setters
that.get_context = function () { return c_ctx; };

that.set_scale = function(scale) { rescale(scale); };

that.set_width = function (val) { that.resize(val, fb_height); };
that.get_width = function() { return fb_width; };

that.set_height = function (val) { that.resize(fb_width, val); };
that.get_height = function() { return fb_height; };



//
// Private functions
//

// Create the public API interface
function constructor() {
    Util.Debug(">> Display.constructor");

    var c, func, i, curDat, curSave,
        has_imageData = false, UE = Util.Engine;

    if (! conf.target) { throw("target must be set"); }

    if (typeof conf.target === 'string') {
        throw("target must be a DOM element");
    }

    c = conf.target;

    if (! c.getContext) { throw("no getContext method"); }

    if (! c_ctx) { c_ctx = c.getContext('2d'); }

    Util.Debug("User Agent: " + navigator.userAgent);
    if (UE.gecko) { Util.Debug("Browser: gecko " + UE.gecko); }
    if (UE.webkit) { Util.Debug("Browser: webkit " + UE.webkit); }
    if (UE.trident) { Util.Debug("Browser: trident " + UE.trident); }
    if (UE.presto) { Util.Debug("Browser: presto " + UE.presto); }

    that.clear();

    // Check canvas features
    if ('createImageData' in c_ctx) {
        conf.render_mode = "canvas rendering";
    } else {
        throw("Canvas does not support createImageData");
    }
    if (conf.prefer_js === null) {
        Util.Info("Prefering javascript operations");
        conf.prefer_js = true;
    }

    // Initialize cached tile imageData
    tile16x16 = c_ctx.createImageData(16, 16);

    /*
     * Determine browser support for setting the cursor via data URI
     * scheme
     */
    curDat = [];
    for (i=0; i < 8 * 8 * 4; i += 1) {
        curDat.push(255);
    }
    try {
        curSave = c.style.cursor;
        changeCursor(conf.target, curDat, curDat, 2, 2, 8, 8);
        if (c.style.cursor) {
            if (conf.cursor_uri === null) {
                conf.cursor_uri = true;
            }
            Util.Info("Data URI scheme cursor supported");
        } else {
            if (conf.cursor_uri === null) {
                conf.cursor_uri = false;
            }
            Util.Warn("Data URI scheme cursor not supported");
        }
        c.style.cursor = curSave;
    } catch (exc2) { 
        Util.Error("Data URI scheme cursor test exception: " + exc2);
        conf.cursor_uri = false;
    }

    Util.Debug("<< Display.constructor");
    return that ;
}

rescale = function(factor) {
    var c, tp, x, y, 
        properties = ['transform', 'WebkitTransform', 'MozTransform', null];
    c = conf.target;
    tp = properties.shift();
    while (tp) {
        if (typeof c.style[tp] !== 'undefined') {
            break;
        }
        tp = properties.shift();
    }

    if (tp === null) {
        Util.Debug("No scaling support");
        return;
    }


    if (typeof(factor) === "undefined") {
        factor = conf.scale;
    } else if (factor > 1.0) {
        factor = 1.0;
    } else if (factor < 0.1) {
        factor = 0.1;
    }

    if (conf.scale === factor) {
        //Util.Debug("Display already scaled to '" + factor + "'");
        return;
    }

    conf.scale = factor;
    x = c.width - c.width * factor;
    y = c.height - c.height * factor;
    c.style[tp] = "scale(" + conf.scale + ") translate(-" + x + "px, -" + y + "px)";
};

setFillColor = function(color) {
    var rgb, newStyle;
    if (conf.true_color) {
        rgb = color;
    } else {
        rgb = conf.colourMap[color[0]];
    }
    newStyle = "rgb(" + rgb[0] + "," + rgb[1] + "," + rgb[2] + ")";
    if (newStyle !== c_prevStyle) {
        c_ctx.fillStyle = newStyle;
        c_prevStyle = newStyle;
    }
};


//
// Public API interface functions
//

// Shift and/or resize the visible viewport
that.viewportChange = function(deltaX, deltaY, width, height) {
    var c = conf.target, v = viewport, cr = cleanRect,
        saveImg = null, saveStyle, x1, y1, vx2, vy2, w, h;

    if (!conf.viewport) {
        Util.Debug("Setting viewport to full display region");
        deltaX = -v.w; // Clamped later if out of bounds
        deltaY = -v.h; // Clamped later if out of bounds
        width = fb_width;
        height = fb_height;
    }

    if (typeof(deltaX) === "undefined") { deltaX = 0; }
    if (typeof(deltaY) === "undefined") { deltaY = 0; }
    if (typeof(width) === "undefined") { width = v.w; }
    if (typeof(height) === "undefined") { height = v.h; }

    // Size change

    if (width > fb_width) { width = fb_width; }
    if (height > fb_height) { height = fb_height; }

    if ((v.w !== width) || (v.h !== height)) {
        // Change width
        if ((width < v.w) && (cr.x2 > v.x + width -1)) {
            cr.x2 = v.x + width - 1;
        }
        v.w = width;

        // Change height
        if ((height < v.h) && (cr.y2 > v.y + height -1)) {
            cr.y2 = v.y + height - 1;
        }
        v.h = height;


        if (v.w > 0 && v.h > 0 && c.width > 0 && c.height > 0) {
            saveImg = c_ctx.getImageData(0, 0,
                    (c.width < v.w) ? c.width : v.w,
                    (c.height < v.h) ? c.height : v.h);
        }

        c.width = v.w;
        c.height = v.h;

        if (saveImg) {
            c_ctx.putImageData(saveImg, 0, 0);
        }
    }

    vx2 = v.x + v.w - 1;
    vy2 = v.y + v.h - 1;


    // Position change

    if ((deltaX < 0) && ((v.x + deltaX) < 0)) {
        deltaX = - v.x;
    }
    if ((vx2 + deltaX) >= fb_width) {
        deltaX -= ((vx2 + deltaX) - fb_width + 1);
    }

    if ((v.y + deltaY) < 0) {
        deltaY = - v.y;
    }
    if ((vy2 + deltaY) >= fb_height) {
        deltaY -= ((vy2 + deltaY) - fb_height + 1);
    }

    if ((deltaX === 0) && (deltaY === 0)) {
        //Util.Debug("skipping viewport change");
        return;
    }
    Util.Debug("viewportChange deltaX: " + deltaX + ", deltaY: " + deltaY);

    v.x += deltaX;
    vx2 += deltaX;
    v.y += deltaY;
    vy2 += deltaY;

    // Update the clean rectangle
    if (v.x > cr.x1) {
        cr.x1 = v.x;
    }
    if (vx2 < cr.x2) {
        cr.x2 = vx2;
    }
    if (v.y > cr.y1) {
        cr.y1 = v.y;
    }
    if (vy2 < cr.y2) {
        cr.y2 = vy2;
    }

    if (deltaX < 0) {
        // Shift viewport left, redraw left section
        x1 = 0;
        w = - deltaX;
    } else {
        // Shift viewport right, redraw right section
        x1 = v.w - deltaX;
        w = deltaX;
    }
    if (deltaY < 0) {
        // Shift viewport up, redraw top section
        y1 = 0;
        h = - deltaY;
    } else {
        // Shift viewport down, redraw bottom section
        y1 = v.h - deltaY;
        h = deltaY;
    }

    // Copy the valid part of the viewport to the shifted location
    saveStyle = c_ctx.fillStyle;
    c_ctx.fillStyle = "rgb(255,255,255)";
    if (deltaX !== 0) {
        //that.copyImage(0, 0, -deltaX, 0, v.w, v.h);
        //that.fillRect(x1, 0, w, v.h, [255,255,255]);
        c_ctx.drawImage(c, 0, 0, v.w, v.h, -deltaX, 0, v.w, v.h);
        c_ctx.fillRect(x1, 0, w, v.h);
    }
    if (deltaY !== 0) {
        //that.copyImage(0, 0, 0, -deltaY, v.w, v.h);
        //that.fillRect(0, y1, v.w, h, [255,255,255]);
        c_ctx.drawImage(c, 0, 0, v.w, v.h, 0, -deltaY, v.w, v.h);
        c_ctx.fillRect(0, y1, v.w, h);
    }
    c_ctx.fillStyle = saveStyle;
};


// Return a map of clean and dirty areas of the viewport and reset the
// tracking of clean and dirty areas.
//
// Returns: {'cleanBox':   {'x': x, 'y': y, 'w': w, 'h': h},
//           'dirtyBoxes': [{'x': x, 'y': y, 'w': w, 'h': h}, ...]}
that.getCleanDirtyReset = function() {
    var v = viewport, c = cleanRect, cleanBox, dirtyBoxes = [],
        vx2 = v.x + v.w - 1, vy2 = v.y + v.h - 1;


    // Copy the cleanRect
    cleanBox = {'x': c.x1, 'y': c.y1,
                'w': c.x2 - c.x1 + 1, 'h': c.y2 - c.y1 + 1};

    if ((c.x1 >= c.x2) || (c.y1 >= c.y2)) {
        // Whole viewport is dirty
        dirtyBoxes.push({'x': v.x, 'y': v.y, 'w': v.w, 'h': v.h});
    } else {
        // Redraw dirty regions
        if (v.x < c.x1) {
            // left side dirty region
            dirtyBoxes.push({'x': v.x, 'y': v.y,
                             'w': c.x1 - v.x + 1, 'h': v.h});
        }
        if (vx2 > c.x2) {
            // right side dirty region
            dirtyBoxes.push({'x': c.x2 + 1, 'y': v.y,
                             'w': vx2 - c.x2, 'h': v.h});
        }
        if (v.y < c.y1) {
            // top/middle dirty region
            dirtyBoxes.push({'x': c.x1, 'y': v.y,
                             'w': c.x2 - c.x1 + 1, 'h': c.y1 - v.y});
        }
        if (vy2 > c.y2) {
            // bottom/middle dirty region
            dirtyBoxes.push({'x': c.x1, 'y': c.y2 + 1,
                             'w': c.x2 - c.x1 + 1, 'h': vy2 - c.y2});
        }
    }

    // Reset the cleanRect to the whole viewport
    cleanRect = {'x1': v.x, 'y1': v.y,
                 'x2': v.x + v.w - 1, 'y2': v.y + v.h - 1};

    return {'cleanBox': cleanBox, 'dirtyBoxes': dirtyBoxes};
};

// Translate viewport coordinates to absolute coordinates
that.absX = function(x) {
    return x + viewport.x;
}
that.absY = function(y) {
    return y + viewport.y;
}


that.resize = function(width, height) {
    c_prevStyle    = "";

    fb_width = width;
    fb_height = height;

    rescale(conf.scale);
    that.viewportChange();
};

that.clear = function() {

    if (conf.logo) {
        that.resize(conf.logo.width, conf.logo.height);
        that.blitStringImage(conf.logo.data, 0, 0);
    } else {
        that.resize(640, 20);
        c_ctx.clearRect(0, 0, viewport.w, viewport.h);
    }

    // No benefit over default ("source-over") in Chrome and firefox
    //c_ctx.globalCompositeOperation = "copy";
};

that.fillRect = function(x, y, width, height, color) {
    setFillColor(color);
    c_ctx.fillRect(x - viewport.x, y - viewport.y, width, height);
};

that.copyImage = function(old_x, old_y, new_x, new_y, w, h) {
    var x1 = old_x - viewport.x, y1 = old_y - viewport.y,
        x2 = new_x - viewport.x, y2 = new_y  - viewport.y;
    c_ctx.drawImage(conf.target, x1, y1, w, h, x2, y2, w, h);
};


// Start updating a tile
that.startTile = function(x, y, width, height, color) {
    var data, rgb, red, green, blue, i;
    tile_x = x;
    tile_y = y;
    if ((width === 16) && (height === 16)) {
        tile = tile16x16;
    } else {
        tile = c_ctx.createImageData(width, height);
    }
    data = tile.data;
    if (conf.prefer_js) {
        if (conf.true_color) {
            rgb = color;
        } else {
            rgb = conf.colourMap[color[0]];
        }
        red = rgb[0];
        green = rgb[1];
        blue = rgb[2];
        for (i = 0; i < (width * height * 4); i+=4) {
            data[i    ] = red;
            data[i + 1] = green;
            data[i + 2] = blue;
            data[i + 3] = 255;
        }
    } else {
        that.fillRect(x, y, width, height, color);
    }
};

// Update sub-rectangle of the current tile
that.subTile = function(x, y, w, h, color) {
    var data, p, rgb, red, green, blue, width, j, i, xend, yend;
    if (conf.prefer_js) {
        data = tile.data;
        width = tile.width;
        if (conf.true_color) {
            rgb = color;
        } else {
            rgb = conf.colourMap[color[0]];
        }
        red = rgb[0];
        green = rgb[1];
        blue = rgb[2];
        xend = x + w;
        yend = y + h;
        for (j = y; j < yend; j += 1) {
            for (i = x; i < xend; i += 1) {
                p = (i + (j * width) ) * 4;
                data[p    ] = red;
                data[p + 1] = green;
                data[p + 2] = blue;
                data[p + 3] = 255;
            }   
        } 
    } else {
        that.fillRect(tile_x + x, tile_y + y, w, h, color);
    }
};

// Draw the current tile to the screen
that.finishTile = function() {
    if (conf.prefer_js) {
        c_ctx.putImageData(tile, tile_x - viewport.x, tile_y - viewport.y)
    }
    // else: No-op, if not prefer_js then already done by setSubTile
};

rgbxImageData = function(x, y, width, height, arr, offset) {
    var img, i, j, data, v = viewport;
    /*
    if ((x - v.x >= v.w) || (y - v.y >= v.h) ||
        (x - v.x + width < 0) || (y - v.y + height < 0)) {
        // Skipping because outside of viewport
        return;
    }
    */
    img = c_ctx.createImageData(width, height);
    data = img.data;
    for (i=0, j=offset; i < (width * height * 4); i=i+4, j=j+4) {
        data[i    ] = arr[j    ];
        data[i + 1] = arr[j + 1];
        data[i + 2] = arr[j + 2];
        data[i + 3] = 255; // Set Alpha
    }
    c_ctx.putImageData(img, x - v.x, y - v.y);
};

cmapImageData = function(x, y, width, height, arr, offset) {
    var img, i, j, data, rgb, cmap;
    img = c_ctx.createImageData(width, height);
    data = img.data;
    cmap = conf.colourMap;
    for (i=0, j=offset; i < (width * height * 4); i+=4, j+=1) {
        rgb = cmap[arr[j]];
        data[i    ] = rgb[0];
        data[i + 1] = rgb[1];
        data[i + 2] = rgb[2];
        data[i + 3] = 255; // Set Alpha
    }
    c_ctx.putImageData(img, x - viewport.x, y - viewport.y);
};

that.blitImage = function(x, y, width, height, arr, offset) {
    if (conf.true_color) {
        rgbxImageData(x, y, width, height, arr, offset);
    } else {
        cmapImageData(x, y, width, height, arr, offset);
    }
};

that.blitStringImage = function(str, x, y) {
    var img = new Image();
    img.onload = function () {
        c_ctx.drawImage(img, x - viewport.x, y - viewport.y);
    };
    img.src = str;
};

that.changeCursor = function(pixels, mask, hotx, hoty, w, h) {
    if (conf.cursor_uri === false) {
        Util.Warn("changeCursor called but no cursor data URI support");
        return;
    }

    if (conf.true_color) {
        changeCursor(conf.target, pixels, mask, hotx, hoty, w, h);
    } else {
        changeCursor(conf.target, pixels, mask, hotx, hoty, w, h, conf.colourMap);
    }
};

that.defaultCursor = function() {
    conf.target.style.cursor = "default";
};

return constructor();  // Return the public API interface

}  // End of Display()


/* Set CSS cursor property using data URI encoded cursor file */
function changeCursor(target, pixels, mask, hotx, hoty, w, h, cmap) {
    "use strict";
    var cur = [], rgb, IHDRsz, RGBsz, ANDsz, XORsz, url, idx, alpha, x, y;
    //Util.Debug(">> changeCursor, x: " + hotx + ", y: " + hoty + ", w: " + w + ", h: " + h);
    
    // Push multi-byte little-endian values
    cur.push16le = function (num) {
        this.push((num     ) & 0xFF,
                  (num >> 8) & 0xFF  );
    };
    cur.push32le = function (num) {
        this.push((num      ) & 0xFF,
                  (num >>  8) & 0xFF,
                  (num >> 16) & 0xFF,
                  (num >> 24) & 0xFF  );
    };

    IHDRsz = 40;
    RGBsz = w * h * 4;
    XORsz = Math.ceil( (w * h) / 8.0 );
    ANDsz = Math.ceil( (w * h) / 8.0 );

    // Main header
    cur.push16le(0);      // 0: Reserved
    cur.push16le(2);      // 2: .CUR type
    cur.push16le(1);      // 4: Number of images, 1 for non-animated ico

    // Cursor #1 header (ICONDIRENTRY)
    cur.push(w);          // 6: width
    cur.push(h);          // 7: height
    cur.push(0);          // 8: colors, 0 -> true-color
    cur.push(0);          // 9: reserved
    cur.push16le(hotx);   // 10: hotspot x coordinate
    cur.push16le(hoty);   // 12: hotspot y coordinate
    cur.push32le(IHDRsz + RGBsz + XORsz + ANDsz);
                          // 14: cursor data byte size
    cur.push32le(22);     // 18: offset of cursor data in the file


    // Cursor #1 InfoHeader (ICONIMAGE/BITMAPINFO)
    cur.push32le(IHDRsz); // 22: Infoheader size
    cur.push32le(w);      // 26: Cursor width
    cur.push32le(h*2);    // 30: XOR+AND height
    cur.push16le(1);      // 34: number of planes
    cur.push16le(32);     // 36: bits per pixel
    cur.push32le(0);      // 38: Type of compression

    cur.push32le(XORsz + ANDsz); // 43: Size of Image
                                 // Gimp leaves this as 0

    cur.push32le(0);      // 46: reserved
    cur.push32le(0);      // 50: reserved
    cur.push32le(0);      // 54: reserved
    cur.push32le(0);      // 58: reserved

    // 62: color data (RGBQUAD icColors[])
    for (y = h-1; y >= 0; y -= 1) {
        for (x = 0; x < w; x += 1) {
            idx = y * Math.ceil(w / 8) + Math.floor(x/8);
            alpha = (mask[idx] << (x % 8)) & 0x80 ? 255 : 0;

            if (cmap) {
                idx = (w * y) + x;
                rgb = cmap[pixels[idx]];
                cur.push(rgb[2]);          // blue
                cur.push(rgb[1]);          // green
                cur.push(rgb[0]);          // red
                cur.push(alpha);           // alpha
            } else {
                idx = ((w * y) + x) * 4;
                cur.push(pixels[idx + 2]); // blue
                cur.push(pixels[idx + 1]); // green
                cur.push(pixels[idx    ]); // red
                cur.push(alpha);           // alpha
            }
        }
    }

    // XOR/bitmask data (BYTE icXOR[])
    // (ignored, just needs to be right size)
    for (y = 0; y < h; y += 1) {
        for (x = 0; x < Math.ceil(w / 8); x += 1) {
            cur.push(0x00);
        }
    }

    // AND/bitmask data (BYTE icAND[])
    // (ignored, just needs to be right size)
    for (y = 0; y < h; y += 1) {
        for (x = 0; x < Math.ceil(w / 8); x += 1) {
            cur.push(0x00);
        }
    }

    url = "data:image/x-icon;base64," + Base64.encode(cur);
    target.style.cursor = "url(" + url + ") " + hotx + " " + hoty + ", default";
    //Util.Debug("<< changeCursor, cur.length: " + cur.length);
}
// SECTION: rfb
/*
 * noVNC: HTML5 VNC client
 * Copyright (C) 2011 Joel Martin
 * Licensed under LGPL-3 (see LICENSE.txt)
 *
 * See README.md for usage and integration instructions.
 */

/*jslint white: false, browser: true, bitwise: false, plusplus: false */
/*global window, Util, Display, Keyboard, Mouse, Websock, Websock_native, Base64, DES */


function RFB(defaults) {
"use strict";

    var that           = {},  // Public API methods
    conf           = {},  // Configuration attributes

    // Pre-declare private functions used before definitions (jslint)
    init_vars, updateState, fail, handle_message,
    init_msg, normal_msg, framebufferUpdate, print_stats,

    pixelFormat, clientEncodings, fbUpdateRequest, fbUpdateRequests,
    keyEvent, pointerEvent, clientCutText,

    extract_data_uri, scan_tight_imgQ,
    keyPress, mouseButton, mouseMove,

    checkEvents,  // Overridable for testing


    //
    // Private RFB namespace variables
    //
    rfb_host       = '',
    rfb_port       = 5900,
    rfb_password   = '',
    rfb_path       = '',

    rfb_state      = 'disconnected',
    rfb_version    = 0,
    rfb_max_version= 3.8,
    rfb_auth_scheme= '',


    // In preference order
    encodings      = [
        ['COPYRECT',         0x01 ],
        ['TIGHT_PNG',        -260 ],
        ['HEXTILE',          0x05 ],
        ['RRE',              0x02 ],
        ['RAW',              0x00 ],
        ['DesktopSize',      -223 ],
        ['Cursor',           -239 ],

        // Psuedo-encoding settings
        ['JPEG_quality_lo',   -32 ],
        //['JPEG_quality_hi',   -23 ],
        ['compress_lo',      -255 ]
        //['compress_hi',      -247 ]
        ],

    encHandlers    = {},
    encNames       = {}, 
    encStats       = {},     // [rectCnt, rectCntTot]

    ws             = null,   // Websock object
    display        = null,   // Display object
    keyboard       = null,   // Keyboard input handler object
    mouse          = null,   // Mouse input handler object
    sendTimer      = null,   // Send Queue check timer
    connTimer      = null,   // connection timer
    disconnTimer   = null,   // disconnection timer
    msgTimer       = null,   // queued handle_message timer

    // Frame buffer update state
    FBU            = {
        rects          : 0,
        subrects       : 0,  // RRE
        lines          : 0,  // RAW
        tiles          : 0,  // HEXTILE
        bytes          : 0,
        x              : 0,
        y              : 0,
        width          : 0, 
        height         : 0,
        encoding       : 0,
        subencoding    : -1,
        background     : null,
        imgQ           : []   // TIGHT_PNG image queue
    },

    fb_Bpp         = 4,
    fb_depth       = 3,
    fb_width       = 0,
    fb_height      = 0,
    fb_name        = "",

    scan_imgQ_rate = 40, // 25 times per second or so
    last_req_time  = 0,
    rre_chunk_sz   = 100,

    timing         = {
        last_fbu       : 0,
        fbu_total      : 0,
        fbu_total_cnt  : 0,
        full_fbu_total : 0,
        full_fbu_cnt   : 0,

        fbu_rt_start   : 0,
        fbu_rt_total   : 0,
        fbu_rt_cnt     : 0
    },

    test_mode        = false,

    def_con_timeout  = Websock_native ? 2 : 5,

    /* Mouse state */
    mouse_buttonMask = 0,
    mouse_arr        = [],
    viewportDragging = false,
    viewportDragPos  = {};
    console.log('loading vnc')
    console.log(Util.push8);
    return;


    // Configuration attributes
    Util.conf_defaults(conf, that, defaults, [
	['target',             'wo', 'dom', null, 'VNC display rendering Canvas object'],
	['focusContainer',     'wo', 'dom', document, 'DOM element that captures keyboard input'],
	
	['encrypt',            'rw', 'bool', false, 'Use TLS/SSL/wss encryption'],
	['true_color',         'rw', 'bool', true,  'Request true color pixel data'],
	['local_cursor',       'rw', 'bool', false, 'Request locally rendered cursor'],
	['shared',             'rw', 'bool', true,  'Request shared mode'],
	['view_only',          'rw', 'bool', false, 'Disable client mouse/keyboard'],
	
	['connectTimeout',     'rw', 'int', def_con_timeout, 'Time (s) to wait for connection'],
	['disconnectTimeout',  'rw', 'int', 3,    'Time (s) to wait for disconnection'],
	
	['viewportDrag',       'rw', 'bool', false, 'Move the viewport on mouse drags'],
	
	['check_rate',         'rw', 'int', 217,  'Timing (ms) of send/receive check'],
	['fbu_req_rate',       'rw', 'int', 1413, 'Timing (ms) of frameBufferUpdate requests'],
	
	// Callback functions
	['onUpdateState',      'rw', 'func', function() { },
         'onUpdateState(rfb, state, oldstate, statusMsg): RFB state update/change '],
	['onPasswordRequired', 'rw', 'func', function() { },
         'onPasswordRequired(rfb): VNC password is required '],
	['onClipboard',        'rw', 'func', function() { },
         'onClipboard(rfb, text): RFB clipboard contents received'],
	['onBell',             'rw', 'func', function() { },
         'onBell(rfb): RFB Bell message received '],
	['onFBUReceive',       'rw', 'func', function() { },
         'onFBUReceive(rfb, fbu): RFB FBU received but not yet processed '],
	['onFBUComplete',      'rw', 'func', function() { },
         'onFBUComplete(rfb, fbu): RFB FBU received and processed '],
	
	// These callback names are deprecated
	['updateState',        'rw', 'func', function() { },
         'obsolete, use onUpdateState'],
	['clipboardReceive',   'rw', 'func', function() { },
         'obsolete, use onClipboard']
    ]);
    
    
    // Override/add some specific configuration getters/setters
    that.set_local_cursor = function(cursor) {
	if ((!cursor) || (cursor in {'0':1, 'no':1, 'false':1})) {
            conf.local_cursor = false;
	} else {
            if (display.get_cursor_uri()) {
		conf.local_cursor = true;
            } else {
		Util.Warn("Browser does not support local cursor");
            }
	}
    };
    
    // These are fake configuration getters
    that.get_display = function() { return display; };
    
    that.get_keyboard = function() { return keyboard; };
    
    that.get_mouse = function() { return mouse; };
    
    
    
    //
    // Setup routines
    //
    
    // Create the public API interface and initialize values that stay
    // constant across connect/disconnect
    function constructor() {
	var i, rmode;
	Util.Debug(">> RFB.constructor");
	
	// Create lookup tables based encoding number
	for (i=0; i < encodings.length; i+=1) {
            encHandlers[encodings[i][1]] = encHandlers[encodings[i][0]];
            encNames[encodings[i][1]] = encodings[i][0];
            encStats[encodings[i][1]] = [0, 0];
	}
	// Initialize display, mouse, keyboard, and websock
	try {
        display   = new Display({'target': conf.target});
	} catch (exc) {
            Util.Error("Display exception: " + exc);
            updateState('fatal', "No working Display");
	}
	keyboard = new Keyboard({'target': conf.focusContainer,
                                 'onKeyPress': keyPress});
	mouse    = new Mouse({'target': conf.target,
                              'onMouseButton': mouseButton,
                              'onMouseMove': mouseMove});
	
	rmode = display.get_render_mode();
	
	ws = new Websock();
	ws.on('message', handle_message);
	ws.on('open', function() {
            if (rfb_state === "connect") {
		updateState('ProtocolVersion', "Starting VNC handshake");
            } else {
		fail("Got unexpected WebSockets connection");
            }
	});
	ws.on('close', function() {
            if (rfb_state === 'disconnect') {
		updateState('disconnected', 'VNC disconnected');
            } else if (rfb_state === 'ProtocolVersion') {
		fail('Failed to connect to server');
            } else if (rfb_state in {'failed':1, 'disconnected':1}) {
		Util.Error("Received onclose while disconnected");
            } else  {
		fail('Server disconnected');
            }
	});
	ws.on('error', function(e) {
            fail("WebSock error: " + e);
	});
	
	
	init_vars();
	
	/* Check web-socket-js if no builtin WebSocket support */
	if (Websock_native) {
            Util.Info("Using native WebSockets");
            updateState('loaded', 'noVNC ready: native WebSockets, ' + rmode);
	} else {
            Util.Warn("Using web-socket-js bridge. Flash version: " +
                      Util.Flash.version);
            if ((! Util.Flash) ||
		(Util.Flash.version < 9)) {
		updateState('fatal', "WebSockets or <a href='http://get.adobe.com/flashplayer'>Adobe Flash<\/a> is required");
            } else if (document.location.href.substr(0, 7) === "file://") {
		updateState('fatal',
			    "'file://' URL is incompatible with Adobe Flash");
            } else {
		updateState('loaded', 'noVNC ready: WebSockets emulation, ' + rmode);
            }
	}
	
	Util.Debug("<< RFB.constructor");
	return that;  // Return the public API interface
    }
    
    function connect() {
	Util.Debug(">> RFB.connect");
	
    var uri = "";
	if (conf.encrypt) {
            uri = "wss://";
	} else {
            uri = "ws://";
	}
	uri += rfb_host + ":" + rfb_port + "/" + rfb_path;
	Util.Info("connecting to " + uri);
	ws.open(uri);
	
    Util.Debug("<< RFB.connect");
    }
    
    // Initialize variables that are reset before each connection
    init_vars = function() {
	var i;
	
	/* Reset state */
	ws.init();
	
	FBU.rects        = 0;
	FBU.subrects     = 0;  // RRE and HEXTILE
	FBU.lines        = 0;  // RAW
	FBU.tiles        = 0;  // HEXTILE
	FBU.imgQ         = []; // TIGHT_PNG image queue
	mouse_buttonMask = 0;
	mouse_arr        = [];
	
	// Clear the per connection encoding stats
	for (i=0; i < encodings.length; i+=1) {
            encStats[encodings[i][1]][0] = 0;
	}
    };
    
    // Print statistics
    print_stats = function() {
	var i, s;
	Util.Info("Encoding stats for this connection:");
	for (i=0; i < encodings.length; i+=1) {
            s = encStats[encodings[i][1]];
            if ((s[0] + s[1]) > 0) {
		Util.Info("    " + encodings[i][0] + ": " +
			  s[0] + " rects");
            }
	}
	Util.Info("Encoding stats since page load:");
	for (i=0; i < encodings.length; i+=1) {
            s = encStats[encodings[i][1]];
            if ((s[0] + s[1]) > 0) {
		Util.Info("    " + encodings[i][0] + ": " +
			  s[1] + " rects");
            }
	}
    };
    
    //
    // Utility routines
    //
    
    
    /*
     * Page states:
     *   loaded       - page load, equivalent to disconnected
     *   disconnected - idle state
     *   connect      - starting to connect (to ProtocolVersion)
     *   normal       - connected
     *   disconnect   - starting to disconnect
     *   failed       - abnormal disconnect
     *   fatal        - failed to load page, or fatal error
     *
     * RFB protocol initialization states:
     *   ProtocolVersion 
     *   Security
     *   Authentication
     *   password     - waiting for password, not part of RFB
     *   SecurityResult
     *   ClientInitialization - not triggered by server message
     *   ServerInitialization (to normal)
     */
    updateState = function(state, statusMsg) {
	var func, cmsg, oldstate = rfb_state;
	
	if (state === oldstate) {
            /* Already here, ignore */
            Util.Debug("Already in state '" + state + "', ignoring.");
            return;
	}
	
	/* 
	 * These are disconnected states. A previous connect may
     * asynchronously cause a connection so make sure we are closed.
     */
    if (state in {'disconnected':1, 'loaded':1, 'connect':1,
                  'disconnect':1, 'failed':1, 'fatal':1}) {
        if (sendTimer) {
            clearInterval(sendTimer);
            sendTimer = null;
        }

        if (msgTimer) {
            clearInterval(msgTimer);
            msgTimer = null;
        }

        if (display && display.get_context()) {
            keyboard.ungrab();
            mouse.ungrab();
            display.defaultCursor();
            if ((Util.get_logging() !== 'debug') ||
                (state === 'loaded')) {
                // Show noVNC logo on load and when disconnected if
                // debug is off
                display.clear();
            }
        }

        ws.close();
    }

    if (oldstate === 'fatal') {
        Util.Error("Fatal error, cannot continue");
    }

    if ((state === 'failed') || (state === 'fatal')) {
        func = Util.Error;
    } else {
        func = Util.Warn;
    }

    if ((oldstate === 'failed') && (state === 'disconnected')) {
        // Do disconnect action, but stay in failed state.
        rfb_state = 'failed';
    } else {
        rfb_state = state;
    }

    cmsg = typeof(statusMsg) !== 'undefined' ? (" Msg: " + statusMsg) : "";
    func("New state '" + rfb_state + "', was '" + oldstate + "'." + cmsg);

    if (connTimer && (rfb_state !== 'connect')) {
        Util.Debug("Clearing connect timer");
        clearInterval(connTimer);
        connTimer = null;
    }

    if (disconnTimer && (rfb_state !== 'disconnect')) {
        Util.Debug("Clearing disconnect timer");
        clearInterval(disconnTimer);
        disconnTimer = null;
    }

    switch (state) {
    case 'normal':
        if ((oldstate === 'disconnected') || (oldstate === 'failed')) {
            Util.Error("Invalid transition from 'disconnected' or 'failed' to 'normal'");
        }

        break;


    case 'connect':
        
        connTimer = setTimeout(function () {
                fail("Connect timeout");
            }, conf.connectTimeout * 1000);

        init_vars();
        connect();

        // WebSocket.onopen transitions to 'ProtocolVersion'
        break;


    case 'disconnect':

        if (! test_mode) {
            disconnTimer = setTimeout(function () {
                    fail("Disconnect timeout");
                }, conf.disconnectTimeout * 1000);
        }

        print_stats();

        // WebSocket.onclose transitions to 'disconnected'
        break;


    case 'failed':
        if (oldstate === 'disconnected') {
            Util.Error("Invalid transition from 'disconnected' to 'failed'");
        }
        if (oldstate === 'normal') {
            Util.Error("Error while connected.");
        }
        if (oldstate === 'init') {
            Util.Error("Error while initializing.");
        }

        // Make sure we transition to disconnected
        setTimeout(function() { updateState('disconnected'); }, 50);

        break;


    default:
        // No state change action to take

    }

    if ((oldstate === 'failed') && (state === 'disconnected')) {
        // Leave the failed message
        conf.updateState(that, state, oldstate); // Obsolete
        conf.onUpdateState(that, state, oldstate);
    } else {
        conf.updateState(that, state, oldstate, statusMsg); // Obsolete
        conf.onUpdateState(that, state, oldstate, statusMsg);
    }
};

fail = function(msg) {
    updateState('failed', msg);
    return false;
};

handle_message = function() {
    //Util.Debug(">> handle_message ws.rQlen(): " + ws.rQlen());
    //Util.Debug("ws.rQslice(0,20): " + ws.rQslice(0,20) + " (" + ws.rQlen() + ")");
    if (ws.rQlen() === 0) {
        Util.Warn("handle_message called on empty receive queue");
        return;
    }
    switch (rfb_state) {
    case 'disconnected':
    case 'failed':
        Util.Error("Got data while disconnected");
        break;
    case 'normal':
        if (normal_msg() && ws.rQlen() > 0) {
            // true means we can continue processing
            // Give other events a chance to run
            if (msgTimer === null) {
                Util.Debug("More data to process, creating timer");
                msgTimer = setTimeout(function () {
                            msgTimer = null;
                            handle_message();
                        }, 10);
            } else {
                Util.Debug("More data to process, existing timer");
            }
        }
        break;
    default:
        init_msg();
        break;
    }
};


function genDES(password, challenge) {
    var i, passwd = [];
    for (i=0; i < password.length; i += 1) {
        passwd.push(password.charCodeAt(i));
    }
    return (new DES(passwd)).encrypt(challenge);
}

function flushClient() {
    if (mouse_arr.length > 0) {
        //send(mouse_arr.concat(fbUpdateRequests()));
        ws.send(mouse_arr);
        setTimeout(function() {
                ws.send(fbUpdateRequests());
            }, 50);

        mouse_arr = [];
        return true;
    } else {
        return false;
    }
}

// overridable for testing
checkEvents = function() {
    var now;
    if (rfb_state === 'normal' && !viewportDragging) {
        if (! flushClient()) {
            now = new Date().getTime();
            if (now > last_req_time + conf.fbu_req_rate) {
                last_req_time = now;
                ws.send(fbUpdateRequests());
            }
        }
    }
    setTimeout(checkEvents, conf.check_rate);
};

keyPress = function(keysym, down) {
    var arr;

    if (conf.view_only) { return; } // View only, skip keyboard events

    arr = keyEvent(keysym, down);
    arr = arr.concat(fbUpdateRequests());
    ws.send(arr);
};

mouseButton = function(x, y, down, bmask) {
    if (down) {
        mouse_buttonMask |= bmask;
    } else {
        mouse_buttonMask ^= bmask;
    }

    if (conf.viewportDrag) {
        if (down && !viewportDragging) {
            viewportDragging = true;
            viewportDragPos = {'x': x, 'y': y};

            // Skip sending mouse events
            return;
        } else {
            viewportDragging = false;
            ws.send(fbUpdateRequests()); // Force immediate redraw
        }
    }

    if (conf.view_only) { return; } // View only, skip mouse events

    mouse_arr = mouse_arr.concat(
            pointerEvent(display.absX(x), display.absY(y)) );
    flushClient();
};

mouseMove = function(x, y) {
    //Util.Debug('>> mouseMove ' + x + "," + y);
    var deltaX, deltaY;

    if (viewportDragging) {
        //deltaX = x - viewportDragPos.x; // drag viewport
        deltaX = viewportDragPos.x - x; // drag frame buffer
        //deltaY = y - viewportDragPos.y; // drag viewport
        deltaY = viewportDragPos.y - y; // drag frame buffer
        viewportDragPos = {'x': x, 'y': y};

        display.viewportChange(deltaX, deltaY);

        // Skip sending mouse events
        return;
    }

    if (conf.view_only) { return; } // View only, skip mouse events

    mouse_arr = mouse_arr.concat(
            pointerEvent(display.absX(x), display.absY(y)) );
};


//
// Server message handlers
//

// RFB/VNC initialisation message handler
init_msg = function() {
    //Util.Debug(">> init_msg [rfb_state '" + rfb_state + "']");

    var strlen, reason, length, sversion, cversion,
        i, types, num_types, challenge, response, bpp, depth,
        big_endian, red_max, green_max, blue_max, red_shift,
        green_shift, blue_shift, true_color, name_length;

    //Util.Debug("ws.rQ (" + ws.rQlen() + ") " + ws.rQslice(0));
    switch (rfb_state) {

    case 'ProtocolVersion' :
        if (ws.rQlen() < 12) {
            return fail("Incomplete protocol version");
        }
        sversion = ws.rQshiftStr(12).substr(4,7);
        Util.Info("Server ProtocolVersion: " + sversion);
        switch (sversion) {
            case "003.003": rfb_version = 3.3; break;
            case "003.006": rfb_version = 3.3; break;  // UltraVNC
            case "003.007": rfb_version = 3.7; break;
            case "003.008": rfb_version = 3.8; break;
            default:
                return fail("Invalid server version " + sversion);
        }
        if (rfb_version > rfb_max_version) { 
            rfb_version = rfb_max_version;
        }

        if (! test_mode) {
            sendTimer = setInterval(function() {
                    // Send updates either at a rate of one update
                    // every 50ms, or whatever slower rate the network
                    // can handle.
                    ws.flush();
                }, 50);
        }

        cversion = "00" + parseInt(rfb_version,10) +
                   ".00" + ((rfb_version * 10) % 10);
        ws.send_string("RFB " + cversion + "\n");
        updateState('Security', "Sent ProtocolVersion: " + cversion);
        break;

    case 'Security' :
        if (rfb_version >= 3.7) {
            // Server sends supported list, client decides 
            num_types = ws.rQshift8();
            if (ws.rQwait("security type", num_types, 1)) { return false; }
            if (num_types === 0) {
                strlen = ws.rQshift32();
                reason = ws.rQshiftStr(strlen);
                return fail("Security failure: " + reason);
            }
            rfb_auth_scheme = 0;
            types = ws.rQshiftBytes(num_types);
            Util.Debug("Server security types: " + types);
            for (i=0; i < types.length; i+=1) {
                if ((types[i] > rfb_auth_scheme) && (types[i] < 3)) {
                    rfb_auth_scheme = types[i];
                }
            }
            if (rfb_auth_scheme === 0) {
                return fail("Unsupported security types: " + types);
            }
            
            ws.send([rfb_auth_scheme]);
        } else {
            // Server decides
            if (ws.rQwait("security scheme", 4)) { return false; }
            rfb_auth_scheme = ws.rQshift32();
        }
        updateState('Authentication',
                "Authenticating using scheme: " + rfb_auth_scheme);
        init_msg();  // Recursive fallthrough (workaround JSLint complaint)
        break;

    // Triggered by fallthough, not by server message
    case 'Authentication' :
        //Util.Debug("Security auth scheme: " + rfb_auth_scheme);
        switch (rfb_auth_scheme) {
            case 0:  // connection failed
                if (ws.rQwait("auth reason", 4)) { return false; }
                strlen = ws.rQshift32();
                reason = ws.rQshiftStr(strlen);
                return fail("Auth failure: " + reason);
            case 1:  // no authentication
                if (rfb_version >= 3.8) {
                    updateState('SecurityResult');
                    return;
                }
                // Fall through to ClientInitialisation
                break;
            case 2:  // VNC authentication
                if (rfb_password.length === 0) {
                    // Notify via both callbacks since it is kind of
                    // a RFB state change and a UI interface issue.
                    updateState('password', "Password Required");
                    conf.onPasswordRequired(that);
                    return;
                }
                if (ws.rQwait("auth challenge", 16)) { return false; }
                challenge = ws.rQshiftBytes(16);
                //Util.Debug("Password: " + rfb_password);
                //Util.Debug("Challenge: " + challenge +
                //           " (" + challenge.length + ")");
                response = genDES(rfb_password, challenge);
                //Util.Debug("Response: " + response +
                //           " (" + response.length + ")");
                
                //Util.Debug("Sending DES encrypted auth response");
                ws.send(response);
                updateState('SecurityResult');
                return;
            default:
                fail("Unsupported auth scheme: " + rfb_auth_scheme);
                return;
        }
        updateState('ClientInitialisation', "No auth required");
        init_msg();  // Recursive fallthrough (workaround JSLint complaint)
        break;

    case 'SecurityResult' :
        if (ws.rQwait("VNC auth response ", 4)) { return false; }
        switch (ws.rQshift32()) {
            case 0:  // OK
                // Fall through to ClientInitialisation
                break;
            case 1:  // failed
                if (rfb_version >= 3.8) {
                    length = ws.rQshift32();
                    if (ws.rQwait("SecurityResult reason", length, 8)) {
                        return false;
                    }
                    reason = ws.rQshiftStr(length);
                    fail(reason);
                } else {
                    fail("Authentication failed");
                }
                return;
            case 2:  // too-many
                return fail("Too many auth attempts");
        }
        updateState('ClientInitialisation', "Authentication OK");
        init_msg();  // Recursive fallthrough (workaround JSLint complaint)
        break;

    // Triggered by fallthough, not by server message
    case 'ClientInitialisation' :
        ws.send([conf.shared ? 1 : 0]); // ClientInitialisation
        updateState('ServerInitialisation', "Authentication OK");
        break;

    case 'ServerInitialisation' :
        if (ws.rQwait("server initialization", 24)) { return false; }

        /* Screen size */
        fb_width  = ws.rQshift16();
        fb_height = ws.rQshift16();

        /* PIXEL_FORMAT */
        bpp            = ws.rQshift8();
        depth          = ws.rQshift8();
        big_endian     = ws.rQshift8();
        true_color     = ws.rQshift8();

        red_max        = ws.rQshift16();
        green_max      = ws.rQshift16();
        blue_max       = ws.rQshift16();
        red_shift      = ws.rQshift8();
        green_shift    = ws.rQshift8();
        blue_shift     = ws.rQshift8();
        ws.rQshiftStr(3); // padding

        Util.Info("Screen: " + fb_width + "x" + fb_height + 
                  ", bpp: " + bpp + ", depth: " + depth +
                  ", big_endian: " + big_endian +
                  ", true_color: " + true_color +
                  ", red_max: " + red_max +
                  ", green_max: " + green_max +
                  ", blue_max: " + blue_max +
                  ", red_shift: " + red_shift +
                  ", green_shift: " + green_shift +
                  ", blue_shift: " + blue_shift);

        /* Connection name/title */
        name_length   = ws.rQshift32();
        fb_name = ws.rQshiftStr(name_length);

        display.set_true_color(conf.true_color);
        display.resize(fb_width, fb_height);
        keyboard.grab();
        mouse.grab();

        if (conf.true_color) {
            fb_Bpp           = 4;
            fb_depth         = 3;
        } else {
            fb_Bpp           = 1;
            fb_depth         = 1;
        }

        response = pixelFormat();
        response = response.concat(clientEncodings());
        response = response.concat(fbUpdateRequests());
        timing.fbu_rt_start = (new Date()).getTime();
        ws.send(response);
        
        /* Start pushing/polling */
        setTimeout(checkEvents, conf.check_rate);
        setTimeout(scan_tight_imgQ, scan_imgQ_rate);

        if (conf.encrypt) {
            updateState('normal', "Connected (encrypted) to: " + fb_name);
        } else {
            updateState('normal', "Connected (unencrypted) to: " + fb_name);
        }
        break;
    }
    //Util.Debug("<< init_msg");
};


/* Normal RFB/VNC server message handler */
normal_msg = function() {
    //Util.Debug(">> normal_msg");

    var ret = true, msg_type, length, text,
        c, first_colour, num_colours, red, green, blue;

    if (FBU.rects > 0) {
        msg_type = 0;
    } else {
        msg_type = ws.rQshift8();
    }
    switch (msg_type) {
    case 0:  // FramebufferUpdate
        ret = framebufferUpdate(); // false means need more data
        break;
    case 1:  // SetColourMapEntries
        Util.Debug("SetColourMapEntries");
        ws.rQshift8();  // Padding
        first_colour = ws.rQshift16(); // First colour
        num_colours = ws.rQshift16();
        for (c=0; c < num_colours; c+=1) { 
            red = ws.rQshift16();
            //Util.Debug("red before: " + red);
            red = parseInt(red / 256, 10);
            //Util.Debug("red after: " + red);
            green = parseInt(ws.rQshift16() / 256, 10);
            blue = parseInt(ws.rQshift16() / 256, 10);
            display.set_colourMap([red, green, blue], first_colour + c);
        }
        Util.Debug("colourMap: " + display.get_colourMap());
        Util.Info("Registered " + num_colours + " colourMap entries");
        //Util.Debug("colourMap: " + display.get_colourMap());
        break;
    case 2:  // Bell
        Util.Debug("Bell");
        conf.onBell(that);
        break;
    case 3:  // ServerCutText
        Util.Debug("ServerCutText");
        if (ws.rQwait("ServerCutText header", 7, 1)) { return false; }
        ws.rQshiftBytes(3);  // Padding
        length = ws.rQshift32();
        if (ws.rQwait("ServerCutText", length, 8)) { return false; }

        text = ws.rQshiftStr(length);
        conf.clipboardReceive(that, text); // Obsolete
        conf.onClipboard(that, text);
        break;
    default:
        fail("Disconnected: illegal server message type " + msg_type);
        Util.Debug("ws.rQslice(0,30):" + ws.rQslice(0,30));
        break;
    }
    //Util.Debug("<< normal_msg");
    return ret;
};

framebufferUpdate = function() {
    var now, hdr, fbu_rt_diff, ret = true;

    if (FBU.rects === 0) {
        //Util.Debug("New FBU: ws.rQslice(0,20): " + ws.rQslice(0,20));
        if (ws.rQwait("FBU header", 3)) {
            ws.rQunshift8(0);  // FBU msg_type
            return false;
        }
        ws.rQshift8();  // padding
        FBU.rects = ws.rQshift16();
        //Util.Debug("FramebufferUpdate, rects:" + FBU.rects);
        FBU.bytes = 0;
        timing.cur_fbu = 0;
        if (timing.fbu_rt_start > 0) {
            now = (new Date()).getTime();
            Util.Info("First FBU latency: " + (now - timing.fbu_rt_start));
        }
    }

    while (FBU.rects > 0) {
        if (rfb_state !== "normal") {
            return false;
        }
        if (ws.rQwait("FBU", FBU.bytes)) { return false; }
        if (FBU.bytes === 0) {
            if (ws.rQwait("rect header", 12)) { return false; }
            /* New FramebufferUpdate */

            hdr = ws.rQshiftBytes(12);
            FBU.x      = (hdr[0] << 8) + hdr[1];
            FBU.y      = (hdr[2] << 8) + hdr[3];
            FBU.width  = (hdr[4] << 8) + hdr[5];
            FBU.height = (hdr[6] << 8) + hdr[7];
            FBU.encoding = parseInt((hdr[8] << 24) + (hdr[9] << 16) +
                                    (hdr[10] << 8) +  hdr[11], 10);

            conf.onFBUReceive(that,
                    {'x': FBU.x, 'y': FBU.y,
                     'width': FBU.width, 'height': FBU.height,
                     'encoding': FBU.encoding,
                     'encodingName': encNames[FBU.encoding]});

            if (encNames[FBU.encoding]) {
                // Debug:
                /*
                var msg =  "FramebufferUpdate rects:" + FBU.rects;
                msg += " x: " + FBU.x + " y: " + FBU.y;
                msg += " width: " + FBU.width + " height: " + FBU.height;
                msg += " encoding:" + FBU.encoding;
                msg += "(" + encNames[FBU.encoding] + ")";
                msg += ", ws.rQlen(): " + ws.rQlen();
                Util.Debug(msg);
                */
            } else {
                fail("Disconnected: unsupported encoding " +
                    FBU.encoding);
                return false;
            }
        }

        timing.last_fbu = (new Date()).getTime();

        ret = encHandlers[FBU.encoding]();

        now = (new Date()).getTime();
        timing.cur_fbu += (now - timing.last_fbu);

        if (ret) {
            encStats[FBU.encoding][0] += 1;
            encStats[FBU.encoding][1] += 1;
        }

        if (FBU.rects === 0) {
            if (((FBU.width === fb_width) &&
                        (FBU.height === fb_height)) ||
                    (timing.fbu_rt_start > 0)) {
                timing.full_fbu_total += timing.cur_fbu;
                timing.full_fbu_cnt += 1;
                Util.Info("Timing of full FBU, cur: " +
                          timing.cur_fbu + ", total: " +
                          timing.full_fbu_total + ", cnt: " +
                          timing.full_fbu_cnt + ", avg: " +
                          (timing.full_fbu_total /
                              timing.full_fbu_cnt));
            }
            if (timing.fbu_rt_start > 0) {
                fbu_rt_diff = now - timing.fbu_rt_start;
                timing.fbu_rt_total += fbu_rt_diff;
                timing.fbu_rt_cnt += 1;
                Util.Info("full FBU round-trip, cur: " +
                          fbu_rt_diff + ", total: " +
                          timing.fbu_rt_total + ", cnt: " +
                          timing.fbu_rt_cnt + ", avg: " +
                          (timing.fbu_rt_total /
                              timing.fbu_rt_cnt));
                timing.fbu_rt_start = 0;
            }
        }
        if (! ret) {
            return ret; // false ret means need more data
        }
    }

    conf.onFBUComplete(that,
            {'x': FBU.x, 'y': FBU.y,
                'width': FBU.width, 'height': FBU.height,
                'encoding': FBU.encoding,
                'encodingName': encNames[FBU.encoding]});

    return true; // We finished this FBU
};

//
// FramebufferUpdate encodings
//

encHandlers.RAW = function display_raw() {
    //Util.Debug(">> display_raw (" + ws.rQlen() + " bytes)");

    var cur_y, cur_height;

    if (FBU.lines === 0) {
        FBU.lines = FBU.height;
    }
    FBU.bytes = FBU.width * fb_Bpp; // At least a line
    if (ws.rQwait("RAW", FBU.bytes)) { return false; }
    cur_y = FBU.y + (FBU.height - FBU.lines);
    cur_height = Math.min(FBU.lines,
                          Math.floor(ws.rQlen()/(FBU.width * fb_Bpp)));
    display.blitImage(FBU.x, cur_y, FBU.width, cur_height,
            ws.get_rQ(), ws.get_rQi());
    ws.rQshiftBytes(FBU.width * cur_height * fb_Bpp);
    FBU.lines -= cur_height;

    if (FBU.lines > 0) {
        FBU.bytes = FBU.width * fb_Bpp; // At least another line
    } else {
        FBU.rects -= 1;
        FBU.bytes = 0;
    }
    //Util.Debug("<< display_raw (" + ws.rQlen() + " bytes)");
    return true;
};

encHandlers.COPYRECT = function display_copy_rect() {
    //Util.Debug(">> display_copy_rect");

    var old_x, old_y;

    if (ws.rQwait("COPYRECT", 4)) { return false; }
    old_x = ws.rQshift16();
    old_y = ws.rQshift16();
    display.copyImage(old_x, old_y, FBU.x, FBU.y, FBU.width, FBU.height);
    FBU.rects -= 1;
    FBU.bytes = 0;
    return true;
};

encHandlers.RRE = function display_rre() {
    //Util.Debug(">> display_rre (" + ws.rQlen() + " bytes)");
    var color, x, y, width, height, chunk;

    if (FBU.subrects === 0) {
        if (ws.rQwait("RRE", 4+fb_Bpp)) { return false; }
        FBU.subrects = ws.rQshift32();
        color = ws.rQshiftBytes(fb_Bpp); // Background
        display.fillRect(FBU.x, FBU.y, FBU.width, FBU.height, color);
    }
    while ((FBU.subrects > 0) && (ws.rQlen() >= (fb_Bpp + 8))) {
        color = ws.rQshiftBytes(fb_Bpp);
        x = ws.rQshift16();
        y = ws.rQshift16();
        width = ws.rQshift16();
        height = ws.rQshift16();
        display.fillRect(FBU.x + x, FBU.y + y, width, height, color);
        FBU.subrects -= 1;
    }
    //Util.Debug("   display_rre: rects: " + FBU.rects +
    //           ", FBU.subrects: " + FBU.subrects);

    if (FBU.subrects > 0) {
        chunk = Math.min(rre_chunk_sz, FBU.subrects);
        FBU.bytes = (fb_Bpp + 8) * chunk;
    } else {
        FBU.rects -= 1;
        FBU.bytes = 0;
    }
    //Util.Debug("<< display_rre, FBU.bytes: " + FBU.bytes);
    return true;
};

encHandlers.HEXTILE = function display_hextile() {
    //Util.Debug(">> display_hextile");
    var subencoding, subrects, color, cur_tile,
        tile_x, x, w, tile_y, y, h, xy, s, sx, sy, wh, sw, sh,
        rQ = ws.get_rQ(), rQi = ws.get_rQi(); 

    if (FBU.tiles === 0) {
        FBU.tiles_x = Math.ceil(FBU.width/16);
        FBU.tiles_y = Math.ceil(FBU.height/16);
        FBU.total_tiles = FBU.tiles_x * FBU.tiles_y;
        FBU.tiles = FBU.total_tiles;
    }

    /* FBU.bytes comes in as 1, ws.rQlen() at least 1 */
    while (FBU.tiles > 0) {
        FBU.bytes = 1;
        if (ws.rQwait("HEXTILE subencoding", FBU.bytes)) { return false; }
        subencoding = rQ[rQi];  // Peek
        if (subencoding > 30) { // Raw
            fail("Disconnected: illegal hextile subencoding " + subencoding);
            //Util.Debug("ws.rQslice(0,30):" + ws.rQslice(0,30));
            return false;
        }
        subrects = 0;
        cur_tile = FBU.total_tiles - FBU.tiles;
        tile_x = cur_tile % FBU.tiles_x;
        tile_y = Math.floor(cur_tile / FBU.tiles_x);
        x = FBU.x + tile_x * 16;
        y = FBU.y + tile_y * 16;
        w = Math.min(16, (FBU.x + FBU.width) - x);
        h = Math.min(16, (FBU.y + FBU.height) - y);

        /* Figure out how much we are expecting */
        if (subencoding & 0x01) { // Raw
            //Util.Debug("   Raw subencoding");
            FBU.bytes += w * h * fb_Bpp;
        } else {
            if (subencoding & 0x02) { // Background
                FBU.bytes += fb_Bpp;
            }
            if (subencoding & 0x04) { // Foreground
                FBU.bytes += fb_Bpp;
            }
            if (subencoding & 0x08) { // AnySubrects
                FBU.bytes += 1;   // Since we aren't shifting it off
                if (ws.rQwait("hextile subrects header", FBU.bytes)) { return false; }
                subrects = rQ[rQi + FBU.bytes-1]; // Peek
                if (subencoding & 0x10) { // SubrectsColoured
                    FBU.bytes += subrects * (fb_Bpp + 2);
                } else {
                    FBU.bytes += subrects * 2;
                }
            }
        }

        /*
        Util.Debug("   tile:" + cur_tile + "/" + (FBU.total_tiles - 1) +
              " (" + tile_x + "," + tile_y + ")" +
              " [" + x + "," + y + "]@" + w + "x" + h +
              ", subenc:" + subencoding +
              "(last: " + FBU.lastsubencoding + "), subrects:" +
              subrects +
              ", ws.rQlen():" + ws.rQlen() + ", FBU.bytes:" + FBU.bytes +
              " last:" + ws.rQslice(FBU.bytes-10, FBU.bytes) +
              " next:" + ws.rQslice(FBU.bytes-1, FBU.bytes+10));
        */
        if (ws.rQwait("hextile", FBU.bytes)) { return false; }

        /* We know the encoding and have a whole tile */
        FBU.subencoding = rQ[rQi];
        rQi += 1;
        if (FBU.subencoding === 0) {
            if (FBU.lastsubencoding & 0x01) {
                /* Weird: ignore blanks after RAW */
                Util.Debug("     Ignoring blank after RAW");
            } else {
                display.fillRect(x, y, w, h, FBU.background);
            }
        } else if (FBU.subencoding & 0x01) { // Raw
            display.blitImage(x, y, w, h, rQ, rQi);
            rQi += FBU.bytes - 1;
        } else {
            if (FBU.subencoding & 0x02) { // Background
                FBU.background = rQ.slice(rQi, rQi + fb_Bpp);
                rQi += fb_Bpp;
            }
            if (FBU.subencoding & 0x04) { // Foreground
                FBU.foreground = rQ.slice(rQi, rQi + fb_Bpp);
                rQi += fb_Bpp;
            }

            display.startTile(x, y, w, h, FBU.background);
            if (FBU.subencoding & 0x08) { // AnySubrects
                subrects = rQ[rQi];
                rQi += 1;
                for (s = 0; s < subrects; s += 1) {
                    if (FBU.subencoding & 0x10) { // SubrectsColoured
                        color = rQ.slice(rQi, rQi + fb_Bpp);
                        rQi += fb_Bpp;
                    } else {
                        color = FBU.foreground;
                    }
                    xy = rQ[rQi];
                    rQi += 1;
                    sx = (xy >> 4);
                    sy = (xy & 0x0f);

                    wh = rQ[rQi];
                    rQi += 1;
                    sw = (wh >> 4)   + 1;
                    sh = (wh & 0x0f) + 1;

                    display.subTile(sx, sy, sw, sh, color);
                }
            }
            display.finishTile();
        }
        ws.set_rQi(rQi);
        FBU.lastsubencoding = FBU.subencoding;
        FBU.bytes = 0;
        FBU.tiles -= 1;
    }

    if (FBU.tiles === 0) {
        FBU.rects -= 1;
    }

    //Util.Debug("<< display_hextile");
    return true;
};


encHandlers.TIGHT_PNG = function display_tight_png() {
    //Util.Debug(">> display_tight_png");
    var ctl, cmode, clength, getCLength, color, img;
    //Util.Debug("   FBU.rects: " + FBU.rects);
    //Util.Debug("   starting ws.rQslice(0,20): " + ws.rQslice(0,20) + " (" + ws.rQlen() + ")");

    FBU.bytes = 1; // compression-control byte
    if (ws.rQwait("TIGHT compression-control", FBU.bytes)) { return false; }

    // Get 'compact length' header and data size
    getCLength = function (arr) {
        var header = 1, data = 0;
        data += arr[0] & 0x7f;
        if (arr[0] & 0x80) {
            header += 1;
            data += (arr[1] & 0x7f) << 7;
            if (arr[1] & 0x80) {
                header += 1;
                data += arr[2] << 14;
            }
        }
        return [header, data];
    };

    ctl = ws.rQpeek8();
    switch (ctl >> 4) {
        case 0x08: cmode = "fill"; break;
        case 0x09: cmode = "jpeg"; break;
        case 0x0A: cmode = "png";  break;
        default:   throw("Illegal basic compression received, ctl: " + ctl);
    }
    switch (cmode) {
        // fill uses fb_depth because TPIXELs drop the padding byte
        case "fill": FBU.bytes += fb_depth; break; // TPIXEL
        case "jpeg": FBU.bytes += 3;            break; // max clength
        case "png":  FBU.bytes += 3;            break; // max clength
    }

    if (ws.rQwait("TIGHT " + cmode, FBU.bytes)) { return false; }

    //Util.Debug("   ws.rQslice(0,20): " + ws.rQslice(0,20) + " (" + ws.rQlen() + ")");
    //Util.Debug("   cmode: " + cmode);

    // Determine FBU.bytes
    switch (cmode) {
    case "fill":
        ws.rQshift8(); // shift off ctl
        color = ws.rQshiftBytes(fb_depth);
        FBU.imgQ.push({
                'type': 'fill',
                'img': {'complete': true},
                'x': FBU.x,
                'y': FBU.y,
                'width': FBU.width,
                'height': FBU.height,
                'color': color});
        break;
    case "jpeg":
    case "png":
        clength = getCLength(ws.rQslice(1, 4));
        FBU.bytes = 1 + clength[0] + clength[1]; // ctl + clength size + jpeg-data
        if (ws.rQwait("TIGHT " + cmode, FBU.bytes)) { return false; }

        // We have everything, render it
        //Util.Debug("   png, ws.rQlen(): " + ws.rQlen() + ", clength[0]: " + clength[0] + ", clength[1]: " + clength[1]);
        ws.rQshiftBytes(1 + clength[0]); // shift off ctl + compact length
        img = new Image();
        //img.onload = scan_tight_imgQ;
        FBU.imgQ.push({
                'type': 'img',
                'img': img,
                'x': FBU.x,
                'y': FBU.y});
        img.src = "data:image/" + cmode +
            extract_data_uri(ws.rQshiftBytes(clength[1]));
        img = null;
        break;
    }
    FBU.bytes = 0;
    FBU.rects -= 1;
    //Util.Debug("   ending ws.rQslice(0,20): " + ws.rQslice(0,20) + " (" + ws.rQlen() + ")");
    //Util.Debug("<< display_tight_png");
    return true;
};

extract_data_uri = function(arr) {
    //var i, stra = [];
    //for (i=0; i< arr.length; i += 1) {
    //    stra.push(String.fromCharCode(arr[i]));
    //}
    //return "," + escape(stra.join(''));
    return ";base64," + Base64.encode(arr);
};

scan_tight_imgQ = function() {
    var data, imgQ, ctx;
    ctx = display.get_context();
    if (rfb_state === 'normal') {
        imgQ = FBU.imgQ;
        while ((imgQ.length > 0) && (imgQ[0].img.complete)) {
            data = imgQ.shift();
            if (data['type'] === 'fill') {
                display.fillRect(data.x, data.y, data.width, data.height, data.color);
            } else {
                ctx.drawImage(data.img, data.x, data.y);
            }
        }
        setTimeout(scan_tight_imgQ, scan_imgQ_rate);
    }
};

encHandlers.DesktopSize = function set_desktopsize() {
    Util.Debug(">> set_desktopsize");
    fb_width = FBU.width;
    fb_height = FBU.height;
    display.resize(fb_width, fb_height);
    timing.fbu_rt_start = (new Date()).getTime();
    // Send a new non-incremental request
    ws.send(fbUpdateRequests());

    FBU.bytes = 0;
    FBU.rects -= 1;

    Util.Debug("<< set_desktopsize");
    return true;
};

encHandlers.Cursor = function set_cursor() {
    var x, y, w, h, pixelslength, masklength;
    //Util.Debug(">> set_cursor");
    x = FBU.x;  // hotspot-x
    y = FBU.y;  // hotspot-y
    w = FBU.width;
    h = FBU.height;

    pixelslength = w * h * fb_Bpp;
    masklength = Math.floor((w + 7) / 8) * h;

    FBU.bytes = pixelslength + masklength;
    if (ws.rQwait("cursor encoding", FBU.bytes)) { return false; }

    //Util.Debug("   set_cursor, x: " + x + ", y: " + y + ", w: " + w + ", h: " + h);

    display.changeCursor(ws.rQshiftBytes(pixelslength),
                            ws.rQshiftBytes(masklength),
                            x, y, w, h);

    FBU.bytes = 0;
    FBU.rects -= 1;

    //Util.Debug("<< set_cursor");
    return true;
};

encHandlers.JPEG_quality_lo = function set_jpeg_quality() {
    Util.Error("Server sent jpeg_quality pseudo-encoding");
};

encHandlers.compress_lo = function set_compress_level() {
    Util.Error("Server sent compress level pseudo-encoding");
};



/*
 * Client message routines
 */

pixelFormat = function() {
    //Util.Debug(">> pixelFormat");
    var arr;
    arr = [0];     // msg-type
    Util.push8(arr, 0);  // padding
    Util.push8(arr, 0);  // padding
    Util.push8(arr, 0);  // padding

    Util.push8(arr, fb_Bpp * 8); // bits-per-pixel
    Util.push8(arr, fb_depth * 8); // depth
    Util.push8(arr, 0);  // little-endian
    Util.push8(arr, conf.true_color ? 1 : 0);  // true-color

    Util.push16(arr, 255);  // red-max
    Util.push16(arr, 255);  // green-max
    Util.push16(arr, 255);  // blue-max
    Util.push8(arr, 0);     // red-shift
    Util.push8(arr, 8);     // green-shift
    Util.push8(arr, 16);    // blue-shift

    Util.push8(arr, 0);     // padding
    Util.push8(arr, 0);     // padding
    Util.push8(arr, 0);     // padding
    //Util.Debug("<< pixelFormat");
    return arr;
};

clientEncodings = function() {
    //Util.Debug(">> clientEncodings");
    var arr, i, encList = [];

    for (i=0; i<encodings.length; i += 1) {
        if ((encodings[i][0] === "Cursor") &&
            (! conf.local_cursor)) {
            Util.Debug("Skipping Cursor pseudo-encoding");
        } else {
            //Util.Debug("Adding encoding: " + encodings[i][0]);
            encList.push(encodings[i][1]);
        }
    }

    arr = [2];     // msg-type
    Util.push8(arr, 0);  // padding

    Util.push16(arr, encList.length); // encoding count
    for (i=0; i < encList.length; i += 1) {
        Util.push32(arr, encList[i]);
    }
    //Util.Debug("<< clientEncodings: " + arr);
    return arr;
};

fbUpdateRequest = function(incremental, x, y, xw, yw) {
    //Util.Debug(">> fbUpdateRequest");
    if (typeof(x) === "undefined") { x = 0; }
    if (typeof(y) === "undefined") { y = 0; }
    if (typeof(xw) === "undefined") { xw = fb_width; }
    if (typeof(yw) === "undefined") { yw = fb_height; }
    var arr;
    arr = [3];  // msg-type
    Util.push8(arr, incremental);
    Util.push16(arr, x);
    Util.push16(arr, y);
    Util.push16(arr, xw);
    Util.push16(arr, yw);
    //Util.Debug("<< fbUpdateRequest");
    return arr;
};

// Based on clean/dirty areas, generate requests to send
fbUpdateRequests = function() {
    var cleanDirty = display.getCleanDirtyReset(),
        arr = [], i, cb, db;

    cb = cleanDirty.cleanBox;
    if (cb.w > 0 && cb.h > 0) {
        // Request incremental for clean box
        arr = arr.concat(fbUpdateRequest(1, cb.x, cb.y, cb.w, cb.h));
    }
    for (i = 0; i < cleanDirty.dirtyBoxes.length; i++) {
        db = cleanDirty.dirtyBoxes[i];
        // Force all (non-incremental for dirty box
        arr = arr.concat(fbUpdateRequest(0, db.x, db.y, db.w, db.h));
    }
    return arr;
};



keyEvent = function(keysym, down) {
    //Util.Debug(">> keyEvent, keysym: " + keysym + ", down: " + down);
    var arr;
    arr = [4];  // msg-type
    Util.push8(arr, down);
    Util.push16(arr, 0);
    Util.push32(arr, keysym);
    //Util.Debug("<< keyEvent");
    return arr;
};

pointerEvent = function(x, y) {
    //Util.Debug(">> pointerEvent, x,y: " + x + "," + y +
    //           " , mask: " + mouse_buttonMask);
    var arr;
    arr = [5];  // msg-type
    Util.push8(arr, mouse_buttonMask);
    Util.push16(arr, x);
    Util.push16(arr, y);
    //Util.Debug("<< pointerEvent");
    return arr;
};

clientCutText = function(text) {
    //Util.Debug(">> clientCutText");
    var arr, i, n;
    arr = [6];     // msg-type
    Util.push8(arr, 0);  // padding
    Util.push8(arr, 0);  // padding
    Util.push8(arr, 0);  // padding
    Util.push32(arr, text.length);
    n = text.length;
    for (i=0; i < n; i+=1) {
        arr.push(text.charCodeAt(i));
    }
    //Util.Debug("<< clientCutText:" + arr);
    return arr;
};



//
// Public API interface functions
//

that.connect = function(host, port, password, path) {
    //Util.Debug(">> connect");

    rfb_host       = host;
    rfb_port       = port;
    rfb_password   = (password !== undefined)   ? password : "";
    rfb_path       = (path !== undefined) ? path : "";

    if ((!rfb_host) || (!rfb_port)) {
        return fail("Must set host and port");
    }

    updateState('connect');
    //Util.Debug("<< connect");

};

that.disconnect = function() {
    //Util.Debug(">> disconnect");
    updateState('disconnect', 'Disconnecting');
    //Util.Debug("<< disconnect");
};

that.sendPassword = function(passwd) {
    rfb_password = passwd;
    rfb_state = "Authentication";
    setTimeout(init_msg, 1);
};

that.sendCtrlAltDel = function() {
    if (rfb_state !== "normal" || conf.view_only) { return false; }
    Util.Info("Sending Ctrl-Alt-Del");
    var arr = [];
    arr = arr.concat(keyEvent(0xFFE3, 1)); // Control
    arr = arr.concat(keyEvent(0xFFE9, 1)); // Alt
    arr = arr.concat(keyEvent(0xFFFF, 1)); // Delete
    arr = arr.concat(keyEvent(0xFFFF, 0)); // Delete
    arr = arr.concat(keyEvent(0xFFE9, 0)); // Alt
    arr = arr.concat(keyEvent(0xFFE3, 0)); // Control
    arr = arr.concat(fbUpdateRequests());
    ws.send(arr);
};

// Send a key press. If 'down' is not specified then send a down key
// followed by an up key.
that.sendKey = function(code, down) {
    if (rfb_state !== "normal" || conf.view_only) { return false; }
    var arr = [];
    if (typeof down !== 'undefined') {
        Util.Info("Sending key code (" + (down ? "down" : "up") + "): " + code);
        arr = arr.concat(keyEvent(code, down ? 1 : 0));
    } else {
        Util.Info("Sending key code (down + up): " + code);
        arr = arr.concat(keyEvent(code, 1));
        arr = arr.concat(keyEvent(code, 0));
    }
    arr = arr.concat(fbUpdateRequests());
    ws.send(arr);
};

that.clipboardPasteFrom = function(text) {
    if (rfb_state !== "normal") { return; }
    //Util.Debug(">> clipboardPasteFrom: " + text.substr(0,40) + "...");
    ws.send(clientCutText(text));
    //Util.Debug("<< clipboardPasteFrom");
};

// Override internal functions for testing
that.testMode = function(override_send) {
    test_mode = true;
    that.recv_message = ws.testMode(override_send);

    checkEvents = function () { /* Stub Out */ };
    that.connect = function(host, port, password) {
            rfb_host = host;
            rfb_port = port;
            rfb_password = password;
            updateState('ProtocolVersion', "Starting VNC handshake");
        };
};


return constructor();  // Return the public API interface

}  // End of RFB()
