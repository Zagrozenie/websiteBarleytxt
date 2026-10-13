document.addEventListener('DOMContentLoaded', function() {
  const form = document.querySelector('.form');
  const createBtn = document.querySelector('.create-btn');
  const infoContainer = document.getElementById('create-info-container');
  const stepsContainer = document.getElementById('stepsContainer');
  const addStepsBtn = document.getElementById('addStepsBtn');

  function isValidSocialMediaLink(url) {
    const patterns = [
      /(https?:\/\/)?(www\.)?tiktok\.com\//i,
      /(https?:\/\/)?(www\.)?discord\.gg\//i,
      /(https?:\/\/)?(www\.)?discord\.com\//i,
      /(https?:\/\/)?(www\.)?youtube\.com\//i,
      /(https?:\/\/)?(www\.)?youtu\.be\//i
    ];
    return patterns.some(pattern => pattern.test(url));
  }

  function showPopup(message, isError = true) {
    infoContainer.innerHTML = '';
    
    const popup = document.createElement('div');
    popup.className = 'create-popup';
    
    if (!isError) {
      popup.style.backgroundColor = '#dcfce7';
      popup.style.borderColor = '#22c55e';
    }
    
    const iconSvg = isError 
      ? '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" aria-hidden="true"><path fill="#dc2626" fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"></path></svg>'
      : '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" aria-hidden="true"><path fill="#16a34a" fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clip-rule="evenodd"></path></svg>';
    
    const textColor = isError ? '#991b1b' : '#166534';
    const iconColor = isError ? '#dc2626' : '#16a34a';
    
    popup.innerHTML = `
      <div class="create-popup-icon" style="fill: ${iconColor}">
        ${iconSvg}
      </div>
      <div class="create-popup-text" style="color: ${textColor}">${message}</div>
      <div class="create-popup-close">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" class="close-svg"><path d="m15.8333 5.34166-1.175-1.175-4.6583 4.65834-4.65833-4.65834-1.175 1.175 4.65833 4.65834-4.65833 4.6583 1.175 1.175 4.65833-4.6583 4.6583 4.6583 1.175-1.175-4.6583-4.6583z" class="close-path"></path></svg>
      </div>
    `;
    
    infoContainer.appendChild(popup);
    
    const closeBtn = popup.querySelector('.create-popup-close');
    closeBtn.addEventListener('click', function() {
      popup.remove();
    });
    
    setTimeout(function() {
      if (popup.parentNode) {
        popup.remove();
      }
    }, 5000);
  }

  function showError(message) {
    showPopup(message, true);
  }

  function showSuccess(message) {
    showPopup(message, false);
  }

  function createStep() {
    const stepDiv = document.createElement('div');
    stepDiv.className = 'form-step';
    
    stepDiv.innerHTML = `
      <div class="form-stepInput">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" width="20" height="20" fill="#ffffff"><path d="M160 96C160 78.3 174.3 64 192 64L448 64C465.7 64 480 78.3 480 96C480 113.7 465.7 128 448 128L418.5 128L428.8 262.1C465.9 283.3 494.6 318.5 507 361.8L510.8 375.2C513.6 384.9 511.6 395.2 505.6 403.3C499.6 411.4 490 416 480 416L160 416C150 416 140.5 411.3 134.5 403.3C128.5 395.3 126.5 384.9 129.3 375.2L133 361.8C145.4 318.5 174 283.3 211.2 262.1L221.5 128L192 128C174.3 128 160 113.7 160 96zM288 464L352 464L352 576C352 593.7 337.7 608 320 608C302.3 608 288 593.7 288 576L288 464z"/></svg>
        <input placeholder="Wpisz link do dodatkowego social media" class="input" type="text">
        <button type="button" class="form-removeBtn">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" width="20" height="20" fill="#ffffff"><path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22z"/></svg>
        </button>
      </div>
    `;
    
    const removeBtn = stepDiv.querySelector('.form-removeBtn');
    removeBtn.addEventListener('click', () => {
      stepDiv.remove();
    });
    
    return stepDiv;
  }

  if (addStepsBtn) {
    addStepsBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const newStep = createStep();
      stepsContainer.appendChild(newStep);
    });
  }

  function validateForm() {
    const inputs = form.querySelectorAll('.input');
    const allInputs = Array.from(inputs);

    let hasSocialMedia = false;

    for (let i = 0; i < allInputs.length; i++) {
      const input = allInputs[i];
      
      if (i >= 2 && input.value.trim()) {
        hasSocialMedia = true;
        const url = input.value.trim();
        if (!isValidSocialMediaLink(url)) {
          showError('Niepoprawny link socialmedia');
          return false;
        }
      }
    }

    const titleInput = allInputs[0];
    const texturepackInput = allInputs[1];
    if (!titleInput.value.trim() || !texturepackInput.value.trim()) {
      showError('Uzupełnij wszystkie pola');
      return false;
    }

    if (!hasSocialMedia) {
      showError('Uzupełnij wszystkie pola');
      return false;
    }

    return true;
  }

  async function generateLink() {
    const allInputs = form.querySelectorAll('.input');
    const titleInput = allInputs[0];
    const texturepackInput = allInputs[1];
    const socialInput = allInputs[2];

    const data = {
      title: titleInput.value.trim(),
      texturepack: texturepackInput.value.trim(),
      socialLinks: []
    };

    if (socialInput.value.trim()) {
      data.socialLinks.push(socialInput.value.trim());
    }

    const stepInputs = document.querySelectorAll('.form-step .input');
    stepInputs.forEach((input, index) => {
      if (input.value.trim()) {
        data.socialLinks.push(input.value.trim());
      }
    });

    try {
      const response = await fetch('https://api.barleytxt.pl/api/links', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Błąd przy tworzeniu linku');
      }

      const result = await response.json();
      const path = window.location.pathname;
      let prefix = '/';
      if (path.includes('/en/')) {
        prefix = '/en/';
      } else if (path.includes('/de/')) {
        prefix = '/de/';
      }
      const fullLink = window.location.origin + prefix + result.slug;
      return fullLink;
    } catch (error) {
      console.error('Error creating link:', error);
      showError(error.message || 'Błąd przy tworzeniu linku');
      return null;
    }
  }

  async function copyToClipboard(text) {
    if (!text) return;
    
    try {
      await navigator.clipboard.writeText(text);
      showSuccess('Link pomyślnie skopiowany');
    } catch (err) {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      try {
        const successful = document.execCommand('copy');
        if (successful) {
          showSuccess('Link pomyślnie skopiowany');
        } else {
          showError('Nie można skopiować linku');
        }
      } catch (err2) {
        console.error('Copy failed:', err2);
        showError('Nie można skopiować linku');
      }
      document.body.removeChild(textarea);
    }
  }

  if (createBtn) {
    createBtn.addEventListener('click', async function(e) {
      e.preventDefault();

      if (validateForm()) {
        const link = await generateLink();
        if (link) {
          copyToClipboard(link);
        }
      }
    });
  }
});
