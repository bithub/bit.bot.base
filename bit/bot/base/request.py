

from zope.interface import implements
from zope.component import getUtility

from bit.bot.common.interfaces import IIntelligent, IConfiguration
from bit.bot.common.interfaces import ISocketRequest

class BitBotRequest(object):
    implements(ISocketRequest)
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
        
        domain = getUtility(IConfiguration).get('bot','domain')
        if domain == mfrom.split('/')[0].split('@')[1]:
            getUtility(IIntelligent).bot.setPredicate('secure','yes',mfrom)

        ask = getUtility(IIntelligent).respond(body,mfrom)
        ask.addCallback(_respond)
        return ask

