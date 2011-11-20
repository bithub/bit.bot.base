

from zope.interface import implements
from zope.component import getGlobalSiteManager
from twisted.words.xish import domish

from ldaptor.interfaces import ILDAPEntry

from bit.bot.common.interfaces import IGroups, IMember, IGroup

from wokkel.xmppim import MessageProtocol, AvailablePresence

from bit.bot.base.roles import RoleProvider

from bit.bot.common.interfaces import IBotRequest

class BitBotRequest(object):
    implements(IBotRequest)
    def __init__(self,proto):
        self.proto = proto
    
    @property
    def user(self):
        return self._asker

    @property
    def args(self):
        return self._args    

    def ask(self,msg):
        body = str(msg.body)
        mfrom = msg['from']
        def _respond(response):
            if response:
                self.proto.speak(msg['from'],response)         
        ask = self.proto.ai.respond(body,mfrom)
        ask.addCallback(_respond)
        return ask

