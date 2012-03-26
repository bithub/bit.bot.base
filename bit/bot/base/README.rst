bit.bot.base
============

    >>> import bit.core

Lets start by creating a configuration for our app    

    >>> test_configuration = """
    ... [bit]
    ... name = testapp
    ... plugins = bit.bot.base
    ... """


We can use makeServiceFromString to load the plugins specified above

    >>> service_collection = bit.bot.base.tap.makeServiceFromString(test_configuration)


This returns a service_collection

    >>> service_collection
    <twisted.application.service.MultiService ...>


Making the service has made our application available

    >>> import zope.component
    >>> app = zope.component.getUtility(bit.core.interfaces.IApplication)

    >>> app
    <twisted.python.components.Componentized instance ...>



