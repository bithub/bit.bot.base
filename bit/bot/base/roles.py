from zope.interface import implements
from zope.component import getUtility

from bit.bot.common.interfaces import IRoles, IMembers
from bit.core.interfaces import IConfiguration


def _asker(jid):
    # this is very bad! - we should check against my bot's jid domain!
    if 'rooms' in jid:
        askerid = (jid.split('/')[-1])
    else:
        askerid = (jid.split('@')[0])
    return askerid


def roles(*role_list):

    roles = getUtility(IRoles)
    members = getUtility(IMembers)
    config = getUtility(IConfiguration)
    jid_domain = config.get('bot', 'domain')

    def check_roles(func):
        def wrapped(*la, **kwa):
            def _gotRoles(roles, role_list):
                has_role = False
                for role in role_list:
                    if role in roles:
                        has_role = True
                        break
                if has_role:
                    return func(*la, **kwa)
                else:
                    la[0].speak(
                        la[2], "i'm sorry i can't answer that for you",
                        la[0]._asker(la[2]))

            def _gotMember(member, role_list):
                return roles.member_roles(
                    member).addCallback(_gotRoles, role_list)

            # this is still pretty bad
            if jid_domain in la[2]:
                return members.member(
                    la[0]._asker(la[2])).addCallback(_gotMember, role_list)
        return wrapped
    return check_roles


class RoleProvider(object):

    implements(IRoles)

    def __init__(self, context):
        self.config = getUtility(IConfiguration)

    def member_roles(self, member):
        def _gotGroups(groups):
            groups = ['@%s' % group.id for group in groups]
            config = self.config
            roles = config.get('roles')
            _roles = set()
            for roleid in roles:
                role = config.get('roles', roleid)
                if not isinstance(role, list):
                    role = [role]
                for users_and_groups in role:
                    if (users_and_groups in groups)\
                    or (users_and_groups == member.id):
                        _roles.add(roleid)
            return _roles

        groups = member.groups
        groups.addCallback(_gotGroups)
        return groups
