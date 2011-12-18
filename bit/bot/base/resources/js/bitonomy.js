
(function( $ ) {
    var bit_methods =
	{
	    init: function(options) 
	    { 
		//console.log('starting bitonomy');		
		if (!('bit' in this.data()))
		    this.data('bit',{});
		if (!('active' in this.data()))
		    this.data('active',{'content':{}});

		var plugins = $.bit('plugins').plugins()
		//nsole.log(plugins)
		var active = this.data('active');
		active.activity = 'event';
		active.plugin = 'booking';

		active.content = {'right': 'trading.account.exchanges'}
		active.widgets = {'trading.account.funds': 'mtgox:phlax2',
				 'trading.account.exchanges': 'mtgox:phlax2'}
		return this.bitonomy('load');
	    },

	    plugins: function()
	    {
		return $.bit('plugins').plugins()
	    },

	    load: function() 
	    { 
		//console.log('loading bitonomy');
		//this.bitonomy('loadTimer');
		var $this = this;
		this.bitonomy('loadActivities', function()
			      {
				  console.log('loading plugins')
				  $this.bitonomy('loadPlugins', function()
						 {
						     console.log('loading templates')
						     $this.bitonomy('loadTemplates', function()
								    {
									console.log('rendering frame')
									$this.bitonomy('renderFrame', function()
										       {
											   console.log('updating plugins')
											   $this.bitonomy('updatePlugins',function()
											   {
											       //$this.bitonomy('loadFrame', 'coin', 'trading');
											   })
										       })
								    })
						 });
			      });

		return this;
	    },

	    loadTimer: function() 
	    { 	    
		var tid = this.data('timer');
		//console.log('loading timer');
		var $this = this;
		if (!tid)
		{
		    tid = setInterval(function()
				      {
					  //console.log('update!');
					  //$this.bitonomy('updatePlugin','coin', 'trading');
					  //console.log('done!');
				      }, 5000)		    
		};
		return this;
	    },

	    fund: function(curr)
	    {
		return (curr/100000000).toFixed(8);
	    },



	    renderContentLeft: function()
	    {		
		var plugins = $.bit('plugins');
		var activity = this.data('active').activity;
		var plugin = this.data('active').plugin;
		plugins['bit.'+activity+'.'+plugin].renderLeft(this,this.find('.bitonomyContentLeft'));
		return this;
	    },

	    renderContentRight: function()
	    {		
		var plugins = $.bit('plugins').plugins();
		var activity = this.data('active').activity;
		var plugin = this.data('active').plugin;
		plugins['bit.'+activity+'.'+plugin].renderRight(this,this.find('.bitonomyContentRight'));
	    },


	    renderContentCenter: function()
	    {		
		var plugins = $.bit('plugins').plugins();
		var activity = this.data('active').activity;
		var plugin = this.data('active').plugin;
		var content = this.data('frame').children['content-panel']
		plugins['bit.'+activity+'.'+plugin].renderCenter(this,content.children['ui-layout-center'])
	    },


	    renderContentTop: function()
	    {		
		var plugins = $.bit('plugins').plugins();
		var activity = this.data('active').activity;
		var plugin = this.data('active').plugin;
		plugins['bit.'+activity+'.'+plugin].renderTop(this,this.find('.bitonomyContentTop'));
		return this;
	    },


	    updateLayout: function(area,layout)
	    {
		var active = this.data('active');
		var activity = active.activity;
		var plugin = active.plugin;
		this.data('active').content[area] = layout;
		this.bitonomy('renderContentCenter')
		return this;
	    },

	    updateWidget: function(widget,v)
	    {
		var active = this.data('active');
		var activity = active.activity;
		var plugin = active.plugin;
		//console.log('updating widget: '+widget+' '+v)
		this.data('active').widgets[widget] = v;
		return this
	    },

	    renderFrame: function(cb) 
	    {
		var active = this.data('active')
		var plugin = $.bit('plugins').plugins()['bit.'+active.activity+'.'+active.plugin];
		if (plugin)
		{
		    //console.log('loading plugin '+pluginid+' to frame')
		    plugin.renderFrame(this,cb);
		}
		return this
	    },

	    renderWidgets: function() { 
		//console.log('loading bitonomy widgets');
		return this;
	    },

	    loadActivities: function(cb) { 
		//console.log('loading bitonomy activities');
		$.ajax({
		    url: "http://localhost:8080",
		    dataType: "json",
		    type: "GET",
		    context: this,
		    success: function(msg){
			for (var res in msg['resources']) 
			{
			    var result = msg['resources'][res].split('.');
			    var activity = result[1]
			    var plugin = result[2]

			    if (!(activity == this.data('active').activity))
				continue

			    if (!(activity in this.data('bit')))				
				this.data('bit')[activity] = {};

			    if (!(plugin in this.data('bit')[activity]))				
				this.data('bit')[activity][plugin] = {};
			}
			if (cb) cb()
		    },
		})
		return this;
	    },


	    updateResource: function(activity,plugin,path,cb) { 		
		console.log('updating plugin resource: bit.'+activity+'.'+plugin+'.'+path);
		var bit = this.data('bit');

		var $this = this;
		var req = $.ajax({
		    url: "http://localhost:8080/"+activity+'/'+plugin+'/'+path,
		    dataType: "json",
		    type: "GET",
		    context: this,
		    success: function(msg){
			//console.log('receiving resource data'+activity+'.'+plugin+'.'+path);
			var plugin_data = bit[activity][plugin];
			var resource_data = plugin_data;
			//console.log(resource_data);					
			if (path.indexOf('/')!=-1)
			{
			    var parts = path.split('/');
			    for (var part in parts)
			    {
				if (!(parts[part] in resource_data))
				{
				    //console.log('adding node for plugin path '+parts[part])
				    resource_data[parts[part]] = {}
				}
				resource_data = resource_data[parts[part]];
			    }
			}
			else
			{
			    resource_data = plugin_data[path];
			}

			if (!('data' in resource_data))
			{
				resource_data['data'] = {};
			}
			for (var data in msg['data']) 
			{
			    if ('trades' == data)
			    {
				//console.log('adding resource:  bit.'+activity+'.'+plugin+'.'+path+'.'+data);
				//console.log(resource_data['data']);
				for (var t in resource_data['data']['trades'])
				{
				    //console.log(resource_data['data']['trades'][t])
				}

			    }


			    if (!(data in resource_data['data']))
			    {
				//console.log('adding node for plugin path data'+parts[part]+data)
				resource_data['data'][data] = {};
			    }
			    //if (data != 'trades')
			   // {
				//console.log('updating data: '+data)
				//console.log(resource_data['data']['trades'])
			//	console.log(msg['data']['trades'])
			 //   }
			    resource_data['data'][data] = msg['data'][data];
			}	
			var counter = 0;			    
			var complete = function()
			{
			    counter--;
			    //console.log('finished updating plugin resource: bit.'+activity+'.'+plugin+'.'+path);
			    if (counter == 0)
			    {
				if (cb) cb()					
			    }
			};

			for (var res in msg['resources']) 
			{			    
			    
			    if(!(res in resource_data))
			    {
				//console.log('adding node for plugin path data resource '+res)
				resource_data[res] = {};			    
			    }

			    resource_data = resource_data[res]
			    var resources = msg['resources'][res];
			    for (var resource in resources)
			    {				
				var resid = resources[resource]				
				if(!(resid in resource_data))
				{
				    //console.log('adding node for plugin path data resource '+resid)
				    resource_data[resid] = {};
				}
				counter++;
				this.bitonomy('updateResource',activity,plugin,path+'/'+res+'/'+resid, complete)
			    };
			}
			if (counter == 0)
			    if (cb) cb()
		    },
		})
		return this;
	    },


	    loadPlugin: function(activity, pluginid,cb) { 
		var plugin = $.bit('plugins').plugins()['bit.'+activity+'.'+pluginid];
		if ('loadPlugin' in plugin)
		{
		    plugin.loadPlugin(this,cb);
		}
		return this
	    },

	    loadTemplates: function(cb)
	    {
		var plugins = $.bit('plugins').plugins()
		var plugin_templates = {};
		for (var plugin in plugins)
		{

		    plugin_template_url = plugins[plugin].template_url		    
		    plugin_templates = plugins[plugin].templates
		    if (plugin_template_url && !(plugin_template_url in plugin_templates))
			plugin_templates[plugin_template_url] = []		    
		    //console.log(plugins[plugin])
		}		
		var load_plugin_templates = function()
		{
		    console.log('base templates loaded')
//		    $.jplates(plugin_templates, function()
//			      {
		    //console.log('plugin templates loaded')
		    if (cb) cb();
//			      })/
		}
		$.jtk('load',load_plugin_templates)
	    },

	    updatePlugin: function(activity, pluginid,cb) { 		
		var plugin = $.bit('plugins').plugins()['bit.'+activity+'.'+pluginid];
		var $this = this;
		if (plugin)
		{
		    var plugincb = function(){
			cb()
		    }
		    plugin.updatePlugin(this,plugincb);
		}
		return this
	    },

	    /* load the active plugin */
	    loadFrame: function(activity, pluginid) { 		
		var plugin = $.bit('plugins').plugins()['bit.'+activity+'.'+pluginid];
		if (plugin)
		{
		    console.log('loading plugin '+pluginid+' to frame')
		    //plugin.loadFrame(this);
		}
		return this
	    },


	    /* reload the active plugin */
	    updateFrame: function(activity, pluginid) { 		
		var plugin = $.bit('plugins').plugins()['bit.'+activity+'.'+pluginid];
		if (plugin)
		{
		    console.log('loading plugin '+pluginid+' to frame')
		    plugin.updateFrame(this);
		}
		return this
	    },

	    
	    updateResourceData: function(activity,plugin,path) { 		
		var bit = this.data('bit');
		var plugin_data = bit[activity][plugin];
		var resource_data = plugin_data;

		$.ajax({
		    url: "http://localhost:8080/"+activity+'/'+plugin+'/'+path,
		    dataType: "json",
		    type: "GET",
		    context: this,
		    success: function(msg){
									
			if (path.indexOf('/')!=-1)
			{
			    var parts = path.split('/');
			    for (var part in parts)
			    {
				
				if (part == parts.length -1 )
				{
				    if (!('data' in resource_data))
				    {
					//console.log('adding node '+parts[part]);
					resource_data['data'] = {};
				    }
				    resource_data = resource_data['data'];
				    resid = parts[part];
				}
				else
				{
				    if (!(parts[part] in resource_data))
				    {
					//console.log('adding node '+parts[part]);
					resource_data[parts[part]] = {}
				    }
				    resource_data = resource_data[parts[part]];				
				}	
			    }
			}
			else
			{
			    resource_data = plugin_data;
			    resid = path;
			}

			//resource_data[resid] = msg;
		    },
		})	
		return this;
	    },

	    loadPlugins: function(cb) { 		
		//console.log('loading bitonomy plugins');
		var bit = this.data('bit');
		var $this = this;
		var counter = 0;
		this.signal();
		var active = this.data('active')
		var complete = function()
		{
		    counter--;		    
		    if (counter == 0)
		    {		
			// hack
			bit['event'] = {}
			bit['event']['booking'] = {}	
			$this.signal('listen', 'update-data',function(resp)
				     {
					 $this.bitonomy('updateFrame', active.activity, active.plugin)
				     });						
			if (cb) cb()
		    }					
		};
		//console.log(bit)

		for (var activity in bit)
		{
		    counter++;
		    var req = $.ajax({
			url: "http://localhost:8080/"+activity,
			dataType: "json",
			type: "GET",
			context: this,
			success: function(msg){
			    for (var res in msg['resources']) 
			    {
				var plugin = msg['resources'][res];
				//console.log('adding plugin:  bit.'+activity+'.'+plugin);
				if (!(plugin in bit[activity]))
				{
				    //console.log('adding node for plugin '+plugin)
				    bit[activity][plugin] = {};
				    this.bitonomy('loadPlugin',activity,plugin,complete);
				};				
			    }
			},
			error: function(msg){
			    console.log(msg)
			}

		    })	
		    req.done(complete);
		    req.fail(complete);		    
		}
		return this;
	    },

	    updatePlugins: function(cb) { 		
		var counter = 0;
		var $this = this
		var complete = function()
		{
		    counter--;
		    if (counter == 0)
		    {
			console.log('finished updating plugins')
			$this.signal('emit','update-data', 'foo')
			if (cb) cb()
		    }
		};
		
		var bit = this.data('bit')
		for (var activity in bit)
		{		    
		    for (var plugin in bit[activity])
		    {
			counter++
			this.bitonomy('updatePlugin',activity,plugin,complete);
		    }
		}
		return this;
	    }


	}

    $.fn.bitonomy = function(method) {
	if ( bit_methods[method] ) {
	    return bit_methods[ method ].apply( this, Array.prototype.slice.call( arguments, 1 ));
	} else if ( typeof method === 'object' || ! method ) {
	    return bit_methods.init.apply( this, arguments );
	} else {
	    $.error( 'Method ' +  method + ' does not exist on jQuery.bitonomy' );
	}    	
    };
})( jQuery );






