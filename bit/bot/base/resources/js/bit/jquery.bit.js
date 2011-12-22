

(function( $ ) 
 {
     var bit_url = function()
     {
	 try{
	     var active = this.ctx.data('active')
	 }catch(err){
	     console.log(this)
	 }
	 return $.bit('plugins').plugins()['bit.'+active.activity+'.'+active.plugin].template_url;
     }

     var bit_bit = function()
     {
	 return this.data('bit')
     }
     
     var plugin_cache = {}
     var PluginRegistry = function()
     {
	 this.register_plugins = function(plugins)
	 {
	     for (var plugin in plugins)
		 plugin_cache[plugin] = plugins[plugin]
	 }
	 this.plugins = function()
	 {
	     return plugin_cache
	 }

	 return this;
     }

     var Plugin = function() {
	 this.init = function(option) {
	     return this;
	 }
	 this.load_activity = function(option) {
	     return this;
	 }
	 this.load_activity_menus = function(option) {
	     return this;
	 }
	 this.load_activity_button = function(option) {
	    var button = {
		icon: '/images/activity.png'
		,title: 'Activity'
	    }
	    return button
	 }
	 return this
     }

     var bit_methods =
	 {
	     plugins: function()
	     {
		 return new PluginRegistry
	     },
	     plugin: function()
	     {
		 return new Plugin
	     }
	 }
     

     $.extend(
	 {
	     bit: function(method)
	     { 		 
		 if ( bit_methods[method] ) {
		     return bit_methods[ method ].apply( this, Array.prototype.slice.call( arguments, 1 ));
		 }
		 try {
		     var _jtk = $.jtk(method)
		     _jtk.getURL = bit_url
		     _jtk.bit = bit_bit;
		     return _jtk
		 } catch(err) { }
		 if ( typeof method === 'object' || ! method ) {
		     return bit_methods.init.apply( this, arguments );
		 } else {
		     $.error( 'Method ' +  method + ' does not exist on jQuery.bit' );
		 }    	
	     },

	 });
 })( jQuery );










