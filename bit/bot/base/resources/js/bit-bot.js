(function( $ ) {  	

    var BotIcon = function(ctx){
	this.init(ctx);
	var $this = this;
	this.params['src'] = "/images/curate-icon.jpg"
    };
    BotIcon.prototype = $.bit('image')

    var UserIcon = function(ctx){
	this.init(ctx);
	var $this = this;
	this.params['src'] = "/images/person.png"
    };
    UserIcon.prototype = $.bit('image')

    var BotSpeakButton = function(ctx){
	this.init(ctx);
	var $this = this;
	this.model = {'image':{child:  function(){return new BotIcon(ctx)}}}
	this.after_add = function()
	{	    
	    $this.element.click(function(evt)
				{
				    evt.preventDefault();
				    ctx.signal('emit', 'toggle-panel', 'west')
				})
	}
    };
    BotSpeakButton.prototype = $.bit('button')

    var BotListenButton = function(ctx){
	this.init(ctx);
	var $this = this;
	this.model = {'image':{child:  function()
			       {
				   var icon = new BotIcon(ctx)
				   icon.params['src'] = '/images/trinity-button-icon.png'
				   return icon
			       }}}
	this.after_add = function()
	{	    
	    $this.element.click(function(evt)
				{
				    evt.preventDefault();
				    ctx.signal('emit', 'toggle-panel', 'east')
				})
	}
    };
    BotListenButton.prototype = $.bit('button')



    var BotSpeakInput = function(ctx,type){
	this.init(ctx);
	var $this = this;
	if (type == 'text')
	    this.params['title'] = 'speak here';
	    this.params['content_'] = 'speak here';
	if (type == 'password')
	    this.params['title'] = '';
	    this.params['content_'] = '';
	
	this.params['type'] = type;
	this.after_add = function()
	{	    
	    if (type == 'text')
		$this.hint($this.element)
	    $this.element.keypress(function(evt)
				   {
				       if (evt.keyCode == 13)
				       {
					   evt.preventDefault();
					   if (type == 'text')
					       ctx.signal('emit', 'speak', $this.element.val());
					   else
					       ctx.signal('emit', 'speak-password', $this.element.val());
					   $this.element.val('');
				       }
				   })
	}
    };
    BotSpeakInput.prototype = $.bit('input')


    var BotSpeakForm = function(ctx){
	this.init(ctx);
	var $this = this;
	this.params['content_'] = 'speak here';
	this.model = {'speak-input':{child:  function(){return new BotSpeakInput(ctx,'text')}}
		      ,'speak-password':{child:  function(){return new BotSpeakInput(ctx,'password')}}};
	this.after_add = function()
	{
	    console.log($this.kids['speak-input']);
	    $this.kids['speak-password'].hide()
	}
	ctx.signal('listen','ask-password', function()
		   {
		       $this.kids['speak-input'].hide()
		       $this.kids['speak-password'].show()		       
		       $this.kids['speak-password'].element.focus()
		   })
	ctx.signal('listen','speak-password', function()
		   {
		       $this.kids['speak-input'].show()
		       $this.kids['speak-password'].hide()
		       $this.kids['speak-input'].element.focus()
		   })
    };
    BotSpeakForm.prototype = $.bit('form')


    var BotButtonImage = function(ctx){
	this.init(ctx);
	var $this = this;
	this.params['src'] = "/images/curate.jpg"
    };
    BotButtonImage.prototype = $.bit('image')

    var BotButton = function(ctx){
	this.init(ctx);
	var $this = this;
	this.model = {'image':{child:  function(){return new BotButtonImage(ctx)}}}
    };
    BotButton.prototype = $.bit('button')


    var BotContent = function(ctx,contentid){
	this.init(ctx);
	var $this = this;
	this.params['content_'] = contentid
	this.params['class_'] = 'bot-content'
	//this.ctx.data('active').widgets['bit.bot.shell'] = year+':'+month
	
    };
    BotContent.prototype = $.bit('widget')


    var Bot = function(ctx){
	this.init(ctx);
	var $this = this;
	this.model = {'bot-button':{child:  function(){return new BotButton(ctx)}}}
	ctx.signal('listen', 'close-sessions', function(resp)
		   {		       
		       for (var kid in $this.kids)
		       {
			   if (kid != 'bot-button')
			       $this.destroy(kid)
		       }
		   })
	ctx.signal('listen', 'show-content', function(resp)
		   {
		       $this.kids['bot-button'].hide();
		       ctx.signal('emit','show-plugin',[$this,resp]);
		   })
    };
    Bot.prototype = $.bit('widget')


    var BotBrain = function(ctx){
	this.init(ctx);
	var $this = this;
	this.model = {'bot-speak-button':{child:  function(){return new BotSpeakButton(ctx)}}
		      ,'bot-speak-form':{child:  function(){return new BotSpeakForm(ctx)}}
		      ,'bot-listen-button':{child:  function(){return new BotListenButton(ctx)}}}
	
	//this.ctx.data('active').widgets['bit.bot.shell'] = year+':'+month
    };
    BotBrain.prototype = $.bit('widget')

    var BotChatSpeaker = function(ctx,name){
	this.init(ctx);
	var $this = this;
	if (name == 'bot')
	    this.model = {'speaker-icon':{child:  function(){
		var icon =  new BotIcon(ctx)
		icon.params['src'] = '/images/curate-icon-small.png'
		return icon;
	    }}}
	else if (name == 'user')
	    this.model = {'speaker-icon':{child:  function() {
		var icon = new BotIcon(ctx)
		var active = ctx.data('active')
		if (active.person)
		    icon.params['src'] = '/images/trinity-person.png'		    
		else
		    icon.params['src'] = '/images/person.png'
		return icon
	    }}}
	//this.ctx.data('active').widgets['bit.bot.shell'] = year+':'+month
    };
    BotChatSpeaker.prototype = $.bit('widget')

    var BotChatResponseLine = function(ctx,msg){
	this.init(ctx);
	var $this = this;
	function text_to_link(text)
	{
	    var exp = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;
	    return text.replace(exp,"<a href='$1' target='_blank'>$1</a>");
	}
	this.params['content_'] = text_to_link(msg);
    };
    BotChatResponseLine.prototype = $.bit('widget')

    var BotChatResponseSpeech = function(ctx,speaker,msg){
	this.init(ctx);
	var $this = this;
	var lines = msg.split('\n');
	this.params['class_'] = 'speech-bubble'
	this.model = {};
	this.model['speaker'] = {child:  function(_line){return new BotChatSpeaker(ctx,speaker)}
					    ,args: [lines[line]]}
	for (var line in lines)
	{
	    this.model['bot-line-'+line] = {child:  function(_line){return new BotChatResponseLine(ctx,_line)}
					    ,args: [lines[line],]}
	}

    };
    BotChatResponseSpeech.prototype = $.bit('widget')

    var BotChatResponseSpeechTail = function(ctx){
	this.init(ctx);
	var $this = this;
    };
    BotChatResponseSpeechTail.prototype = $.bit('widget')

    var BotChatResponse = function(ctx,speaker,msg){
	this.init(ctx);
	var $this = this;
	var lines = msg.split('\n');
	this.params['class_'] = 'say-'+speaker
	this.model = {}
	if (speaker=='bot')
	    this.model['response-speech-tail-bot'] = {child:  function(){return new BotChatResponseSpeechTail(ctx)}}
	this.model['response-speech'] = {child:  function(){return new BotChatResponseSpeech(ctx,speaker,msg)}}
	if (speaker=='user')
	    this.model['response-speech-tail-person'] = {child:  function(){return new BotChatResponseSpeechTail(ctx)}}
    };
    BotChatResponse.prototype = $.bit('list_item')


    var BotChat = function(ctx){
	this.init(ctx);
	var $this = this;
	var i = 0;
	ctx.signal('listen', 'close-sessions', function(resp)
		   {		       
		       for (var kid in $this.kids)
		       {
			   $this.destroy(kid)
		       }
		   })

	ctx.signal('listen', 'speak', function(resp)
		   {
		       ctx.signal('emit', 'open-panel', 'west')
		       $this.add('response-'+i
				 , new BotChatResponse(ctx,'user',resp)
				 , $this.element
				 , null
				 , 0
				)

		   })


	ctx.signal('listen', 'respond', function(resp)
		   {
		       if (!resp) return
		       if (resp == 'What is your password?')
			   ctx.signal('emit', 'ask-password')			   
		       ctx.signal('emit', 'open-panel', 'west')
		       $this.add('response-'+i
				 , new BotChatResponse(ctx,'bot',resp)
				 , $this.element
				 , null
				 , 0
				)

		   })


    };
    BotChat.prototype = $.bit('list')

    var BotEarLeft = function(ctx){
	this.init(ctx);
	var $this = this;
	this.model = {'bot-chat':{child:  function(){return new BotChat(ctx)}}}
	//this.ctx.data('active').widgets['bit.bot.shell'] = year+':'+month
    };
    BotEarLeft.prototype = $.bit('widget')

    var BotEarRight = function(ctx){
	this.init(ctx);
	var $this = this;
	//this.model = {'bot-chat':{child:  function(){return new BotChat(ctx)}}}
    };
    BotEarRight.prototype = $.bit('widget')
   	
    var PanelBot = function(ctx){
	this.init(ctx);
	var $this = this;
	this.model = {'bot':{child:  function(){return new Bot(ctx)}}}
    };
    PanelBot.prototype = $.bit('panel')

    var PanelBotBrain = function(ctx){
	this.init(ctx);
	var $this = this;
	this.model = {'bot-brain':{child:  function(){return new BotBrain(ctx)}}}
    };
    PanelBotBrain.prototype = $.bit('panel')

    var PanelBotEarLeft = function(ctx){
	this.init(ctx);
	var $this = this;
	this.model = {'bot-mini':{child:  function(){return new BotEarLeft(ctx)}}}
    };
    PanelBotEarLeft.prototype = $.bit('panel')

    var PanelBotEarRight = function(ctx){
	this.init(ctx);
	var $this = this;
	this.model = {'bot-right':{child:  function(){return new BotEarRight(ctx)}}}
    };
    PanelBotEarRight.prototype = $.bit('panel')

    var BitBotBase = {
	init: function(option)
	{
	    return this;
	},
	activity: 'bot',
	plugin: 'base',
	template_url: '/jplates/jtk-elements.html',
	templates: {},
//	templates: {'http://localhost:8080/bitonomy/jtk-elements.html':['jtk-panel','jtk-widget','jtk-title'
//									, 'jtk-list', 'jtk-list-item', 'jtk-link'
//									,'jtk-button', 'jtk-image']},    

	renderCenter: function(ctx,element,cb)
	{

	    if (!element.has_child('bot'))
	    {		
		//console.log('adding center panel')
		var cbelement = function(res)
		{
		    console.log('added center panel')
		    if (cb) cb()		    
		}		
		element.add('bot-panel'
			,new PanelBot(ctx)
			,element.element, cbelement)
	    } else
		element.kids['bot'].update()
	    
	},

	renderTop: function(ctx,element,cb)
	{
	    if (!element.has_child('bot-brain'))
	    {		
		//console.log('adding top panel')
		var cbelement = function(res)
		{
		    //console.log('added top panel')
		    if (cb) cb()
		}		
		element.add('bot-brain'
			,new PanelBotBrain(ctx)
			,element.element, cbelement)
	    } else
		element.kids['bot-brain'].update()
	    

	},

	renderLeft: function(ctx,element,cb)
	{
	    if (!element.has_child('bot-ear-left'))
	    {		
		//console.log('adding top panel')
		var cbelement = function(res)
		{
		    //console.log('added top panel')
		    if (cb) cb()
		}		
		element.add('bot-ear-left'
			,new PanelBotEarLeft(ctx)
			,element.element, cbelement)
	    } else
		element.kids['bot-ear-left'].update()	    

	},

	renderBottom: function(ctx,element,cb)
	{
	    if (!element.has_child('bot-brain'))
	    {		
		//console.log('adding top panel')
		var cbelement = function(res)
		{
		    //console.log('added top panel')
		    if (cb) cb()
		}		
		element.add('bot-brain'
			,new PanelBotBrain(ctx)
			,element.element, cbelement)
	    } else
		element.kids['bot-brain'].update()
	 
	},

	renderRight: function(ctx,element,cb)
	{
	    if (!element.has_child('bot-ear-right'))
	    {		
		//console.log('adding top panel')
		var cbelement = function(res)
		{
		    //console.log('added top panel')
		    if (cb) cb()
		}		
		element.add('bot-ear-right'
			,new PanelBotEarRight(ctx)
			,element.element, cbelement)
	    } else
		element.kids['bot-ear-right'].update()	    
	},

	updateFrame: function(ctx,cb)
	{
	    var content = ctx.data('frame').kids['content-panel']
	    //console.log(cb)
	    var _cb = function()
	    {
		counter--;
		if (counter == 0)
		{
		    console.log('frame panels loaded')
		    if (cb) cb()
		}
	    }
	    var counter=4
	    var sides = {north:this.renderTop,west:this.renderLeft,center:this.renderCenter,east:this.renderRight,south:this.renderBottom}
	    for (var side in sides)
	    {
		try
		{
		    sides[side](ctx,content.kids['ui-layout-'+side],_cb)
		}
		catch(err)
		{
		    console.log(err)	
		}
	    }
	},

	loadFrame: function(ctx)
	{
	    //this.updateFrame(ctx);
	},

	loadPlugin: function(ctx,cb)
	{
	    //console.log('adfasdf')
	    //$.jplates(this.templates, function()
	    //{
//			  if (cb) cb();//
	//	      })
	},

	renderFrame: function(ctx,cb) 
	{
	    //console.log('loading bitonomy HTML');
	    var $this = this;
	    var counter = 5;
	    var panelsLoaded = function(panel)
	    {
		counter--;
		if (counter == 0)
		{
		    var layout = panel.parent.element.layout({ slidable: true
							       ,closable: true
							       ,west__resizable: false
							       ,west__togglerLength_open: 0
							       ,west__togglerLength_closed: 0
							       ,west__spacing_open: 0
							       ,west__spacing_closed: 0

							       ,north__resizable: false
							       ,north__closable: false
							       ,north__initClosed: false
							       ,north__togglerLength_open: 0
							       ,north__spacing_open: 0
							       ,north__spacing_closed: 0

							       ,east__resizable: false
							       ,east__initClosed: true
							       ,east__togglerLength_open: 0
							       ,east__spacing_open: 0
							       ,east__spacing_closed: 0

							       ,south__resizable: false
							       ,south__closable: true
							       ,south__initClosed: false
							       ,south__togglerLength_open: 200
							       ,south__togglerLength_closed: 200
							       ,south__spacing_open: 2
							       ,south__spacing_closed: 5
							       ,initClosed: true})
		    layout.sizePane('north', 36)
		    layout.sizePane('south', 36)
		    layout.sizePane('west',  350)
		    layout.sizePane('east',  350)
		    if (cb) cb()
		    ctx.signal('listen', 'close-panel',function(resp)
			       {
				   layout.close(resp);
			       })

		    ctx.signal('listen', 'open-panel',function(resp)
			       {
				   layout.open(resp);
			       })

		    ctx.signal('listen', 'toggle-panel',function(resp)
			       {
				   console.log('toggle '+resp)
				   layout.toggle(resp);
			       })
		}
	    }
	    
	    var loadPanels = function(panel)
	    {
		var sides = ['north','east','center','west','south'];
		for (var p in sides)
		{
			panel.add('ui-layout-'+sides[p]
				  ,$.bit('panel').init(ctx)
				  ,panel.element
				  ,panelsLoaded)
		}
	    }		   
	    var loadContent = function(frame)
	    {
		var panel = 
		frame.add('content-panel'
			  ,$.bit('panel').init(ctx)
			  ,frame.element
			  ,loadPanels);
	    }
	    $.bit('frame').attach(ctx,'bitFrame',loadContent);				
	    return this;
	},
	
	updatePlugin: function(ctx,cb)
	{
	    console.log('updating plugin: bit.'+this.activity+'.'+this.plugin);
	    var bit = ctx.data('bit');	    
	    var frame = ctx.data('frame');	    
	    var active = ctx.data('active');

	    ctx.signal('listen', 'auth-successful', function(resp)
		       {
			   console.log('auth successful: '+resp)
			   active.person = {}
			   active.person.jid = resp
			   var _active = ctx.data('active');
			   console.log(_active)
		       })
	    ctx.signal('listen', 'auth-goodbye', function(resp)
		       {
			   active.person = null;
			   ctx.signal('emit', 'close-sessions', '');
		       })


	    var pluginid = this.plugin;
	    var activity = this.activity;
	    var counter = 0;
	    var complete = function()
	    {
		counter--;	
		if (counter == 0)
		{
		    //console.log('finished updating plugin '+pluginid)
		    //console.log(counter)
		    if (cb) cb()					
		}
	    };
	    
	},
    };

    $.bit('plugins').register_plugins({'bit.bot.base':BitBotBase.init()})
    
})( jQuery );










