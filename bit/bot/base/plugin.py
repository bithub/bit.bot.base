
import os
import inspect
from zope.interface import implements
from zope.component import getUtility, provideUtility, provideHandler,provideAdapter

# this is necessary to activate the event architecture
import zope.component.event
# and this is for pyflakes
zope.component.event

from twisted.application.service import IServiceCollection
from twisted.web import static

from bit.bot.common.interfaces import IPlugin, IServices, IIntelligent, IWebImages, IWebCSS, IWebJS, IWebHTML, IWebJPlates, ISubscriptions, IFlatten, IAgents

from bit.bot.web.folder import BotFolder

from bit.bot.base.subscriptions import Subscriptions
from bit.bot.base.handlers import  rubbish_collection
from bit.bot.base.agent import AgentRubbish, Agents, AgentsFlattener
from bit.bot.base.services import ServicesFlattener, Services

class BotPlugin(object):
    implements(IPlugin)
    _services = {}
    _handlers = []
    _services = {}
    _http = {}
    _aiml = []
    _agents = {}
    _utils = []

    @property
    def name(self):
        return '%s.%s' %(self.__module__,self.__class__.__name___)

    @property
    def utils(self):
        return self._utils

    def load_utils(self):
        for util,iface in self.utils:
            if isinstance(iface,list):
                name,iface = iface
                provideUtility(util,iface,name=name)
            else:
                provideUtility(util,iface)

    def load_agents(self):
        [getUtility(IAgents).add(self.name,name,*agent)
         for name,agent in self._agents.items()]

    def load_handlers(self):
        for handler in self._handlers:
            provideHandler(handler)

    @property
    def services(self):
        return self._services

    def load_services(self):
        if not self.services: return
        _services = {}
        for sid,s in self.services.items():
            _services[sid] = s['service'](*s.get('args',[]))
        getUtility(IServices).add(self.name,_services)


    def load_sockets(self): 
        pass

    def load_adapters(self):         
        pass

    def load_HTTP(self):
        resource_types = {'images':dict(iface=IWebImages
                                        ,ext=['png','jpg','jpeg','gif'])
                          ,'js':dict(iface=IWebJS
                                     ,ext=['js'])
                          ,'css':dict(iface=IWebCSS
                                      ,ext=['css'])
                          ,'jplates':dict(iface=IWebJPlates
                                             ,ext=['html'])
                          ,'html':dict(iface=IWebHTML
                                       ,ext=['html'])
                          }

        fpath =  os.path.dirname(inspect.getfile(self.__class__))
        for hid,http in self._http.items():
            if hid == 'root':
                target = os.path.join(fpath,http)
                for rtype in resource_types:
                    if rtype in os.listdir(target):
                        resource = getUtility(resource_types[rtype]['iface'])
                        dir_target = os.path.join(target,rtype)
                        self._add_http_resources(resource,resource_types,rtype,dir_target)
                        for subf in os.listdir(dir_target):
                            if os.path.isdir(os.path.join(dir_target,subf)):
                                if not subf in resource.children:
                                    resource.putChild(subf,BotFolder())
                                subresource = resource.children[subf]
                                self._add_http_resources(subresource, resource_types,rtype, os.path.join(dir_target,subf)) 

    def _add_http_resources(self,resource,resource_types,rtype,dir_target):
        for f in os.listdir(dir_target):
            if os.path.isdir(os.path.join(dir_target,f)): continue
            for ext in resource_types[rtype]['ext']:
                if f.endswith('.%s'%ext):
                    file_path = os.path.join(dir_target,f)
                    print 'adding base %s: %s' %(rtype,file_path)
                    resource.putChild(f,static.File(file_path))

            
    
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
    _http = {'root': 'resources'}
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
  


