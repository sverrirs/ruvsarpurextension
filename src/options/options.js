function saveOptions(e) {
  e.preventDefault();
  
  var options = {};

  // Automatically loop through all input elements on the 
  // page and collect their currently selected values in a dict
  $('input, select').each(function(){
    var el = $(this);
    var el_id = el.attr('id');
    if( !el_id || el_id.length <= 0 ) return;
    options[el_id] = getValue(el);
  });

  chrome.storage.sync.set({options},
    function() {
      // Update status to let user know options were saved.
      var status = document.getElementById('status');
      status.textContent = 'Options saved.';
      setTimeout(function() {
        status.textContent = '';
      }, 750);
    });
}

function restoreOptions() {

  function setCurrentChoice(val) {
    if( !val || !val.options) return;

    var result = val.options;

    // Now iterate over every key and attempt
    // to locate the element with that id on the page
    // and set it's value
    Object.keys(result).forEach(function(key) {
        var value = result[key];
        var el = $('#'+key);
        if( !el || el.length <= 0 ) return;

        setValue(el, value);
    });
  }

  chrome.storage.sync.get("options", setCurrentChoice);
}

document.addEventListener("DOMContentLoaded", restoreOptions);
$('#savebutton').on('click', saveOptions);

function setValue(el, result){
  if( !result || !result.enabled) return;

  if( el.is(':checkbox') || el.is(':radio')){
    el.prop('checked', result.value === 'true');
  } else if( el.is('select') ){
    el.find("option").removeAttr('selected');
    el.find('option[value="'+result.value+'"]').prop({defaultSelected: true});
  } else {
    el.val(result.value);
  }
  el.change(); // Trigger the change event
}

function getValue(el){
  var val = undefined;

  if( el.is(':checkbox') || el.is(':radio')) {
    if( el.is(':checked') ){
      val = 'true';
    }
  }
  else if( el.is('select') ){
    val = el.find("option:selected" ).val();
  }
  else {
    val = el.val();
  }

  return { 
    enabled: val !== undefined,
    value: val
  }
}