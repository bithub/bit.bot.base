import zope.component.event
zope.component.event

from twisted.python import usage

from bit.core.configuration import FileConfigurationLoader,\
    StringConfigurationLoader
from bit.core.interfaces import IApplicationRunner


class Options(usage.Options):

    optParameters = [
        ['config', 'c', 'bit-bot.cfg'],
        ]


def makeService(config):
    return IApplicationRunner(
        FileConfigurationLoader(config).load()).service


def makeServiceFromString(config):
    return IApplicationRunner(
        StringConfigurationLoader(config).load()).service
