(function( $ ) {  	
    var displayFunds = function(ctx,funds,keys)
    {
	var _res = {}
	for (var k in funds)
	{
	    if (!keys)
		_res[k] = ctx.bitonomy('fund',funds[k])
	    else if (keys && (keys.indexOf(k) != -1))
	    {
		_res[k] = ctx.bitonomy('fund',funds[k])
	    }
	    else _res[k] = funds[k]
	}
	return _res
    }
    
    var market_buy_calculator = function(asks,total_spend)
    {
	var total_bought = 0
	for (var ask in asks)
	{
	    if (total_spend > 0)
	    {
		var available_spend = (asks[ask].price * asks[ask].quantity)/100000000
		//console.log('    ')
		//console.log('total left to spend:' +(total_spend/100000000))
		//console.log('available to spend:'+(available_spend/100000000))
		//console.log('total bought:'+(total_bought/100000000))
		if( available_spend > total_spend )
		{


		    total_bought += (total_spend/asks[ask].price)*100000000
		    total_spend = 0;
		    break;
		}
		else
		{
		    total_bought += asks[ask].quantity;
		    total_spend -= available_spend;		    
		}
	    }
	}
	return { bought: total_bought
		 ,left: total_spend }
    }

    var market_sell_price_calculator = function(bids,price)
    {
	var average_price = 0;
	var total_sold = 0
	var total_recvd = 0
	var sold = 0;
	var c = 0
	//console.log('TARGET PRICE '+price)
	for (var bid in bids)
	{
	    c++;

	    var bid_price = bids[bid].price
	    var bid_quantity = bids[bid].quantity
	    total_sold += bid_quantity
	    total_recvd += (bid_price * bid_quantity)/100000000	   
	    average_price = ((total_recvd*100000000)/total_sold)
	    
	    //console.log('bid price '+bid_price)	    
	    //console.log('selling '+total_sold)	    
	    //console.log('average price '+average_price)
	    //console.log('target price '+price*100000000)

	    if (price >= average_price)
		break
	    sold = total_sold;
	    //if (c>2) break
	}
	return  sold
    }


    var market_buy_price_calculator = function(asks,price)
    {
	var average_price = 0;
	var total_bought = 0
	var total_spent = 0
	var bought = 0;
	var c = 0
	//console.log('TARGET PRICE '+price)
	for (var ask in asks)
	{
	    c++;

	    var ask_price = asks[ask].price
	    var ask_quantity = asks[ask].quantity
	    total_bought += ask_quantity
	    total_spent += (ask_price * ask_quantity)/100000000	   
	    average_price = ((total_spent*100000000)/total_bought)
	    
	    //console.log('ask price '+ask_price)	    
	    //console.log('buying '+total_bought)	    
	    //console.log('average price '+average_price)
	    //console.log('target price '+price*100000000)

	    if (price <= ask_price)
		break
	    bought = total_bought;
	    //if (c>2) break
	}
	return  bought
    }






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
    MacroLinkedListItem.prototype = $.bit('macro');

    var MacroTabulatedList = function (ctx,keys,name,cb){
	this.init(ctx);
	var $this = this;
	this.template = 'macro-tabulated-list';
	this.templates[this.getURL()] = ['macro-tabulated-list-item', ]
	this.name = name;
	this.update = function(items)
	{

	    var macro = $this.element;
	    var ooe = 'odd'
	    var existing_items = macro.find('li.item.trow');

	    for(var i in items)
	    {
		if (i > 10) break;
		var res = items[i];
		//console.log(res)
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
    MacroTabulatedList.prototype = $.bit('macro');
   
    var WidgetAccountTradeHistory = function(ctx,market,account,exchange)
    {
	this.init(ctx);
	var $this = this;
	this.template = 'bit-market-account-trade-history'
	this.name = 'bitonomyAccountTradeHistory';
	this.update = function(widget)
	{
	    var bit_account = $this.bit().coin.trading.markets[market].accounts[account];	    
	    var keys = ['date','price','quantity'];
	    var amounts = ['price','quantity'];
	    if (!$this.has_child(exchange+'-bought'))		    
	    {
		$this.add(exchange+'-bought'
			  , new MacroTabulatedList(ctx,keys,'accountBoughtList'
						   ,function(res){return displayFunds(ctx,res,amounts)})
			  ,$this.element.find('.accountBought')
			 )
	    } 
	    $this.children[exchange+'-bought'].update(bit_account.data.bought[exchange])

	    if (!$this.has_child(exchange+'-sold'))		    
	    {
		$this.add(exchange+'-sold'
			  ,new MacroTabulatedList(ctx,keys,'accountSoldList'
						  ,function(res){return displayFunds(ctx,res,amounts)})
			  ,$this.element.find('.accountSold')			  
			 )
	    } 
	    $this.children[exchange+'-sold'].update(bit_account.data.sold[exchange])
 	    return this
	}
    }
    WidgetAccountTradeHistory.prototype =$.bit('widget');

    var WidgetAccountPositions = function(ctx,market,account,exchange)
    {
	this.init(ctx);
	var $this = this;
	this.template = 'bit-market-account-positions'
	this.name = 'bitonomyAccountPositions';
	this.update = function()
	{
	    var bit_account = $this.bit().coin.trading.markets[market].accounts[account];	    
	    //console.log(exchange)
	    var keys = 	['price','quantity']
	    if (!$this.has_child(exchange+'-buying'))		    
		{
		    $this.add(exchange+'-buying'
			      , new MacroTabulatedList(ctx,keys,'accountBuyingList'
						       ,function(res){return displayFunds(ctx,res,keys)})
			      ,$this.element.find('.accountBuying'))

		} 
	    $this.children[exchange+'-buying'].update(bit_account.data.buying[exchange])
	
	    if (!$this.has_child(exchange+'-selling'))		    
	    {
		$this.add(exchange+'-selling'
			  , new MacroTabulatedList(ctx,keys,'accountSellingList'
						   ,function(res){return displayFunds(ctx,res,keys)})
			  ,$this.element.find('.accountSelling'))
	    } 
	    $this.children[exchange+'-selling'].update(bit_account.data.selling[exchange])
	    return this
	}
	
    }
    WidgetAccountPositions.prototype =$.bit('widget');
    
    var WidgetAccountTrade = function(ctx,market,account,exchange)
    {
	this.init(ctx);
	var $this = this;
	this.name = 'marketAccountTradeWidget';
	this.template = 'bit-market-account-trade-form';
	var curr1 = exchange.split(':')[0];
	var curr2 = exchange.split(':')[1];
	var marketAccInfo = function()
	{
	    var acc = {}
	    var bit_account = $this.bit().coin.trading.markets[market].accounts[account];
	    acc['sell_price'] = ctx.bitonomy('fund',$this.bit().coin.trading.markets[market].data.tick[exchange]['ask']);
	    acc['buy_price'] = ctx.bitonomy('fund',$this.bit().coin.trading.markets[market].data.tick[exchange]['bid']);
	    acc['currency1'] = curr1;
	    acc['currency2'] = curr2;
	    var curr1_balance = 0;
	    if(curr1 in bit_account.data.balances)
	    {
		var c1_balance = bit_account.data.balances[curr1];
		if (c1_balance)
		    acc['currency1_balance'] = ctx.bitonomy('fund',c1_balance);
	    }
	    var curr2_balance = 0;
	    if(curr2 in bit_account.data.balances);
	    {
		var bit_funds = bit_account.data.balances[curr2];
		var c2_balance = bit_account.data.balances[curr2];
		if (c2_balance)
		{
		    acc['currency2_balance'] = ctx.bitonomy('fund',c2_balance);
		}
		
	    }
	    return acc	    
	}
	this.params = marketAccInfo(); 
	this.update = function(widget)
	{
	    return
	    var sell_price = ctx.bitonomy('fund',bit.coin.trading.markets[market].data.tick[exchange]['ask']);
	    var buy_price = ctx.bitonomy('fund',bit.coin.trading.markets[market].data.tick[exchange]['bid']);
	    
	    var widget = $this.element;
	    var bit_account = bit.coin.trading.markets[market].accounts[account];
	    var trade_widget_content = widget.find('.'+this.name+'Content');
	    
	 
	    var update = false;
	    var amount = widget.find('.tradeForm .amount input');
	    var price = widget.find('.tradeForm .price input');

	    var prop_action = widget.find('.tradeForm .proposedAction');
	    var prop_amount = widget.find('.tradeForm .proposedAmount');
	    var prop_price = widget.find('.tradeForm .proposedPrice');
	    var prop_total = widget.find('.tradeForm .proposedTotal');

	    var confirm = widget.find('.tradeForm .confirm')
	    if (!amount.val())
		amount.val(0);

	    if (!price.val())
		price.val(sell_price);
	    
	    var updateTotal = function()
	    {
		var total = amount.val() * price.val();
		var totals = widget.find('.totals');
		var totals = widget.find('.totals');
		if (total)
		{
		    totals.toggleClass('visibilityHidden', false);
		    confirm.toggleClass('visibilityHidden', false);
		}
		else
		{
		    totals.toggleClass('visibilityHidden', true);
		    confirm.toggleClass('visibilityHidden', true);
		}
		    		    
		prop_amount.html(amount.val());
		prop_price.html(price.val());
		prop_total.html(total);
		if (parseFloat(price.val()) > parseFloat(sell_price)) {
		    prop_price.toggleClass('positive',true);
		} else
		    prop_price.toggleClass('positive',false);

		if (parseFloat(price.val()) < parseFloat(buy_price)) {
		    prop_price.toggleClass('negative',true);
		} else
		    prop_price.toggleClass('negative',false);

		//if(amount.val()==0){amount.val('')};

	    };

	    var action = widget.find('.tradeForm .action select')
	    var sell_option = action.find('option[value="Sell"]');	    
	    var buy_option = action.find('option[value="Buy"]');	    

	    if (curr1_balance == 0)
	    {
		buy_option.toggleClass('optionDisabled', true);
		sell_option.select();
	    }
	    else
	    {
		buy_option.toggleClass('optionDisabled', false);
	    }
	    if (curr2_balance == 0)
	    {
		sell_option.toggleClass('optionDisabled', true);
		buy_option.select();		
	    }
	    else
	    {
		sell_option.toggleClass('optionDisabled', false);
	    }


	    var updateAction = function()
	    {
		var exch_action = action.find(':selected').val();
		if (exch_action == 'Sell')
		{
		    prop_action.html('sell')		    
		    prop_action.toggleClass('actionBuy',false)
		    prop_action.toggleClass('actionSell',true)
		}
		else
		{
		    prop_action.html('buy')		    
		    prop_action.toggleClass('actionBuy',true)
		    prop_action.toggleClass('actionSell',false)
		}		
	    };
	    
	    if (update)
	    {
		amount.keyup(updateTotal);
		price.keyup(updateTotal);
		action.change(updateAction);
		confirm.find('input').click(function(){console.log(prop_total.html())});
	    }
	    
	    widget.find('.tradePrice div.buyPrice').html(buy_price);
	    widget.find('.tradePrice div.sellPrice').html(sell_price);
	    widget.find('span.accountCurrency-1').html(curr1);
	    widget.find('span.accountCurrency-2').html(curr2);
	    widget.find('span.accountBalance-1').html(curr1_balance);
	    widget.find('span.accountBalance-2').html(curr2_balance);
	}
	return this;
    };
    WidgetAccountTrade.prototype =$.bit('widget');

    var WidgetAccountFund = function(ctx,market,account,fund)
    {
	this.init(ctx);
	var $this = this;
	this.name = 'marketAccountFundsWidget-'+fund;
	this.template = 'widget-bit-market-account-funds';
	var active = ctx.data('active');
	var widget_data = active.widgets['trading.account.funds'];	    
	var account = widget_data.split(':')[1];
	var accountid = account.replace('@','_at_').replace(/\./g,'')
	var resource_id = 'content-market-'+market+'-'+accountid+'-'+fund;	    
	var widget_title = fund + ' '+'('+market+'/'+account+')';
	this.params = {id_: resource_id};
	this.update = function()
	{
	    var panel = $this.element.parents('.marketAccountFundsPanel');
	    var accounts = panel.find('.marketAccounts');
	    if (!$this.has_child(fund+'-title'))
		$this.add(fund+'-title'
			  ,new MacroLinkedListItem(ctx,resource_id)
			  ,accounts)
	    
	    $this.children[fund+'-title'].update(fund,'#'+resource_id)

	    if (!$this.has_child(fund+'-balance'))
		$this.add(fund+'-balance'
			  ,new WidgetAccountBalance(ctx,market,account,fund)
			  ,$this.element)	    
	    else $this.children[fund+'-balance'].update()
	}
	return this;
    }
    WidgetAccountFund.prototype = $.bit('widget');

    var WidgetAccountBalance = function(ctx,market,account,fund)
    {
	this.init(ctx);
	var $this = this;
	this.name = 'marketAccountBalanceWidget-'+fund;
	this.template = 'widget-bit-market-account-balance';
	var accountid = account.replace('@','_at_').replace(/\./g,'')
	this.params = {'id': 'content-market-'+market+'-'+accountid+'-'+fund};
	var bit = ctx.data('bit');	    	    
	var bit_account = bit.coin.trading.markets[market].accounts[account]
	var account_history = content.find('.bitonomyAccountBalance');	    	
	var widget_title = fund+' Balance ('+market+'/'+account+')';	    
	this.update_content = function(widget)
	{
	    var title= $this.element.find('h1.title');
	    if (title.html() != $this.element_title) title.html($this.element_title);
	    var balance = $this.element.find('h2.balance')
	    var _balance = (ctx.bitonomy('fund', bit_account.data.balances[fund]))
	    if (balance.html() != _balance) 
	    {
		//console.log('updating balance '+_balance)
		balance.html(_balance);
	    }
	}
    };
    WidgetAccountBalance.prototype =$.bit('widget');
		      
    var PanelAccountFunds = function(ctx)
    {	
	this.init(ctx);
	var $this = this;
	var active = ctx.data('active');	    	    	   
	var widget_data = active.widgets['trading.account.funds'];	    
	var market = widget_data.split(':')[0];
	var account = widget_data.split(':')[1];
	var accountid = account.replace('@','_at_').replace(/\./g,'')
	this.name = 'marketAccountFunds-'+market+'-'+accountid;
	this.template = 'panel-bit-market-account-funds';
	this.update_data = function()
	{	    	 
	    var panel_title = ' exchange ('+market+'/'+account+')';	   	    	    
	    var funds = $this.bit().coin.trading.markets[market].accounts[account].data.balances;
	    for (var fund in funds)
	    {	
		if (!(fund in this.__proto_children__))
		{
		    $this.__proto_children__[fund] =  {selector: function(){return $this.element}
						       ,args: [market,account,fund]
						       ,child: function(market,account,fund){return new WidgetAccountFund(ctx,market,account,fund)}}
		}
	    }
	}

	this.update_content = function()
	{
	    var i = 0;
	    for (var fund in $this.bit().coin.trading.markets[market].accounts[account].data.balances) i++;
	    var tablength = $this.element.find('ul li.ui-corner-top').length
	    if (tablength != i )
	    {
		$this.element.tabs('destroy')
		$this.element.tabs()
	    }
	}
	return this;
    };
    PanelAccountFunds.prototype = $.bit('panel');


    var WidgetAccountExchange = function(ctx,market,account,exchange)
    {
	this.init(ctx);
	var $this = this;
	this.template = 'widget-bit-market-account-exchange'
	this.name = 'marketAccountExchangeWidget'+market+'-'+account+'-'+'-'+exchange.replace(':','-');	
	this.params['id_'] = 'content-market-'+market+'-'+account+'-'+'-'+exchange.replace(':','-');			
	this.update = function(widget)
	{

	    if (!$this.has_child(account+'-trade'))		    
	    {
		$this.add(account+'-trade'
			  , new WidgetAccountTrade(ctx,market,account,exchange)
			  ,$this.element)
	    } else $this.children[account+'-trade'].update()



	    if (!$this.has_child(account+'-positions'))		    
	    {
		$this.add(account+'-positions'
			  , new WidgetAccountPositions(ctx,market,account,exchange)
			  ,$this.element)
	    } else $this.children[account+'-positions'].update()
	    

	    if (!$this.has_child(account+'-trades'))		    
	    {
		$this.add(account+'-trades'
			  , new WidgetAccountTradeHistory(ctx,market,account,exchange)
			  ,$this.element)
	    } else $this.children[account+'-trades'].update()

	}
    };
    WidgetAccountExchange.prototype =$.bit('widget');

    var WidgetAccountExchangeTitle = function(ctx,market,account,exchange)
    {
	this.init(ctx);
	this.template = 'widget-bit-market-account-exchange-title'
	this.name = 'marketAccountExchangeTitleWidget'+market+'-'+account+'-'+'-'+exchange.replace(':','-');
	this.params['href'] = 'content-market-'+market+'-'+account+'-'+'-'+exchange.replace(':','-');		
	this.params['title'] = exchange;
    };
    WidgetAccountExchangeTitle.prototype =$.bit('widget');


    var PanelAccountExchanges = function(ctx) {	
	this.init(ctx);
	var $this = this;
	var active = ctx.data('active');	    	    	   
	var widget_data = active.widgets['trading.account.exchanges'];	    
	var market = widget_data.split(':')[0];
	var account = widget_data.split(':')[1];
	var accountid = account.replace('@','_at_').replace(/\./g,'')
	this.name = 'marketAccountExchange-'+market+'-'+accountid;
	this.template = 'panel-bit-market-account-exchanges';
	this.update_data = function()
	{	    	 
	    var panel_title = ' exchange ('+market+'/'+account+')';	   	    	    
	    var exchanges = $this.bit().coin.trading.markets[market].accounts[account].data.exchanges;
	    for (var exch in exchanges)
	    {	
		var exchange = exchanges[exch];		
		if (!(exchange+'-title' in this.__proto_children__))
		{
		    $this.__proto_children__[exchange+'-title'] =  {selector: function(){return $this.element.find("ul.bitonomyMarketAccountResources")}
								    ,args: [market,account,exchange]
								    ,child: function(market,account,exchange){return new WidgetAccountExchangeTitle(ctx,market,account,exchange)}}
		}
		if (!(exchange+'-menu' in this.__proto_children__))
		{
		    $this.__proto_children__[exchange+'-menu'] =  {selector: function(){return $this.element}
								   ,args: [market,account,exchange]
								   ,child: function(market,account,exchange){return new WidgetAccountExchange(ctx,market,account,exchange)}}
		}
	    }
	}
	this.update_content = function()
	{
	    var i = 0;
	    for (var exch in $this.bit().coin.trading.markets[market].accounts[account].data.exchanges) i++;
	    var tablength = $this.element.find('ul li.ui-corner-top').length
	    if (tablength != i )
	    {
		$this.element.tabs('destroy')
		$this.element.tabs()
	    }
	}
	return this;
    };
    PanelAccountExchanges.prototype = $.bit('panel');

    var PanelMarketActivity = function(ctx)
    {
	this.ctx = ctx;
	this.name = 'bitonomyMarketActivity'
	this.template = 'panel-bit-market-activity'
    }
    PanelMarketActivity.prototype = $.bit('panel');
    
    var GraphMarketRealtime = function(ctx,market,exchange) 
    {
	this.init(ctx)
	this.template = 'graph-market-depth'
	var bitmarket = this.bit().coin.trading.markets[market];			      
	var $this = this;
	if (!('params' in this)) this['params'] = {}
	//var id = 'bitonomy-market-depth-'+market+'-'+exchange.replace(':','_')+'-'+this.uid;
	//this.id = id;
	var id = this.uid;
	this.newplotvars = [];

	this.update_data = function()
	{
	    //console.log('hereeeeeeeeee')
	    var market_data = $this.bit().coin.trading.markets[market].data
	    var bid = market_data.tick[exchange].bid;
	    var ask = market_data.tick[exchange].ask;
	    var asks = market_data.asks;
	    var bids = market_data.offers;
	    var average_price = (ask+bid)/2;	   	    
	    var spread_start = Math.round(((average_price/100000000) - .5)*100)/100
	    var spread_end = Math.round(((average_price/100000000) + .5)*100)/100
	    var steps = []
	    var step_value = spread_start
	    for (var i=0;i<101;i++)
	    {
		steps.push(step_value)
		step_value += .05
	    }
	    //console.log(steps)

	    var buyvars = []
	    for (var i=0;i<11;i++)
	    {
		var amount = market_sell_price_calculator(bids[exchange],(steps[i]*100000000))
		buyvars.push([steps[i],amount/100000000])
	    }
	    
	    var sellvars = []
	    for (var i=10;i<21;i++)
	    {
		var amount = market_buy_price_calculator(asks[exchange],(steps[i]*100000000))
		sellvars.push([steps[i],amount/100000000])
	    }

	    if (market == 'mtgox' && exchange == 'USD:BTC')
	    {
		//console.log(buyvars)	
		//console.log(average_price)
		//console.log(sellvars)	
	    }

	    this.plotvars =  [buyvars,sellvars]
	    this.plotsettings = {
		stackSeries: false,
		showMarker: false,
		axes: {
		    xaxis: {
			pad: 0,
			min: spread_start,
			max: spread_end,
		    },
		    yaxis: {
			pad: 0,
			min: 0,
			max: 50000,
		    }
		},
		axesDefaults:{min:0},
		seriesDefaults: {
		    fill: true,
		    fillToZero: true,
		    showMarker:false,
		    //pointLabels: { show:true },
		    rendererOptions: {
			highlightMouseDown: true,
		    }
		}
	    }
	    
	}

	var graph = false;
	var plotvarcache = false;
	this.update_content = function()
	{
	    var graph_el = $('#'+id);
	    if(!graph)
	    {
		graph = $.jqplot(id, $this.plotvars, $this.plotsettings)
		plotvarcache = $this.plotvars;
		$(id).bind('jqplotDataHighlight',
				   function (ev, seriesIndex, pointIndex, data) {
				       $('#info1b').html('series: '+seriesIndex+', point: '+pointIndex+', data: '+data);
				   }
				  );
		
		$(id).bind('jqplotDataUnhighlight',
				   function (ev) {
				       $('#info1b').html('Nothing');
				   }
				  );
	    } else
	    {	
		if ($this.plotvars != plotvarcache)
		{
		    //console.log('replotting')
		    graph.series[0].data = $this.plotvars[0];
		    graph.replot()
		    //console.log($this.plotvars);
		    //console.log(plotvarcache);
		    plotvarcache = $this.plotvars;
		}
	    }
	}
    }
    GraphMarketRealtime.prototype =$.bit('widget');

    var WidgetMarketRealtime = function(ctx)
    {
	this.init(ctx)
	var $this = this;
	this.template = 'widget-bit-realtime'
	this.__proto_children__ = {'realtime-graph':{selector: function(){return $this.element.find('.realtime-graph')}
						     ,child:  function(){return new GraphMarketRealtime(ctx,'mtgox','USD:BTC')}}}
    }
    WidgetMarketRealtime.prototype = $.bit('widget');


    var PanelMarketRealtime = function(ctx)
    {
	this.init(ctx)
	var $this = this;
	//this.name = 'bitonomy-market-realtime'
	this.template = 'panel-bit'
	this.__proto_children__ = {'market-realtime':{selector: function(){return $this.element}
							     ,child:  function(){return new WidgetMarketRealtime(ctx)}}}
    }
    PanelMarketRealtime.prototype = $.bit('panel');


    var WidgetMarketAccountMenu = function(ctx,market,account)
    {
	this.ctx = ctx;
	var $this = this;
	this.template = 'widget-bit-market-account-menu'
	this.name = 'marketAccountMenuWidget-'+market+'-'+account.replace('@','_at_').replace(/\./g,'_');
	var menu_items = ['Exchanges','Funds']
	this.params = {'market': market, 'account': account, 'menu_items': menu_items}
	this.update_content = function()
	{
	    var accid = market+':'+account;
	    var update = function(event,button,target)
	    {
		event.preventDefault();
		ctx.bitonomy('updateWidget', target, accid)
		ctx.bitonomy('updateLayout', 'right', target)
	    }	   
	    $this.element.find('a.Funds').click(function(evt){update(evt,this,'trading.account.funds')});
	    $this.element.find('a.Exchanges').click(function(evt){update(evt,this,'trading.account.exchanges')});
	}
    };
    WidgetMarketAccountMenu.prototype =$.bit('widget');

    var WidgetMarketAccountMenuTitle = function(ctx,market,account)
    {
	this.init(ctx)
	this.template = 'widget-bit-market-account-menu-title'
	this.name = 'marketAccountMenuTitleWidget-'+market+'-'+account.replace('@','_at_').replace(/\./g,'_');
	this.params = {'market': market, 'account': account}
    };
    WidgetMarketAccountMenuTitle.prototype =$.bit('widget');

    var WidgetMarketMenuTitle = function(ctx,market)
    {
	this.init(ctx)
	this.template = 'widget-bit-market-menu-title'
	this.name = 'marketMenuTitleWidget-'+market
	this.params = {'market': market}
    };
    WidgetMarketMenuTitle.prototype =$.bit('widget');

    var WidgetMarketAccountsList = function(ctx,market)
    {
	this.init(ctx);
	var $this = this;
	this.template = 'widget-bit-market-accounts-list'
	this.name = 'marketAccountsListWidget-'+market;
	this.params = {'market': market}
	this.market = market
	this.update_data = function(widget)
	{
	    for (var account in $this.bit().coin.trading.markets[market].accounts)
	    {	
		if (!(account+'-title' in this.__proto_children__))
		{
		    $this.__proto_children__[account+'-title'] =  {selector: function(){return $this.element.find('.accounts')}
								   ,args: [market,account]
								   ,child:function(market,account){ return new WidgetMarketAccountMenuTitle(ctx,market,account)}}
		}
		if (!(account+'-menu' in this.__proto_children__))
		{
		    $this.__proto_children__[account+'-menu'] =  {selector: function(){return $this.element.find('.accounts')}
								  ,args: [market,account]
								  ,child: function(market,account){return new WidgetMarketAccountMenu(ctx,market,account)}}
		}
	    }
	}
	this.update_content = function()
	{
	    var i = 0;
	    for (var acc in $this.bit().coin.trading.markets[$this.market].accounts) i++;
	    var acclength = $this.element.find('.accounts h3.ui-accordion-header').length;
	    if ((i != 0) && (acclength != i))
	    {
		$this.element.find('.accounts').accordion();				    	    
	    }	    
	}
    };
    WidgetMarketAccountsList.prototype =$.bit('widget');

    var WidgetMarketAccounts = function(ctx)
    {
	this.init(ctx);
	var $this = this;
	this.template = 'widget-bit-market-accounts'
	this.name = 'marketAccountsWidget'
	this.update_data = function(widget)
	{
	    for (var market in $this.bit().coin.trading.markets)
	    {
		if (!(market+'-title' in this.__proto_children__))
		{
		    $this.__proto_children__[market+'-title'] =  {selector: function(){return $this.element.find('.bitonomyMarketAccounts')}
								  ,args: [market]
								  ,child: function(market){return new WidgetMarketMenuTitle(ctx,market)}}
		}
		if (!(market+'-info' in this.__proto_children__))
		{
		    $this.__proto_children__[market+'-info'] =  {selector: function(){return $this.element.find('.bitonomyMarketAccounts')}
								 ,args: [market]
								 ,child:function(market){return new WidgetMarketAccountsList(ctx,market)}}
		}
	    }
	}
	
	this.update_content = function()
	{
	    var acclength = $this.element.find('h3.marketMenuTitleWidget.ui-accordion-header').length;
	    var i = 0;
	    for (var market in $this.bit().coin.trading.markets) i++;
	    if ((i != 0) && (acclength != i))
	    {
		$this.element.find('.bitonomyMarketAccounts').accordion('destroy')
		$this.element.find('.bitonomyMarketAccounts').accordion();				    	    
	    }
	}
    };
    WidgetMarketAccounts.prototype = $.bit('widget');

    var PanelMarketAccounts = function(ctx)
    {
	this.init(ctx);
	var $this = this;
	this.template = 'panel-bit-market-accounts'
	this.name = 'marketAccountsPanel'
	this.__proto_children__ = {'widget-market-accounts':{selector: function(){return $this.element}
							     ,child:  function(){return new WidgetMarketAccounts(ctx)}}}
    };
    PanelMarketAccounts.prototype = $.bit('panel');
    
    var WidgetMarketExchangeTitle = function(ctx,market,exchange) {
	this.init(ctx);
	var exchange_id = exchange.replace(':','-');
	this.name = 'bitonomyMarketExchangeTitle-'+market+'-'+exchange_id;
	this.template = 'widget-bit-market-exchange-title';
	var target = 'tabs-markets-'+market+'-'+exchange_id;
	this.params = {'market': market, 'exchange': exchange, 'target': target};
    }
    WidgetMarketExchangeTitle.prototype =$.bit('widget');


    var WidgetMarketExchangeTicker = function(ctx,market,exchange) {
	this.init(ctx);
	var $this = this;
	this.name = 'bitonomyMarketExchangeTicker'
	this.template = 'widget-bit-market-exchange-ticker';
	var bitmarket = this.bit().coin.trading.markets[market];			      
	var tick = bitmarket.data.tick;	
	this.params = {'market': market, 'exchange': exchange
		       ,last:ctx.bitonomy('fund', tick[exchange]['last'])
		       ,bid:ctx.bitonomy('fund', tick[exchange]['bid'])
		       ,ask:ctx.bitonomy('fund', tick[exchange]['ask'])		       
		      };
	this.update = function()
	{
	    var tick = bitmarket.data.tick;
	    var ticks = ['bid','last','ask'];
	    for (var t in ticks)
	    {
		var current = $this.element.find('.'+ticks[t]);
		var updated = ctx.bitonomy('fund', tick[exchange][ticks[t]]);		
		if (current.html() != updated)
		{
		    current.html(updated)
		    current.effect('highlight')
		}
	    }
	}
    }
    WidgetMarketExchangeTicker.prototype =$.bit('widget');

    var WidgetMarketExchangeTrades = function(ctx,market,exchange) 
    {
	this.init(ctx);
	var $this = this;
	this.name = 'bitonomyMarketExchangeTrades'
	this.template = 'widget-bit-market-exchange-trades'
	var keys = ['date','price','quantity','total']
	var amounts = ['price','quantity','total']
	this.update = function()
	{

	    var bit = ctx.data('bit');		
	    var bitmarket = bit.coin.trading.markets[market];			      
	    var trades = bitmarket.data.trades[exchange];
	    if (!$this.has_child('trades'))
		$this.add('trades'
			  ,new MacroTabulatedList(ctx,keys,'marketTrades'
						  ,function(res){return displayFunds(ctx,res,amounts)})
			  ,$this.element.find('.trades'))
	    $this.children['trades'].update(trades)
	}
    }
    WidgetMarketExchangeTrades.prototype =$.bit('widget');

    var WidgetMarketExchangeOrderbook = function(ctx,market,exchange) 
    {
	//this.children = {}
	//this.parent = {}
	//this.ctx = ctx;
	this.init(ctx);
	this.name = 'bitonomyMarketExchangeOrderbook'
	this.template = 'widget-bit-market-exchange-orderbook'
	var bit = ctx.data('bit');		
	var bitmarket = bit.coin.trading.markets[market];			      
	var $this = this;
	this.update = function()
	{
	    var keys = ['price','quantity'];
	    var orderbook = bitmarket.data;

	    if (!$this.has_child('offers'))
		$this.add('offers'
			  ,new MacroTabulatedList(ctx,keys,'marketOffers'
						  ,function(res){return displayFunds(ctx,res)})			  			  
			  ,$this.element.find('.offers'))
	    $this.children['offers'].update(orderbook.offers[exchange])


	    if (!$this.has_child('asks'))
		$this.add('asks'
			  ,new MacroTabulatedList(ctx,keys,'marketAsks'
						  ,function(res){return displayFunds(ctx,res)})
			  ,$this.element.find('.asks'))	    
	    $this.children['asks'].update(orderbook.asks[exchange])
	}
    }
    WidgetMarketExchangeOrderbook.prototype =$.bit('widget');

    
    var GraphMarketDepth = function(ctx,market,exchange) 
    {
	this.init(ctx)
	this.name = 'bitMarketDepthGraph'
	this.template = 'graph-market-depth'
	var bitmarket = this.bit().coin.trading.markets[market];			      
	var $this = this;
	if (!('params' in this)) this['params'] = {}
	var id = this.uid;

	this.newplotvars = [];

	this.update_data = function()
	{
	    //console.log('hereeeeeeeeee')
	    var market_data = $this.bit().coin.trading.markets[market].data
	    var bid = market_data.tick[exchange].bid;
	    var ask = market_data.tick[exchange].ask;
	    var asks = market_data.asks;
	    var bids = market_data.offers;
	    var average_price = (ask+bid)/2;	   	    
	    var spread_start = Math.round(((average_price/100000000) - .5)*100)/100
	    var spread_end = Math.round(((average_price/100000000) + .5)*100)/100
	    var steps = []
	    var step_value = spread_start
	    for (var i=0;i<101;i++)
	    {
		steps.push(step_value)
		step_value += .05
	    }
	    //console.log(steps)

	    var buyvars = []
	    for (var i=0;i<11;i++)
	    {
		var amount = market_sell_price_calculator(bids[exchange],(steps[i]*100000000))
		buyvars.push([steps[i],amount/100000000])
	    }
	    
	    var sellvars = []
	    for (var i=10;i<21;i++)
	    {
		var amount = market_buy_price_calculator(asks[exchange],(steps[i]*100000000))
		sellvars.push([steps[i],amount/100000000])
	    }

	    if (market == 'mtgox' && exchange == 'USD:BTC')
	    {
		//console.log(buyvars)	
		//console.log(average_price)
		//console.log(sellvars)	
	    }

	    this.plotvars =  [buyvars,sellvars]
	    this.plotsettings = {
		stackSeries: false,
		showMarker: false,
		axes: {
		    xaxis: {
			pad: 0,
			min: spread_start,
			max: spread_end,
		    },
		    yaxis: {
			pad: 0,
			min: 0,
			max: 50000,
		    }
		},
		axesDefaults:{min:0},
		seriesDefaults: {
		    fill: true,
		    fillToZero: true,
		    showMarker:false,
		    //pointLabels: { show:true },
		    rendererOptions: {
			highlightMouseDown: true,
		    }
		}
	    }
	    
	}

	var graph = false;
	var plotvarcache = false;
	this.update_content = function()
	{
	    var graph_el = $('#'+id);
	    if(!graph)
	    {
		graph = $.jqplot(id, $this.plotvars, $this.plotsettings)
		plotvarcache = $this.plotvars;
		$(id).bind('jqplotDataHighlight',
				   function (ev, seriesIndex, pointIndex, data) {
				       $('#info1b').html('series: '+seriesIndex+', point: '+pointIndex+', data: '+data);
				   }
				  );
		
		$(id).bind('jqplotDataUnhighlight',
				   function (ev) {
				       $('#info1b').html('Nothing');
				   }
				  );
	    } else
	    {	
		if ($this.plotvars != plotvarcache)
		{
		    //console.log('replotting')
		    graph.series[0].data = $this.plotvars[0];
		    graph.replot()
		    //console.log($this.plotvars);
		    //console.log(plotvarcache);
		    plotvarcache = $this.plotvars;
		}
	    }
	}
    }
    GraphMarketDepth.prototype =$.bit('widget');

    var WidgetMarketExchangeDepth = function(ctx,market,exchange) 
    {
	this.init(ctx)
	this.name = 'bitMarketExchangeDepth'
	this.template = 'widget-bit-market-exchange-depth'
	var bit = ctx.data('bit');		
	var bitmarket = bit.coin.trading.markets[market];			      
	var $this = this;
	if (!('params' in this)) this['params'] = {}
	var id = 'bitonomy-market-depth-'+market+'-'+exchange.replace(':','_')+'-'+this.uid;
	this.params['id_'] = id;
	this.__proto_children__ = {'depth-graph':{selector: function(){return $this.element.find('.depth-graph')}
						  ,args: [market,exchange]
						  ,child: function(market,exchange){return new GraphMarketDepth(ctx,market,exchange)}}}
    }
    WidgetMarketExchangeDepth.prototype =$.bit('widget');

    var WidgetMarketExchangeCalc = function(ctx,market,exchange) 
    {
	this.init(ctx);
	this.name = 'bitonomyMarketExchangeCalc'
	this.template = 'widget-bit-market-exchange-calc'
	var $this = this;
	if (!('params' in this)) this['params'] = {}
	var curr1 = exchange.split(':')[0];
	var curr2 = exchange.split(':')[1];
	this.params['curr1'] = curr1;
	this.params['curr2'] = curr2;

	var events_added = false
	this.update_content = function()
	{
	    if (events_added) return
	    var updateTotal = function(evt)
	    {
		var total_spend = $(this).val()*100000000
		var asks = $this.bit().coin.trading.markets[market].data.asks[exchange]
		results = market_buy_calculator(asks,total_spend)
		var bought_el = $this.element.find('.results .amount')
		var price_el = $this.element.find('.results .price')
		var total_el = $this.element.find('.results .total')
		var bought = ctx.bitonomy('fund', results['bought'])
		var total_spent = total_spend - results['left']
		var average_price = ctx.bitonomy('fund', ((total_spent*100000000)/results['bought']))
		var spent = ctx.bitonomy('fund', total_spent)
		if (bought_el.html() != bought)
		{
		    bought_el.html(bought)
		}
		if (price_el.html() != average_price)
		{
		    price_el.html(average_price)
		}
		if (total_el.html() != spent)
		{
		    total_el.html(spent)
		}
		
	    }
	    
	    var updateAmount = function(evt)
	    {
		console.log($(this).val())
	    }

	    $this.element.find('input.total').keyup(updateTotal);
	    $this.element.find('input.amount').keyup(updateAmount);	    	    
	    events_added = true;
	}
    }
    WidgetMarketExchangeCalc.prototype =$.bit('widget');


    var WidgetMarketExchangeUtils = function(ctx,market,exchange) {
	this.init(ctx);
	this.name = 'bitonomyMarketExchangeUtils'
	this.template = 'widget-bit-market-exchange-utils';
	var prefix = 'tabs-markets-exchange-utils'
	var utils = ['orderbook','trades', 'depth', 'calc'];
	this.params = {'market': market, 'exchange': exchange, 'prefix': prefix, 'utils': utils};
	var $this = this;
	this.__proto_children__[exchange+'-orderbook'] =  {selector: function(){return $this.element.find('#'+prefix+'-orderbook')}
							   ,args: [market,exchange]
						      	   ,child: function(market,exchange){return new WidgetMarketExchangeOrderbook(ctx,market,exchange)}}
	this.__proto_children__[exchange+'-trades'] = {selector: function(){return $this.element.find('#'+prefix+'-trades')}
						       ,args: [market,exchange]						      
						       ,child: function(market,exchange){return new WidgetMarketExchangeTrades(ctx,market,exchange)}}
	this.__proto_children__[exchange+'-depth'] = {selector: function(){return $this.element.find('#'+prefix+'-depth')}
						      ,args: [market,exchange]						      
						      ,child: function(market,exchange){return new WidgetMarketExchangeDepth(ctx,market,exchange)}}
	this.__proto_children__[exchange+'-calc'] = {selector: function(){return $this.element.find('#'+prefix+'-calc')}
						     ,args: [market,exchange]
						     ,child: function(market,exchange){ return new WidgetMarketExchangeCalc(ctx,market,exchange)}}
	this.update_content = function()
	{
	    var tablength = $this.element.find('ul.titles li.utilTitle.ui-corner-top').length
	    if (tablength != 4 )
	    {
		$this.element.tabs()
	    }
	}
    }
    WidgetMarketExchangeUtils.prototype =$.bit('widget');

    var WidgetMarketExchangeInfo = function(ctx,market,exchange) {
	this.init(ctx);
	var $this = this;
	var exchange_id = exchange.replace(':','-');
	this.name = 'bitonomyMarketExchangeInfo-'+market+'-'+exchange_id;
	this.template = 'widget-bit-market-exchange-info ';
	var target = 'tabs-markets-'+market+'-'+exchange_id;
	this.params = {'market': market, 'exchange': exchange, 'target': target};
	this.__proto_children__[exchange+'-ticker'] =  {selector: function(){return $this.element}
							,child: function(){return new WidgetMarketExchangeTicker(ctx,market,exchange)}}
	this.__proto_children__[exchange+'-utils'] =  {selector: function(){return $this.element}
						       ,child:  function(){return new WidgetMarketExchangeUtils(ctx,market,exchange)}}

    }
    WidgetMarketExchangeInfo.prototype =$.bit('widget');


    var WidgetMarket = function(ctx,market) {
	this.init(ctx);
	var $this = this;
	this.name = 'bitonomyMarket-'+market;
	this.template = 'widget-bit-market';
	this.params = {'market': market};
	this.update_data = function()
	{
	    var bitmarket = $this.bit().coin.trading.markets[market];			      
	    var tick = bitmarket.data.tick;
	    for (var exchange in tick)
	    {	
		if (!(exchange+'-title' in this.__proto_children__))
		{
		    $this.__proto_children__[exchange+'-title'] =  {selector: function(){return $this.element.find('ul.exchanges')}
								    ,args: [market,exchange]
								    ,child:  function(market,exchange){return new WidgetMarketExchangeTitle(ctx,market,exchange)}}

		}
		if (!(exchange+'-info' in this.__proto_children__))
		{
		    $this.__proto_children__[exchange+'-info'] =  {selector: function(){return $this.element}
								   ,args: [market,exchange]
								   ,child:  function(market,exchange){return new WidgetMarketExchangeInfo(ctx,market,exchange)}}
		}
	    }
	}

	this.update_content = function()
	{
	    var bitmarket = $this.bit().coin.trading.markets[market];			      
	    var tick = bitmarket.data.tick;
	    var i = 0;
	    for (var exchange in tick)
	    {		
	    	i++;
	    }
	    var tablength = $this.element.find('li.bitonomyMarketExchangeTitle.ui-corner-top').length

	    if (tablength != i )
	    {
		//console.log('loading tabs done');
		$this.element.tabs('destroy')
		$this.element.tabs()
	    }
	    //console.log($this.widget.popups);
	    if ('popups' in $this)
	    {
		for (var p in $this.popups)
		{
		    $this.popups[p].update();
		}
	    } else $this['popups'] = []

	    var loaded = function(popup)
	    {
		var marketLoaded = function(popup_market)
		{
		    $this.popups.push(popup_market)
		    popup.element.dialog({width: "23em",
					  show: "drop",
					  hide: "drop"
					  ,beforeClose: function()
					  {
					      var popups = [];
					      for (var p in $this.popups)
					      {
						  if ($this.popups[p] != popup_market)
						  {
						      popups.push($this.popups[p]);
						  }
					      }
					      $this.popups = popups;
					  }})
		};
		popup.add(market
			  ,new WidgetMarket(ctx,market)
			  ,popup.element
			  ,marketLoaded)		
	    }					

	    $.each($this.element.find('.sectionHeader .button a'),
		   function(i,item)
		   {
		       $(item).unbind('click.popup');		       
		       $(item).bind('click.popup'
				    ,function(evt)
				    {
					evt.preventDefault();					
					var popup = $.jtk('popup').attach($this.ctx
									  ,$this
									  ,'popup-'+market
									  ,loaded)					
				    })
		   })
		}
    }			
    WidgetMarket.prototype =$.bit('widget');

    var WidgetMarkets = function(ctx) {
	this.init(ctx);
	var $this = this;
	this.name = 'bitonomyMarketsWidget'
	this.template = 'widget-bit-markets'
	this.update_data = function()
	{
	    for (var market in $this.bit().coin.trading.markets)
	    {		
		if (!(market in $this.__proto_children__))
		{
		    $this.__proto_children__[market] =  {selector: function(){return $this.element}
							 ,args: [market,]
							 ,child:  function(market){return new WidgetMarket(ctx,market)}
							}
		}
	    }	    
	}
    }
    WidgetMarkets.prototype = $.bit('widget');
	
    var PanelMarkets = function(ctx){
	this.init(ctx);
	this.template = 'panel-bit-markets'
	this.name = 'bitonomyMarkets'
	var $this = this;
	this.__proto_children__ = {'widget-markets':{selector: function(){return $this.element}
						     ,child:  function(){return new WidgetMarkets(ctx)}}}
    };
    PanelMarkets.prototype = $.bit('panel')

    var BitCoinTrading = {
	init: function(option)
	{
	    return this;
	},
	activity: 'coin',
	plugin: 'trading',
	template_url: 'http://localhost:8080/bitonomy/bitonomy-trading-elements.html',
	templates: {'http://localhost:8080/bitonomy/bitonomy-trading-elements.html':[]},

	renderCenter: function(ctx,content,cb)
	{
	    var active = ctx.data('active');
	    
	    var loader = ''
	    if (active.content.right == 'trading.account.exchanges')
	    {
		var loaderid = 'trading.account.exchanges'
		loader = PanelAccountExchanges;
	    }
	    else if (active.content.right == 'trading.account.funds')
	    {
		var loaderid = 'trading.account.funds'
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

    $.bit('plugins').register_plugins({'bit.coin.trading':BitCoinTrading.init()})

})( jQuery );










