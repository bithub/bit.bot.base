import os

from zope.component import provideUtility
import zope.component.event
zope.component.event

from twisted.python import usage

from bit.core.configuration import Configuration, FileConfiguration
from bit.core.interfaces import IConfiguration, IApplicationRunner


class Options(usage.Options):
    pass


def makeService(config):
    configuration = Configuration()
    file_configuration = FileConfiguration('curate.cfg')
    provideUtility(configuration, IConfiguration)
    provideUtility(file_configuration, IConfiguration, name='default')
    for extension in [x.strip() for x in configuration.get('bot', 'extends')]:
        provideUtility(FileConfiguration(extension),
                       IConfiguration, name=os.path.basename(extension))
    return IApplicationRunner(configuration).service
