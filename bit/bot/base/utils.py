
from random import choice
import string

def mkpasswd():
    chars = string.letters + string.digits
    return ''.join([choice(chars) for i in range(8)])
