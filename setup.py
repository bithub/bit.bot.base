from setuptools import setup, find_packages
import os

version = '0.0.9'

setup(name='bit.bot.base',
      version=version,
      description="Bit Bot",
      long_description=open(
        os.path.join('bit', 'bot', 'base', 'README.txt')).read() + "\n"
      + open(os.path.join("docs", "HISTORY.txt")).read(),
      classifiers=[
        "Programming Language :: Python",
        "Topic :: Software Development :: Libraries :: Python Modules",
        ],
      keywords='',
      author='Ryan Northey',
      author_email='ryan@3ca.org.uk',
      url='http://code.3ca.org.uk',
      license='GPL',
      packages=find_packages(exclude=['ez_setup']) + ['twisted.plugins'],
      package_data={'twisted.plugins': ['twisted/plugins/bitbot.py']},
      namespace_packages=['bit', 'bit.bot'],
      include_package_data=True,
      zip_safe=False,
      install_requires=[
          'setuptools',
          'zope.interface',
          'zope.configuration',
          'zope.component',
          'twisted',
      ],
      entry_points="""
      # -*- Entry points: -*-
      """,
      )
