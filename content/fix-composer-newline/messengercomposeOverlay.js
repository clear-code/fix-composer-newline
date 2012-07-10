window.addEventListener("load", function loader() {
    window.removeEventListener("load", loader, true);

    var Cc = Components.classes;
    var Ci = Components.interfaces;

    function createEditorElement(tagName) {
      var doc = editorElement.contentDocument;
      return doc.createElement(tagName);
    }

    function createQuoteNodeFromFragment(fragment) {
      var quoteNode = createEditorElement("SPAN");
      quoteNode.setAttribute("_moz_quote", "true");
      quoteNode.setAttribute("_moz_dirty", "true");
      quoteNode.appendChild(fragment);
      return quoteNode;
    }

    function removeChildIf(childNode, expectedName) {
      if (childNode.localName &&
          childNode.localName.toLowerCase() === expectedName)
        childNode.parentNode.removeChild(childNode);
    }

    function getFirstRange(win) {
      var win = editorElement.contentWindow;
      var selection = win.getSelection();
      return selection && selection.getRangeAt(0);
    }

    function ensureCursorIsVisible() {
      var editor = getEditor();

      var oldFocusNode = editor.selection.focusNode;
      var oldFocusOffset = editor.selection.focusOffset;

      goDoCommand('cmd_charNext');

      var newFocusNode = editor.selection.focusNode;
      var newFocusOffset = editor.selection.focusOffset;

      if (oldFocusNode !== newFocusNode ||
          oldFocusOffset !== newFocusOffset)
        goDoCommand('cmd_charPrevious');
    }

    var editorElement = document.getElementById("content-frame");
    if (!editorElement)
      return;

    function getEditor() {
      return editorElement.getEditor(editorElement.contentWindow);
    }

    function isHTML() {
      if (editorElement.getAttribute("editortype") === "textmail")
        return false;

      // with messagetypeswitcher, the editor element can be htmlmail mode
      // even if it works as a plaintext editor.
      if (editorElement.contentDocument.body.getAttribute("messagetypeswitcher-plaintext-body") === "true")
        return false;

      return true;
    }

    editorElement.addEventListener("keypress", function (ev) {
      var doc = editorElement.contentDocument;
      var win = editorElement.contentWindow;

      if (ev.ctrlKey && ev.charCode === 'u'.charCodeAt(0)) {
        var selection = win.getSelection();
        var selectionRange = selection && selection.getRangeAt(0);
        var source = Util.nodeToString(doc, selectionRange);
        window.openDialog('view-source:data:text/plain,' + encodeURIComponent(source),
                          '_blank',
                          'all,dialog=no,centerscreen'+
                            ',width='+Math.floor(screen.availWidth*0.8)+
                            ',height='+Math.floor(screen.availHeight*0.8));
        return;
      }

      if (isHTML())
        return;

      if (!(ev.keyCode === KeyEvent.DOM_VK_ENTER ||
            ev.keyCode === KeyEvent.DOM_VK_RETURN))
        return;

      var selection = win.getSelection();
      if (!selection.isCollapsed)
        return;

      var currentNode = selection.anchorNode;
      var quoteNode   = currentNode.parentNode;

      if (!quoteNode || quoteNode.getAttribute("_moz_quote") !== "true")
        return;

      ev.preventDefault();
      ev.stopPropagation();

      var range = selection.getRangeAt(0);
      var cursor = range.startOffset;

      // Extract the left part (from the cursor) of quotation
      range.setStartBefore(quoteNode.firstChild);
      range.setEnd(currentNode, cursor);
      var leftFragment = range.cloneContents();
      range.deleteContents();
      var leftQuoteNode = createQuoteNodeFromFragment(leftFragment);

      // Now quoteNode represents right part of the quotation
      var rightQuoteNode = quoteNode;

      // Ensure leftQuoteNode and rightQuoteNode does not have redundant <br>
      removeChildIf(leftQuoteNode.lastChild, "br");
      removeChildIf(rightQuoteNode.firstChild, "br");

      // Append new line node between leftQuoteNode and rightQuoteNode
      var newlineNode = createEditorElement("BR");
      rightQuoteNode.parentNode.insertBefore(newlineNode, rightQuoteNode);

      // Append leftQuoteNode
      rightQuoteNode.parentNode.insertBefore(leftQuoteNode, newlineNode);

      // Now, set cursor position to the head of the rightQuoteNode
      win.getSelection().removeAllRanges();
      var newRange = document.createRange();
      newRange.setStart(rightQuoteNode, 0);
      win.getSelection().addRange(newRange);

      ensureCursorIsVisible();
    }, true);
}, false);
