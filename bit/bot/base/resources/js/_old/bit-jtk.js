

(function( $ ) 
 {
     var bit_url = function()
     {
	 return this.ctx.data('plugins')['bit.coin.trading'].template_url;
     }
     
     var BitElement = function() 
     {

	 this.bit = function()
	 {
	     return this.ctx.data('bit')
	 }

	 this.frame = function()
	 {
	     return this.ctx.data('frame')
	 }

	 this.getURL = function()
	 {
	     return this.ctx.data('plugins')['bit.coin.trading'].template_url;
	 }
     }
     BitElement.prototype = $.jtk('element');    
     
     var BitPanel = function() 
     {
     }
     BitPanel.prototype = $.jtk('panel');    
     BitPanel.prototype.getURL = bit_url
     
     var BitWidget = function() 
     {
     }
     BitWidget.prototype = $.jtk('widget');
     BitWidget.prototype.getURL = bit_url
     
     var BitMacro = function() 
     {
     }
     BitMacro.prototype = $.jtk('macro');
     BitMacro.prototype.getURL = bit_url
     
     var MacroLinkedListItem = function (ctx,name)
     {
	 this.init(ctx);
	 //this.children = {}
	 //this.parent = {}
	 this.ctx = ctx;
	 this.template = 'macro-linked-list-item';
	 this.name = name;
	var $this = this;
	 this.update = function(title,href)
	 {
	     var la = $this.element.find('a');
	     la.html(title);
	     la.attr('href',href);	    
	 }
     }
     MacroLinkedListItem.prototype = new BitMacro;
     
     var MacroTabulatedList = function (ctx,keys,name,el,cb){
	 this.init(ctx);
	 //this.children = {}
	 //this.parent = {}
	 this.template = 'macro-tabulated-list';
	 this.templates = {}
	 this.templates[this.getURL()] = ['macro-tabulated-list-item', ]
	 this.name = name;
	 var $this = this;
	 this.update = function(items)
	 {
	     
	     var macro = $this.element;
	     var ooe = 'odd'
	     var existing_items = macro.find('li.item.trow');
	     
	     for(var i in items)
	     {
		 if (i > 10) break;
		 var res = items[i];
		 if (cb) res = cb(res)
		 
		 if (existing_items[i])
		 {
		     var list_item = $(existing_items[i]);
		 }
		 else
		 {
 		     var list_item = $.tmpl('macro-tabulated-list-item',{class_:ooe,keys: keys})
		    list_item.appendTo(macro)
		 }
		 
		 for (var k in keys)
		 {
		     var item_content = list_item.find('span.tcell.'+keys[k])
		     if (item_content.html() != res[keys[k]])
		     {
			 item_content.html(res[keys[k]]);			
			item_content.effect('highlight')
		     }
		 }
		 
		 if (ooe == 'odd') ooe = 'even';
		 else ooe = 'odd';
		 
	     }	    
	     return macro;
	 }
	 return this;
     };
     MacroTabulatedList.prototype = new BitMacro;
     
     

     var bit_methods =
	 {
	     frame: function(options) 
	     {
		 return new BitFrame;
	     },

	     element: function(options) 
	     {
		 return new BitElement;
	     },

	     panel: function(options) 
	     {
		 return new BitPanel;
	     },
	     
	     popup: function(options) 
	     {
		 return new BitPopup;
	     },

	     widget: function(options) 
	     {
		 return new BitWidget;
	     },

	     graph: function(options) 
	     {
		 return new BitGraph;
	     },

	     macro: function(options) 
	     {
		 return new BitMacro;
	     },

	     register_plugins: function(options)
	     {
		 
	     }
	 }
     

     $.extend(
	 {
	     bit: function(method)
	     { 
		 if ( bit_methods[method] ) {
		     return bit_methods[ method ].apply( this, Array.prototype.slice.call( arguments, 1 ));
		 } else if ( typeof method === 'object' || ! method ) {
		     return bit_methods.init.apply( this, arguments );
		 } else {
		     $.error( 'Method ' +  method + ' does not exist on jQuery.bit' );
		 }    	
	     },
	 });
     
     

})( jQuery );










