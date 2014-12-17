jQuery(document).ready(function document_ready_cb() {
	jQuery.getScript("https://platform.linkedin.com/in.js?async=true", function framework_loaded_cb() {
		var drupal_linkedin_sso_return_uri = encodeURIComponent(window.location.href.replace(/^http:\/\//, 'https://'));
		var drupal_linkedin_sso_login_uri = Drupal.settings.linkedin_sso.base_url.replace(/^http:\/\//, 'https://') + '/linkedin_sso/login?return=' + drupal_linkedin_sso_return_uri;
		var drupal_linkedin_sso_loggedout_home_uri = Drupal.settings.linkedin_sso.base_url.replace(/^https:\/\//, 'http://');
		var drupal_linkedin_sso_logout_uri = Drupal.settings.linkedin_sso.base_url.replace(/^http:\/\//, 'https://') + '/user/logout?no_jsapi_logout=1';
		
		function getCookie(name) {
			var i,key,value,cookies=document.cookie.split(";");
			for (i=0; i<cookies.length; i++) {
		  		key = cookies[i].substr(0,cookies[i].indexOf("="));
		  		value = cookies[i].substr(cookies[i].indexOf("=")+1);
		  		key = key.replace(/^\s+|\s+$/g,"");
		  		if (key == name) {
		    		return unescape(value);
		    	}
		  	}
			return false;
		}
		
		IN.Event.on(IN, 'frameworkLoaded', function() {
			IN.Event.on(IN, 'logout', function() {
				setTimeout(function() {
					window.location.href = drupal_linkedin_sso_loggedout_home_uri;
				}, 2000);
			});

			if(!IN.User.isAuthorized()) {
				// user isn't LI authed, so register handler for if that happens to redirect to Drupal side login handler
				IN.Event.onOnce(IN, 'auth', function() {
					window.location.href = drupal_linkedin_sso_login_uri + '&oauth_token=' + encodeURIComponent(IN.ENV.auth.oauth_token) + '&member_id=' + encodeURIComponent(IN.ENV.auth.member_id);
				});
				
				// if user is logged into Drupal, but not LI, log them out
				if(Drupal.settings.linkedin_sso.active_session) {
					window.location.href = drupal_linkedin_sso_logout_uri;
				}
			} else {
				// if user is LI authed, but doesn't have a drupal active session, redirect them to do Drupal login if we aren't in the process of logging them out
				setTimeout(function() {
					if(!Drupal.settings.linkedin_sso.active_session && window.location.pathname != "/linkedin_sso/logout") {
						window.location.href = drupal_linkedin_sso_login_uri + '&existing_auth=1' + '&oauth_token=' + encodeURIComponent(IN.ENV.auth.oauth_token) + '&member_id=' + encodeURIComponent(IN.ENV.auth.member_id);
					}
				},1);
			}
			
			try {
				if(drupal_linkedin_sso_load_callback && drupal_linkedin_sso_load_callback.call) {
					drupal_linkedin_sso_load_callback(drupal_linkedin_sso_loggedout_home_uri);
				}
			} catch(e) {
				
			}
			
			// attach LinkedIn SSO login handler
			var user_base_prefix_selector = Drupal.settings.linkedin_sso.base_path + 'user';
			//console.log(user_base_prefix_selector);
			jQuery('a[href="' + user_base_prefix_selector + '"], a[href^="' + user_base_prefix_selector + '/login"]').click(function user_login_link_click_handler(event) {
				try { 
					IN.User.authorize();
					event.preventDefault();
					return false;
				}
				catch(e) { 
					alert("Error: " + e.message);
					return false;
				}
			});

			// registration links point to linkedin.com
			jQuery('a[href^="' + user_base_prefix_selector + '/register"]').attr({
				href: "http://www.linkedin.com",
				target: "_blank"
			});
		});
		
		IN.init({
		    api_key: Drupal.settings.linkedin_sso.api_key,
			credentials_cookie: "true",
			authorize: "true",
			entropy: Drupal.settings.linkedin_sso.entropy
		});
	});
});



