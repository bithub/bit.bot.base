
import os
import inspect
from zope.interface import implements
from zope.component import getUtility, getGlobalSiteManager, provideHandler, adapter, provideUtility, provideHandler,provideAdapter
import zope.component.event
from zope.event import notify
from twisted.application.internet import TCPServer, TimerService
from twisted.application.service import IServiceCollection
from twisted.web import server
from twisted.web import static

from bit.bot.common.interfaces import IPluginFactory, IJPlates, IHTMLResources, IConfiguration, IHTTPRoot, IServices, ISockets, IIntelligent, IWebImages, IWebCSS, IWebJS, IWebHTML, IWebJPlates, IWebFolder, ISubscriptions, IFlatten, ISessions, IAgents, IApplication, ISession

from bit.bot.base.http import BitBotHTTP, BitBotImages, BitBotJS, BitBotCSS, BitBotJPlates, BitBotHTML, BitBotResourceFolder

from bit.bot.base.subscriptions import Subscriptions
from bit.bot.base.socket import Sockets, WebBotSocketFactory
from bit.bot.base.handlers import bot_session_created, bot_session_destroyed, rubbish_collection, session_destroyed, session_created, agents_session_created,sessions_changed,stfw_session_created,sessions_session_created

from bit.bot.base.agent import AgentRubbish, Agents, AgentsFlattener

from bit.bot.base.sessions import SessionsFlattener, SessionFlattener
from bit.bot.base.services import ServicesFlattener, Services
from bit.bot.base.socket import SocketsFlattener



class HTMLResources(object):
    implements(IHTMLResources)
    def __init__(self,dir):
        self.dir = dir
        self._root = static.File(self.dir)

    @property
    def root(self):
        return self._root

    def resource(self,*la):
        resource = self._root
        if len(la)>1:
            for child in la[:-1]:
                resource = resource.children[child]
        return os.path.join(resource.path,la[-1])

class JPlates(HTMLResources):
    implements(IJPlates)


class BitBotPluginBase(object):
    implements(IPluginFactory)
    _services = {}
    _handlers = []
    _services = {}
    _http = {}
    _aiml = []
    _agents = {}

    @property
    def name(self):
        return '%s.%s' %(self.__module__,self.__class__.__name___)

    def load_utils(self): pass

    def load_agents(self):
        [getUtility(IAgents).add(self.name,name,*agent)
         for name,agent in self._agents.items()]

    def load_handlers(self):
        for handler in self._handlers:
            provideHandler(handler)

    def load_services(self):
        if not self._services: return
        _services = {}
        for sid,s in self._services.items():
            _services[sid] = s['service'](*s.get('args',[]))
        getUtility(IServices).add(self.name,_services)


    def load_sockets(self): 
        pass

    def load_adapters(self):         
        pass

    def load_HTTP(self):
        image_extensions = ['png','jpg','jpeg','gif']
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
                                    resource.putChild(subf,BitBotResourceFolder())
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

class BitBot(BitBotPluginBase):
    implements(IPluginFactory)

    _handlers = [bot_session_created,bot_session_destroyed,rubbish_collection,session_destroyed,session_created,agents_session_created,sessions_changed,stfw_session_created,sessions_session_created]
    _agents = { 'rubbish': (AgentRubbish, 5) }
    _http = {'root': 'resources'}
    _services = {}
    name = 'bit.bot.base'

    def load_services(self):
        self._services = {'socket': dict( service=TCPServer
                                          ,args=[8383,WebBotSocketFactory()])
                          ,'http': dict( service = TCPServer 
                                         ,args =[int(getUtility(IConfiguration).get('http','port'))
                                                 ,server.Site(getUtility(IHTTPRoot))])
                          }
        super(BitBot,self).load_services()

    def load_utils(self):
        provideUtility(HTMLResources(os.path.join(os.path.dirname(__file__),'html')),IHTMLResources)
        provideUtility(JPlates(os.path.join(os.path.dirname(__file__),'jplates')),IJPlates)

        provideUtility(BitBotHTTP(),IHTTPRoot)
        provideUtility(BitBotImages(),IWebImages)
        provideUtility(BitBotCSS(),IWebCSS)
        provideUtility(BitBotJS(),IWebJS)
        provideUtility(BitBotHTML(),IWebHTML)
        provideUtility(BitBotJPlates(),IWebJPlates)

        provideUtility(Sockets(),ISockets)
        provideUtility(Subscriptions(),ISubscriptions)

        provideUtility(IAgents(self),IAgents)

    def load_adapters(self):
        provideAdapter(Agents,[IPluginFactory,],IAgents)       
        provideAdapter(AgentsFlattener,[IAgents,],IFlatten)        

        provideAdapter(Services,[IServiceCollection,],IServices)       
        provideAdapter(ServicesFlattener,[IServices,],IFlatten)      
  
        provideAdapter(SessionsFlattener,[ISessions,],IFlatten)        
        provideAdapter(SessionFlattener,[ISession,],IFlatten)        
        provideAdapter(SocketsFlattener,[ISockets,],IFlatten)        



