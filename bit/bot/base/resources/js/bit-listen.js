
(function( $ ) {  	

    var ListenerContent = function(ctx,contentid,password){
	this.init(ctx);
	var $this = this;
	this.klass = 'listener-content'	
	this.params['contentid'] = contentid
	this.params['password'] = password
	this.kontent = 'Configure listeners'
    };
    ListenerContent.prototype = $.bit('widget')
    
    var BitListener = function(){
	this.activity = 'bot'
	this.plugin = 'listener'
	this.load_activity = function(ctx,session,token)
	{
	    return new ListenerContent(ctx,session,token);
	}	    
	return this;
    };
    BitListener.prototype = $.bit('plugin');
    $.bit('plugins').register_plugins({'bit.bot.listener':new BitListener().init()})
})( jQuery );
