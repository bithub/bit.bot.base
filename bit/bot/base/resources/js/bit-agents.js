
(function( $ ) {  	

    var AgentsContent = function(ctx,contentid,password){
	this.init(ctx);
	var $this = this;
	this.klass = 'agents-content'	
	this.params['contentid'] = contentid
	this.params['password'] = password
	this.kontent = 'Configure agents'
    };
    AgentsContent.prototype = $.bit('widget')
    
    var BitAgents = function(){
	this.activity = 'bot'
	this.plugin = 'agents'
	this.load_activity = function(ctx,session,token)
	{
	    return new AgentsContent(ctx,session,token);
	}	    
	return this;
    };
    BitAgents.prototype = $.bit('plugin');
    $.bit('plugins').register_plugins({'bit.bot.agents':new BitAgents().init()})
})( jQuery );
