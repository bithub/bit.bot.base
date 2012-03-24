from zope.component import getAdapters, queryAdapter

from twisted.python import log
from twisted.internet import reactor, defer

from bit.bot.common.interfaces import ISubscribe


class TestSubscribe(object):

    def __init__(self, request):
        self.request = request

    def load(self, user, args):
        d = defer.Deferred()

        def _test():
            self.request.speak('test complete')
            d.callback('TEST FINISHED!')
            return 'tota'
        self.request.speak('test started')
        reactor.callLater(10, _test)
        return d


class Subscribes(object):

    def __init__(self, request):
        self.request = request

    def load(self, sessionid, args):
        log.msg('bit.bot.xmpp.subscribes: Subscribes.load: ',
                sessionid)

        def _subscribes():
            log.msg('bit.bot.http.request: Subscribes.load._subscribes: ',
                    sessionid)
            if len(args.strip().split(' ')) > 1:
                subscribe_name = args.strip().split(' ')[1]
                subscribe = queryAdapter(
                    self.request, ISubscribe, subscribe_name)
                if subscribe:
                    self.request.speak("%s:" % subscribe_name)
                    self.request.speak(
                        subscribe.__doc__ or '...is currently undocumented')
                else:
                    self.request.speak(
                        'unrecognized subscribe: %s' % subscribe_name)
                    self.request.speak(
                        'type ~ or ~help for a list of subscribes')
                return

            _subscribes = ['list of subscribes:']
            subscribes = getAdapters((self.request, ), ISubscribe)
            for subscribe, adapter in subscribes:
                if not subscribe:
                    continue
                _subscribes.append(subscribe)
            self.request.speak('\n'.join(_subscribes))

        return defer.maybeDeferred(_subscribes)
