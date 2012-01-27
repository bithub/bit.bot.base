

from zope.interface import implements
from zope.component import getUtility
from bit.bot.common.interfaces import ICurateBotProtocol, IAIMLMacro, IMUCBot

from bit.core.interfaces import ISockets


class BotAIMacro(object):
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

    def speak(self,jid,resp,askerid=None,token=None):
        sockets = getUtility(ISockets)        
        resource = jid.split('/')[1]

        proto = getUtility(ICurateBotProtocol)
        self.ai.respond_async(jid,resp)

        if 'bot' in sockets.sockets and resource in sockets.sockets['bot']:
            getUtility(ISockets).emit('bot',resource,'respond',resp,token=token)

        elif 'rooms' in jid:
            rooms = getUtility(IMUCBot)
            rooms.speak(jid,resp,askerid)

        else:
            proto.speak(jid, resp)         


    def complete(self):
        pass
