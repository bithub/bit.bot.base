from zope.interface import implements

from bit.bot.common.interfaces import ISubscriptions


class Subscriptions(object):

    implements(ISubscriptions)
    _subscriptions = {}

    def subscribe(self, sub, session, out):
        print 'subscribing %s' % session
        if sub not in self._subscriptions:
            self._subscriptions[sub] = {}
        self._subscriptions[sub][session] = out

    @property
    def subscriptions(self):
        return self._subscriptions

subscriptions = Subscriptions()
