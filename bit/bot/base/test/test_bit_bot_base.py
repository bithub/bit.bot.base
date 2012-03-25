import doctest

from twisted.trial import runner


test_configuration = """
[bot]
name = testbot
plugins = bit.bot.base
"""


def setUp(self):
    pass


def test_suite():
    ts = runner.TestSuite()
    ts.name = "BitBotBase"
    ts.addTest(doctest.DocFileSuite(
            "../README.txt", setUp=setUp,
            optionflags=doctest.ELLIPSIS | doctest.NORMALIZE_WHITESPACE))
    return ts
