
from twisted.internet import protocol


def getPort():
    return 8888


class TestFactory(protocol.Factory):
    pass
