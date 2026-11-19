/**
 * DIGENZ Homepage Hero Interactive Animations (v4.7)
 * Subtle 3D tilt, floating tech icons, and depth parallax.
 * Dual-trigger: Direct DOM hotspot hover + continuous coordinate detection + 60fps GPU transforms.
 */
(function() {
  'use strict';

  function initHeroAnimations() {
    var banner = document.querySelector('.home-banner');
    if (!banner) return;

    // Check for reduced motion preference
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    var scene = banner.querySelector('.hero-interactive-scene');
    if (!scene) {
      scene = document.createElement('div');
      scene.className = 'hero-interactive-scene';
      scene.innerHTML =
        '<div class="hero-scene-inner">' +
          '<div class="hero-hotspot hotspot-phone" title="DIGENZ Mobile App Engineering"></div>' +
          '<div class="hero-hotspot hotspot-laptop" title="DIGENZ Custom Web Systems"></div>' +
          '<div class="hero-device-glow glow-phone"></div>' +
          '<div class="hero-device-glow glow-laptop"></div>' +
          '<div class="hero-tech-floater floater-code"><span class="floater-icon">&lt;&nbsp;/&gt;</span><span class="floater-pulse"></span></div>' +
          '<div class="hero-tech-floater floater-analytics"><span class="floater-icon floater-chart"><span class="bar bar-1"></span><span class="bar bar-2"></span><span class="bar bar-3"></span></span><span class="floater-pulse"></span></div>' +
          '<div class="hero-tech-floater floater-globe"><span class="floater-icon floater-sphere"></span><span class="floater-pulse"></span></div>' +
          '<div class="hero-particle particle-1"></div>' +
          '<div class="hero-particle particle-2"></div>' +
          '<div class="hero-particle particle-3"></div>' +
        '</div>';
      banner.appendChild(scene);
    } else {
      // Ensure glow elements exist inside existing scene
      var inner = scene.querySelector('.hero-scene-inner');
      if (inner) {
        if (!inner.querySelector('.glow-phone')) {
          var glowPhone = document.createElement('div');
          glowPhone.className = 'hero-device-glow glow-phone';
          inner.appendChild(glowPhone);
        }
        if (!inner.querySelector('.glow-laptop')) {
          var glowLaptop = document.createElement('div');
          glowLaptop.className = 'hero-device-glow glow-laptop';
          inner.appendChild(glowLaptop);
        }
      }
    }

    var phoneSpot = scene.querySelector('.hotspot-phone');
    var laptopSpot = scene.querySelector('.hotspot-laptop');

    // Parallax mouse tracking & coordinate-based hover detection
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

      if (Math.abs(targetX - currentX) > 0.001 || Math.abs(targetY - currentY) > 0.001 || isMoving) {
        rafId = requestAnimationFrame(updateParallax);
      } else {
        rafId = null;
      }
    }

    banner.addEventListener('mousemove', function(e) {
      if (window.innerWidth < 992) return;

      var rect = banner.getBoundingClientRect();
      var relX = (e.clientX - rect.left) / rect.width;
      var relY = (e.clientY - rect.top) / rect.height;

      // Parallax target (centered -0.5 to 0.5)
      targetX = Math.max(-0.5, Math.min(0.5, relX - 0.5));
      targetY = Math.max(-0.5, Math.min(0.5, relY - 0.5));
      isMoving = true;

      // Robust coordinate + element hit hover detection
      // Smartphone visual bounds: x: 50% - 65%, y: 32% - 95%
      var isOverPhone = (phoneSpot && (e.target === phoneSpot || phoneSpot.contains(e.target))) ||
                        (relX >= 0.50 && relX <= 0.65 && relY >= 0.32 && relY <= 0.95);
      // Laptop visual bounds: x: 65% - 98%, y: 28% - 95%
      var isOverLaptop = (!isOverPhone) && (
                        (laptopSpot && (e.target === laptopSpot || laptopSpot.contains(e.target))) ||
                        (relX >= 0.65 && relX <= 0.98 && relY >= 0.28 && relY <= 0.95)
      );

      if (isOverPhone) {
        scene.classList.add('is-hover-phone');
        scene.classList.remove('is-hover-laptop');
      } else if (isOverLaptop) {
        scene.classList.add('is-hover-laptop');
        scene.classList.remove('is-hover-phone');
      } else {
        scene.classList.remove('is-hover-phone');
        scene.classList.remove('is-hover-laptop');
      }

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

    // Also support direct hotspot pointer events
    if (phoneSpot) {
      phoneSpot.addEventListener('mouseenter', function() { scene.classList.add('is-hover-phone'); });
      phoneSpot.addEventListener('mouseleave', function() { scene.classList.remove('is-hover-phone'); });
    }
    if (laptopSpot) {
      laptopSpot.addEventListener('mouseenter', function() { scene.classList.add('is-hover-laptop'); });
      laptopSpot.addEventListener('mouseleave', function() { scene.classList.remove('is-hover-laptop'); });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHeroAnimations);
  } else {
    initHeroAnimations();
  }
})();
