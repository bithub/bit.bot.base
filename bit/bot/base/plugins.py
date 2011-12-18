from zope.dottedname.resolve import resolve  
from zope.component import getGlobalSiteManager, getUtility
from bit.bot.common.interfaces import IConfiguration
from zope.interface import implements
from bit.bot.common.interfaces import IPlugins, IPluginFactory


class Plugins(object):
    implements(IPlugins)

    def loadPlugins(self):
        config = getUtility(IConfiguration)
        plugins = config.get('bot','plugins')
        if isinstance(plugins,str): plugins = [plugins]
        for plugin in plugins:
            plug = resolve(plugin.strip())()
            if not IPluginFactory.providedBy(plug): continue
            plug.load_utils()
            plug.load_handlers()
            plug.load_services()
            plug.load_sockets()
            plug.load_HTTP()
            plug.load_AIML()
    
            
