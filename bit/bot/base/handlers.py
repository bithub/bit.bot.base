
import time
from zope.component import adapter,getUtility

from bit.bot.common.interfaces import ISessions
from bit.bot.base.agent import RubbishCollectionEvent


@adapter(RubbishCollectionEvent)
def rubbish_collection(evt):
    # expire old sessions

    def _sessionDestroyed(result,sessionid):
        print 'removed session %s' %sessionid

    def _gotSessions(results):
        for session in results:            
            if session.last + session.expiry < time.time():
                getUtility(ISessions).destroy(session.hex).addCallback(_sessionDestroyed,session.hex)

    getUtility(ISessions).sessions().addCallback(_gotSessions)
