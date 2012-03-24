import os
import zope
import bit
from StringIO import StringIO

from zope.configuration.xmlconfig import xmlconfig
from zope.i18nmessageid import MessageFactory
_ = MessageFactory('bit.core')

from bit.bot.common.interfaces import ISocketRequest


class IPluginDirective(zope.interface.Interface):
    """
    Define a plugin
    """

    package = zope.configuration.fields.GlobalObject(
        title=_("Plugin package"),
        description=_("The plugin package"),
        required=True,
        )


zcml_template = """\
       <configure xmlns='http://namespaces.zope.org/zope'
                  i18n_domain="zope">
       %s
       </configure>"""


def plugin(_context, package):
    meta_path = os.path.join(package.__path__[0], 'meta.zcml')

    def _xmlconfig(config):
        config.seek(0)
        return xmlconfig(config)

    if not os.path.exists(meta_path):
        meta = "<include package='%s' file='meta.zcml' />" % package.__name__
        zcml = zcml_template % meta
        conf = StringIO(zcml)
        _context.action(
            discriminator=None,
            callable=_xmlconfig,
            args=(conf,)
            )

    plugin_path = os.path.join(package.__path__[0], 'plugin.zcml')
    if os.path.exists(plugin_path):
        plugin = "<include package='%s' file='plugin.zcml' />" %\
            package.__name__
        zcml = zcml_template % plugin
        conf = StringIO(zcml)
        _context.action(
            discriminator=None,
            callable=_xmlconfig,
            args=(conf,)
            )


def command(_context, name, factory, for_=ISocketRequest):
    _context.action(
        discriminator=None,
        callable=zope.component.provideAdapter,
        args=(factory, [for_], bit.core.interfaces.ICommand, name),
        )


class ISubscribeDirective(zope.interface.Interface):
    """
    Define a subscribe
    """

    name = zope.schema.TextLine(
        title=_("Name"),
        description=_("The subscribe name"),
        required=True,
        )

    factory = zope.configuration.fields.GlobalObject(
        title=_("Subscribe factory"),
        description=_("The subscribe factory"),
        required=True,
        )

    for_ = zope.configuration.fields.GlobalInterface(
        title=_("Subscribe socket interface"),
        description=_("The socket interface that I provide subscribes for"),
        required=False,
        missing_value=ISocketRequest,
        )


def subscribe(_context, name, factory, for_=ISocketRequest):
    _context.action(
        discriminator=None,
        callable=zope.component.provideAdapter,
        args=(factory, [for_], bit.bot.common.interfaces.ISubscribe, name),
        )
