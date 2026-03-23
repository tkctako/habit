// Shared cover zoom/pan logic using transform
// Usage: initCoverZoom(imgEl, zoomEl)
function initCoverZoom(imgEl, zoomEl) {
  let scale = 1, posX = 0, posY = 0;
  let dragging = false, startX = 0, startY = 0, lastPosX = 0, lastPosY = 0;

  function apply() {
    imgEl.style.transform = `scale(${scale}) translate(${posX}px, ${posY}px)`;
  }

  // Zoom slider
  zoomEl.addEventListener('input', function(e) {
    e.stopPropagation();
    scale = parseInt(this.value) / 100;
    apply();
  });

  // Drag - mouse
  imgEl.addEventListener('mousedown', function(e) {
    e.preventDefault();
    e.stopPropagation();
    dragging = true;
    startX = e.clientX;
    startY = e.clientY;
    lastPosX = posX;
    lastPosY = posY;
  });
  document.addEventListener('mousemove', function(e) {
    if (!dragging) return;
    posX = lastPosX + (e.clientX - startX) / scale;
    posY = lastPosY + (e.clientY - startY) / scale;
    apply();
  });
  document.addEventListener('mouseup', function() { dragging = false; });

  // Drag - touch
  imgEl.addEventListener('touchstart', function(e) {
    dragging = true;
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    lastPosX = posX;
    lastPosY = posY;
  }, { passive: true });
  document.addEventListener('touchmove', function(e) {
    if (!dragging) return;
    posX = lastPosX + (e.touches[0].clientX - startX) / scale;
    posY = lastPosY + (e.touches[0].clientY - startY) / scale;
    apply();
  }, { passive: true });
  document.addEventListener('touchend', function() { dragging = false; });

  apply();
  return { reset: function() { scale = 1; posX = 0; posY = 0; zoomEl.value = 100; apply(); } };
}
