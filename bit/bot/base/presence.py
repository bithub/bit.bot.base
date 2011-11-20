

from wokkel import xmppim

class BitBotPresence(xmppim.PresenceClientProtocol):

    def __init__(self, streamhost):
        xmppim.PresenceClientProtocol.__init__(self)
        self.streamhost = streamhost
        self.friends_online = set([])

    def connectionInitialized(self):
        xmppim.PresenceClientProtocol.connectionInitialized(self)
        print 'init roster'
        #self.available(statuses={None: "Just ask me!"})
        self.available()

    def subscribeReceived(self, entity):
        print 'got subscribe', entity
        self.subscribed(entity)

    def subscribedReceived(self, entity):
        """
        Subscription approval confirmation was received.

        @param entity: entity from which the confirmation was received.
        @type entity: {JID}
        """
        print 'subscribed received'

    def unsubscribeReceived(self, entity):
        print 'got unsubscribed', entity
        self.unsubscribed(entity)
        self.unsubscribe(entity)
        
    def availableReceived(self, entity, show=None, statuses=None, priority=0):
        print 'got available'
        self.friends_online.add(entity)

    def unavailableReceived(self, entity, statuses=None):
        print 'unavailbale recieved'
        self.friends_online.remove(entity)

