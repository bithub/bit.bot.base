
from zope.interface import implements
from zope.component import getUtility

from twisted.internet import utils, defer

from bit.bot.common.interfaces import IMembers, ICurateBotProtocol, IAIMLMacro, IMUCBot, IConfiguration, ISockets, ISessions
from bit.bot.base.roles import roles
from bit.bot.base.sessions import SessionsChangedEvent

from bit.bot.base.ai import BitBotAIMacro

import json

class AuthPerson(BitBotAIMacro):
    implements(IAIMLMacro)
    def parse(self,elem,jid,kernel):
        personname,password = kernel.getPredicate(kernel._inputHistory,jid)[-2:]

        def isauth(result,jid):
            
            if result:
                sessions = getUtility(ISessions)
                session = jid.split('/')[1]
                

                def _gotOrphanedSessions(result,sess):
                    updates = []                    
                    for x in result:
                        session = x.hex
                        updates.append(getUtility(ISessions).update_session(session,dict(jid=sess.jid),jid=jid))
                    return defer.DeferredList(updates)
                    
                def _gotSession(sess):
                    getUtility(ISessions).sessions(jid=jid).addCallback(_gotOrphanedSessions,sess)
                    kernel.setPredicate('secure',"yes",sess.jid)
                    kernel.setPredicate('name',personname,sess.jid)
                    self.speak(sess.jid,'welcome %s' %personname)

                # fix this!
                person_jid = '%s@%s/%s' %(personname,'chat.3ca.org.uk',session)
                sessions.add_session(session_id=session,jid=person_jid,session_type='curate').addCallback(_gotSession)
        return getUtility(IMembers).auth(personname,password).addCallback(isauth,jid)


class PersonTrusted(BitBotAIMacro):
    implements(IAIMLMacro)
    def parse(self,elem,jid,kernel):
        personname,password = kernel.getPredicate(kernel._inputHistory,jid)[-2:]
        def isauth(result,jid):
            if result:
                sessions = getUtility(ISessions)
                session = jid.split('/')[1]
                def _gotSession(sess):
                    self.speak(sess.jid,'welcome %s' %personname)

                # fix this!
                person_jid = '%s@%s/%s' %(personname,'chat.3ca.org.uk',session)
                sessions.session(session_id=session,jid=person_jid,session_type='curate').addCallback(_gotSession)
        return getUtility(IMembers).auth(personname,password).addCallback(isauth,jid)



class UnauthPerson(BitBotAIMacro):
    implements(IAIMLMacro)
    def parse(self,elem,jid,kernel):
        def _sessionRemoved(resp,sess):
            if resp[0][1]['affected_rows'] > 0:
                self.speak(sess.jid,'goodbye')
        def _gotSession(sess):
            if sess:
                sessions.destroy(sess.hex).addCallback(_sessionRemoved,sess)
        sessions = getUtility(ISessions)
        members = getUtility(IMembers)
        session = jid.split('/')[1]        
        return sessions.session(session).addCallback(_gotSession)    

class IdentPerson(BitBotAIMacro):
    implements(IAIMLMacro)
    def parse(self,elem,jid,kernel):

        sessions = getUtility(ISessions)
        session = jid.split('/')[1]

        def _gotSession(sess):
            import pdb; pdb.set_trace()

        sessions.session(session).addCallback(_gotSession)
        

class ConfigureAgents(BitBotAIMacro):
    implements(IAIMLMacro)

    #@roles('view_desktop')
    def parse(self,elem,jid,kernel):
        def respond(session):
            sessions = getUtility(ISessions)
            sockets = getUtility(ISockets)
            self.speak(jid, 'http://curate.3ca.org.uk/desktop/%s' %session.hex)
            self.speak(jid, 'password: %s' %session.password)

        return getUtility(ISessions).add_session(jid=jid, session_type='bit.bot.base:agents').addCallback(respond)

class STFW(BitBotAIMacro):
    implements(IAIMLMacro)

    #@roles('view_desktop')
    def parse(self,elem,jid,kernel):
        def respond(session):
            sessions = getUtility(ISessions)
            sockets = getUtility(ISockets)
            self.speak(jid, 'http://curate.3ca.org.uk/desktop/%s' %session.hex)
            self.speak(jid, 'password: %s' %session.password)
        return getUtility(ISessions).add_session(jid=jid, session_type='bit.bot.base:stfw').addCallback(respond)


class PersonSessions(BitBotAIMacro):
    implements(IAIMLMacro)

    #@roles('view_desktop')
    def parse(self,elem,jid,kernel):
        def respond(session):
            sessions = getUtility(ISessions)
            sockets = getUtility(ISockets)
            self.speak(jid, 'http://curate.3ca.org.uk/desktop/%s' %session.hex)
            self.speak(jid, 'password: %s' %session.password)
        return getUtility(ISessions).add_session(jid=jid, session_type='bit.bot.base:sessions').addCallback(respond)

class PersonSession(BitBotAIMacro):
    implements(IAIMLMacro)
    """ give a person a session, using an existing one if available """
    
    #@roles('view_desktop')
    def parse(self,elem,jid,kernel):
        sessions = getUtility(ISessions)
        person,resource = jid.split('/')
        
        def _gotExisting(existing):
            for _session in existing:
                self.speak(jid,'http://curate.3ca.org.uk/%s'%_session.hex)
                return
            """ at this point give the user a new unauthenticated session """
            return getUtility(ISessions).add_session(jid=jid, session_type='bit.bot.base:agents').addCallback(respond)            

        def _gotSession(session):
            if session:
                self.speak(jid,'http://curate.3ca.org.uk/%s'%session.hex)
            else:
                """ get a session for the user """
                sessions.sessions(person=person,session_type='curate').addCallback(_gotExisting)
            
        # if person == 'anon@chat.3ca.org.uk': return defer.maybeDeferred(lambda: None)
 
        # lets check if this resource is a bot session        
        return sessions.session(resource).addCallback(_gotSession)        
