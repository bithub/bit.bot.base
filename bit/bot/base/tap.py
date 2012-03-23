import zope.component.event
zope.component.event

from twisted.python import usage

from bit.core.configuration import ConfigurationLoader
from bit.core.interfaces import IApplicationRunner


class Options(usage.Options):

    optParameters = [
        ['config', 'c', 'bit-bot.cfg'],
        ]


def makeService(config):
    return IApplicationRunner(ConfigurationLoader(config).load()).service
