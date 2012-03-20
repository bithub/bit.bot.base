from zope.interface import implements
# this is necessary to activate the event architecture
import zope.component.event
# and this is for pyflakes
zope.component.event

from bit.core.interfaces import IPlugin
from bit.core.plugin import BitPlugin


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
