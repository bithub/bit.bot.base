from zope.interface import implements
from zope.component import getUtility, provideHandler

from bit.core.interfaces import IPluginExtender
from bit.bot.common.interfaces import IAgents


class SocketsPlugin(object):

    implements(IPluginExtender)

    def __init__(self, plugin):
        self.plugin = plugin

    def extend(self):
        if hasattr(self.plugin, 'load_sockets'):
            getattr(self.plugin, 'load_sockets')()


class AgentsPlugin(object):

    implements(IPluginExtender)

    def __init__(self, plugin):
        self.plugin = plugin

    def extend(self):
        if hasattr(self.plugin, 'load_agents'):
            getattr(self.plugin, 'load_agents')()
        else:
            agents = getattr(self.plugin, '_agents', {})
            [getUtility(IAgents).add(self.plugin.name, name, *agent)
             for name, agent in agents.items()]


class HandlersPlugin(object):

    implements(IPluginExtender)

    def __init__(self, plugin):
        self.plugin = plugin

    def extend(self):
        if hasattr(self.plugin, 'load_handlers'):
            getattr(self.plugin, 'load_handlers')()
        else:
            handlers = getattr(self.plugin, '_handlers', [])
            for handler in handlers:
                provideHandler(handler)
