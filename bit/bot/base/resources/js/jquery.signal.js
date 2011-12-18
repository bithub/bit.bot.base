
(function( $ ) {
    var signal_methods =
	{
	    init: function(options) 
	    { 
		if ( ! this.data('__signal_handler') )
		     {
			 //console.log('adding signal handler');		
			 this.data('__signal_handler',{});
		     }
		return this;
	    },
	    listen: function(event,cb) 
	    { 
		//console.log('adding cb for event: '+event);
		var listener = this.data('__signal_handler');
		if(event in listener)
		{
		    listener[event].push(cb);
		}
		else
		{
		    listener[event] = Array();
		    listener[event].push(cb);
		}
		this.data('__signal_handler',listener);		
		return this;
	    },
	    emit: function(event,resp) 
	    { 
		var listener = this.data('__signal_handler');
		//console.log(event)
		//console.log(listener)
		//console.log(event in listener)
		if(event in listener)
		{
		    for (var cb in listener[event])
		    {
			//console.log('emitting event: '+event);		    
			//console.log(listener[event][cb](resp));
			listener[event][cb](resp);
		    }
		}
		return this;
	    },
    };


    $.fn.signal = function(method) {
	if ( signal_methods[method] ) {
	    return signal_methods[ method ].apply( this, Array.prototype.slice.call( arguments, 1 ));
	} else if ( typeof method === 'object' || ! method ) {
	    return signal_methods.init.apply( this, arguments );
	} else {
	    $.error( 'Method ' +  method + ' does not exist on jQuery.bitonomy' );
	}    	
    };
})( jQuery );


