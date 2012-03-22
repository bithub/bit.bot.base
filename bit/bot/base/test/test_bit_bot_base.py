
from cStringIO import StringIO

from zope.component import getUtility
from zope.configuration.xmlconfig import xmlconfig

from twisted.trial import unittest
from twisted.test import proto_helpers
from twisted.internet import reactor

from bit.core.interfaces import IApplication, IServices, IApplicationRunner
from bit.core.configuration import Configuration, StringConfiguration


test_configuration = """
[bot]
name = testbot
plugins = bit.bot.base
"""


def runSnippet(snippet):
    template = """\
     <configure xmlns='http://namespaces.zope.org/zope'
                i18n_domain="zope">
     %s
     </configure>"""
    xmlconfig(StringIO(template % snippet))
    

class BitBotBaseTestCase(unittest.TestCase):

    def setUp(self):
        configuration = Configuration()
        configuration.register(StringConfiguration(test_configuration))
        self.app = IApplicationRunner(configuration)

    def tearDown(self):
        if reactor.running:
            self.app.stop()    

    def test_application(self):
        application = getUtility(IApplication)
        self.failUnless(IApplication.providedBy(application))

    def test_services(self):
        services = getUtility(IServices)
        self.failUnless(IServices.providedBy(services))

    def test_service_zcml(self):
        runSnippet('''
   <service
      parent="bit.bot.base"
      name="test-service"      
      service="twisted.application.internet.TCPServer"
      port="bit.bot.base.test.example.getPort"
      factory="bit.bot.base.test.example.TestFactory"
       />''')
        self.failUnless('bit.bot.base' in getUtility(IServices).services)

        
