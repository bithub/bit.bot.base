import os
from zope.interface import implements
from zope.component import getUtility
from twisted.web import static
from twisted.web.resource import Resource
from bit.bot.common.interfaces import IConfiguration, IHTMLResources, IJPlates, IWebImages, IWebCSS, IWebJS, IWebHTML, IWebJPlates, IWebFolder

class BitBotResource(Resource):

    def __init__(self):
        Resource.__init__(self)

    def render_GET(self, request):
        return "<dl>%s</dl>" %''.join(["<dt>%s</dt><dd>%s</dd>"%(k,v) for k,v in self.children.items()])

class BitBotCSS(BitBotResource):
    implements(IWebCSS)

class BitBotResourceFolder(BitBotResource):
    implements(IWebFolder)

class BitBotJS(BitBotResource):
    implements(IWebJS)

class BitBotImages(BitBotResource):
    implements(IWebImages)

class BitBotHTML(BitBotResource):
    implements(IWebHTML)

class BitBotJPlates(BitBotResource):
    implements(IWebJPlates)

class BitBotHTTP(Resource):

    def render_GET(self, request):
        html = getUtility(IWebHTML)
        return html.children['bot.html'].render_GET(request)

    def getChild(self,name,request):

        if name == '':
            return self

        if name == 'images':
            return getUtility(IWebImages)

        if name == 'js':
            return getUtility(IWebJS)

        if name == 'css':
            return getUtility(IWebCSS)

        if name == 'jplates':
            return getUtility(IWebJPlates)

        if name == '_html':
            return getUtility(IWebHTML)


