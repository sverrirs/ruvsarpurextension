function injectScript(path, continuation){
  var s = document.createElement('script');

  // TODO: add "script.js" to web_accessible_resources in manifest.json
  s.src = chrome.runtime.getURL(path);
  s.onload = function() { 
    this.remove();
    if( continuation ){
      continuation(); 
    }
  };
  (document.head || document.documentElement).appendChild(s);
}

function injectExtensionId(){
  var s = document.createElement('span');
  s.className = "ruvsarpurextensionid";
  s.id = chrome.runtime.id;
  (document.head || document.documentElement).appendChild(s);
}