
import json
import time

from zope.interface import implements
from zope.event import notify
from zope.component import adapter, getUtility

from twisted.application.internet import TCPServer, TimerService
from twisted.internet import defer

from bit.bot.common.interfaces import IBotAgent, ISubscriptions, IAgents, IFlatten, IServices
from bit.bot.base.flat import Flattener



class PingEvent(object):
    pass

class RubbishCollectionEvent(object):
    pass

class BotAgent(object):
    implements(IBotAgent)

class AgentRubbish(BotAgent):
    implements(IBotAgent)
    
    _active = False
    _updated = None

    @property
    def active(self):
        pass
    
    def activate(self):
        self._active = True

    def complete(self):
        self._active = False
        self._updated = time.time()

    def scope(self):
        if self.active: return
        self.activate()
        notify(RubbishCollectionEvent())
        self.complete()

class AgentPing(BotAgent):
    implements(IBotAgent)
    def scope(self):
        print 'ping'
        notify(PingEvent())

@adapter(PingEvent)
def ping_handler(evt):
    subs = getUtility(ISubscriptions)
    if 'ping' in subs.subscriptions:
        for subscriber in subs.subscriptions['ping']:
            subs.subscriptions['ping'][subscriber](json.dumps(dict(emit={'ping': ''})))        

class Agents(object):
    implements(IAgents)
    def __init__(self,plugin):
        self.plugin = plugin

    _agents = {}
    
    @property
    def agents(self):
        return self._agents

    def add(self,service,name,agent,freq):        
        if service not in self._agents: self._agents[service] = []
        self._agents[service].append(name)
        getUtility(IServices).add(service,{name: TimerService(freq,agent().scope)})
    
class AgentsFlattener(Flattener):
    implements(IFlatten)

    def _flatten(self,name,agent):
        import pdb; pdb.set_trace()
        klass = '%s.%s'%(agent.__module__, agent.__class__.__name__)                
        _agent = {}
        _agent['agents'] = []
        _agent['multi'] = False
        if IAgentCollection.providedBy(agent):
            _agent['multi'] = True            
            for sub,subagent in agent.namedAgents.items():
                _agent['agents'].append(self._flatten(sub,subagent))
        for k in ['port','running']:
            if hasattr(agent,k):
                _agent[k] = str(getattr(agent,k))
        _agent['klass'] = klass
        _agent['name'] = name
        _agent['parent'] = '%s.%s' %(agent.parent.__module__, agent.parent.__class__.__name__)
        return _agent

    def flatten(self):
        _agents = {}                 
        agents = self.context.agents        
        for service,agent in agents.items():
            _agents[service] = agent
        return defer.maybeDeferred(lambda: _agents)

