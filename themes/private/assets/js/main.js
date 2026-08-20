console.log('The archive that records everything');

document.addEventListener('DOMContentLoaded', function () {
  document.querySelectorAll('pre > code').forEach(function (codeBlock) {
    if (!codeBlock.className) {
      return;
    }

    if (codeBlock.className.includes('mermaid')) {
      return;
    }

    let highlight = codeBlock.parentElement;

    while (highlight && !highlight.classList.contains('highlight')) {
      highlight = highlight.parentElement;
    }

    if (!highlight) {
      return;
    }

    // 중복 버튼 생성 방지
    const prevSibling = highlight.previousSibling;
    if (
      prevSibling &&
      prevSibling.nodeType === 1 &&
      prevSibling.classList.contains('code-copy-container')
    ) {
      return;
    }

    const codeCopyContainer = document.createElement('div');
    codeCopyContainer.className = 'code-copy-container';

    const codeCopyButton = document.createElement('button');
    codeCopyButton.className = 'code-copy-button';
    codeCopyButton.type = 'button';
    codeCopyButton.innerText = 'Copy';

    codeCopyContainer.appendChild(codeCopyButton);

    highlight.parentNode.insertBefore(codeCopyContainer, highlight);

    codeCopyButton.addEventListener('click', function () {
      const codeContent = highlight.querySelector('td.code');
      const code = codeContent
        ? codeContent.textContent
        : codeBlock.textContent;

      // 클립보드 API 사용 가능 여부 확인
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(code).then(
          function () {
            codeCopyButton.innerText = 'Copied!';
            setTimeout(function () {
              codeCopyButton.innerText = 'Copy';
            }, 2000);
          },
          function () {
            codeCopyButton.innerText = 'Error';
            setTimeout(function () {
              codeCopyButton.innerText = 'Copy';
            }, 2000);
          },
        );
      } else {
        // 대체 방법 (구형 브라우저용)
        const textArea = document.createElement('textarea');
        textArea.value = code;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        try {
          document.execCommand('copy');
          codeCopyButton.innerText = 'Copied!';
        } catch (err) {
          codeCopyButton.innerText = 'Error';
        }
        document.body.removeChild(textArea);
        setTimeout(function () {
          codeCopyButton.innerText = 'Copy';
        }, 2000);
      }
    });
  });
});
