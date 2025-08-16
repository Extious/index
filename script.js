(function() {
    var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    // Simplified image loading
    function loadImageWithFallback(img, src, onLoad, onError) {
        var tempImg = new Image();
        tempImg.decoding = 'async';
        tempImg.onload = function() {
            img.src = src;
            if (typeof img.decode === 'function') {
                img.decode().then(onLoad).catch(onLoad);
            } else {
                onLoad && onLoad();
            }
        };
        tempImg.onerror = onError;
        tempImg.src = src;
    }
    
    // Avatar loading
    function lazyLoadAvatar() {
        var avatarImg = document.querySelector('.avatar');
        var placeholder = document.querySelector('.avatar-placeholder');
        if (!avatarImg || !placeholder) return;
        
        var dataSrc = avatarImg.getAttribute('data-src');
        if (!dataSrc) return;
        
        loadImageWithFallback(
            avatarImg,
            dataSrc,
            function() {
                avatarImg.classList.add('loaded');
                if (placeholder) {
                    setTimeout(function() {
                        placeholder.style.opacity = '0';
                        setTimeout(function() {
                            placeholder.style.display = 'none';
                        }, 300);
                    }, 100);
                }
            },
            function() {
                console.warn('Failed to load avatar image');
                if (placeholder) {
                    placeholder.style.background = 'rgba(255,255,255,0.1)';
                    placeholder.style.animation = 'none';
                }
            }
        );
    }
    
    // Initialize avatar loading
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', lazyLoadAvatar);
    } else {
        lazyLoadAvatar();
    }

    // Card interactions (simplified)
    var cards = document.querySelectorAll('.nav-link');
    if (!reduceMotion) {
        cards.forEach(function(card) {
            card.addEventListener('pointermove', function(e) {
                var rect = card.getBoundingClientRect();
                var x = e.clientX - rect.left;
                var y = e.clientY - rect.top;
                card.style.setProperty('--x', x + 'px');
                card.style.setProperty('--y', y + 'px');
            });
            card.addEventListener('pointerleave', function() {
                card.style.removeProperty('--x');
                card.style.removeProperty('--y');
            });
        });
    }

    // Language functionality
    var app = document.querySelector('main.container');
    var currentLang = (localStorage.getItem('lang') || app.getAttribute('data-lang') || 'zh');
    
    function setLangLabel(){
        var btn = document.getElementById('lang-toggle');
        if (btn) btn.textContent = currentLang.toUpperCase();
    }
    setLangLabel();

    function timelinePath(){
        return currentLang === 'zh' ? 'timeline.zh.json' : 'timeline.en.json';
    }
    function aboutPath(){
        return currentLang === 'zh' ? 'about.zh.md' : 'about.en.md';
    }

    // Load timeline
    function loadTimeline(){
        return fetch(timelinePath())
            .catch(function(){ return fetch('timeline.json'); })
            .then(function(res){ return res.json(); })
            .then(function(data){
                try {
                    var container = document.getElementById('timeline');
                    if (!container || !Array.isArray(data)) return;
                    var html = data.map(function(item){
                        var year = (item && item.year != null) ? String(item.year) : '';
                        var text = (item && item.text) ? String(item.text) : '';
                        return (
                            '<div class="tl-item">' +
                                '<div class="tl-dot"></div>' +
                                '<div class="tl-time">' + year + '</div>' +
                                '<div class="tl-content">' +
                                    '<div class="tl-desc">' + text + '</div>' +
                                '</div>' +
                            '</div>'
                        );
                    }).join('');
                    container.innerHTML = html;
                } catch (e) { /* noop */ }
            });
    }
    loadTimeline();

    // Load about text
    function loadAbout(){
        return fetch(aboutPath())
            .catch(function(){ return fetch('about.md'); })
            .then(function(res){ return res.text(); })
            .then(function(md){
                var lines = md.split(/\r?\n/)
                    .map(function(s){ return s.trim(); })
                    .filter(function(s){ return s.length > 0 && !/^#/.test(s); });
                var html = lines.map(function(line){
                    var t = line
                      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                      .replace(/\*(.+?)\*/g, '<em>$1</em>')
                      .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank">$1</a>');
                    return '<div class="line">' + t + '</div>';
                }).join('');
                var el = document.getElementById('about-text');
                if (el) el.innerHTML = html;
            });
    }
    loadAbout();

    // i18n
    var i18n = {
        en: {
            siteTitle: "Extious' Space",
            aboutTitle: 'About',
            sitesTitle: 'Sites',
            blog: 'Blog',
            blogDesc: 'Personal thoughts and insights',
            notes: 'Notes',
            notesDesc: 'Knowledge and learning notes',
            gallery: 'Gallery',
            galleryDesc: 'Photo collection and memories',
            imgbed: 'Image Bed',
            imgbedDesc: 'Static image hosting'
        },
        zh: {
            siteTitle: 'Extious的空间',
            aboutTitle: '关于',
            sitesTitle: '站点',
            blog: '博客',
            blogDesc: '个人观点与随笔',
            notes: '笔记',
            notesDesc: '知识笔记与学习记录',
            gallery: '相册',
            galleryDesc: '照片与回忆',
            imgbed: '图床',
            imgbedDesc: '静态图片托管'
        }
    };
    
    function applyI18n(){
        var dict = i18n[currentLang] || i18n.en;
        document.querySelectorAll('[data-i18n]').forEach(function(el){
            var key = el.getAttribute('data-i18n');
            if (dict[key]) el.textContent = dict[key];
        });
    }
    applyI18n();

    // Language toggle
    var btnToggle = document.getElementById('lang-toggle');
    if (btnToggle) {
        btnToggle.addEventListener('click', function(){
            currentLang = currentLang === 'en' ? 'zh' : 'en';
            localStorage.setItem('lang', currentLang);
            setLangLabel();
            applyI18n();
            loadAbout();
            loadTimeline();
        });
    }

    // Enhanced background system integration
    function setupBackgroundStatusMonitoring() {
        // Listen for background change events
        window.addEventListener('backgroundChanged', function(event) {
            var body = document.body;
            
            // Add success feedback
            body.classList.add('bg-success');
            setTimeout(function() {
                body.classList.remove('bg-success');
            }, 300);
            
            // Log status for debugging
            if (window.backgroundManager) {
                var status = window.backgroundManager.getStatus();
                console.log('Background changed:', {
                    url: event.detail.url,
                    index: event.detail.index,
                    cached: status.preloadedCount,
                    total: status.totalImages
                });
            }
        });

        // Monitor background manager status
        if (window.backgroundManager) {
            // Optional: Add debug information to console
            setTimeout(function() {
                var status = window.backgroundManager.getStatus();
                console.log('Background Manager Status:', status);
            }, 2000);
        }
    }

    // Setup enhanced avatar feedback
    function setupEnhancedAvatarFeedback() {
        var avatarEl = document.querySelector('.avatar');
        if (!avatarEl) return;

        // Add enhanced hover effects
        avatarEl.addEventListener('mouseenter', function() {
            if (!reduceMotion) {
                avatarEl.style.transform = 'scale(1.05)';
            }
        });

        avatarEl.addEventListener('mouseleave', function() {
            avatarEl.style.transform = '';
        });

        // Handle background switch errors
        var originalClickHandler = avatarEl.onclick;
        
        window.addEventListener('backgroundSwitchError', function() {
            var body = document.body;
            body.classList.add('bg-error');
            setTimeout(function() {
                body.classList.remove('bg-error');
            }, 500);
        });
    }

    // Initialize enhanced background system
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            setupBackgroundStatusMonitoring();
            setupEnhancedAvatarFeedback();
        });
    } else {
        setupBackgroundStatusMonitoring();
        setupEnhancedAvatarFeedback();
    }
})();
