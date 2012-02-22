
import os
import inspect
from zope.interface import implements
from zope.component import getUtility, provideUtility, provideHandler,provideAdapter, queryUtility

# this is necessary to activate the event architecture
import zope.component.event
# and this is for pyflakes
zope.component.event

from twisted.application.service import IServiceCollection
from twisted.web import static

from bit.core.interfaces import IPlugin, IServices, IPluginExtender
from bit.core.plugin import BitPlugin

from bit.bot.common.interfaces import IIntelligent, IWebImages, IWebCSS, IWebJS, IWebHTML, IWebJPlates, IFlatten, IAgents, ISubscriptions

from bit.bot.base.subscriptions import Subscriptions
from bit.bot.base.handlers import  rubbish_collection
from bit.bot.base.agent import AgentRubbish, Agents, AgentsFlattener
from bit.bot.base.services import ServicesFlattener, Services
from bit.bot.base.extends import HandlersPlugin, AgentsPlugin, SocketsPlugin

from bit.bot.common.interfaces import IHTTPRoot

class BotPlugin(BitPlugin):
    implements(IPlugin)

    # remove these!
    _services = {}
    _handlers = []
    _services = {}
    _http = {}
    _aiml = []
    _agents = {}
    _utils = []

