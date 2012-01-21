from zope.dottedname.resolve import resolve  
from zope.component import getUtility
from bit.bot.common.interfaces import IConfiguration
from zope.interface import implements
from bit.bot.common.interfaces import IPlugins, IPlugin


class Plugins(object):
    implements(IPlugins)

    def loadPlugins(self):
        config = getUtility(IConfiguration)
        plugins = config.get('bot','plugins')
        if isinstance(plugins,str): plugins = [plugins]
        _plugins = []
        for plugin in plugins:
            plug = resolve(plugin.strip())()
            if IPlugin.providedBy(plug): _plugins.append(plug)

        for auto in ['adapters','utils','handlers','agents','services','sockets','HTTP','AIML']:
            for plug in _plugins:
                getattr(plug,'load_%s' %auto)()
    
            
