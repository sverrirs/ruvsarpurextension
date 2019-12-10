/**
 * Main entry point for the script loaded on player enabled pages
 * e.g. beint/spila that kind of thing
 */
$( document ).ready(function() {

  // In order for the sendMessages to work properly from the page we need
  // to make the content scripts aware of the id that we should send to
  // only alternative is to hard-code it and that is just awkward.
  injectExtensionId();

  // Inject external libraries to interact with the page elements properly, 
  // ensure that each is loaded before the next is injected
  injectScript('js/lib/jquery-3.4.1.min.js', function(){
    injectScript("js/lib/jquery.visible.min.js", function(){
      injectScript('js/inject_keyboardshortcuts.js');
    });
  });
});