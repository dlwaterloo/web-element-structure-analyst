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
        groupedElements.forEach((groupInfo) => {
          const groupDiv = document.createElement('div');
          groupDiv.className = 'element-group';
          groupDiv.textContent = `${groupInfo.groupId}`; //Group:
          const groupList = document.createElement('ul');

          groupInfo.elements.forEach((element) => {
            const elementItem = document.createElement('li');
            elementItem.className = 'element';
            elementItem.textContent = element[0]; // Display tagName: innerText

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'elementCheckbox';
            checkbox.dataset.elementId = element[1]; // Unique ID for element

            // Create the "Scroll to Element" button
            const scrollToElementButton = document.createElement('button');
            scrollToElementButton.innerText = 'Scroll to Element';
            scrollToElementButton.style.marginLeft = '10px';

            // Add event listener to scroll to the element
            scrollToElementButton.addEventListener('click', function() {
              chrome.scripting.executeScript({
                target: { tabId: tabs[0].id },
                func: scrollToElement,
                args: [element[1]] // Pass the unique ID of the element to scroll to
              });
            });

            checkbox.addEventListener('change', function() {
              chrome.scripting.executeScript({
                target: { tabId: tabs[0].id },
                func: highlightAndInsertText,
                args: [this.dataset.elementId, element[2] === 'input' || element[2] === 'clickable']
              });
            });

            elementItem.appendChild(checkbox);
            elementItem.appendChild(scrollToElementButton); // Append the button to the list item
            groupList.appendChild(elementItem);
          });

          groupDiv.appendChild(groupList);
          resultsElement.appendChild(groupDiv);
        });
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
  let uniqueIdCounter = 0;
  let groups = new Map();

  allElements.forEach(element => {
    if (element.offsetWidth > 0 && element.offsetHeight > 0) {
      let hasVisibleChild = Array.from(element.children).some(child => child.offsetWidth > 0 && child.offsetHeight > 0);

      // Check if the element has no visible text content but a tag name exists
      if (!hasVisibleChild && element.innerText.trim().length > 0) { // Modified condition
        const uniqueId = `visible-${uniqueIdCounter++}`;
        element.setAttribute('data-highlight-id', uniqueId);
        element.style.border = '2px solid blue';
        element.style.boxSizing = 'border-box';

        let isClickable = ['a', 'button'].includes(element.tagName.toLowerCase()) || element.getAttribute('role') === 'button';
        let isInput = element.tagName.toLowerCase() === 'input';
        const elementType = isInput ? 'input' : isClickable ? 'clickable' : '';
        const elementText = element.tagName.toLowerCase() + ': ' + element.innerText.trim(); // Display tagName: innerText

        // Traverse up to the great-great-great-great-great-great-great-great-grandparent if it exists
        let ancestor = element;
        for (let i = 0; i < 6; i++) { // Look up to 8 levels up the DOM tree
          if (ancestor.parentElement) {
            ancestor = ancestor.parentElement;
          } else {
            break; // Stop if there are no more ancestors
          }
        }

        // Use the highest-level ancestor as the group element
        let groupElement = ancestor;
        let groupId = groupElement.getAttribute('data-group-id');
        if (!groupId) {
          groupId = `group-${uniqueIdCounter++}`;
          groupElement.setAttribute('data-group-id', groupId);
          groups.set(groupId, []);
        }
        groups.get(groupId).push([elementText, uniqueId, elementType]);
      }
    }
  });

  // Convert the groups Map to an array of group information
  groups.forEach((elements, groupId) => {
    visibleElementsInfo.push({ groupId, elements });
  });

  return visibleElementsInfo;
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
