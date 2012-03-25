from zope.interface import implements

from twisted.python import log
from twisted.application.service import IServiceCollection, MultiService
from twisted.internet import defer

from bit.core.interfaces import IServices
from bit.bot.common.interfaces import IFlatten
from bit.bot.base.flat import Flattener


class ServicesFlattener(Flattener):

    implements(IFlatten)

    def _flatten(self, name, service):
        klass = '%s.%s' % (
            service.__module__, service.__class__.__name__)
        _service = {}
        _service['services'] = []
        _service['multi'] = False
        if IServiceCollection.providedBy(service):
            _service['multi'] = True
            for sub, subservice in service.namedServices.items():
                _service['services'].append(self._flatten(sub, subservice))
        for k in ['port', 'running']:
            if hasattr(service, k):
                _service[k] = str(getattr(service, k))
        _service['klass'] = klass
        _service['name'] = name
        _service['parent'] = service.parent.name
        return _service

    def flatten(self):
        _services = {}
        services = self.context.services
        for name, service in services.items():
            _services[name] = self._flatten(name, service)
        return defer.maybeDeferred(lambda: _services)

