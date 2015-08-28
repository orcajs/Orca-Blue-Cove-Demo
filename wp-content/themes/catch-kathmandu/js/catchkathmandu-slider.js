/*!
 * Custom scripts for jQuery Cycle set up
 * Version: 1.0
 * Description: Featured slider to display in header.php
 */
 
jQuery(window).load(function() {

var transition_effect = js_value.transition_effect;
var transition_delay = js_value.transition_delay;
var transition_duration = js_value.transition_duration;
jQuery('.featured-slider').cycle({ 
    fx:            		transition_effect, // name of transition effect (or comma separated names, ex: 'fade,scrollUp,shuffle') 
    pager:  			'#controllers',  // element, jQuery object, or jQuery selector string for the element to use as pager container 
	prev:				'.slide-previous',
	next:				'.slide-next',
	activePagerClass: 	'active',  // class name used for the active pager element
	timeout:       		transition_delay,  // milliseconds between slide transitions (0 to disable auto advance) 
	speed:         		transition_duration,  // speed of the transition (any valid fx speed value) 
	pause:         		1,     // true to enable "pause on hover" 
	pauseOnPagerHover: 	1, // true to pause when hovering over pager link 
	width: 				'100%',
	containerResize: 	0,   // resize container to fit largest slide 
	fit:           		1,
	after: function (){
        jQuery(this).parent().css("height", jQuery(this).height());
     }	
});

});