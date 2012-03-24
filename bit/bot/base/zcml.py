import os
import zope
import bit
from StringIO import StringIO

from zope.configuration.xmlconfig import xmlconfig
from zope.i18nmessageid import MessageFactory
_ = MessageFactory('bit.core')


class IServiceDirective(zope.interface.Interface):
    """
    Define a service
    """

    name = zope.schema.TextLine(
        title=_("Name"),
        description=_("The service name"),
        required=True,
        )

    parent = zope.schema.TextLine(
        title=_("Name"),
        description=_("The service parent"),
        required=True,
        )

    service = zope.configuration.fields.GlobalObject(
        title=_("Service"),
        description=_("The service"),
        required=True,
        )

    port = zope.configuration.fields.GlobalObject(
        title=_("Port"),
        description=_("The service port"),
        required=True,
        )

    factory = zope.configuration.fields.GlobalObject(
        title=_("Service factory"),
        description=_("The service factory"),
        required=True,
        )

    context = zope.configuration.fields.GlobalObject(
        title=_("Service context"),
        description=_("The service context"),
        required=False,
        )


def service(_context, parent, name, service, port, factory, context=None):
    services = zope.component.getUtility(bit.core.interfaces.IServices)
    _services = {}

    if context:
        _services[name] = service(port(), factory(), context())
    else:
        _services[name] = service(port(), factory())
    _context.action(
        discriminator=None,
        callable=services.add,
        args=(parent, _services)
        )


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
