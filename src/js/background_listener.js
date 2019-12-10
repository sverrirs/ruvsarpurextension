/*
Change the behavior of the extension icon click
 */
chrome.browserAction.setPopup({popup:''});  //disable browserAction's popup
chrome.browserAction.onClicked.addListener(()=>{
    chrome.tabs.create({url:'options/options.html'});
});

/* 
  Listen to various player change events on the page 
  this is used to track selected bitrate, current location when stopped etc.
*/
chrome.runtime.onMessageExternal.addListener(
  function(request, sender, sendResponse) {

    /**
     * Handling setting queries
     */
    function checkOptionsSettings(val) {
      if( !val || !val.options) return;
      var options = val.options;

      if( request.settingName in options 
        && options[request.settingName].enabled
        && options[request.settingName].value ){
          sendResponse(options[request.settingName]);
        }
    }

    /**
     * Saves the current video playback location for later restoring
     */
    function saveCurrentVideoLocation(request, val){
      var videoloc = val.videoloc || {};

      var pos = videoloc.pos || [];

      // Attempt to find the current video
      var videoId = request.videoId;
      var videoPos = request.currentPos;
      
      var existing = pos.find(element => element.videoId === videoId);
      if( !existing ){
        existing = request;
        pos.push(existing);
      } else {
        existing.currentPos = videoPos;
      }

      // If there are too many videos in here, more than 10
      // then pop the oldest off until we have again no more than 10
      if( pos.length > 10 ){
        pos.splice(0, pos.length - 10);
      }

      // Update and save the data
      videoloc.pos = pos;
      chrome.storage.sync.set({videoloc});
    }

    /**
     * Get the previous location of the video in question or nothing if
     * the video has not been abandoned before (with less than 10% remaining)
     */
    function getCurrentVideoPreviousLocation(request, val){
      if( !val || !val.videoloc || !val.videoloc.pos || val.videoloc.pos.length <= 0) return;
      var pos = val.videoloc.pos;

      var videoId = request.videoId;
      var videoPos = request.currentPos;

      var existing = pos.find(element => element.videoId === videoId);
      if( !existing ){
        sendResponse(undefined);
      } else {
        sendResponse(existing);
      }
    }


    //{type:'checksetting', settingName: settingName}
    if( !request.type) return;

    if( request.type === 'checksetting'){
      chrome.storage.sync.get("options", checkOptionsSettings);
      return;
    }

    if( request.type === 'savelocation'){
      if( request.videoId ){
        chrome.storage.sync.get('videoloc', function(val){ saveCurrentVideoLocation(request, val)});
      }
      return;
    }

    if( request.type === 'getlocation'){
      if( request.videoId ){
        chrome.storage.sync.get('videoloc', function(val){ getCurrentVideoPreviousLocation(request, val)});
      }
      return;
    }
    
    return true; //Important
  });


