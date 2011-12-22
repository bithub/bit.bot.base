


(function( $ ) {  	



    var SessionsContent = function(ctx){
	this.init(ctx);
	var $this = this;
	this.klass = 'sessions'	
	var bit = ctx.data('bit')
	var title = $.bit('title').init(ctx);
	title.kontent = 'Sessions'
	title.subtype = 'h2'
	sesslist = $.bit('list').init(ctx)
	sesslist.klass = 'table'
	this.model['title'] = {child:  function(){return title}}
	this.model['session-list'] = {child:  function(){return sesslist }}
	this.added = function(){
	    ctx.signal('emit', 'subscribe', 'sessions-changed')
	    ctx.signal('listen', 'sessions-changed', function()
		       {
			   console.log(bit)
			   $this._update_sessions();
		       })	    	    	
	    $this._update_sessions();
	}
	this._update_sessions = function() {
	    var sessions = bit.person.sessions
	    for (var existing in $this.kids['session-list'].kids){
		if (!(existing in sessions))
		{
		    $this.kids['session-list'].destroy(existing)
		}
	    }

	    for (var session in sessions)
	    {
		if ($this.kids['session-list'].has_child(session)) continue
		var session_info = $.bit('list_item').init(ctx)
		session_info.klass = 'trow'
		var keys = ['hex','jid','last','expiry']
		session_info.added = function() {		
		    for (var _k in keys) {
			var k = keys[_k]
			var info = $.bit('label').init(ctx)
			info.klass = 'tcell'
			info.kontent = sessions[session][k]
			session_info.add(k
					 , info
					 , session_info.$
					)
		    }		    
		}
		$this.kids['session-list'].add(session
					       , session_info
					       , $this.kids['session-list'].element
					      )
	    }
	    
	}
    }
    SessionsContent.prototype = $.bit('widget')
    
    var BitSessions = function(){
	this.activity = 'bot'
	this.plugin = 'sessions'
	this.load_activity_menus = function(ctx,contentid,token)
	{
	    var menus = $.bit('menus').init(ctx);

	    var menu1 =  $.bit('menu').init(ctx);
	    menu1.title = 'Menu 1'

	    var menu2 =  $.bit('menu').init(ctx);
	    menu2.title = 'Menu 2'

	    var item1 =  $.bit('menu_item').init(ctx);
	    item1.title = 'Item 1'	    
	    var item2 =  $.bit('menu_item').init(ctx);
	    item2.title = 'Item 2'	    

	    var item3 =  $.bit('menu_item').init(ctx);
	    item3.title = 'Item 3'	    
	    var item4 =  $.bit('menu_item').init(ctx);
	    item4.title = 'Item 4'	    


	    menu1.items['item1'] = {child: function(){return item1}}
	    menu1.items['item2'] = {child: function(){return item2}}

	    menu2.items['item1'] = {child: function(){return item3}}
	    menu2.items['item2'] = {child: function(){return item4}}

	    menus.model['menu1'] = {child: function(){return menu1}}
	    menus.model['menu2'] = {child: function(){return menu2}}

	    return menus;
	}

	this.load_activity = function(ctx,session,token)
	{
	    return new SessionsContent(ctx,session,token);
	}	    
	return this;
    };
    BitSessions.prototype = $.bit('plugin');
    $.bit('plugins').register_plugins({'bit.bot.sessions':new BitSessions().init()})
})( jQuery );


