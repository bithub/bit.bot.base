
(function( $ ) {  	

    var StfwContent = function(ctx,contentid,password){
	this.init(ctx);
	var $this = this;
	this.klass = 'stfw-content'	
	this.params['contentid'] = contentid
	this.params['password'] = password
	this.kontent = 'Search the web'
    };
    StfwContent.prototype = $.bit('widget')
    
    var BitStfw = function(){
	this.activity = 'bot'
	this.plugin = 'stfw'
	this.load_activity = function(ctx,session,token)
	{
	    return new StfwContent(ctx,session,token);
	}	    
	return this;
    };
    BitStfw.prototype = $.bit('plugin');
    $.bit('plugins').register_plugins({'bit.bot.stfw':new BitStfw().init()})
})( jQuery );
