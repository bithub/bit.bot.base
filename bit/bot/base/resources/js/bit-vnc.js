
(function( $ ) {  	

    var VNCCanvas = function(ctx,contentid,password){
	this.init(ctx);
	var $this = this;
	this.params['class_'] = 'bot-canvas noVNC_canvas'
	this.params['height'] = '20px'
	this.params['width'] = '800px'

	this.initialized = false;

	this.initialized = false;

	this.after_add = function(resp)
	{
	    if ($this.initialized) return
	    $this.initialized = true;
	    $this.element.mouseout(function(evt){
		UI.rfb = rfb
		UI.displayBlur() 
	    })
	    $this.element.mouseover(function(evt){
		UI.rfb = rfb
		UI.displayFocus() 
	    })

	    function get_INCLUDE_URI() {
		return (typeof INCLUDE_URI !== "undefined") ? INCLUDE_URI : "/include/novnc/";
	    }

	    var extras = ['util.js', 'webutil.js', 'base64.js','websock.js','des.js','input.js','display.js','rfb.js']
	    var count = 0

	    function updateState(rfb, state, oldstate, msg) {
		var s, sb, cad, level;
		
		
	    }	    	    	    
	    host = 'curate.3ca.org.uk';	    
	    port = 8889;	    
	    var passwordRequired = function(rfb) {
		console.log('returning password!')
            }
	    var loadScript = function(href,cb)
	    {
		$.ajax({
		    type: "GET",
		    url: href,
		    dataType: "script",
		    error: function (XMLHttpRequest, textStatus, errorThrown) 
		    {
			if (cb) cb(0);
			console.log(errorThrown);
		    },
		    success:function(data,status,resp)
		    {
			setTimeout(function(){if (cb) cb(1)},3000);			
		    }
		    });  		 
	    }     		  
	    var loaded = function(res)
	    {
		count++;
		if (res != 0)
		{
		    if (extras[count] == 23)
		    {
			console.log('loading '+extras[count]);			
			loadScript(get_INCLUDE_URI() + extras[count],loaded)
		    } else {
			console.log('loading VNC canvas')
			console.log($this.element)
			console.log(ctx)
			rfb = new RFB({'target':       $this.element[0],
				       'encrypt':      false,
				       'true_color':   true,
				       'local_cursor': true,
				       'shared':       true,
				       'view_only':    false,
				       'updateState':  updateState,
				       'onPasswordRequired':  passwordRequired});			
			rfb.connect(host, port, 'x', '');    
		    }
		}
	    }
	    loaded(87)
	    //loadScript(get_INCLUDE_URI() + extras[0],loaded)	    
	}
	
    };
    VNCCanvas.prototype = $.bit('canvas')

    var VNCContent = function(ctx,contentid,password){
	this.init(ctx);
	var $this = this;
	this.params['class_'] = 'vnc-content'	
	this.params['contentid'] = contentid
	this.params['password'] = password
	this.model = {'vnc-canvas':{child:  function(){return new VNCCanvas(ctx,contentid,password)}}}
    };
    VNCContent.prototype = $.bit('widget')
    
    var BitBotVnc = {
	init: function(option)
	{
	    return this;
	},

	load: function(ctx)
	{
	    ctx.signal()
	    ctx.signal('listen', 'show-plugin', function(resp)
		       {
			   console.log('loading vnc panel')
			   var widget = resp[0]
			   var contentid = resp[1].split('-')[1]
			   var password = resp[1].split('-')[2]
			   widget.add('content-'+contentid
				      , new VNCContent(ctx,contentid,password)
				      , widget.element
				      , null
				      , 0
				    )
		       })	    
	    return this;
	},
	activity: 'bot',
	plugin: 'vnc',
    };
    $.bit('plugins').register_plugins({'bit.bot.vnc':BitBotVnc.init()})
})( jQuery );
