document.getElementById('allElementsButton').addEventListener('click', () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.scripting.executeScript({
      target: { tabId: tabs[0].id },
      func: findAllVisibleElements
    }, (injectionResults) => {
      const resultsElement = document.getElementById('results');
      resultsElement.innerHTML = ''; // Clear previous results

      const groupedElements = injectionResults[0]?.result;
      if (groupedElements) {
        // Convert groupedElements to JSON
        const json = JSON.stringify(groupedElements, null, 2);

        // Display JSON in a <pre> element for formatting
        const pre = document.createElement('pre');
        pre.style.overflow = 'auto';
        pre.textContent = json;
        resultsElement.appendChild(pre);
      }
    });
  });
});


function scrollToElement(uniqueId) {
  const element = document.querySelector(`[data-highlight-id='${uniqueId}']`);
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

function findAllVisibleElements() {
  let allElements = document.querySelectorAll('body *');
  let visibleElementsInfo = [];
  let groups = new Map();

  allElements.forEach(element => {
    if (element.offsetWidth > 0 && element.offsetHeight > 0) {
      let hasVisibleChild = Array.from(element.children).some(child => child.offsetWidth > 0 && child.offsetHeight > 0);

      if (!hasVisibleChild && element.innerText.trim().length > 0 || element.tagName.toLowerCase() === 'input') {
        let isClickable = ['a', 'button'].includes(element.tagName.toLowerCase()) || element.getAttribute('role') === 'button';
        let isInput = element.tagName.toLowerCase() === 'input';
        const elementType = isInput ? 'input' : isClickable ? 'clickable' : '';
        const elementText = element.innerText.trim().length > 0 ? element.innerText.trim() : element.value;

        // Determine a suitable group based on the element's ancestors
        let ancestor = element;
        for (let i = 0; i < 8; i++) {
          if (ancestor.parentElement) {
            ancestor = ancestor.parentElement;
          } else {
            break;
          }
        }

        // Use the highest-level ancestor as the group element
        let groupElement = ancestor;
        let groupId = groupElement.getAttribute('data-group-id');
        if (!groupId) {
          groupId = 'group'; // Simplify groupId since it will not be included in the output
          groupElement.setAttribute('data-group-id', groupId);
          if (!groups.has(groupId)) {
            groups.set(groupId, []);
          }
        }
        // Modify here to match the requested structure
        groups.get(groupId).push({ element: elementText, type: element.tagName.toLowerCase() }); 
      }
    }
  });

  // Convert groups to an array without group IDs for JSON serialization
  let groupedElements = [];
  groups.forEach((elements) => {
    groupedElements.push({ elements }); // Omitting groupId in the output
  });

  return groupedElements;
}



function getStructuralPath(element) {
  let path = '';
  while (element) {
    let name = element.nodeName.toLowerCase();
    let id = element.id ? `#${element.id}` : '';
    let className = element.className ? `.${element.className.split(' ').join('.')}` : '';
    path = `${name}${id}${className}` + (path ? '>' + path : '');
    element = element.parentElement;
  }
  return path;
}

function groupElementsByStructure(elementsInfo) {
  let groups = {};
  elementsInfo.forEach(info => {
    const path = info[3]; // Use the structural path for grouping
    if (!groups[path]) {
      groups[path] = [];
    }
    groups[path].push(info);
  });
  return groups;
}

function highlightAndInsertText(uniqueId, isInput) {
  const element = document.querySelector(`[data-highlight-id='${uniqueId}']`);
  if (element) {
    element.style.border = '2px solid green';
    if (isInput) {
      const searchText = 'hello'; // Insert 'hello' text
      element.value = searchText; // Set the search text
      
      // Attempt to directly submit the form if present
      let parentForm = element.closest('form');
      if (parentForm) {
        parentForm.submit();
        return; // Exit after attempting to submit the form
      }

      // Simulate the Enter key press for inputs if no form submission is possible
      simulateEnterKeyPress(element);

      // Fallback: Attempt to click the associated search button if Enter key simulation doesn't work
      clickSearchButtonIfAvailable();
    }
  }
}

function simulateEnterKeyPress(element) {
  ['keydown', 'keypress', 'keyup'].forEach(eventType => {
    const event = new KeyboardEvent(eventType, {
      key: 'Enter',
      code: 'Enter',
      which: 13,
      keyCode: 13,
      bubbles: true,
      cancelable: true
    });
    element.dispatchEvent(event);
  });
}

function clickSearchButtonIfAvailable() {
  // Example: If the search button has a common class or identifiable attribute on Amazon.ca
  const searchButton = document.querySelector('button.searchButtonClass, input[type="submit"]');
  if (searchButton) {
    searchButton.click();
  }
}

// Go Back button functionality remains unchanged
document.getElementById('goBackButton').addEventListener('click', () => {
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    chrome.scripting.executeScript({
      target: {tabId: tabs[0].id},
      func: goBackPage
    });
  });
});

function goBackPage() {
  window.history.back();
}
