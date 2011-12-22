
import json
from zope.component import getUtility
from zope.interface import implements
from twisted.internet.protocol import Factory
from twisted.internet import defer
from twisted.protocols.stateful import StatefulProtocol
from bit.bot.common.interfaces import ISockets, IIntelligent, ISessions, ISubscriptions, IFlatten
from txws import WebSocketFactory

from bit.bot.base.flat import Flattener

class SocketsFlattener(Flattener):
    implements(IFlatten)
    def flatten(self):
        _sockets = {}                
        sockets = self.context.sockets
        for socket in sockets:
            _sockets[socket] = []
            for _socket in sockets[socket]:
                _sockets[socket].append(_socket)
        return defer.maybeDeferred(lambda:_sockets)

class BotSocketProtocol(StatefulProtocol):
    def connectionMade(self):
        # send the current data model
        self.sessionid = None
        bit = {}
        bot = {}
        bot['base'] = {}
        bit['bot'] = bot
        emit = {}
        emit['data-loaded'] = ''
        self.transport.write(json.dumps(dict(bit=bit,emit=emit)))
        
    def connectionLost(self,reason):
        if self.sessionid:
            getUtility(ISockets).remove('bot',self.sessionid)

    def dataReceived(self,data):
        data = json.loads(data)
        sessionid = data['session'].replace('-','')
        self.sessionid = sessionid
        getUtility(ISockets).add('bot',sessionid,self)
        def respond(msg):
            self.transport.write(json.dumps(dict(emit={'respond': msg})))
        
        def _gotSession(sess):
            if sess:
                jid = sess.jid
                getUtility(ISessions).stamp(sessionid)
                if 'message' in data:                    
                    getUtility(IIntelligent).respond(data['message'].strip(),jid).addCallback(respond)
            else:
                if 'message' in data:            
                    getUtility(IIntelligent).respond(data['message'].strip(),'anon@chat.3ca.org.uk/%s'%sessionid).addCallback(respond)
        if 'subscribe' in data:
            subscriptions = getUtility(ISubscriptions)
            subscriptions.subscribe(data['subscribe'],sessionid,self.transport.write)
        getUtility(ISessions).session(sessionid).addCallback(_gotSession)


    def getInitialState(self):
        pass

    def speak(self,jid,msg,asker):
        self.transport.write(json.dumps(dict(emit={'respond': msg})))


class BotSocketFactory(Factory):
    protocol = BotSocketProtocol


class Sockets(object):
    implements(ISockets)
    _sockets = {}
    def add(self,socket_type,socket_id,proto):
        if not socket_type in self._sockets:
            self._sockets[socket_type] = {}

        if not socket_id in self._sockets[socket_type]:
            self._sockets[socket_type][socket_id] = proto


    def remove(self,socket_type,socket_id):
        del self._sockets[socket_type][socket_id]

    @property
    def sockets(self):
        return self._sockets

WebBotSocketFactory = lambda: WebSocketFactory(BotSocketFactory())
