
import uuid

from zope.interface import implements
from zope.component import getUtility
from zope.event import notify

from twisted.internet import defer

from bit.bot.common.interfaces import ISessions, ISession, IData, IFlatten
from bit.bot.base import utils
from bit.bot.base.flat import Flattener

class SessionFlattener(Flattener):
    implements(IFlatten)
    def flatten(self):
        session = self.context
        keys = ['expiry', 'hex', 'jid', 'last', 'password', 'session_type']                
        _session = {}
        for k in keys:
            _session[k] = getattr(session,k)            
        return defer.maybeDeferred(lambda: _session)

class SessionsFlattener(Flattener):
    implements(IFlatten)
    def flatten(self):
        def _gotSessions(sessions):
            _sessions = {}                
            for session in sessions:
                _sessions[session.hex] = {}
                # make a session dict like!
                keys = ['expiry', 'hex', 'jid', 'last', 'password', 'session_type']                
                _sessions[session.hex] = {}
                for k in keys:
                    _sessions[session.hex][k] = getattr(session,k)
            return _sessions
        return getUtility(ISessions).sessions().addCallback(_gotSessions)

class SessionsChangedEvent(object):
    def __init__(self,sessions={}):
        self.sessions = sessions
            

class SessionCreatedEvent(object):
    def __init__(self,session):
        self.session = session

class SessionDestroyedEvent(object):
    def __init__(self,session):
        self.session = session

session_keys = ['id','session_type','jid','unix_timestamp(last+1)','expiry','password']

class Sessions(object):
    implements(ISessions)
    
    _sessions = {}

    def stamp(self,session_id):
        return getUtility(IData).stamp('sessions',session_id,'last')

    def destroy(self,session_id):
        def _destroyed(resp,sess):
            notify(SessionDestroyedEvent(sess))
            return resp
        
        def _gotSession(sess):
            return getUtility(IData).delete('sessions',session_id).addCallback(_destroyed,sess)
        
        return self.session(session_id).addCallback(_gotSession)

    def sessions(self,session_type=None,jid=None,person=None,parent_session=None):
        def _gotSessions(result):
            for session in result.results:
                yield ISession(session)
        kwa = {}
        if jid: kwa['jid'] = jid
        if session_type: kwa['session_type'] = session_type
        if parent_session: kwa['parent_session'] = parent_session
        if person: kwa['person'] = person
        return getUtility(IData).get('sessions',select=session_keys, **kwa).addCallback(_gotSessions)

    def update_session(self,session_id,updates,**kwa):
        if '/' in session_id:
            session_type,session_id = session_id.split('/')            
        def _sessionUpdated(result):
            notify(SessionsChangedEvent())
        return getUtility(IData).update('sessions',updates,**kwa).addCallback(_sessionUpdated)
                
    def session(self,session=None,jid=None,session_type=None,session_id=None):
        if not session: return self.add_session(jid=jid,session_type=session_type,session_id=session_id)
        def gotSession(resp):
            session = None
            for session in resp.results:
                break
            if not session: return

            if session_type and not session.result['session_type'] == session_type:
                return                
            if jid and not session.result['jid'] == jid:
                return
            return ISession(session)
        return getUtility(IData).get('sessions',session,select=session_keys).addCallback(gotSession)
                        
    def add_session(self,session_id=None,jid=None,session_type=None):
        if not jid: raise
        session_id = session_id or uuid.uuid4().get_hex()
        password = utils.mkpasswd() 
        def sessionAdded(resp):
            def _gotSession(sess,sessid):
                notify(SessionCreatedEvent(sess))
                return sess
            return self.session(session_id).addCallback(_gotSession,session_id)
        if jid: person,parent = jid.split('/')
        return getUtility(IData).add('sessions',session_id,**dict(jid=jid
                                                                  ,session_type=session_type
                                                                  ,person=person
                                                                  ,parent_session=parent
                                                                  ,password=password)).addCallback(sessionAdded)

        
