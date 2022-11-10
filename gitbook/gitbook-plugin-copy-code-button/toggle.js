require(["gitbook", "jQuery"], function(gitbook, $) {
  function selectElementText(el){
      var range = document.createRange();
      range.selectNodeContents(el);
      var selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
  }

  function getSelectedText() {
    var t = '';
      if (window.getSelection) {
          t = window.getSelection();
      } else if (document.getSelection) {
          t = document.getSelection();
      } else if (document.selection) {
          t = document.selection.createRange().text;
      }
      return t;
  }
  
  function copyToClipboard(text) {
    if (window.clipboardData && window.clipboardData.setData) {
        // IE specific code path to prevent textarea being shown while dialog is visible.
        return clipboardData.setData("Text", text); 

    } else if (document.queryCommandSupported && document.queryCommandSupported("copy")) {
        var textarea = document.createElement("textarea");
        textarea.textContent = text;
        textarea.style.position = "fixed";  // Prevent scrolling to bottom of page in MS Edge.
        document.body.appendChild(textarea);
        textarea.select();
        try {
            return document.execCommand("copy");  // Security exception may be thrown by some browsers.
        } catch (ex) {
            console.warn("Copy to clipboard failed.", ex);
            return false;
        } finally {
            document.body.removeChild(textarea);
        }
    }
  }

  function expand(chapter) {
    chapter.show();
    if (chapter.parent().attr('class') != 'summary'
        && chapter.parent().attr('class') != 'book-summary'
      && chapter.length != 0
       ) {
         expand(chapter.parent());
       }
  }

  gitbook.events.bind("page.change", function() {
    $("pre").each(function(){
      $(this).css("position", "relative");

      var $copyCodeButton = $("<button class='copy-code-button'>Copy</button>");
      $copyCodeButton.css({"position": "absolute", "top": "5px", "right": "5px", "padding": "3px", "background-color":"#313E4E", "color":"white", "border-radius": "5px" , "-moz-border-radius": "5px", "-webkit-border-radius": "5px", "border": "2px solid #CCCCCC"});
      $copyCodeButton.click(function(){
        var $codeContainer = $(this).siblings("code");
        if($codeContainer) {
          selectElementText($codeContainer.get(0));
          var selectedText = getSelectedText();

          var buttonNewText = "";
          if(copyToClipboard(selectedText) == true){
            buttonNewText = "Copied";
            selectElementText($codeContainer.get(0));
          } else {
            buttonNewText = "Unable to copy";
            selectElementText($codeContainer.get(0));
          }

          $(this).text(buttonNewText);
          var that = this;
          setTimeout(function(){
              $(that).text("Copy");
          }, 2000);
        }
      });
      
      $(this).append($copyCodeButton);
    });
  });
});
