class BitSession(object):
    implements(ISession)

    def __init__(self,jid=None,session_type=None,password=None,session_id=None):
        self._hex = session_id or uuid.uuid4().get_hex()
        self._password = password or utils.mkpasswd()
        self._jid = jid
        self._type = session_type

    
    def hex(self,hex=None):
        if hex: self._hex = hex
        return self._hex
    hex = property(hex,hex)


    def session_type(self,type=None):
        if type: self._type = type
        return self._type
    session_type = property(session_type, session_type)

    def jid(self,jid=None):
        if jid: self._jid = jid
        return self._jid
    jid = property(jid,jid)

    def password(self,password=None):
        """ otp password for session sharing """
        if password: self._password = password
        return self._password
    password = property(password, password)
    
    def last(self,last=None):
        if last: self._last=last
        return self._last
    last = property(last, last)

    def expiry(self,expiry=None):
        if expiry: self._expiry=expiry
        return self._expiry
    expiry = property(expiry, expiry)

