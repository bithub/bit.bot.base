

(function( $ ) 
 {
     $.extend(
	 {
	     jplates: function(options,cb)
	     { 
		 var $this = $('body');
		 var widget_data = $this.data('__template_cache__')
		 if (!widget_data) $this.data('__template_cache__',{})
		 widget_data = $this.data('__template_cache__')		 
		 var urls = {};
		 var templates = {};
		 var counter = 0;		 
		 var loadTemplates = function(tids,html)
		 {
		     for (var _t in tids)
		     {
			 var t = tids[_t];
			 var temphtml = $(html).filter(function(){ return $(this).is('div.template#'+t) });
			 if(temphtml.length != 0)
			 {
			     console.log('adding template '+t);
			     $.template(t, temphtml.html());
			 } else
			 {
			     console.log('template not found: '+t+' in '+url);
			 }				    
		     }
		 }


		 for (var url in options)
		 {		    
		     if (url in widget_data)
		     {
			 console.log('adding from cache')
			 loadTemplates(options[url],widget_data[url])
		     } else
		     {
			 counter++;
			 var req = $.ajax({
			     url: url,
			     type: "GET",
			     success: function(msg){				 
				 widget_data[this.url] = msg		    
				 loadTemplates(options[this.url],msg);
			     },
			     error: function(msg){
				 console.log('loading template url '+url+' failed');
			     }
			 })
			 var complete = function()
			 {
			     counter--;		
			     if (counter == 0)
				 if (cb) cb()					
			 };
			 req.done(complete);
			 req.fail(complete);		    
		     };	    
		     if (counter == 0)
			 if (cb) cb()					
		 };
	     },
	 });
 })( jQuery );


$(document).ready(function() {
    var templates = {}
    turl1 = 'http://localhost:8080/bitonomy/demo-template.html'
    templates[turl1] = ['demo-widget','demo-widget-2', 'demo-widget-3']
    turl2 = 'http://localhost:8080/bitonomy/demo-template-2.html'
    templates[turl2] = ['demo-2-widget',]
    $.jplates(templates, function()
	     {		   
		 console.log('rendering');
		 $.tmpl('demo-widget',{'who':'foo'}).appendTo($('#bitonomy'));
		 $.tmpl('demo-widget-2',{'foo':'widget'}).appendTo($('#bitonomy'));

		 var templates2 = {}
		 turl1 = 'http://localhost:8080/bitonomy/demo-template.html'
		 templates2[turl1] = ['demo-widget-4']

		 $.jplates(templates2, function()
			   {		   
			       console.log('rendering again');
			       $.tmpl('demo-widget-4',{'xxx':'bar'}).appendTo($('#bitonomy'));
			   });
	     })
});

