/**
 * DIGENZ Homepage Hero Interactive Animations
 * Subtle, premium 3D tilt, floating tech icons, and depth parallax.
 * Strictly lightweight, 60fps GPU-accelerated transforms, zero dependencies.
 */
(function() {
  'use strict';

  function initHeroAnimations() {
    var banner = document.querySelector('.home-banner');
    if (!banner) return;

    // Check for reduced motion preference
    var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    // Ensure interactive scene container exists
    var scene = banner.querySelector('.hero-interactive-scene');
    if (!scene) {
      scene = document.createElement('div');
      scene.className = 'hero-interactive-scene';
      scene.innerHTML = 
        '<div class="hero-scene-inner">' +
          '<!-- Interactive Device Hotspots -->' +
          '<div class="hero-hotspot hotspot-phone" title="DIGENZ Mobile App Engineering" aria-label="Smartphone visual interactive zone"></div>' +
          '<div class="hero-hotspot hotspot-laptop" title="DIGENZ Custom Web Systems" aria-label="Laptop visual interactive zone"></div>' +
          '<!-- Device 3D Depth Rings / Auras -->' +
          '<div class="hero-device-glow glow-phone"></div>' +
          '<div class="hero-device-glow glow-laptop"></div>' +
          '<!-- Floating Technology Elements -->' +
          '<div class="hero-tech-floater floater-code" aria-hidden="true">' +
            '<span class="floater-icon">&lt;&nbsp;/&gt;</span>' +
            '<span class="floater-pulse"></span>' +
          '</div>' +
          '<div class="hero-tech-floater floater-analytics" aria-hidden="true">' +
            '<span class="floater-icon floater-chart">' +
              '<span class="bar bar-1"></span><span class="bar bar-2"></span><span class="bar bar-3"></span>' +
            '</span>' +
            '<span class="floater-pulse"></span>' +
          '</div>' +
          '<div class="hero-tech-floater floater-globe" aria-hidden="true">' +
            '<span class="floater-icon floater-sphere"></span>' +
            '<span class="floater-pulse"></span>' +
          '</div>' +
          '<!-- Ambient Tech Particle Nodes -->' +
          '<div class="hero-particle particle-1" aria-hidden="true"></div>' +
          '<div class="hero-particle particle-2" aria-hidden="true"></div>' +
          '<div class="hero-particle particle-3" aria-hidden="true"></div>' +
        '</div>';
      banner.appendChild(scene);
    }

    var phoneSpot = scene.querySelector('.hotspot-phone');
    var laptopSpot = scene.querySelector('.hotspot-laptop');
    var codeSpot = scene.querySelector('.floater-code');
    var analyticsSpot = scene.querySelector('.floater-analytics');
    var globeSpot = scene.querySelector('.floater-globe');

    // Smartphone hover listeners
    if (phoneSpot) {
      phoneSpot.addEventListener('mouseenter', function() {
        scene.classList.add('is-hover-phone');
      });
      phoneSpot.addEventListener('mouseleave', function() {
        scene.classList.remove('is-hover-phone');
      });
    }

    // Laptop hover listeners
    if (laptopSpot) {
      laptopSpot.addEventListener('mouseenter', function() {
        scene.classList.add('is-hover-laptop');
      });
      laptopSpot.addEventListener('mouseleave', function() {
        scene.classList.remove('is-hover-laptop');
      });
    }

    // Parallax mouse tracking
    var targetX = 0;
    var targetY = 0;
    var currentX = 0;
    var currentY = 0;
    var rafId = null;
    var isMoving = false;

    function updateParallax() {
      // Smooth lerp (0.08) for organic fluid motion
      currentX += (targetX - currentX) * 0.08;
      currentY += (targetY - currentY) * 0.08;

      scene.style.setProperty('--parallax-x', currentX.toFixed(4));
      scene.style.setProperty('--parallax-y', currentY.toFixed(4));

      // Continue animating while there is noticeable delta
      if (Math.abs(targetX - currentX) > 0.001 || Math.abs(targetY - currentY) > 0.001 || isMoving) {
        rafId = requestAnimationFrame(updateParallax);
      } else {
        rafId = null;
      }
    }

    banner.addEventListener('mousemove', function(e) {
      // Only run on devices with fine pointer (mouse)
      if (window.innerWidth < 992) return;

      var rect = banner.getBoundingClientRect();
      var x = (e.clientX - rect.left) / rect.width - 0.5;
      var y = (e.clientY - rect.top) / rect.height - 0.5;

      // Clamp between -0.5 and 0.5
      targetX = Math.max(-0.5, Math.min(0.5, x));
      targetY = Math.max(-0.5, Math.min(0.5, y));
      isMoving = true;

      if (!rafId) {
        rafId = requestAnimationFrame(updateParallax);
      }
    }, { passive: true });

    banner.addEventListener('mouseleave', function() {
      targetX = 0;
      targetY = 0;
      isMoving = false;
      scene.classList.remove('is-hover-phone');
      scene.classList.remove('is-hover-laptop');
      if (!rafId) {
        rafId = requestAnimationFrame(updateParallax);
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHeroAnimations);
  } else {
    initHeroAnimations();
  }
})();
