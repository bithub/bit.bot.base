
import json
import time
from zope.component import adapter,getUtility

from twisted.internet import defer

from bit.bot.common.interfaces import ISockets, ISessions, ISubscriptions, IFlatten
from bit.bot.base.sessions import SessionCreatedEvent, SessionDestroyedEvent, SessionsChangedEvent
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

    sessions = getUtility(ISessions).sessions().addCallback(_gotSessions)

def session_updated(evt):
    subs = getUtility(ISubscriptions)
    def _gotSessions(sessions):
        if 'sessions-changed' in subs.subscriptions:
            for subscriber in subs.subscriptions['sessions-changed']:
                subs.subscriptions['sessions-changed'][subscriber](json.dumps(dict(emit={'sessions-changed': ''}
                                                                                   ,bit=dict(bot=dict(admin=(dict(sessions=sessions)))))))
    IFlatten(getUtility(ISessions)).flatten().addCallback(_gotSessions)

    
@adapter(SessionCreatedEvent)
def session_created(evt):
    session_updated(evt)
    
@adapter(SessionDestroyedEvent)
def session_destroyed(evt):
    session_updated(evt)

@adapter(SessionsChangedEvent)
def sessions_changed(evt):
    session_updated(evt)


@adapter(SessionCreatedEvent)
def bot_session_created(evt):
    sockets = getUtility(ISockets)
    sess = evt.session
    resource = sess.jid.split('/')[1]

    if sess.session_type == 'curate':
        if 'bot' in sockets.sockets and resource in sockets.sockets['bot']:
            socket = sockets.sockets['bot'][resource]
            socket.transport.write(json.dumps(dict(emit={'auth-successful': sess.jid})))

@adapter(SessionDestroyedEvent)
def bot_session_destroyed(evt):
    sockets = getUtility(ISockets)
    sess = evt.session
    if 'bot' in sockets.sockets and sess.hex in sockets.sockets['bot']:
        socket = sockets.sockets['bot'][sess.hex]
        socket.transport.write(json.dumps(dict(emit={'auth-goodbye': ''})))


@adapter(SessionCreatedEvent)
def agents_session_created(evt):
    sockets = getUtility(ISockets)
    sess = evt.session
    resource = sess.jid.split('/')[1]
    if sess.session_type == 'bit.bot.base:agents':
        if 'bot' in sockets.sockets and resource in sockets.sockets['bot']:
            socket = sockets.sockets['bot'][resource]
            socket.transport.write(json.dumps(dict(emit={'show-content': 'agents-%s-%s'%(sess.hex,sess.password)})))


@adapter(SessionCreatedEvent)
def stfw_session_created(evt):
    sockets = getUtility(ISockets)
    sess = evt.session
    resource = sess.jid.split('/')[1]
    if sess.session_type == 'bit.bot.base:stfw':
        if 'bot' in sockets.sockets and resource in sockets.sockets['bot']:
            socket = sockets.sockets['bot'][resource]
            socket.transport.write(json.dumps(dict(emit={'show-content': 'stfw-%s-%s'%(sess.hex,sess.password)})))

@adapter(SessionCreatedEvent)
def sessions_session_created(evt):
    sockets = getUtility(ISockets)
    sess = evt.session
    resource = sess.jid.split('/')[1]
    if sess.session_type == 'bit.bot.base:sessions':
        if 'bot' in sockets.sockets and resource in sockets.sockets['bot']:
            def _flattened(_sessions):                
                socket = sockets.sockets['bot'][resource]
                socket.transport.write(json.dumps(dict(emit={'show-content': 'sessions-%s-%s'%(sess.hex,sess.password)}
                                                       ,bit=dict(person=dict(sessions=[y for x,y in _sessions])))))

            def _gotSession(_sessions):
                _out = []
                for _session in _sessions:
                    _out.append(IFlatten(_session).flatten())
                return defer.DeferredList(_out).addCallback(_flattened)

            getUtility(ISessions).sessions(jid=sess.jid).addCallback(_gotSession)

