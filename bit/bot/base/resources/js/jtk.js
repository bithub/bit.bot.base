
(function( $ ) {

    var Panel = function()
    {
	this.template = 'panel-example'
	this.template_url = 'http://localhost:8080/bitonomy/foo-elements.html'
	this.name = 'panelExample'
    };
    Panel.prototype = $.jtk('panel');

    var widgetHeader = function(params)
    {
	this.template = 'widget-header'
	this.template_url = 'http://localhost:8080/bitonomy/foo-elements.html'
	this.name = 'headerWidget'
	this.params = params;
    };
    widgetHeader.prototype = $.jtk('widget');

    var widgetMenu = function(params)
    {
	this.template = 'widget-menu'
	this.template_url = 'http://localhost:8080/bitonomy/foo-elements.html'
	this.name = 'menuWidget'
	this.params = params;
    };
    widgetMenu.prototype = $.jtk('widget');

    var widgetContent = function(params)
    {
	this.template = 'widget-content'
	this.template_url = 'http://localhost:8080/bitonomy/foo-elements.html'
	this.name = 'menuWidget'
	this.params = params;
    };
    widgetContent.prototype = $.jtk('widget');

    $(document).ready(function() {
	header_widget = {'title': 'Example page'
			 ,'description': 'a simple example of a panel with some embedded widgets'
			}
	menu_widget = { menu_items: ['page-1','page-2','page-3'] }	
	content_widget = [{title: 'page-1'
			   ,content: 'this is the teext of page 1'}
			  ,{title: 'page-2'
			    ,content: 'this is the teext of page 2'}
			  ,{title: 'page-3'
			    ,content: 'this is the teext of page 3'}]

	var loadMenu = function(menu)
	{							   
	    $.each(menu.find('li.item a')
		   ,function(i,item)
		   {
		       item = $(item);
		       item.click(function(evt)
				  {
				      evt.preventDefault();
				      var target = item.html();
				      var content = item.parents('.pageBody').find('.content .page')
				      $.each(content,function(i,page)
					     {
						 page = $(page)
						 if (page.hasClass(target))
						 {
						     page.toggleClass('hidden',false)
						 } else
						     page.toggleClass('hidden', true)
					     })
					  })	
		   })								
		}

	var loadPanel = function(panel)
	{
	    new widgetHeader(header_widget).load(panel.find('.header'))
	    new widgetMenu(menu_widget).load(panel.find('.pageBody .menu'),loadMenu)
	    new widgetContent(content_widget).load(panel.find('.pageBody .content')
						   ,function(content)
						   {						       
						       $(content[0]).toggleClass('hidden');
						   })
	}
	new Panel().load($('body'),loadPanel)
    })
		     
})( jQuery );






