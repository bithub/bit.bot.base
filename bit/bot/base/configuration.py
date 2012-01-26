
from ConfigParser import ConfigParser

from zope.component import getUtilitiesFor
from zope.interface import implements

from bit.core.interfaces import IConfiguration, IFileConfiguration

class Configuration(object):
    implements(IConfiguration)
    def get(self,section,name=None):
        utils = getUtilitiesFor(IConfiguration)
        for utilid,util in utils:
            if utilid:
                res = util.get(section,name)
                if res: return res


class FileConfiguration(object):
    implements(IFileConfiguration)
    def __init__(self,filename):
        self.filename = filename
        self.config = ConfigParser()
        self.config.read(filename)
    def get(self,section,name=None):
        if not name:
            return [x for x,y in self.config.items(section)]
        results = self.config.get(section,name)
        if '\n' in results.strip():
            results = [r.strip() for r in results.split('\n')]
        return results
