from twisted.application.service import ServiceMaker

Curate = ServiceMaker(
         "BitBot",
         "bit.bot.base.tap",
         "Bit Bot",
         "bit-bot"
     )
