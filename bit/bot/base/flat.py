
from zope.interface import implements
from bit.bot.common.interfaces import IFlatten

class Flattener(object):
    implements(IFlatten)    
    def __init__(self,context):
        self.context = context

    def flatten(self):
        pass
