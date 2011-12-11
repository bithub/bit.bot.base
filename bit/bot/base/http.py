import os
from zope.component import getUtility
from twisted.web import static, proxy
from twisted.web.resource import Resource
from bit.bot.common.interfaces import IConfiguration


class BitBotHTTP(Resource):
    def __init__(self,app):
        Resource.__init__(self)
        self.app = app        
    
    def render_GET(self, request):
        config = getUtility(IConfiguration)
        return "<html><body style='background: url(%s) no-repeat 50%% 50%%; width: 100%%; height: 100%%; margin:0; padding: 0'></body></html>" %config.get('bot','image')

    def getChild(self,name,request):
        config = getUtility(IConfiguration)
        if name == '':
            return self
        if name == 'desktop':
            return BitBotVNCHTTP(self.app)
                                                     
        if name == config.get('bot','image'):
            return static.File(os.path.join(os.path.dirname(__file__),'html',name))


