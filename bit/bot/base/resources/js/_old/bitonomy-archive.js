(function( $ ) {  	
	
    var PanelMarkets = function(ctx){
	this.init(ctx);
	this.template = 'panel-bit-markets'
	this.name = 'bitonomyMarkets'
	var $this = this;
	this.__proto_children__ = {'widget-markets':{selector: function(){return $this.element}
						     ,child:  function(){return new WidgetMarkets(ctx)}}}
    };
    PanelMarkets.prototype = $.bit('panel')

    var BitEventBooking = {
	init: function(option)
	{
	    return this;
	},
	activity: 'event',
	plugin: 'booking',
	template_url: 'http://localhost:8080/bitonomy/bitonomy-booking-elements.html',
	templates: {'http://localhost:8080/bitonomy/bitonomy-booking-elements.html':[]},

	renderCenter: function(ctx,content,cb)
	{
	    var active = ctx.data('active');
	    

	    var loader = ''
	    if (active.content.right == 'booking.account.exchanges')
	    {
		var loaderid = 'booking.account.exchanges'
		loader = PanelAccountExchanges;
	    }
	    else if (active.content.right == 'booking.account.funds')
	    {
		var loaderid = 'booking.account.funds'
		loader = PanelAccountFunds;
	    }
	    else 
	    {
		content.html('nothing to see here...');
		return
	    }

	    var widget_data = active.widgets[loaderid]

	    var panelid = loaderid+':'+widget_data

	    for (var child in content.children)
	    {
		if (child == panelid)
		{
		    content.children[child].update()
		    if (content.children[child].hidden())
			content.children[child].show()

		}
		else if (!content.children[child].hidden())
		    content.children[child].hide()
	    }
	    //console.log(content.has_child(panelid))
	    if (!content.has_child(panelid))
	    {		
		var cbcontent = function(res)
		{
		    if (cb) cb()
		}
		content.add(panelid
			    ,new loader(ctx)
			    ,content.element, cbcontent)
	    }
	},

	renderTop: function(ctx,top,cb)
	{
	    if (!top.has_child('panel-markets'))
	    {		
		var cbtop = function(res)
		{
		    if (cb) cb()
		}		
		top.add('panel-markets'
			    ,new PanelMarkets(ctx)
			,top.element, cbtop)
	    } else
		top.children['panel-markets'].update()
	},

	renderLeft: function(ctx,left,cb)
	{
	    if (!left.has_child('panel-market-accounts'))
	    {		
		var cbleft = function(res)
		{
		    if (cb) cb()
		    //console.log('finished adding left panel')
		}
		left.add('panel-market-accounts'
			 ,new PanelMarketAccounts(ctx)
			 ,left.element, cbleft)
	    }

	},

	renderBottom: function(ctx,bottom,cb)
	{
	    if (!bottom.has_child('panel-market-realtime'))
	    {		
		var cbbottom = function(res)
		{
		    if (cb) cb()
		    //console.log('finished adding bottom panel')
		}
		bottom.add('panel-market-realtime'
			 ,new PanelMarketRealtime(ctx)
			 ,bottom.element, cbbottom)
	    }

	},

	renderRight: function(ctx,content)
	{
	    new PanelMarketActivity(ctx).load(content);
	},

	updateFrame: function(ctx,cb)
	{
	    var content = ctx.data('frame').children['content-panel']
	    //console.log(cb)
	    var _cb = function()
	    {
		counter--;
		if (counter == 0)
		{
		    if (cb) cb()
		}
	    }
	    var counter=0
	    var sides = {north:this.renderTop,west:this.renderLeft,center:this.renderCenter,south:this.renderBottom}
	    for (var side in sides)
	    {
		try
		{
		    counter++;
		    sides[side](ctx,content.children['ui-layout-'+side],_cb)
		}
		catch(err)
		{
		    console.log(err)
	
		}
	    }
	},
	loadFrame: function(ctx)
	{
	    this.updateFrame(ctx);
	},

	loadPlugin: function(ctx,cb)
	{
	    $.jplates(this.templates, function()
		      {
			  if (cb) cb();
		      })
	},


	updatePlugin: function(ctx,cb)
	{
	    //console.log('updating plugin: bit.'+this.activity+'.'+this.plugin);
	    var bit = ctx.data('bit');	    
	    var frame = ctx.data('frame');	    
	    var pluginid = this.plugin;
	    var activity = this.activity;
	    if (!('markets' in bit[activity][pluginid]))
	    {
		//console.log('adding node for plugin '+pluginid+' markets')		
		bit[activity][pluginid]['markets'] = {}
	    }
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
	    
	    var req = $.ajax({
		url: "http://localhost:8080/"+this.activity+'/'+this.plugin,
		dataType: "json",
		type: "GET",
		context: ctx,
		success: function(msg) {
		    for (var mid in msg['resources']['markets']) 
		    {
			counter++;
			var market = msg['resources']['markets'][mid];
			//console.log('adding market:  bit.'+activity+'.'+pluginid+'.markets.'+market);
			if(!(market in bit[activity][pluginid]['markets']))
			    bit[activity][pluginid]['markets'][market] = {}
			this.bitonomy('updateResource',activity,pluginid,'markets/'+market,complete);
		    }
		},	
	    })
	},
    };

    $.bit('plugins').register_plugins({'bit.event.booking':BitEventBooking.init()})
    
})( jQuery );










