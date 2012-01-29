
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


from bit.core.interfaces import IPlugin, IServices
from bit.core.plugin import BitPlugin

from bit.bot.common.interfaces import IIntelligent, IWebImages, IWebCSS, IWebJS, IWebHTML, IWebJPlates, IFlatten, IAgents, ISubscriptions

from bit.bot.base.subscriptions import Subscriptions
from bit.bot.base.handlers import  rubbish_collection
from bit.bot.base.agent import AgentRubbish, Agents, AgentsFlattener
from bit.bot.base.services import ServicesFlattener, Services

from bit.bot.common.interfaces import IHTTPRoot

class BotPlugin(BitPlugin):
    implements(IPlugin)
    _services = {}
    _handlers = []
    _services = {}
    _http = {}
    _aiml = []
    _agents = {}
    _utils = []

    def load_agents(self):
        [getUtility(IAgents).add(self.name,name,*agent)
         for name,agent in self._agents.items()]

    def load_handlers(self):
        for handler in self._handlers:
            provideHandler(handler)

    def load_HTTP(self):
        fpath =  os.path.dirname(inspect.getfile(self.__class__))
        for hid,http in self._http.items():
            if hid == 'root':
                target = os.path.join(fpath,http)
                for rtype in os.listdir(target):
                    resource = queryUtility(IHTTPRoot,rtype)
                    if not resource: continue
                    resource.add_resources(os.path.join(target,rtype))

            
    
    def load_AIML(self):
        fpath =  os.path.dirname(inspect.getfile(self.__class__))
        for aiml in self._aiml:
            target = os.path.join(fpath,aiml)
            if os.path.isdir(target):
                for f in os.listdir(target):
                    if f.endswith('.aiml'):
                        getUtility(IIntelligent).learn(os.path.join(target,f))
            elif os.path.isfile(target):
                getUtility(IIntelligent).learn(target)

class BitBot(BotPlugin):
    implements(IPlugin)
    _handlers = [rubbish_collection,]
    _agents = { 'rubbish': (AgentRubbish, 5) }

    _services = {}
    name = 'bit.bot.base'

    def load_utils(self):
        provideUtility(Subscriptions(),ISubscriptions)
        provideUtility(IAgents(self),IAgents)

    def load_adapters(self):
        provideAdapter(Agents,[IPlugin,],IAgents)       
        provideAdapter(AgentsFlattener,[IAgents,],IFlatten)        

        provideAdapter(Services,[IServiceCollection,],IServices)       
        provideAdapter(ServicesFlattener,[IServices,],IFlatten)      
  


