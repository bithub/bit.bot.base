import os

from zope.component import provideUtility
import zope.component.event
zope.component.event

from twisted.python import usage

from bit.core.configuration import ConfigurationLoader
from bit.core.interfaces import IConfiguration, IApplicationRunner


class Options(usage.Options):

    optParameters = [
        ['config', 'c', 'bit-bot.cfg'],
        ]


def makeService(config):
    return IApplicationRunner(ConfigurationLoader(config).load()).service
