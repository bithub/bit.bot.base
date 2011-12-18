

from zope.interface import implements
from zope.component import getUtility

from twisted.internet import utils

from bit.bot.common.interfaces import IMembers, ICurateBotProtocol, IAIMLMacro, IMUCBot, IConfiguration, ISessions, ISockets, IIntelligent
from bit.bot.base.roles import roles


class BitBotAIMacro(object):
    implements(IAIMLMacro)
    def __init__(self,ai):
        self.ai = ai

    def _asker(self,jid):
        # this is very bad! - we should check against my bot's jid domain!
        if 'rooms' in jid:
            askerid = (jid.split('/')[-1])                    
        else:
            askerid = (jid.split('@')[0])
        return askerid

    def speak(self,jid,resp,askerid=None):

        sessions = getUtility(ISessions)
        sockets = getUtility(ISockets)        
        resource = jid.split('/')[1]

        proto = getUtility(ICurateBotProtocol)
        self.ai.respond_async(jid,resp)
        
        if 'bot' in sockets.sockets and resource in sockets.sockets['bot']:
            socket = sockets.sockets['bot'][resource]
            socket.speak(jid,resp,askerid)

        elif 'rooms' in jid:
            rooms = getUtility(IMUCBot)
            rooms.speak(jid,resp,askerid)

        else:
            proto.speak(jid, resp)         


    def complete(self):
        pass
