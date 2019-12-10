function waitForPlayerToBecomeReady(){
  var player = window.THEOplayer.players[0];  

  if( !player || player === undefined || !player.addEventListener ){
    console.debug("Player instance not ready, waiting");
    setTimeout( waitForPlayerToBecomeReady, 1000);
    return;
  }

  console.debug("Player instance READY");
  customizePlayer(player);

  // Setup an regular check to see if the player instance needs to be fixed
  setTimeout(function(){ handlePlayerInstanceIsOutDated(player)}, 2000);
}

function handlePlayerInstanceIsOutDated(player){
  if( $('button.vjs-big-play-button').is(':visible') && player !== window.THEOplayer.players[0]) {
    // If the big play button is visible 
    // again then we need to update the 
    // reference to the player
    player = window.THEOplayer.players[0]; 
    console.debug("Player instance updated, as big play button is visible");
    customizePlayer(player);
  }

  setTimeout(function(){ handlePlayerInstanceIsOutDated(player)}, 2000);
}

// Start the wait for the player instance
waitForPlayerToBecomeReady();

/**
 *  Executes the customizations for the player control
 * @param {THEOplayer} player 
 */
function customizePlayer(player) {
  if( !player ) return;

  // Setup callback to check to see if we should play next
  player.addEventListener('ended', function(e) {
    console.debug('ended event detected!');
    
    // Check to see if the play next setting is enabled, 
    checkSetting('autoPlayNext', handlePlayNextEpisode);
  });

  // Set the default quality of the player
  checkSetting('videoQuality', handlePlayerSetInitialBitrate);

  // Set the default next up if that is enabled
  checkSetting('showNextUp', handleSetNextUpInPlayer);

  // detect video tracks being added to the player
  player.videoTracks.addEventListener('addtrack', function(e0) {
    console.debug('addTrack event detected');

    // Set the default quality of the player
    checkSetting('videoQuality', function(e){handleTrackSetBitrate(e0, e)});

    // Check to see if we should offer the user to start playing from an earlier timepoint
    checkSetting('rememberLastLocation', handlePlayVideoFromLastLocation);

    // detect quality changes of a track
    /*e0.track.addEventListener('activequalitychanged', function(e1) {
        handlePlayerEvent_BitrateChange(e1);
    });*/
  });  

  // Track the current play position to be able to save it for the user
  player.addEventListener('timeupdate', function(e) {
    saveVideoLocation(window.location.href, player.currentTime.toFixed(2), player.duration.toFixed(2));    
  });

  // Check to see if we should start the player immediately after page load
  checkSetting('startPlayOnLoad', handlePlayerStartImmediatelyAfterPageLoad);

  /**
   * Checks to see if the user has already played this video and then where he/she left off
   * offers the user to restore the current location to that point in time
   */
  function handlePlayVideoFromLastLocation(){
    // TODO: Tracking playback location https://demo.theoplayer.com/keeping-track-of-currenttime-timeupdate
    // TODO: How do i present the option to the user
    sendMessage({type:'getlocation', videoId: window.location.href},
              function(response){
                if(!response || !response.videoId || !response.currentPos ) return;

                // If the user was at the end don't restore them to the end
                var percent = parseInt( (response.currentPos/response.totalDuration)*100);
                if( percent > 95 ){
                  console.debug("User has played over 95% of the video, not restoring the last playback location");
                  return;
                }

                // Don't restore the user to a playback location in the past
                if( player.currentTime < response.currentPos){
                  player.currentTime = response.currentPos;
                  console.debug("Found previous playback location for video, setting player to it now");
                }
              });
  }

  /**
   * Leverages the built-in properties of the player to show the up-next screen
   */
  function handleSetNextUpInPlayer(){

    var nextEpEl = $('a.playing').prev('a');
    if( !nextEpEl || nextEpEl.length <= 0 ){
      return;
    }

    // Need to manipulate the urls a bit otherwise we end up in 
    // a bad link situation
    var searchPart = nextEpEl.attr('href');
    searchPart = searchPart.substr(searchPart.indexOf('?'));
    var nextUpLink = window.location.origin + window.location.pathname + searchPart;

    // Apply the next up config
    player.upnext.source = {
      image : nextEpEl.find('img').attr('src'),
      title : nextEpEl.find('h2').text(),
      duration : undefined,
      link : nextUpLink
      };

    // a percentage (e.g. "10%"): the bar will be displayed during the last 10% of the video.
    // or a number (e.g. 10): the bar will be displayed from 10 seconds before the end of the video
    player.upnext.bar.offset = '7%';
  }

  function handlePlayerStartImmediatelyAfterPageLoad(e) {
    if( !e || !e.value ) return;
    player.autoplay = true;
    console.debug("Starting player right away from options");
  }

  /**
   * Applies the given bitrate to the player, forcing it to always choose this bitrate at 
   * every playback start
   * @param {string} bitrate 
   */
  function handlePlayerSetInitialBitrate(e){
    if( !e || !e.value ) return;
    player.abr.strategy = {type:'quality', metadata:{bitrate: parseInt(e.value)}}
    console.debug("Setting bitrate from options");
    console.debug(e);
  }

  function handleTrackSetBitrate(e0, e) {
    if( !e || !e.value ) return;

    var targetBandwith = parseInt(e.value);
    console.debug("Setting bitrate for track from options");
    console.debug(targetBandwith);

    // Find the correct quality in the track
    for(var i=0, len=e0.track.qualities.length; i < len; i++){
      var quality = e0.track.qualities.item(i);
      if( quality.bandwidth === targetBandwith){
        console.debug("Found target bandwith "+targetBandwith+", applying targetQuality to track");
        e0.track.targetQuality = quality;
        return;
      }
    }

    console.warn("Could not find target bandwith "+targetBandwith+", no quality applied to track");
  }

  /*function handlePlayerEvent_BitrateChange(e){
    console.debug("Bitrate changed");
    //console.debug(e);
    if( e && e.quality ){
      console.debug(e.quality.bandwidth);
      //sendMessage({ bandwidth : e.quality.bandwidth });
    }
  }*/

  function handlePlayNextEpisode(e){
    var nextEpEl = $('a.playing').prev('a');
    if( nextEpEl && nextEpEl.length > 0 ){
      nextEpEl[0].click();
    }
  }

  var ids = undefined;
  /**
   * Checks if a particular setting is enabled in the settings and if it is then executes the continuation function
   * @param {string} settingName 
   * @param {function} continuation 
   */
  function checkSetting(settingName, continuation){
    var data = {type:'checksetting', settingName: settingName};

    if( !ids ){
      var idels = document.getElementsByClassName('ruvsarpurextensionid');
      if( !idels || idels.length <= 0 ) {
        console.error("Sarpur Extension did not load correctly missing it's id");
        ids = ["kldgbchghoaaadmnpdafmhcdnekkpddk", "bckbhgfffkcnfdnblbnhjbldpiikfpjf"];
      } else {
        ids = [idels[0].id];
      }
    }
   
    // Now send the message
    ids.forEach(function(key){
      chrome.runtime.sendMessage(key, data,
        function(response) {
          if (response && response.enabled && continuation){
            continuation(response);
          }
          return true; 
        });
     });
  }

  function saveVideoLocation(videoId, currentTime, totalDuration){
    sendMessage({type:'savelocation', videoId: videoId, currentPos: currentTime, totalDuration: totalDuration});
  }

  function sendMessage(data, continuation){
    if( !ids ){
      var idels = document.getElementsByClassName('ruvsarpurextensionid');
      if( !idels || idels.length <= 0 ) {
        console.error("Sarpur Extension did not load correctly missing it's id");
        ids = ["kldgbchghoaaadmnpdafmhcdnekkpddk", "bckbhgfffkcnfdnblbnhjbldpiikfpjf"];
      } else {
        ids = [idels[0].id];
      }
    }
   
    // Now send the message
    ids.forEach(function(key){
      chrome.runtime.sendMessage(key, data,
        function(response) {
          if (response && continuation){
            continuation(response);
          }
          return true; 
        });
     });
  }

  document.onkeyup = function(e) {

    // Execute this on player page
    if( window.location.href.indexOf('/sjonvarp/spila/') !== -1 || window.location.href.indexOf('/sjonvarp/beint') !== -1){
      handle_keyup_for_playerpage(e);
      return;
    }

    // Only execute this on list view pages
    if( window.location.href.indexOf('/sjonvarp/spila/') === -1 && window.location.href.indexOf('/sjonvarp/beint') === -1){
      handle_keyup_for_listpage(e);
      return;
    }
  }

  function handle_keyup_for_playerpage(e) {
    if (e.which == 39) {  // Arrow right
      console.debug("Fast forward")
      player.currentTime = player.currentTime + 90
    } else if (e.which == 37) {  // Arrow left
      console.debug("Rewind")
      player.currentTime = player.currentTime - 60
    } else if (e.which == 70) { //F
      console.debug("Fullscreen toggle")
      if( player.presentation.currentMode === 'fullscreen' )
        player.presentation.requestMode('inline')
      else
        player.presentation.requestMode('fullscreen')
    } else if (e.which == 77) { //M
      console.debug("Toggle muted")
      player.muted = !player.muted
    } else if (e.which == 80) {  //P
    console.debug("Toggle play/pause")
    if( player.paused )
      player.play()
    else
      player.pause()
    } else if (e.which == 83) { //S
      console.debug("Subtitles toggled")
      if( player.textTracks.length <= 0 )
        return;
      if( player.textTracks[0].mode === 'showing' )
        player.textTracks[0].mode = 'disabled'
      else
        player.textTracks[0].mode = 'showing'
    } 
    else if( e.which == 66 ) { //B => Back action
      history.back();
    }
  };

  function handle_keyup_for_listpage(e) {
    // First find the currently selected card, or select the first one
    var selCard = findSelectedCard();
    if( !selCard || selCard.length <= 0 ){
      // If none then the attempt to return the first card div in the page
      handle_selectFirstCard();
      return;
    }
    // Force it to a jQuery selector
    selCard = $(selCard);

    switch(e.which){
      case 39: // Right
        handle_NavigateToNext(selCard);
        break;
      case 37: // Left
        handle_NavigateToPrevious(selCard);
        break;
      case 38: // Up
        handle_NavigateUp(selCard);
        break;
      case 40: // Down
        handle_NavigateDown(selCard);
        break;
      case 80: // P => play event
        perform_clickOnCard(selCard);
        break;
      case 66: // B => Refresh window
        window.location.reload();
        break;
      default:
        return;
    }
  };

  function findSelectedCard(){
    // First with our class assigned
    var el = $('div.card-selected');
    if( !el || el.length <= 0 ){
      return null;
    }

    // Always just return the first one in case of multiples
    return el.first();  
  }

  function handle_selectFirstCard(){
    select_card($($('div.card')[0]));
  }

  function perform_clickOnCard(cardEl){
    // The card contains a <a href> find it and simulate a click event
    var aEl = cardEl.find('a');
    if( !aEl || aEl.length <= 0 )
      return;

    // Fire the event on the first a found
    eventFire( aEl.first() , 'click');
  }

  function trigger_scroll_list(currCardEl, direction){
    var groupEl = currCardEl.closest('div.slick-list')
    var arrow = groupEl.next('div.slick-next');
    if( direction == 'prev'){
      arrow = groupEl.prev('div.slick-prev');
    }
    
    if( !arrow || arrow.length <= 0)
      return; // Nothing to click don't do anything
      
    eventFire( $(arrow.first()) , 'click');
  }

  function handle_NavigateToNext(currCardEl){
    // Default is to find next
    var nextEl = currCardEl.next('div.card');

    // If this card is a 'card-featured-single' then we find the nearest 'card-featured-many' and search from there
    if( currCardEl.hasClass('card-featured-single')){
      nextEl = currCardEl.next('div.card-featured-many').find('div.card').first()
    } else {
      // If there is no next el, attempt to click the arrow-next and select again
      if( !nextEl || nextEl.length <= 0){
        trigger_scroll_list(currCardEl, 'next');
      }
      // Now attempt to find the next
      var nextEl = currCardEl.next('div.card');
      if( !nextEl || nextEl.length <= 0){
        return;
      }
    }

    // Perform a selection with what we've got
    select_card(nextEl, currCardEl, 'next');
  }

  function handle_NavigateToPrevious(currCardEl){
    // Default is to find next
    var prevEl = currCardEl.prev('div.card');

    // If we're navigating away from a billboard many to single then do that
    // If this card is a 'card-featured-single' then we find the nearest 'card-featured-many' and search from there
    if( (!prevEl || prevEl.length <= 0) && currCardEl.parent().hasClass('card-featured-many')){
      prevEl = currCardEl.parent().prev('div.card-featured-single').first()
    } else {
      // If there is no next el, don't do anything more if the prev el has attribute data-index < 0
      // meaning that it is the first card and everything will loop back
      if( currCardEl.prev('div').hasClass('data-index') && parseInt(currCardEl.prev('div').attr('data-index')) < 0 ){
        return;
      }

      // If there is no next el, attempt to click the arrow-next and select again
      if( !prevEl || prevEl.length <= 0){
        trigger_scroll_list(currCardEl, 'prev');
      }
      // Now attempt to find the next
      var prevEl = currCardEl.prev('div.card');
      if( !prevEl || prevEl.length <= 0){
        return;
      }
    }

    // Perform a selection with what we've got
    select_card(prevEl, currCardEl, 'prev');
  }

  function handle_NavigateUp(currCardEl){
    // First try to find the parent slider
    var groupEl = currCardEl.closest('div.card-slider');

    // Store the location of the current card in the groupEl data
    groupEl.data('selected-card', currCardEl);

    // First, if we're in the billboard section then we just simply select the first group found
    if(currCardEl.closest('section.billboard').length > 0){
      // Check if group is visible
      if( !isElementVisible(groupEl)) {
        groupEl.get(0).scrollIntoView();
      }
      return;
    } else {
      groupEl = groupEl.prev('div.card-slider')
      // If the group is null, we might be close to top, so select the billboard
      if( !groupEl || groupEl.length <= 0 )
        groupEl = $('section.billboard').first();
    }
    
    // If no group element
    if( !groupEl || groupEl.length <= 0)
      return;

    // Get the last selected card for the group or simply select the first
    var nextCard = groupEl.data('selected-card');
    if( !nextCard || nextCard.length <= 0 ){
      //nextCard = groupEl.find('div.card').first();
      nextCard = find_first_visible_card_in_group(groupEl);
    }

    select_card(nextCard, currCardEl);

    // Check if group is visible
    if( !isElementVisible(groupEl)) {
      groupEl.get(0).scrollIntoView();
    }
  }

  function handle_NavigateDown(currCardEl){
    // First try to find the parent slider
    var groupEl = currCardEl.closest('div.card-slider');

    // Store the location of the current card in the groupEl data
    if( groupEl ) groupEl.data('selected-card', currCardEl);

    // First, if we're in the billboard section then we just simply select the first group found
    if(currCardEl.closest('section.billboard').length > 0){
      groupEl = $('div.card-slider').first();
    } else {
      groupEl = groupEl.next('div.card-slider')
    }
    
    // If no group element
    if( !groupEl || groupEl.length <= 0)
      return;

    // Find the first card and select it
    var nextCard = groupEl.data('selected-card');
    if( !nextCard || nextCard.length <= 0 ){
      nextCard = find_first_visible_card_in_group(groupEl);
    }

    select_card(nextCard, currCardEl);

    // Check if group is visible
    if( !isElementVisible(groupEl)){
      groupEl.get(0).scrollIntoView();
    }
  }

  function find_first_visible_card_in_group(groupEl){
    var firstCard = null;
    groupEl.find('div').each(function(idx, card){
      var cardEl = $(card);

      // If it has class card then assign it
      if( cardEl.hasClass('card') && !firstCard ){
        firstCard = cardEl;
        return;
      }
      
      // if it has attribute data-index with value less than zero then clear firstCard
      if( parseInt(cardEl.attr('data-index')) < 0 ){
        firstCard = null;
        return;
      }

    });
    return firstCard;
  }

  function select_card(cardEl, prevCardEl, direction){
    if( !cardEl || cardEl.length <= 0 )
      return;

    if(prevCardEl)
      prevCardEl.removeClass('card-selected');

    cardEl.addClass('card-selected');

    // If the currently selected card is off-screen then attempt to bring it into view
    if( direction && !isElementVisible(cardEl)){
      trigger_scroll_list(cardEl, direction);
    }
  }

  function eventFire(el, etype){
    // If jQuery
    if( el.on ){
      el.get(0).click();
      return;
    }

    // If some fancy fireEvent crap
    if (el.fireEvent) {
      el.fireEvent('on' + etype);
      return;
    }

    // Default handling
    var evObj = document.createEvent('Events');
    evObj.initEvent(etype, true, false);
    el.dispatchEvent(evObj);
  }

  function isElementVisible(element, partial,hidden,direction,container){

    if (element.length < 1)
        return;

  // Set direction default to 'both'.
  direction = direction || 'both';

    var $t          = element.length > 1 ? element.eq(0) : element,
        isContained = typeof container !== 'undefined' && container !== null,
        $c				  = isContained ? $(container) : $(window),
        wPosition        = isContained ? $c.position() : 0,
        t           = $t.get(0),
        vpWidth     = $c.outerWidth(),
        vpHeight    = $c.outerHeight(),
        clientSize  = hidden === true ? t.offsetWidth * t.offsetHeight : true;

    if (typeof t.getBoundingClientRect === 'function'){

        // Use this native browser method, if available.
        var rec = t.getBoundingClientRect(),
            tViz = isContained ?
                    rec.top - wPosition.top >= 0 && rec.top < vpHeight + wPosition.top :
                    rec.top >= 0 && rec.top < vpHeight,
            bViz = isContained ?
                    rec.bottom - wPosition.top > 0 && rec.bottom <= vpHeight + wPosition.top :
                    rec.bottom > 0 && rec.bottom <= vpHeight,
            lViz = isContained ?
                    rec.left - wPosition.left >= 0 && rec.left < vpWidth + wPosition.left :
                    rec.left >= 0 && rec.left <  vpWidth,
            rViz = isContained ?
                    rec.right - wPosition.left > 0  && rec.right < vpWidth + wPosition.left  :
                    rec.right > 0 && rec.right <= vpWidth,
            vVisible   = partial ? tViz || bViz : tViz && bViz,
            hVisible   = partial ? lViz || rViz : lViz && rViz,
  vVisible = (rec.top < 0 && rec.bottom > vpHeight) ? true : vVisible,
            hVisible = (rec.left < 0 && rec.right > vpWidth) ? true : hVisible;

        if(direction === 'both')
            return clientSize && vVisible && hVisible;
        else if(direction === 'vertical')
            return clientSize && vVisible;
        else if(direction === 'horizontal')
            return clientSize && hVisible;
    } else {

        var viewTop 				= isContained ? 0 : wPosition,
            viewBottom      = viewTop + vpHeight,
            viewLeft        = $c.scrollLeft(),
            viewRight       = viewLeft + vpWidth,
            position          = $t.position(),
            _top            = position.top,
            _bottom         = _top + $t.height(),
            _left           = position.left,
            _right          = _left + $t.width(),
            compareTop      = partial === true ? _bottom : _top,
            compareBottom   = partial === true ? _top : _bottom,
            compareLeft     = partial === true ? _right : _left,
            compareRight    = partial === true ? _left : _right;

        if(direction === 'both')
            return !!clientSize && ((compareBottom <= viewBottom) && (compareTop >= viewTop)) && ((compareRight <= viewRight) && (compareLeft >= viewLeft));
        else if(direction === 'vertical')
            return !!clientSize && ((compareBottom <= viewBottom) && (compareTop >= viewTop));
        else if(direction === 'horizontal')
            return !!clientSize && ((compareRight <= viewRight) && (compareLeft >= viewLeft));
    }
  };

// End customizePlayer main function
};