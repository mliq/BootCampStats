window.LinkedIn = window.LinkedIn || {};  // namespace
LinkedIn.jQuery = jQuery;

window.li_plugin_generator_name = window.li_plugin_generator_name || '';

(function($, undef) {                  // preserve jQuery $ alias
var FRAMEWORK = '<script src="//platform.linkedin.com/in.js" type="text/javascript">{PARAMS}</script>\n';
var COMMENT = 'LIComment_'+(new Date().getTime());
var MAX_RESULTS_PER_CATEGORY = 10;
var INITIAL_LOAD_DELAY = 1000; // delay in ms
var PROTOCOL = (location.href.match(/^https:\/\//)) ? 'https://' : 'http://';

var TA_URL = {
  user    : '',
  company : PROTOCOL+'www.linkedin.com/ta/federator?types=company,showcase&query={TERM}',
  school  : PROTOCOL + 'www.linkedin.com/ta/federator?types=school&query={TERM}',
  product : ''
};

// handy function to reverse the order of a collection
// this will be used to step through a collection in reverse order
$.fn.reverse = function() {
  return this.pushStack(this.get().reverse(), arguments);
};

$(function() {                        // wait for on DOMReady
// since this is going to be running on every page (thank you Jive),
// we should check to see that this is actually a generator page
// before playing with stuff
if( !$('.widget #sandbox').length ) {
  return;
}
var $buttonsTypes = $(".button-types li");
var $sandbox = $('#sandbox');
var gotCode = false;
LinkedIn.data = {};

// pick up user data from Jive
// if it's available we won't use Connect
var userData = $('#user-data').text();
if(userData) {
  // remove tabs and newlines, thanks Jive
  LinkedIn.data = $.parseJSON(userData.replace(/[\t\r]/g,''));
  // trim extra whitespace
  $.each(LinkedIn.data, function(i){
    LinkedIn.data[i] = LinkedIn.data[i].replace(/^\s+|\s+$/g,"");
  });
  if(LinkedIn.data.publicProfileUrl && LinkedIn.data.companyName) {
    LinkedIn.data.dontUseConnectLogin = true;
  }
}

/* ***********************
 *  Helper Functions     *
 *********************** */
// get user inputs and prepare them for use in the jQ template
var getInputs = function(special) {
  var inputs = {};
  inputs[COMMENT] = [];
  $('input, textarea').reverse().each(function() {
    var $$ = $(this);
    var name = $$.attr('name');
    
    if( name && !$$.is('.ignore') ) {
      // some hack stuff for IE to work with templates
      // if we haven't already set the 
      if( !inputs.hasOwnProperty(name) ) {
        inputs[name] = false;
      }
      // we dont want to include options that arent visible or disabled
      if( !$$.parent().is(':visible') || $$.is('.disabled') ) {
        return;
      }
      
      var data = $.parseJSON( $$.attr('alt').replace(/'/g,'"') ) || {};
      
      //var comment = $$.attr('data-comment');
      var comment = data['comment'];
      var inverted = $$.is('.inverted');
      var checked = $$.is(':checked');
      var hasValue = $$.is(':text, textarea, :checked');
      
      // if there are any comments, move those along
      // we only want comments for parameters that are passed along
      // however, we have to take the inverted cases into account
      if( comment && special === true ) {
        if( ((inverted && !checked) || hasValue) ) {
          if( !(hasValue && inverted) ) {
            inputs[COMMENT].push(comment);
          }
        }
      }
      
      // now let's get the real values
      if( hasValue ) {
        if( !inputs[name] ) {
          inputs[name] = [];
        }
        //var val = $$.val() || ($$.attr('data-default') || null);
        var val = $$.val();
        if(val==='NONE') {
          val = '';
        }
        val = val || (data['default'] || null);
        
        if( $$.is('.expander') && !val ) {
          inputs[name] = null;
        }
        else {
          if( $$.is('.typeahead') ) {
            //var mapTo = $$.attr('data-typeahead-mapto');
            var mapTo = data['typeahead-mapto'];
            val = $(mapTo).val() || val;
            if(data.ifNotNumeric) {
              // check if it's numeric
              if( !(/^\d+$/.test(val)) ) {
                name = data.ifNotNumeric;
                if( !inputs[name] ) {
                  inputs[name] = [];
                }
              }
            }
          }
          inputs[name].push(val);
        }
        //}
        // replace values
        //var key = $$.attr('data-key');
        //var value = $$.attr('data-value');
        var key = data['key'];
        var value = data['value'];
        if( $$.is('.extend') && value ) {
          if( LinkedIn.data[value] ) {
            if( !inputs[key] ) {
              inputs[key] = [];
            }
            inputs[key].push( LinkedIn.data[value] );
          }
        }
      }
    }
  });
  // now concat any arrays that were created
  // this is where it is important to do it in reverse order
  // if we don't do it in reverse order, sub options will have to
  // be recursively joined, but by traversing the collection in
  // reverse order, they are already concatenated when we need them!
  $.each(inputs, function(i) {
    // if multiple options were selected, concat
    if( $.isArray(inputs[i]) ) {
      if(i === COMMENT) {
        inputs[i] = inputs[i].reverse().join('<br/>');
      }
      else {
        inputs[i] = inputs[i].reverse().join(',');
      }
    }
    // now for any null values, they should map to a suboption
    if( inputs[i] === null ) {
      var target = i+'-expand';
      if( inputs.hasOwnProperty(target) ) {
        inputs[i] = inputs[target];
      }
    }
  });
  return inputs;
};

// get code
LinkedIn.getCode = function( special ) {
  var input = getInputs(special);
  var $temp = $('<div>');
  LinkedIn.jQuery('#codeTemplate').tmpl(input).appendTo($temp);
  delete $temp;
  
  var params = [];
  // use an API Key in the framework if needed
  if($('.api-key-is-needed').length) {
    params.push("  api_key: "+(special ? Drupal.settings.linkedin_sso.api_key : "YOUR_API_KEY"));
  }

  var apikey = document.getElementById('apikey');
  if(apikey) {
    params.push("  api_key: "+apikey.value);
  }
  if($('.noauth-enabled').length) {
    params.push("  noAuth: true");
  }

  var extensions = document.getElementById('extensions');
  if (extensions) {
    params.push("  extensions: " + extensions.value);
  }

  // if locale is specified, use it to localize plugin
  if($('.locale-enabled').length) {
	var localeValue = document.getElementById('locale');
    params.push("  lang: "+localeValue.value);
  }
  
  // if we have any params, add some linebreaks for readability
  if(params.length) {
    // push empty string on the beginning and end of the stack
    params.unshift("");
    params.push("");
  }
  // allow the iframe to run on SSL, but force the copy-paste code to be on http://
  var protocol = (special) ? PROTOCOL : 'http://';
  // IE generates all tags in CAPS, so we will lowecase them to be nice to xhtml developers
  return FRAMEWORK.replace(/\{PARAMS\}/gi, params.join("\n")).replace(/\{PROTOCOL\}/gi, protocol) + $temp.html().replace(/SCRIPT/gi,"script") + (special ? '<div class="comment">'+input[COMMENT]+'</div>' : '');
};

LinkedIn.doIt = function(force, minWidth) {
  var isUpdated = showCode();
  isUpdated = force || isUpdated;
  LinkedIn.renderWidget( isUpdated, minWidth );
}

function fire_cc_track_event() {
		window._gaq.push(['_trackEvent', 'Plugins', 'CutCopy', window.plugin_generator_name]);
}

$("#widget-code").bind({
	copy : fire_cc_track_event,
	cut : fire_cc_track_event
});

function fire_gc_track_event() {
		window._gaq.push(['_trackEvent', 'Plugins', 'GetCode', window.li_plugin_generator_name]);
}

// show code
var showCode = function() {
  var $$ = $('#widget-code');
  var code = LinkedIn.getCode();
  // we can't just compare code with $$.val() thanks to IE
  var oldCode = $$.val();
  $$.val( code );
  var newCode = $$.val();
  //$$.each( function() { this.focus(); } )
	fire_gc_track_event();
  return (oldCode !== newCode);
};

// render widget
LinkedIn.renderWidget = function( updated, minWidth ) {
  // don't render the widget if the code hasn't changed or
  // the Get Code button hasnt been clicked yet
  if(!updated) {
    return;
  }
  // TODO: this needs to be finished
  // if a dirty sandbox exists, we will use it to inject our code into,
  // otherwise we need to create a dirty iframe
  if( $('.sandbox.dirty iframe').length ) {
    
  }
  
  minWidth = minWidth || '';
  var scrolling = minWidth ? '' : 'scrolling="no"';
  
  // /sites/all/themes/dlc/sandbox.php
  $('#sandbox').empty().append('<iframe id="sandboxrunner" src="/sites/all/themes/dlc/sandbox.php?'+minWidth+'" '+scrolling+' frameborder="no" align="center">');
};

LinkedIn.updateValues = function() {
  $('.connect-onauth').each(function(){
    var $$ = $(this);
    var data = $.parseJSON( $$.attr('alt').replace(/'/g,'"') ) || {};
    //var onauth = $$.attr('data-onauth');
    var onauth = data.onauth;
    $$.val(LinkedIn.data[onauth]);
  });
  LinkedIn.doIt(true);
};

var textUpdate = function($$) {
  var data = $.parseJSON( $$.attr('alt').replace(/'/g,'"') ) || {};
  if($$.is('.typeahead')) {
    //var mapTo = $$.attr('data-typeahead-mapto');
    var mapTo = data['typeahead-mapto'];
    $(mapTo).val( $$.val() );
  }
  if(data['dataOverride']) {
    LinkedIn.data[ data['dataOverride'] ] = $$.val();
  }
  LinkedIn.doIt();
}

/* ***********************
 *  Process DOM          *
 *********************** */
var urlParams = {};
(function () {
  var e,
  a = /\+/g,  // Regex for replacing addition symbol with a space
  r = /([^&=]+)=?([^&]*)/g,
  d = function (s) { return decodeURIComponent(s.replace(a, " ")); },
  q = window.location.search.substring(1);
  
  while (e = r.exec(q)) {
    urlParams[d(e[1])] = d(e[2]);
  }
})();
$.each(urlParams, function(i) {
  if(urlParams[i] === "true") {
    $('#'+i).attr('checked',true);
  }
});

$buttonsTypes.each(function() {
  $(this).append('<span class="checkmark"/>');
});

$('input','.toggle-button').each(function() {
  var $$ = $(this);
  var data = $.parseJSON( $$.attr('alt').replace(/'/g,'"') ) || {};
  
  var checked = $$.is(':checked');
  
  if($$.is('.inverted')) {
    checked = !checked;
  }
  checked = (checked ? ' on' : ' off');
  var label={
    on : data['on'] || 'On',
    off: data['off'] || 'Off'
    // on : $$.attr('data-on') || 'On',
    // off: $$.attr('data-off') || 'Off'
  }
  $$.wrap('<div class="toggle state'+checked+'">');
  $$.parent().append('<span class="label on ui-corner-left">'+label.on+'</span><span class="label off ui-corner-right">'+label.off+'</span>');
});

// help tips
$('.help-tip').each(function() {
  var $$ = $(this);
  var title = $$.attr('title');
  $$.attr('title','');
  var tip = $('<span class="tooltip" title="'+title+'"></span>');
  $(tip).qtip({
    position: {
      corner : {
        target: 'rightMiddle',
        tooltip : 'leftMiddle'
      }
    },
    style: {
      border: {
        width: 2,
        color: '#ccc'
      }
    }
  });
  $$.after(tip);
});



/* ***********************
 *  Event Handlers       *
 *********************** */
// typeahead
$('.typeahead').each(function() {
  var $$ = $(this);
  var elData = $.parseJSON( $$.attr('alt').replace(/'/g,'"') ) || {};
  //var mapTo = $$.attr('data-typeahead-mapto') || this;
  var mapTo = elData['typeahead-mapto'] || this;
  $$.autocomplete({
    source: function( request, response ) {
      var type = elData['typeahead'];
      if(!type) {
        return false;
      }
      $.ajax({
        url: TA_URL[type].replace(/\{TERM\}/g, encodeURIComponent(request.term)),
        dataType: 'jsonp',
        success: function( data ) {
          var _data = [];
          var keys = [];
          $.each(data, function(key) {
            keys.push(key);
          });
          keys.reverse();

          for(var i in keys) {
            var list = data[keys[i]].resultList;
            if(list) {
              $.each(list, function(j) {
                if(j >= MAX_RESULTS_PER_CATEGORY/keys.length) {
                  return true;
                }
                var result = list[j];
                _data.push({
                  label: result.displayName,
                  id   : result.id
                });
              });
            }
          };

          data = _data;
          response( $.map(data, function( item ) {
            return {
              label: item.label,
              id   : item.id
            }
          }));
        }
      });
    },
    minLength: 2,
    select: function( event, ui ) {
      if(ui.item) {
        $(mapTo).val(ui.item.id);
        if(elData['dataOverride']) {
          LinkedIn.data[ elData['dataOverride'] ] = $$.val();
        }
        if (elData['dataTypeaheadValueMapTo']) {
          $(elData['dataTypeaheadValueMapTo']).val(ui.item.value);
        }
        if (elData['dataTypeaheadSeoMapTo']) {
          var seoName = ui.item.value.split(' ').join('-').toLowerCase() + '-' + ui.item.id;
          $(elData['dataTypeaheadSeoMapTo']).val(seoName);
        }
      }
      $$.data('valid', true);
      LinkedIn.doIt();
    }
  });
})
.live('blur', function() {
  var $$ = $(this);
  var elData = $.parseJSON( $$.attr('alt').replace(/'/g,'"') ) || {};
  //var mapTo = $$.attr('data-typeahead-mapto') || this;
  var mapTo = elData['typeahead-mapto'] || this;
  
  if( !($$.is('.unset-map-on-blur') || $$.is('.no-blur') ) ) {
    if( $('.ui-autocomplete li:visible').length ) {
      item = $($(".ui-autocomplete li:visible:first").data()).attr('item.autocomplete');
      $$.val(item.label);
      $(mapTo).val(item.id);
      $$.data('valid', true);
      LinkedIn.doIt();
    }
  }
  else if($$.is('.unset-map-on-blur')) {
    if($$.data('valid')) {
      LinkedIn.doIt();
    }
    else {
      $(mapTo).val('');
      LinkedIn.doIt();
    }
    $$.data('valid', false);
  }
});

// capture code click
$('#get-code').click(function(event) {
  gotCode = true;
  $('.gen-code').slideDown();
  LinkedIn.doIt();
  event.preventDefault();
});

// capture check/radio boxes
$(':checked',$buttonsTypes).each(function() {
  var $$ = $(this);
  $$.parent().addClass('selected');
  if( $$.is('.expander') ) {
    var target = '.'+$$.attr('id')+'.expand';
    $(target).show();
  }
});

$buttonsTypes.click( function(event) {
  var $$ = $(this);
  var $button = $('input',$$);
  var checked = $button.attr('checked');
  var expandTarget = '.' + $button.attr('id') + '.expand';
  var $neighbors = $$.parent().siblings();
  
  // toggle button states
  if( $button.is(':radio') ) {  // it's a radio button
    if(checked) {
      return;
    }
    $('li', $$.parent()).removeClass('selected');
  }
  
  if( $button.is('.expander') ) {
    var $parent = $('.expand:not('+expandTarget+')',$$.parent().parent()).slideUp();
    $(expandTarget).slideDown();
    $('input',$parent).addClass('ignore');
    $('input',$(expandTarget)).removeClass('ignore')
  }
  else {
    var $parent = $('.expand',$$.parent().parent()).slideUp();
    $('input',$parent).addClass('ignore');
  }
  
  $button.attr('checked',!checked);
  if(checked) {
    $$.removeClass('selected');
  }
  else {
    $$.addClass('selected');
  }
  
  // now do the real stuff
  LinkedIn.doIt();
  event.preventDefault();
});


$('.toggle-button').click(function(event) {
  var $$ = $(this);
  var $button = $('input',$$);
  var checked = $button.attr('checked');
  var classes = ['on', 'off'];
  
  $('.toggle',$$).toggleClass('on').toggleClass('off');
  
  //$('.toggle',$$).addClass(classes[!checked]).removeClass(classes[checked]);
  $button.attr('checked',!checked);
  
  LinkedIn.doIt();
  event.preventDefault();
  
});

$('.toggle-button').focus(function() {
  this.blur();
})
.select(function() {
  this.blur();
});

// set the code area to autoselect text
$('#widget-code').focus(function() {
  this.select();
});


// capture ENTER presses on input
$(':text:not(.typeahead)').live('change', function() {
  textUpdate( $(this) );
});

/******************************/

if(LinkedIn.data && LinkedIn.data.dontUseConnectLogin) {
  if( $('#company-id').length ) {
    $.ajax({
      url: TA_URL['company'].replace(/\{TERM\}/g, LinkedIn.data.companyName),
      dataType: 'jsonp',
      success: function( data ) {
        var _data = [];
        $.each(data, function(i) {
          var list = data[i].resultList;
          if(list) {
            LinkedIn.data.companyID = list[0].id;
          }
          LinkedIn.updateValues();
        });
      }
    });
  }
  else {
    LinkedIn.updateValues();
  }
}
else {
  LinkedIn.timer = setTimeout(function() {
    LinkedIn.doIt(true);
  }, INITIAL_LOAD_DELAY);
}

$('#loggedOut').tmpl().appendTo('.auth-state');

});                                   // END wait for on DOMReady
})(LinkedIn.jQuery);                   // END preserve jQuery $ alias

// do this on logout
LinkedIn.onLogout = function() {
  LinkedIn.jQuery(function() {
    var $ = LinkedIn.jQuery;
    var $auth = $('.auth-state').empty();
    if(LinkedIn.data) {
      LinkedIn.data.fullName = '';
      LinkedIn.data.publicProfileUrl = '';
      LinkedIn.data.companyName = '';
      LinkedIn.data.companyID = '';

	  $('#loggedOut').tmpl().appendTo('.auth-state');
    }
  });
}

// do this on login
LinkedIn.onLogin = function() {
  LinkedIn.jQuery(function() {
    // if we authed fast enough, we won't make the initial render call
    // and instead will wait until we have completed a profile call to
    // load the user's customized profile
    clearTimeout( LinkedIn.timer );
    var $ = LinkedIn.jQuery;
    var $auth = $('.auth-state').empty();
    if(LinkedIn.data && !LinkedIn.data.dontUseConnectLogin) {
      IN.API.Profile("me")
      .fields(["id", "firstName", "lastName", "pictureUrl", "publicProfileUrl", "positions"])
      .result( function(result) {
        var me = result.values[0];

        LinkedIn.data.fullName = ((me.firstName || '') + ' ' + (me.lastName || '')).replace(/"/g, '&quot;');
        LinkedIn.data.publicProfileUrl = me.publicProfileUrl || '';

        LinkedIn.data.companyName = '';
        LinkedIn.data.companyID = '';

        if(me.positions && me.positions.values[0].company) {
          var company = me.positions.values[0].company;
          LinkedIn.data.companyName = (company.name || '').replace(/"/g, '&quot;');
          LinkedIn.data.companyID = (company.id || 1337);
        }
        
        $('#loggedIn').tmpl(me).appendTo($auth);

        LinkedIn.updateValues();
      });
    }
  });
}

function tryLI() {
  if(typeof(IN)!=="undefined" && IN.Event && IN.Event.on) {
    IN.Event.on(IN, "auth", LinkedIn.onLogin );
    IN.Event.on(IN, "logout", LinkedIn.onLogout );
    return;
  }
  setTimeout(tryLI, 10);
}

setTimeout(tryLI, 1);
