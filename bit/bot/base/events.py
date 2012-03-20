

class BotRespondsEvent(object):

    def __init__(self, bot):
        self.bot = bot

    def update(self, sessionID, response):
        self.session_id = sessionID
        self.message = response
        return self


class PersonSpeaksEvent(object):

    def __init__(self, bot):
        self.bot = bot

    def update(self, sessionID, response):
        self.session_id = sessionID
        self.message = response
        return self
