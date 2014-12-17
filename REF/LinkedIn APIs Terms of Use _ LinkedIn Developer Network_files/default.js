window.LinkedIn = window.LinkedIn || {};        // namespace

(function($, undef) {									// preserve jQuery $ alias
$(function() {												// wait for on DOMReady

$('.bar > ul > li', '.global-nav').hover(
  function() { $(this).addClass('hover'); },
  function() { $(this).removeClass('hover'); }
);

$('.api-preview','.content').each(function(){
  var $$ = $(this);
  var $toggle = $('<ul class="toggle"/>');
  var $caption = $('<span class="caption"></span>');
  var $jsCode = $('.jsapi', $$);
  var $restCode = $('.rest', $$);
  
  function makeLink(type) {
    var $link = $('<li><a href="#">'+type+'</a></li>').click(function(event){
      if(type==='REST') {
        $jsCode.slideUp();
        $restCode.slideDown();
      }
      else {
        $restCode.slideUp();
        $jsCode.slideDown();
      }
      $caption.text(type + ' Example');
      $('.selected', $toggle).removeClass('selected');
      $(this).addClass('selected');
      event.preventDefault();
    });
    $toggle.append($link);
  }
  
  if($restCode.length) {
    makeLink('REST');
  }
  if($jsCode.length) {
    makeLink('JavaScript');
  }
  
  $('li:first a', $toggle).click();
  $$.append($toggle);//.append($caption);
});

});   																// END wait for on DOMReady
})(jQuery);   				        				// END preserve jQuery $ alias