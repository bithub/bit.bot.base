
import json
from zope.component import adapter,getUtility

from bit.bot.common.interfaces import ISockets
from bit.bot.base.sessions import SessionCreatedEvent, SessionDestroyedEvent

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

