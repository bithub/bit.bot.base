

from zope.interface import implements
from zope.component import getUtility
from zope.event import notify
from bit.bot.common.interfaces import ISessions, ISession, IData
from bit.bot.base import utils

import uuid

class SessionCreatedEvent(object):
    def __init__(self,session):
        self.session = session

class SessionDestroyedEvent(object):
    def __init__(self,session):
        self.session = session


class BitSession(object):
    implements(ISession)

    def __init__(self,jid=None,session_type=None,password=None,session_id=None):
        self._hex = session_id or uuid.uuid4().get_hex()
        self._password = password or utils.mkpasswd()
        self._jid = jid
        self._type = session_type

    @property
    def hex(self):
        return self._hex

    @property
    def session_type(self):
        return self._type

    @property
    def jid(self):
        return self._jid

    @property
    def password(self):
        """ otp password for session sharing """
        return self._password


class Sessions(object):
    implements(ISessions)
    
    _sessions = {}

    def destroy(self,session_id):
        def _destroyed(resp,sess):
            notify(SessionDestroyedEvent(sess))
            return resp
        
        def _gotSession(sess):
            return getUtility(IData).set('sessions',session_id,None).addCallback(_destroyed,sess)
        
        return self.session(session_id).addCallback(_gotSession)

    def sessions(self,session_type=None,jid=None):
        return self._sessions.keys()

    def session(self,session=None,jid=None,session_type=None,session_id=None):
        if session:
            def gotSession(resp):
                resp = resp[0]
                if not resp: return

                resp = resp[0]
                if session_type and not resp[1] == session_type:
                    return                
                if jid and not resp[2] == jid:
                    return
                return BitSession(resp[2],resp[1],resp[3],session_id=resp[0])
            return getUtility(IData).get('sessions',session).addCallback(gotSession)
        if not jid: return
        _session = BitSession(jid,session_type,session_id=session_id)
        def sessionAdded(resp):
            notify(SessionCreatedEvent(_session))
            return _session
        return getUtility(IData).set('sessions',_session.hex,dict(jid=_session.jid
                                                                  ,session_type=_session.session_type
                                                                  ,password=_session.password)).addCallback(sessionAdded)

        
