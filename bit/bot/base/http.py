import os
from twisted.web import static
from twisted.web.resource import Resource

class BitBotHTTP(Resource):
    def __init__(self,app):
        Resource.__init__(self)
        self.app = app        
    
    def render_GET(self, request):
        return "<html><body style='background: url(/curate.jpg) no-repeat 50% 50%; width: 100%; height: 100%; margin:0; padding: 0'></body></html>"

    def getChild(self,name,request):
        if name == '':
            return self
        if name == 'curate.jpg':
            sfile =  static.File(os.path.join(os.path.dirname(__file__),'html',name))
            return sfile
