(function( $ ) {  	

    var DAYS = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday']
    var loadtime = new Date()
    var MONTHS = []
    for( var m=0; m<12; m++)
    {
	month = new Date(loadtime.getYear(),m)
	MONTHS.push(month.getMonthName());
    }
    
    var days_time = function(day,days)
    {
	return new Date((day-1)+((days*86400000)+1))
    }

    var calendar_index = function(widget_data,week,day)
    {
	var first_day_of_month = new Date(widget_data[0],widget_data[1],1,1)	
	var month_starts_on = first_day_of_month.getDay()
	month_starts_on--;
	if (month_starts_on < 0) month_starts_on = 6
	return first_day_of_month.add(-(month_starts_on)).days().add((week*7)+day).days()	    
    }

    var month_after = function(year,month)
    {
	month++;
	if (month > 11)
	{
	    month = 0;
	    year++;
	}
	return [year,month]
    }

    var month_before = function(year,month)
    {
	month--;
	if (month < 0)
	{
	    month = 11;
	    year--;
	}
	return [year,month]
    }

    var DayEventStatusButtonImage = function(ctx){
	this.init(ctx);
	var $this = this;
	this.params['src'] = "http://localhost:8080/bitonomy/images/confirmed.png"
    };
    DayEventStatusButtonImage.prototype = $.bit('image')

    var DayEventStatusButton = function(ctx){
	this.init(ctx);
	var $this = this;
	this.__proto_children__ = {'image':{child:  function(){return new DayEventStatusButtonImage(ctx)}}}
    };
    DayEventStatusButton.prototype = $.bit('button')


    var DayEventEditButtonImage = function(ctx){
	this.init(ctx);
	var $this = this;
	this.params['src'] = "http://localhost:8080/bitonomy/images/edit_icon.png"
    };
    DayEventEditButtonImage.prototype = $.bit('image')

    var DayEventEditButton = function(ctx){
	this.init(ctx);
	var $this = this;
	this.__proto_children__ = {'add-event-image':{child:  function(){return new DayEventEditButtonImage(ctx)}}}
    };
    DayEventEditButton.prototype = $.bit('button')

    var DayEventLocationButtonImage = function(ctx){
	this.init(ctx);
	var $this = this;
	this.params['src'] = "http://localhost:8080/bitonomy/images/trinity-icon.png"
    };
    DayEventLocationButtonImage.prototype = $.bit('image')

    var DayEventLocationButton = function(ctx){
	this.init(ctx);
	var $this = this;
	this.__proto_children__ = {'add-event-image':{selector: function(){return $this.element}
						      ,child:  function(){return new DayEventLocationButtonImage(ctx)}}}
    };
    DayEventLocationButton.prototype = $.bit('button')

    var DayEventButtons = function(ctx){
	this.init(ctx);
	var $this = this;
	this.__proto_children__ = {'event-location':{child:  function(){return new DayEventLocationButton(ctx)}}
				   ,'event-status':{child:  function(){return new DayEventStatusButton(ctx)}}}
    };
    DayEventButtons.prototype = $.bit('widget')


    var DayEventTitleLink = function(ctx,event){
	this.init(ctx);
	var $this = this;
	this.params['content_'] = event.display_times()
    };
    DayEventTitleLink.prototype = $.bit('link')

    var DayEventTitle = function(ctx, event){
	this.init(ctx);
	this.params['type'] = "h4"
	var $this = this;
	this.params['class_'] = "event-title title"
	this.__proto_children__ = {'link':{args: [event]
					    ,child:  function(){return new DayEventTitleLink(ctx,event)}}}
	
    };
    DayEventTitle.prototype = $.bit('title')

    var DayEventInformation = function(ctx,event){
	this.init(ctx);
	var $this = this;
	this.__proto_children__ = {'buttons':{child:  function(){return new DayEventButtons(ctx)}}}
    };
    DayEventInformation.prototype = $.bit('widget')

    var DayEvent = function(ctx,day,event){
	this.init(ctx);
	var $this = this;
	this.params['class_'] = "event"
	this.__proto_children__ = {'title': {args: [event]
					     ,child:  function(event){return new DayEventTitle(ctx,event)}}
				   ,'information':{args: [event]
						   ,child:  function(){return new DayEventInformation(ctx,event)}}}				   
    };
    DayEvent.prototype = $.bit('widget')

    var DayEvents = function(ctx,day){
	this.init(ctx);
	var $this = this;
	this.params['class_'] = "events"

	this.update_data = function()
	{
	    if (!day.getEvents)
		console.log(day)

	    var events = day.getEvents().events;

	    // we want this to start with 5 but have a show all function
	    var i=0
	    for(var event in events)
	    {
		if (i<5)
		{
		    //console.log('EVENT')
		    //console.log(events)
		    this.__proto_children__['event-'+i] = {child:  function(){return new DayEvent(ctx,day,events[event])}}
		    i++;
		}
	    }
	    
	    var c=0;
	    // update and remove unwanted children
	    for (var child in $this.children)
	    {
		if (c < i)
		{
		    $this.children[child].update()
		    if ($this.children[child].hidden())
			$this.children[child].show()
		} else {
		    $this.children[child].hide()
		}
	    }
	}	
    };
    DayEvents.prototype = $.bit('list')

    var DayAddEventButtonImage = function(ctx){
	this.init(ctx);
	var $this = this;
	this.params['src'] = "http://localhost:8080/bitonomy/images/add_icon.gif"
    };
    DayAddEventButtonImage.prototype = $.bit('image')

    var DayAddEventButton = function(ctx){
	this.init(ctx);
	var $this = this;
	this.params['class_'] = "add-event"
	// this should not be requrired
	this.__proto_children__ = {'add-event-image':{selector: function(){return $this.element}
						      ,child:  function(){return new DayAddEventButtonImage(ctx)}}}
    };
    DayAddEventButton.prototype = $.bit('button')

    var DayTitleButtons = function(ctx){
	this.init(ctx);
	var $this = this;
	this.__proto_children__ = {'add-event':{child:  function(){return new DayAddEventButton(ctx)}}}
    };
    DayTitleButtons.prototype = $.bit('widget')
    
    var DayTitleLink = function(ctx,day){
	this.init(ctx);
	var $this = this;
	this.day = day
	var _day = day
	this.params['content_'] = day.getDay().getDate()
	this.update_content = function()
	{
	    var widget_data = $this.ctx.data('active').widgets['event.booking.calendar'].split(':')	
	    if (parseInt($this.element.text()) != day.getDay().getDate())
		$this.element.html(day.getDay().getDate())
	}
    };
    DayTitleLink.prototype = $.bit('link')
    
    var DayTitle = function(ctx,day){
	this.init(ctx);
	this.params['type'] = "h3"
	this.params['class_'] = "day-title"
	var $this = this;
	this.__proto_children__ = {'buttons':{child:  function(){return new DayTitleButtons(ctx)}}
				   ,'link':{child: function(){return new DayTitleLink(ctx,day)}}}
    };

    DayTitle.prototype = $.bit('title')
    
    var Day = function(ctx,week,day){
	this.init(ctx);
	//this.params['content_'] = " day"
	
	this.params['class_'] = "day"
	var $this = this;

	var widget_data = $this.ctx.data('active').widgets['event.booking.calendar'].split(':')	
	this.getDay = function()
	{
	    return ctx.month.getDay(week,day);
	}

	this.getEvents = function()
	{
	    return ctx.calendar.getEventsForDay(ctx.month.getDay(week,day))
	}

	this.update_data = function()
	{	    
	    $this.__proto_children__ = {'title':{child:  function(){return new DayTitle(ctx,$this)}}
					,'events': {child:  function(){return new DayEvents(ctx,$this)}}}
	}

	this.update_content = function()
	{
	    var widget_data = $this.ctx.data('active').widgets['event.booking.calendar'].split(':')	    
	    var _day = ctx.month.getDay(week,day)
	    if( parseInt(widget_data[0]) != _day.getFullYear() || parseInt(widget_data[1]) != _day.getMonth())
	    {
		if ($this.element.hasClass('current'))
		    $this.element.toggleClass('current', false)
	    } else if (!$this.element.hasClass('current'))
		$this.element.toggleClass('current', true)
	}

    };
    Day.prototype = $.bit('widget')

    var WeekTitle = function(ctx,week){
	this.init(ctx);
	var $this = this;
	this.params['type'] = 'h3'
	var getWeek = function()
	{
	    return ctx.month.getDay(week,0).getWeekOfYear()
	}

	var getWeeksInYear = function()
	{
	    return ctx.month.getDay(week,0).moveToMonth(11).moveToLastDayOfMonth().getWeekOfYear()
	}
	
	var getContent = function()
	{
	    var cweek = getWeek();
	    return "Week "+cweek
	}

	this.params['content_'] = getContent()
	this.update_content = function()
	{	    
	    var current_week = $this.element.text();
	    var new_week = getContent();
	    if (current_week != new_week)
	    {
		$this.element.html(new_week)
	    }
	}
    };
    WeekTitle.prototype = $.bit('title')


    var WeekMonth = function(ctx,week){
	this.init(ctx);
	var $this = this;
	this.params['type'] = 'h3'
	var getWeek = function()
	{
	    return ctx.month.getDay(week,0).getWeekOfYear()
	}

	var getWeeksInYear = function()
	{
	    return ctx.month.getDay(week,0).moveToMonth(11).moveToLastDayOfMonth().getWeekOfYear()
	}
	
	var getContent = function()
	{
	    var cmonth = ctx.calendar.month()
	    var first_day = new Date(ctx.calendar.year(),ctx.calendar.month(),1).getDay()
	    if (first_day == 0)
		first_day = 7
	    if ( week == 0 && first_day > 1 )
	    {
		return MONTHS[month_before(ctx.calendar.year(),cmonth)[1]]+'/'+MONTHS[cmonth]
	    }
	    console.log(first_day)
	    return MONTHS[cmonth]

	}

	this.params['content_'] = getContent()
	this.update_content = function()
	{	    
	    var current_week = $this.element.text();
	    var new_week = getContent();
	    if (current_week != new_week)
	    {
		$this.element.html(new_week)
	    }
	}
    };
    WeekMonth.prototype = $.bit('label')


    var WeekYear = function(ctx,week){
	this.init(ctx);
	var $this = this;
	this.params['type'] = 'h3'
	var getWeek = function()
	{
	    return ctx.month.getDay(week,0).getWeekOfYear()
	}

	var getWeeksInYear = function(year)
	{
	    return new Date(year,11,31).getWeekOfYear()
	}
	
	var getContent = function()
	{
	    var cweek = getWeek();
	    if (week == 0 && ctx.calendar.month() == 0 && cweek>50)
		return (parseInt(ctx.calendar.year())-1) +'/'+ctx.calendar.year()

	    var weeks = getWeeksInYear(ctx.calendar.year())
	    
	    if (cweek >= (weeks))
	    {
		return ctx.calendar.year() +'/'+ (parseInt(ctx.calendar.year())+1) 
	    }
	    else 
	    {
		if (week>4 && cweek == 1)
		    return parseInt(ctx.calendar.year())+1
		else
		    return ctx.calendar.year()
	    }
	}

	this.params['content_'] = getContent()
	this.update_content = function()
	{	    
	    var current_week = $this.element.text();
	    var new_week = getContent();
	    if (current_week != new_week)
	    {
		$this.element.html(new_week)
	    }
	}
    };
    WeekYear.prototype = $.bit('label')

    var WeekShowAllButtonImage = function(ctx){
	this.init(ctx);
	var $this = this;
	this.params['src'] = "http://localhost:8080/bitonomy/images/arrow-down-icon.png"
    };
    WeekShowAllButtonImage.prototype = $.bit('image')


    var WeekShowAllButton = function(ctx){
	this.init(ctx);
	var $this = this;
	this.__proto_children__ = {'image':{child:  function(){return new WeekShowAllButtonImage(ctx)}}}
    };
    WeekShowAllButton.prototype = $.bit('button')

    var WeekButtons = function(ctx,week){
	this.init(ctx);
	var $this = this;
	this.params['class_'] = 'week-buttons'
	this.__proto_children__ = {'show-all':{child:  function(){return new WeekShowAllButton(ctx)}}}
    };
    WeekButtons.prototype = $.bit('widget')


    var WeekInfo = function(ctx,week){
	this.init(ctx);
	var $this = this;
	this.__proto_children__['title'] = {args: [week]
					    ,child:  function(week){return new WeekTitle(ctx,week)}}
	this.__proto_children__['month'] = {args: [week]
					    ,child:  function(week){return new WeekMonth(ctx,week)}}
	this.__proto_children__['year'] = {args: [week]
					    ,child:  function(week){return new WeekYear(ctx,week)}}
	this.__proto_children__['buttons'] = {args: [week]
					      ,child:  function(week){return new WeekButtons(ctx,week)}}
    };
    WeekInfo.prototype = $.bit('widget')

    var Week = function(ctx,week){
	this.init(ctx);
	var $this = this;
	this.params['class_'] = "week"
	this.__proto_children__['week-start'] = {args: [week]
						 ,child:  function(week){return new WeekInfo(ctx,week)}}
	for(var i=0;i<7;i++)
	    this.__proto_children__['day-'+i] = {args: [week,i  ]
						 ,child:  function(week,day){return new Day(ctx,week,day)}}
    };
    Week.prototype = $.bit('widget')

    var DayHeaderTitle = function(ctx,day){
	this.init(ctx);
	var $this = this;
	this.params['class_'] = 'day-header title'
	this.params['type'] = 'h3'
	if (!day && day != 0)
	    this.params['content_'] = ''
	else
	    this.params['content_'] = DAYS[day];
    };
    DayHeaderTitle.prototype = $.bit('title')
    
    var DayHeaders = function(ctx){
	this.init(ctx);
	var $this = this;
	this.__proto_children__['day-'+0] = {child:  function(day){return new DayHeaderTitle(ctx)}}
	for(var i=1;i<8;i++)
	{
	    this.__proto_children__['day-'+i] = {args: [i-1]
						 ,child:  function(day){return new DayHeaderTitle(ctx,day)}}
	}
    };
    DayHeaders.prototype = $.bit('widget')

    var Month = function(ctx,year,month){
	this.init(ctx);
	var $this = this;
	this.params['class_'] = "month"
	var first_day = new Date(year,month,1)	


	if (first_day.getMonth() == 0)	    
	    var previous_month = new Date(year-1,11)
	else var previous_month = new Date(year,month-1)

	var weeks = 6

	for(var i=0;i<weeks;i++)
	{
	    this.__proto_children__['week-'+i] = {args: [i]
						  ,child:  function(week){return new Week(ctx,week)}}
	}
	this.ctx.signal('listen', 'reload-calendar'
		    ,function()
		    {
			$this.update()
		    });


	var month = {
	    getDay: function(week,day)
	    {
		var widget_data = ctx.data('active').widgets['event.booking.calendar'].split(':')	
		return calendar_index(widget_data,week,day)
	    }

	}

	this.ctx.month = month;

    };
    Month.prototype = $.bit('widget')

    var CalendarDateYearOption = function(ctx,selected_year,year){
	this.init(ctx);
	var $this = this;
	this.params['value'] = year
	this.params['content_'] = year
	if (year == selected_year)
	    this.params['selected'] = true
	else this.params['selected'] = false
    };
    CalendarDateYearOption.prototype = $.bit('option')


    var CalendarDateYearSelect = function(ctx,year,month){
	this.init(ctx);
	var $this = this;
	var years = [2010,2011,2012,2013,2014,2015]
	for (var y in years)
	{	    
	    if (!$this.has_child(years[y]))
		this.__proto_children__['year-'+years[y]] = {args: [year,years[y]]
							     ,child:  function(selected_year,year){return new CalendarDateYearOption(ctx,selected_year,year)}}
	}
	
	this.after_add = function()
	{
	    $this.element.change(function(evt)
				 {
				     var new_year = $(evt.target).val();
				     var new_month = ctx.calendar.month();				     
				     ctx.calendar.loadMonth(new_year,new_month)
				 })
	}
	this.update_content = function()
	{
	    var widget_data = $this.ctx.data('active').widgets['event.booking.calendar'].split(':')
	    if(!($this.element.find(':selected').val() == widget_data[0]))
	    {
		$this.element.find(':selected').removeAttr('selected')		
		var target = $this.element.find('option[value="'+widget_data[0]+'"]')
		target.attr('selected','selected')
	    }
	    
	}

    };
    CalendarDateYearSelect.prototype = $.bit('select')
    
    
    var CalendarDateMonthOption = function(ctx,selected_month,month){
	this.init(ctx);
	var $this = this;
	this.params['value'] = month
	this.params['content_'] = MONTHS[month]
	if (month == selected_month)
	    this.params['selected'] = true
	else this.params['selected'] = false
    };
    CalendarDateMonthOption.prototype = $.bit('option')
    
    var CalendarDateMonthSelect = function(ctx,month,month){
	this.init(ctx);
	var $this = this;
	var months = []
	for (var i=0; i<12; i++) months.push(i)
	for (var m in months)
	{	    
	    this.__proto_children__['month-'+months[m]] = {selector: function(){return $this.element}
							   ,args: [month,months[m]]
							   ,child:  function(selected_month,month){return new CalendarDateMonthOption(ctx,selected_month,month)}}
	}
	
	this.after_add = function()
	{
	    $this.element.change(function(evt)
				 {
				     var widget_data = $this.ctx.data('active').widgets['event.booking.calendar']
				     var new_month = $(evt.target).val();				     
				     var new_year = widget_data.split(':')[0]
				     ctx.calendar.loadMonth(new_year,new_month)
				 })
	}
	this.update_content = function()
	{
	    var widget_data = $this.ctx.data('active').widgets['event.booking.calendar'].split(':')
	    if(!($this.element.find(':selected').val() == widget_data[1]))
	    {
		$this.element.find(':selected').removeAttr('selected')		
		var target = $this.element.find('option[value="'+widget_data[1]+'"]')
		target.attr('selected','selected')
	    }
	    
	}
    };
    CalendarDateMonthSelect.prototype = $.bit('select')
    
    var CalendarDateJumpForm = function(ctx,year,month)
    {
	this.init(ctx);
	var $this = this;
	this.params['type'] = 'h2'
	this.params['content_'] = 'Calendar: '+month+'/'+year
	this.__proto_children__ = {'month': {selector: function(){return $this.element}
					     ,args: [year,month]
					     ,child:  function(year,month){return new CalendarDateMonthSelect(ctx,year,month)}}
				   ,'year': {selector: function(){return $this.element}
					     ,args: [year,month]
					     ,child:  function(year,month){return new CalendarDateYearSelect(ctx,year,month)}}}
    }
    CalendarDateJumpForm.prototype = $.bit('form')

    var CalendarDateJumpButton = function(ctx,year,month)
    {
	this.init(ctx);
	var $this = this;
	var widget_data = this.ctx.data('active').widgets['event.booking.calendar'].split(':')
	var current_year = widget_data[0]
	var current_month = widget_data[1]
	//console.log('here')
	//console.log($this)
	if (month < 0)
	{
	    this.year = year-1;
	    this.month = 11
	    this.params['content_'] = '<'
	} else if (month == 12)
	{
	    this.year = 11
	    this.month = year+1
	    this.params['content_'] = '>'	    
	} else {
	    this.month = month;
	    this.year = year;
	    if (this.year < current_year)
		this.params['content_'] = '<<'
	    else if (year > current_year)
		this.params['content_'] = '>>'
	    else if (month < current_month)
		this.params['content_'] = '<'
	    else if (month > current_month)
		this.params['content_'] = '>'
	}
	this.after_add = function()
	{
	    $this.element.click(function(evt)
				{
				    var widget_data = $this.ctx.data('active').widgets['event.booking.calendar'].split(':')
				    evt.preventDefault()
				    var new_year = widget_data[0];
				    var new_month = widget_data[1];
				    if($(evt.currentTarget).hasClass('month-back'))
				    {
					new_month--;
					if (new_month < 0)
					{
					    new_month = 11;
					    new_year--;
					}
				    }
				    if($(evt.currentTarget).hasClass('month-forward'))
					new_month++;
					if (new_month > 11)
					{
					    new_month = 0;
					    new_year++;
					}
				    ctx.calendar.loadMonth(new_year,new_month)
				})
	    
	}
    }
    CalendarDateJumpButton.prototype = $.bit('button')

    var CalendarTitle = function(ctx,year,month){
	this.init(ctx);
	var $this = this;
	this.params['type'] = 'h2'
	this.__proto_children__['month-back'] = {args: [year,month]
						 ,child:  function(year,month){return new CalendarDateJumpButton(ctx,year,month-1)}}
	this.__proto_children__['year-back'] = {args: [year,month]
						 ,child:  function(year,month){return new CalendarDateJumpButton(ctx,year-1,month)}}
	this.__proto_children__['month-forward'] = {args: [year,month]
						 ,child:  function(year,month){return new CalendarDateJumpButton(ctx,year,month+1)}}
	this.__proto_children__['year-forward'] = {args: [year,month]
						 ,child:  function(year,month){return new CalendarDateJumpButton(ctx,year+1,month)}}
	this.__proto_children__['date-jump'] = {args: [year,month]
						,child:  function(year,month){return new CalendarDateJumpForm(ctx,year,month)}}


    };
    CalendarTitle.prototype = $.bit('title')

    var CalendarTitleBar = function(ctx,year,month){
	this.init(ctx);
	var $this = this;	
	this.__proto_children__['title'] = {selector: function(){return $this.element}
					    ,child:  function(){return new CalendarTitle(ctx,year,month)}}
	
	this.ctx.signal('listen', 'reload-calendar'
		    ,function()
		    {
			$this.update()
		    });
    };
    CalendarTitleBar.prototype = $.bit('widget')

    var CalendarHeader = function(ctx,year,month){
	this.init(ctx);
	var $this = this;
	this.__proto_children__ = {'day-headers': {selector: function(){return $this.element}
						   ,child:  function(){return new DayHeaders(ctx)}}}
    };
    CalendarHeader.prototype = $.bit('widget')
    
    var BitEvent = function(year,month,date,bit_event)
    {
	var $this = this;
	this.data = bit_event;
	var start = new Date(bit_event.start);
	var end = new Date(bit_event.end);
	var takedown = new Date(bit_event.takedown);
	this.start = function()
	{
	    return start;
	}
	this.end = function()
	{
	    return end;
	}
	this.takedown = function()
	{
	    return takedown;
	}
	this.display_time = function(dob)
	{
	    return dob.getHours() +':'+  dob.getMinutes()
	}
	this.display_times = function()
	{
	    return $this.display_time(start) +' - '+$this.display_time(end)
	}
	return this;
    }
    
    var BitEvents = function(year,month,date,bit_events)
    {
	this.events = {}
	this.data = bit_events;
	for (var ev in bit_events)
	{
	    this.events[ev] = new BitEvent(year,month,date,bit_events[ev])
	}
	return this;
    }

    var Calendar = function(ctx,year,month){
	this.init(ctx);
	var $this = this;
	var today = new Date()
	if (!year)
	    var year = today.getFullYear()
	if (!month)
	    var month = today.getMonth()

	var calendar = {
	
	    getEventsForDay: function(day)
	    {
		var year = day.getFullYear()
		var month = parseInt(day.getMonth())+1
		var date = parseInt(day.getDate())
		if (year in $this.bit().event.booking.diary)
		{
		    if (month in $this.bit().event.booking.diary[year])	  
			return new BitEvents(year,month,date,$this.bit().event.booking.diary[year][month].data.events[date])
		    else
			console.log('no events found: '+month+' '+date)
		}
	    },
	    year: function()
	    {
		return ctx.data('active').widgets['event.booking.calendar'].split(':')[0]
	    },
	    month: function()
	    {
		return ctx.data('active').widgets['event.booking.calendar'].split(':')[1]		
	    },

	    loadMonth: function(new_year,new_month)
	    {
		console.log('updating '+new_month+new_year)
		console.log($this.parent.element)
		var new_month = parseInt(new_month);
		var complete = function()
		{
		    counter--;	
		    if (counter == 0)
		    {			
			ctx.data('active').widgets['event.booking.calendar'] = new_year+':'+new_month				     
			ctx.signal('emit','reload-calendar')
		    }
		};
		var months = [month_before(new_year,new_month)
			      ,[new_year,new_month]
			      ,month_after(new_year, new_month)]
		var counter = 0;
		for (var m in months)
		{
		    counter++
		    ctx.bitonomy('updateResource','event','booking','diary/'+months[m][0]+'/'+(months[m][1]+1),complete);
		}

	    },

	}

	this.ctx.calendar = calendar;
	this.ctx.data('active').widgets['event.booking.calendar'] = year+':'+month
	this.__proto_children__ = {'title-bar': {child:  function(){return new CalendarTitleBar(ctx,year,month)}}
				   ,'calendar-header':{child:  function(){return new CalendarHeader(ctx,year,month)}}
				   ,'month':{child:  function(){return new Month(ctx,year,month)}}}
    };
    Calendar.prototype = $.bit('widget')
   	
    var PanelCalendar = function(ctx){
	this.init(ctx);
	var $this = this;
	this.__proto_children__ = {'calendar':{child:  function(){return new Calendar(ctx)}}}
    };
    PanelCalendar.prototype = $.bit('panel')


    var BitEventBooking = {
	init: function(option)
	{
	    return this;
	},
	activity: 'event',
	plugin: 'booking',
	template_url: 'http://localhost:8080/bitonomy/templates/jtk-elements.html',
	templates: {},
//	templates: {'http://localhost:8080/bitonomy/jtk-elements.html':['jtk-panel','jtk-widget','jtk-title'
//									, 'jtk-list', 'jtk-list-item', 'jtk-link'
//									,'jtk-button', 'jtk-image']},    
	renderCenter: function(ctx,element,cb)
	{
	    if (!element.has_child('calendar'))
	    {		
		console.log('adding center panel')
		var cbelement = function(res)
		{
		    console.log('added center panel')
		    if (cb) cb()
		}		
		element.add('calendar'
			,new PanelCalendar(ctx)
			,element.element, cbelement)
	    } else
		element.children['calendar'].update()
	    
	},

	renderTop: function(ctx,top,cb)
	{
	    cb()
	},

	renderLeft: function(ctx,left,cb)
	{
	    cb()
	},

	renderBottom: function(ctx,bottom,cb)
	{
	    cb()
	},

	renderRight: function(ctx,content)
	{

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
		    console.log('frame panels loaded')
		    if (cb) cb()
		}
	    }
	    var counter=4
	    var sides = {north:this.renderTop,west:this.renderLeft,center:this.renderCenter,south:this.renderBottom}
	    for (var side in sides)
	    {
		try
		{
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
	    //this.updateFrame(ctx);
	},

	loadPlugin: function(ctx,cb)
	{
	    //console.log('adfasdf')
	    //$.jplates(this.templates, function()
	    //{
//			  if (cb) cb();//
	//	      })
	},

	renderFrame: function(ctx,cb) 
	{
	    //console.log('loading bitonomy HTML');
	    var $this = this;
	    
	    var counter = 5;
	    var panelsLoaded = function(panel)
	    {
		counter--;
		    if (counter == 0)
		{
		    var layout = panel.parent.element.layout({ slidable: true
							       ,closable: true
							       ,west__resizable: false
							       ,north__resizable: false
							       ,north__closable: false
							       ,north__initClosed: false
							       ,north__togglerLength_open: 0
							       ,north__spacing_open: 0
							       ,initClosed: true})
		    layout.hide('south')
		    layout.hide('east')
		    layout.sizePane('north', 30)
		    layout.sizePane('west',  350)
		    if (cb) cb()
		}
	    }
	    
	    var loadPanels = function(panel)
	    {
		var sides = ['north','east','center','west','south'];
		for (var p in sides)
		{
			panel.add('ui-layout-'+sides[p]
				  ,$.bit('panel').init(ctx)
				  ,panel.element
				  ,panelsLoaded)
		}
	    }		   
	    var loadContent = function(frame)
	    {
		var panel = 
		frame.add('content-panel'
			  ,$.bit('panel').init(ctx)
			  ,frame.element
			  ,loadPanels);
	    }
	    $.bit('frame').attach(ctx,'bitFrame',loadContent);				
	    return this;
	},
	
	updatePlugin: function(ctx,cb)
	{
	    console.log('updating plugin: bit.'+this.activity+'.'+this.plugin);
	    var bit = ctx.data('bit');	    
	    var frame = ctx.data('frame');	    
	    var pluginid = this.plugin;
	    var activity = this.activity;
	    if (!('diary' in bit[activity][pluginid]))
	    {
		//console.log('adding node for plugin '+pluginid+' calendar')		
		bit[activity][pluginid]['diary'] = {}
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
	    //console.log(this.activity)
	    //console.log(this.plugin)
	    var req = $.ajax({
		url: "http://localhost:8080/event/booking/diary",
		dataType: "json",
		type: "GET",
		context: ctx,
		success: function(msg) {
		    //console.log(msg)
		    for (var y in msg['resources']) 
		    {
			var year = msg['resources'][y];
			if(!(year in bit[activity][pluginid]['diary']))
			    bit[activity][pluginid]['diary'][year] = {}
		    }
		    //var months = [10,11,12]
		    var now = new Date()
		    var new_year = now.getFullYear();
		    var new_month = now.getMonth();
		    var months = [month_before(new_year,new_month)
				  ,[new_year,new_month]
				  ,month_after(new_year, new_month)]
		    for (var m in months)
		    {
			counter++
			ctx.bitonomy('updateResource','event','booking','diary/'+months[m][0]+'/'+(months[m][1]+1),complete);
		    }
		},	
	    })
	},
    };

    $.bit('plugins').register_plugins({'bit.event.booking':BitEventBooking.init()})
    
})( jQuery );










