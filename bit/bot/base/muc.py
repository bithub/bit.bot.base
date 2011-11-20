


from twisted.words.protocols.jabber import jid


from wokkel import muc


class MUCBot(muc.MUCClient):
    def __init__(self, server,ai):
        muc.MUCClient.__init__(self)
        self.server   = server
        self.ai = ai
        self.room = 'office'
        self.nick = 'curate'
        self.room_jid = jid.internJID(self.room+'@'+self.server)
        self.last = {}
        self.activity = None
        self.timeout = 0

    def connectionInitialized(self):
        muc.MUCClient.connectionInitialized(self)
        self.join(self.room_jid, self.nick)
    _roomOccupantMap = {}

    def receivedGroupChat(self, room, user, message):
        if message.body.startswith(self.nick + u":"):
            nick, text = message.body.split(':', 1)
            text = text.strip().lower()
            mfrom = '%s/%s' %(room.roomJID.userhost(),user.nick)
            def _respond(response):
                if response:
                    self.groupChat(self.room_jid, '%s: %s'%(user.nick,response))
            self.ai.respond(text,mfrom).addCallback(_respond)

    def speak(self,jidstr,response,user=None):
        rjid = jid.internJID(jidstr.split('/')[0])
        if user:
            self.groupChat(rjid, '%s: %s'%(user,response))
        else:
            self.groupChat(rjid, response)            
                
