// Enhanced Background Image Manager - Version 3.1
(function() {
    'use strict';
    
    console.log('🚀 Background Manager v3.1 loaded!');
    
    // Suppress common external script errors
    window.addEventListener('error', function(e) {
        // Suppress Cloudflare beacon errors
        if (e.filename && e.filename.includes('cloudflareinsights.com')) {
            e.preventDefault();
            return false;
        }
    }, true);
    
    // Reduce console noise in production
    const isDebug = location.hostname === 'localhost' || location.hostname === '127.0.0.1' || location.search.includes('debug=1');
    if (!isDebug) {
        // Override console methods to reduce noise
        const originalLog = console.log;
        const originalWarn = console.warn;
        
        console.log = function(...args) {
            // Only show important logs in production
            const message = args[0] ? args[0].toString() : '';
            if (message.includes('🚀') || message.includes('✨') || message.includes('🔄') || message.includes('❌')) {
                originalLog.apply(console, args);
            }
        };
        
        console.warn = function(...args) {
            const message = args[0] ? args[0].toString() : '';
            // Filter out Cloudflare related warnings
            if (!message.includes('cloudflare') && !message.includes('beacon')) {
                originalWarn.apply(console, args);
            }
        };
    }
    
    // Configuration
    const CONFIG = {
        CDN_PREFIX: 'https://cdn.jsdelivr.net/gh/Extious/image-bed-hosting@master/',
        API_URL: 'https://data.jsdelivr.com/v1/package/gh/Extious/image-bed-hosting@master/flat',
        PRELOAD_COUNT: 5,           // Number of images to preload
        MAX_RETRIES: 3,             // Max retry attempts for failed images
        CACHE_SIZE: 20,             // Maximum cached images
        SWITCH_ANIMATION_DURATION: 800, // Background transition duration
        SUPPORTED_FORMATS: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'PNG', 'JPG', 'JPEG', 'WEBP', 'GIF', 'SVG'],
        AUTO_REFRESH_INTERVAL: 1800000, // Auto refresh every 30 minutes (reduced frequency)
        MANUAL_REFRESH_COOLDOWN: 10000 // Minimum 10 seconds between manual refreshes
    };

    // Background Manager Class
    function BackgroundManager() {
        this.imageList = [];
        this.currentIndex = -1;
        this.preloadedImages = new Map(); // url -> HTMLImageElement
        this.loadingQueue = new Set();
        this.failedUrls = new Set();
        this.isInitialized = false;
        this.pendingSwitches = 0;
        this.lastRefreshTime = 0;
        this.autoRefreshTimer = null;
        this.isRefreshing = false;
        this.retryCount = 0;

        
        this.init();
        
        // Cleanup on page unload
        window.addEventListener('beforeunload', () => {
            this.destroy();
        });
    }

    BackgroundManager.prototype = {
        init: function() {
            this.loadImageList()
                .then(() => {
                    this.isInitialized = true;
                    this.retryCount = 0; // Reset retry count on success
                    this.startPreloading();
                    this.setInitialBackground();
                    this.startAutoRefresh();
                })
                .catch(err => {
                    this.handleInitializationError();
                });
        },

        loadImageList: function(forceRefresh = false) {
            // Smart API selection: compare both sources to detect sync issues
            return this.smartLoadImageList(forceRefresh);
        },

        smartLoadImageList: function(forceRefresh = false) {
            // Load from both APIs simultaneously to compare results
            const githubPromise = this.loadFromGitHubAPI(forceRefresh).catch(err => {
                console.warn('❌ GitHub API失败:', err.message);
                return [];
            });
            
            const jsdelivrPromise = this.loadFromJSDelivrAPI(forceRefresh).catch(err => {
                console.error('❌ JSDelivr API失败:', err.message);
                return [];
            });
            
            return Promise.all([githubPromise, jsdelivrPromise])
                .then(([githubList, jsdelivrList]) => {
                    const githubCount = Array.isArray(githubList) ? githubList.length : 0;
                    const jsdelivrCount = Array.isArray(jsdelivrList) ? jsdelivrList.length : 0;
                    
                    // 在控制台输出图片数量对比
                    console.log(`📊 API图片数量对比: GitHub API ${githubCount} 张, JSDelivr CDN ${jsdelivrCount} 张`);
                    
                    let selectedList = [];
                    let source = '';
                    let needsSync = false;
                    
                    if (githubCount === jsdelivrCount && jsdelivrCount > 0) {
                        // 数量相同，使用JSDelivr（更快的CDN）
                        selectedList = jsdelivrList;
                        source = 'JSDelivr CDN';
                    } else if (githubCount !== jsdelivrCount) {
                        // 数量不同，暂时使用GitHub API
                        console.log(`🔄 图片数量不一致，差异: ${Math.abs(githubCount - jsdelivrCount)} 张图片`);
                        selectedList = githubList;
                        source = 'GitHub API (临时)';
                        needsSync = true;
                        
                        // 显示同步提示并后台更新JSDelivr缓存
                        if (githubCount > jsdelivrCount) {
                            this.updateJSDelivrCacheInBackground();
                        }
                    } else if (githubCount > 0) {
                        // JSDelivr没有数据，回退到GitHub
                        selectedList = githubList;
                        source = 'GitHub API (回退)';
                        needsSync = true;
                    } else {
                        console.error('❌ 两个API都失败了');
                        throw new Error('两个API都没有返回有效结果');
                    }
                    
                    // Update image list and handle changes
                    const previousCount = this.imageList.length;
                    this.imageList = selectedList;
                    
                    // 输出最终选择结果
                    console.log(`🎯 最终选择: ${source}, 加载图片数量: ${this.imageList.length} 张`);
                    
                    if (forceRefresh && previousCount !== this.imageList.length) {
                        // Clear failed URLs on successful refresh
                        this.failedUrls.clear();
                        // Start preloading new images
                        this.startPreloading();
                    }
                    
                    return selectedList;
                });
        },

        loadFromGitHubAPI: function(forceRefresh = false) {
            const githubUrl = 'https://api.github.com/repos/Extious/image-bed-hosting/contents';
            
            // Check if we have a GitHub token in localStorage
            const githubToken = localStorage.getItem('github_token');
            const headers = {
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'BackgroundManager/2.9'
            };
            
            // Add authorization header if token is available
            if (githubToken) {
                headers['Authorization'] = `token ${githubToken}`;
            }
            
            return fetch(githubUrl, {
                cache: forceRefresh ? 'no-cache' : 'default',
                headers: headers,
                signal: AbortSignal.timeout ? AbortSignal.timeout(15000) : undefined
            })
            .then(response => {
                // Log rate limit information if available
                const rateLimitRemaining = response.headers.get('X-RateLimit-Remaining');
                if (rateLimitRemaining !== null && parseInt(rateLimitRemaining) < 10) {
                    console.warn('⚠️ GitHub API rate limit is low! Consider adding a token or reducing refresh frequency.');
                }
                
                if (!response.ok) {
                    // Provide more specific error messages
                    if (response.status === 403) {
                        const rateLimitMsg = rateLimitRemaining === '0' ? 
                            ' (Rate limit exceeded - try again later or add a GitHub token)' : '';
                        throw new Error(`GitHub API 403: Forbidden${rateLimitMsg}`);
                    } else if (response.status === 401) {
                        throw new Error('GitHub API 401: Invalid or expired token');
                    } else {
                        throw new Error(`GitHub API ${response.status}: ${response.statusText}`);
                    }
                }
                return response.json();
            })
            .then(data => {
                                if (!Array.isArray(data)) {
                    throw new Error('GitHub API did not return an array');
                }
                
                return this.processFileList(data, forceRefresh, 'GitHub API');
            })
            .catch(err => {
                console.error('💥 GitHub API Error:', err);
                throw err;
            });
        },

        loadFromJSDelivrAPI: function(forceRefresh = false) {
            // Add timestamp to force cache bypass when refreshing
            const url = forceRefresh ? 
                `${CONFIG.API_URL}?t=${Date.now()}` : 
                CONFIG.API_URL;
            
            return fetch(url, { 
                cache: forceRefresh ? 'no-cache' : 'default',
                signal: AbortSignal.timeout ? AbortSignal.timeout(10000) : undefined
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`JSDelivr API ${response.status}: ${response.statusText}`);
                }
                return response.json();
            })
                            .then(data => {
                    // 修复JSDelivr API响应处理
                    let files = [];
                    if (Array.isArray(data)) {
                        // 直接是文件数组
                        files = data;
                    } else if (data && data.files && Array.isArray(data.files)) {
                        // 包含files属性的对象
                        files = data.files;
                    } else if (data && data.paths && Array.isArray(data.paths)) {
                        // 包含paths属性的对象（某些版本的JSDelivr API）
                        files = data.paths;
                    } else {
                        console.warn('⚠️ JSDelivr API响应格式未知:', data);
                        files = [];
                    }
                    
                    return this.processFileList(files, forceRefresh, 'JSDelivr API');
                });
        },

        processFileList: function(files, forceRefresh, source) {

            

            
            // Initialize arrays
            const processedFiles = [];
            
            // Detailed filtering process
            files.forEach((file, index) => {
                // Handle different API response formats
                const name = file && (file.name || file.path || file.file);
                const isValid = this.isValidImageFile(name);
                let url;
                
                if (source === 'GitHub API') {
                    // GitHub API returns direct file info
                    url = name ? CONFIG.CDN_PREFIX + String(name).replace(/^\//, '') : null;
                } else {
                    // JSDelivr API format
                    url = name ? CONFIG.CDN_PREFIX + String(name).replace(/^\//, '') : null;
                }
                
                const isFailed = url ? this.failedUrls.has(url) : false;
                
                processedFiles.push({
                    original: file,
                    name,
                    isValid,
                    url,
                    isFailed,
                    included: isValid && url && !isFailed
                });
            });
            
            const validImageFiles = processedFiles.filter(f => f.isValid);
            const newImageList = processedFiles
                .filter(item => item.included)
                .map(item => item.url);

            if (newImageList.length === 0) {
                throw new Error(`No valid images found from ${source}`);
            }

            return newImageList;
        },

        updateJSDelivrCacheInBackground: function() {
            // 后台清理JSDelivr缓存，但不重载页面
            const apiPurgeUrl = CONFIG.API_URL.replace('https://data.jsdelivr.net/', 'https://purge.jsdelivr.net/');
            
            fetch(apiPurgeUrl, { 
                method: 'GET',
                cache: 'no-cache',
                signal: AbortSignal.timeout ? AbortSignal.timeout(15000) : undefined
            })
                .then(response => {
                    if (response.ok) {
                        console.log('✅ JSDelivr API缓存已清理，预计2-5分钟后同步最新内容');
                    } else {
                        console.warn('⚠️ JSDelivr缓存清理失败，响应状态:', response.status, response.statusText);
                    }
                })
                .catch(err => {
                    console.error('❌ JSDelivr缓存更新请求失败:', err.message);
                });
        },

        isValidImageFile: function(name) {
            if (!name || typeof name !== 'string') {
                return false;
            }
            
            const filename = name.split('/').pop().toLowerCase();
            
            // Skip hidden files
            if (filename.startsWith('.')) {
                return false;
            }
            
            // Check for supported formats (case insensitive)
            const hasValidExtension = CONFIG.SUPPORTED_FORMATS.some(format => {
                const extension = '.' + format.toLowerCase();
                return filename.endsWith(extension);
            });
            
            return hasValidExtension;
        },

        startPreloading: function() {
            if (this.imageList.length === 0) return;

            const preloadCount = Math.min(CONFIG.PRELOAD_COUNT, this.imageList.length);
            const startIndex = this.currentIndex >= 0 ? this.currentIndex : 0;
            
            for (let i = 0; i < preloadCount; i++) {
                const index = (startIndex + i) % this.imageList.length;
                this.preloadImage(this.imageList[index]);
            }
        },

        preloadImage: function(url) {
            if (!url || this.preloadedImages.has(url) || 
                this.loadingQueue.has(url) || this.failedUrls.has(url)) {
                return Promise.resolve(null);
            }

            this.loadingQueue.add(url);

            return new Promise((resolve, reject) => {
                const img = new Image();
                img.decoding = 'async';
                
                const cleanup = () => {
                    this.loadingQueue.delete(url);
                };

                img.onload = () => {
                    cleanup();
                    this.cacheImage(url, img);
                    resolve(img);
                };

                img.onerror = () => {
                    cleanup();
                    this.failedUrls.add(url);
                    reject(new Error(`Failed to load ${url}`));
                };

                img.src = url;
            });
        },

        cacheImage: function(url, img) {
            if (this.preloadedImages.size >= CONFIG.CACHE_SIZE) {
                const firstKey = this.preloadedImages.keys().next().value;
                this.preloadedImages.delete(firstKey);
            }
            
            this.preloadedImages.set(url, img);
        },

        getNextImageIndex: function() {
            if (this.imageList.length === 0) return -1;
            if (this.imageList.length === 1) return 0;

            let attempts = 0;
            let nextIndex;
            
            do {
                nextIndex = Math.floor(Math.random() * this.imageList.length);
                attempts++;
            } while (
                (nextIndex === this.currentIndex || this.failedUrls.has(this.imageList[nextIndex])) && 
                attempts < this.imageList.length * 2
            );

            return nextIndex;
        },

        setInitialBackground: function() {
            if (this.imageList.length === 0) return;

            const index = this.getNextImageIndex();
            if (index >= 0) {
                this.currentIndex = index;
                const url = this.imageList[index];
                
                if (this.preloadedImages.has(url)) {
                    this.applyBackground(url);
                } else {
                    this.preloadImage(url).then(() => {
                        this.applyBackground(url);
                    }).catch(() => {
                        this.switchToNext();
                    });
                }
            }
        },

        switchToNext: function() {
            if (!this.isInitialized || this.imageList.length === 0) {
                if (this.imageList.length === 0 && this.isInitialized) {
                    return this.refreshImageList().then(() => {
                        if (this.imageList.length > 0) {
                            return this.switchToNext();
                        }
                        throw new Error('No images available after refresh');
                    });
                }
                return Promise.reject(new Error('Background manager not ready'));
            }

            this.pendingSwitches++;
            const switchId = this.pendingSwitches;

            return new Promise((resolve, reject) => {
                const nextIndex = this.getNextImageIndex();
                
                if (nextIndex < 0) {
                    this.refreshImageList().then(() => {
                        const retryIndex = this.getNextImageIndex();
                        if (retryIndex >= 0) {
                            const url = this.imageList[retryIndex];
                            this.preloadImage(url).then(() => {
                                if (switchId === this.pendingSwitches) {
                                    this.currentIndex = retryIndex;
                                    this.applyBackground(url);
                                    resolve(url);
                                }
                            }).catch(() => reject(new Error('No available images')));
                        } else {
                    reject(new Error('No available images'));
                        }
                    }).catch(() => reject(new Error('No available images')));
                    return;
                }

                const url = this.imageList[nextIndex];

                if (this.preloadedImages.has(url)) {
                    if (switchId === this.pendingSwitches) {
                        this.currentIndex = nextIndex;
                        this.applyBackground(url);
                        this.triggerPreload();
                        resolve(url);
                    }
                } else {
                    this.preloadImage(url)
                        .then(() => {
                            if (switchId === this.pendingSwitches) {
                                this.currentIndex = nextIndex;
                                this.applyBackground(url);
                                this.triggerPreload();
                                resolve(url);
                            }
                        })
                        .catch(() => {
                            if (switchId === this.pendingSwitches) {
                                this.switchToNext().then(resolve).catch(reject);
                            }
                        });
                }
            });
        },

        applyBackground: function(url) {
            if (!url) return;

            this.createBackgroundTransition();

            const overlay = 'linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5))';
            document.body.style.backgroundImage = `${overlay}, url("${url}")`;
            
            document.body.style.transition = `background-image ${CONFIG.SWITCH_ANIMATION_DURATION}ms cubic-bezier(0.4, 0, 0.2, 1)`;
            
            this.addFlashEffect();
            
            window.dispatchEvent(new CustomEvent('backgroundChanged', { 
                detail: { 
                    url, 
                    index: this.currentIndex,
                    cached: this.preloadedImages.size,
                    total: this.imageList.length
                } 
            }));
        },

        createBackgroundTransition: function() {
            const transitionEl = document.createElement('div');
            transitionEl.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: radial-gradient(circle at center, rgba(255,255,255,0.1) 0%, transparent 70%);
                pointer-events: none;
                z-index: 0;
                opacity: 0;
                transition: opacity 0.3s ease;
            `;
            document.body.appendChild(transitionEl);
            
            setTimeout(() => {
                transitionEl.style.opacity = '1';
            }, 10);
            
            setTimeout(() => {
                transitionEl.style.opacity = '0';
            }, 200);
            
            setTimeout(() => {
                if (transitionEl.parentNode) {
                    transitionEl.parentNode.removeChild(transitionEl);
                }
            }, 500);
        },

        addFlashEffect: function() {
            const flashEl = document.createElement('div');
            flashEl.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: linear-gradient(45deg, 
                    rgba(255,255,255,0) 0%, 
                    rgba(255,255,255,0.1) 50%, 
                    rgba(255,255,255,0) 100%);
                pointer-events: none;
                z-index: 0;
                transform: translateX(-100%);
                transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
            `;
            document.body.appendChild(flashEl);
            
            setTimeout(() => {
                flashEl.style.transform = 'translateX(100%)';
            }, 100);
            
            // Remove after animation
            setTimeout(() => {
                if (flashEl.parentNode) {
                    flashEl.parentNode.removeChild(flashEl);
                }
            }, 700);
        },

        triggerPreload: function() {
            // Preload next few images based on current position
            if (this.imageList.length <= 1) return;

            const preloadIndices = [];
            for (let i = 1; i <= CONFIG.PRELOAD_COUNT; i++) {
                const index = (this.currentIndex + i) % this.imageList.length;
                preloadIndices.push(index);
            }

            preloadIndices.forEach(index => {
                const url = this.imageList[index];
                if (!this.preloadedImages.has(url) && !this.loadingQueue.has(url)) {
                    this.preloadImage(url).catch(() => {
                        // Silently ignore preload failures
                    });
                }
            });
        },

        startAutoRefresh: function() {
            if (this.autoRefreshTimer) {
                clearInterval(this.autoRefreshTimer);
            }
            
            this.autoRefreshTimer = setInterval(() => {
                this.refreshImageList();
            }, CONFIG.AUTO_REFRESH_INTERVAL);
        },

        refreshImageList: function() {
            if (this.isRefreshing) {
                return Promise.resolve();
            }

            const now = Date.now();
            if (now - this.lastRefreshTime < CONFIG.MANUAL_REFRESH_COOLDOWN) {
                return Promise.resolve();
            }

            this.isRefreshing = true;
            this.lastRefreshTime = now;

            return this.loadImageList(true)
                .then(() => {
                    window.dispatchEvent(new CustomEvent('imageListRefreshed', { 
                        detail: { count: this.imageList.length } 
                    }));
                })
                .catch(err => {
                    console.warn('Failed to refresh image list:', err);
                })
                .finally(() => {
                    this.isRefreshing = false;
            });
        },

        handleInitializationError: function() {
            const defaultGradient = 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)';
            document.body.style.backgroundImage = defaultGradient;
            
            if (this.autoRefreshTimer) {
                clearInterval(this.autoRefreshTimer);
                this.autoRefreshTimer = null;
            }
            
            const retryDelay = Math.min(5000 * Math.pow(2, (this.retryCount || 0)), 30000);
            this.retryCount = (this.retryCount || 0) + 1;
            
            console.log(`Retrying initialization in ${retryDelay}ms (attempt ${this.retryCount})`);
            
            setTimeout(() => {
                this.init();
            }, retryDelay);
        },

        forceRefresh: function() {
            return this.refreshImageList();
        },

        debugAPI: function() {
            const apis = [
                {
                    name: 'GitHub API',
                    url: 'https://api.github.com/repos/Extious/image-bed-hosting/contents',
                    headers: { 'Accept': 'application/vnd.github.v3+json' }
                },
                {
                    name: 'JSDelivr Flat API',
                    url: CONFIG.API_URL,
                    headers: {}
                },
                {
                    name: 'JSDelivr Package API',
                    url: 'https://data.jsdelivr.com/v1/package/gh/Extious/image-bed-hosting',
                    headers: {}
                }
            ];
            
            return Promise.all(apis.map(api => 
                fetch(`${api.url}?debug=${Date.now()}`, { 
                    cache: 'no-cache',
                    headers: api.headers
                })
                .then(response => {
                    return response.json();
                })
                .then(data => {
                    let fileCount = 0;
                    let files = [];
                    
                    if (Array.isArray(data)) {
                        files = data;
                        fileCount = data.length;
                    } else if (data && data.files) {
                        files = data.files;
                        fileCount = data.files.length;
                    }
                    
                    const imageFiles = files.filter(file => {
                        const name = file && (file.name || file.path || file.file);
                        if (!name) return false;
                        const filename = name.split('/').pop().toLowerCase();
                        return CONFIG.SUPPORTED_FORMATS.some(format => 
                            filename.endsWith('.' + format.toLowerCase())
                        );
                    });
                    
                    return { 
                        api: api.name, 
                        totalFiles: fileCount, 
                        imageFiles: imageFiles.length,
                        success: true,
                        files: imageFiles
                    };
                })
                .catch(err => {
                    return { 
                        api: api.name, 
                        error: err.message, 
                        success: false 
                    };
                })
            ))
            .then(results => {
                return results;
            });
        },

        destroy: function() {
            if (this.autoRefreshTimer) {
                clearInterval(this.autoRefreshTimer);
                this.autoRefreshTimer = null;
            }
            this.preloadedImages.clear();
            this.loadingQueue.clear();
        },

        getStatus: function() {
            return {
                isInitialized: this.isInitialized,
                totalImages: this.imageList.length,
                preloadedCount: this.preloadedImages.size,
                currentIndex: this.currentIndex,
                failedUrls: this.failedUrls.size,
                loadingCount: this.loadingQueue.size,
                isRefreshing: this.isRefreshing,
                lastRefreshTime: this.lastRefreshTime,
                autoRefreshEnabled: !!this.autoRefreshTimer
            };
        }
    };

    // Create global instance
    window.backgroundManager = new BackgroundManager();
        
        // Keep only essential functions

    // Enhanced avatar click handler with beautiful loading effects
    function setupAvatarClickHandler() {
        const avatarEl = document.querySelector('.avatar');
        if (!avatarEl) return;

        avatarEl.style.cursor = 'pointer';
        avatarEl.title = 'Click to change background image';

        // Add loading state management
        let isLoading = false;

        avatarEl.addEventListener('click', function(e) {
            if (isLoading) return;

            isLoading = true;
            
            // Create beautiful loading effects
            const loadingContainer = createLoadingContainer();
            const progressBar = createProgressBar();
            const transitionOverlay = createTransitionOverlay();
            
            // Add elements to DOM
            avatarEl.parentNode.appendChild(loadingContainer);
            document.body.appendChild(progressBar);
            document.body.appendChild(transitionOverlay);
            
            // Start loading animations
            startLoadingAnimations(avatarEl, progressBar, transitionOverlay);

            window.backgroundManager.switchToNext()
                .then((newImageUrl) => {
                    // Success animations
                    showSuccessAnimation(avatarEl, transitionOverlay);
                    console.log('🎨 Background changed successfully!');
                })
                .catch(err => {
                    console.warn('Failed to switch background:', err);
                    // Error animations
                    showErrorAnimation(avatarEl);
                    
                    // Try to refresh image list on error
                    if (window.backgroundManager.forceRefresh) {
                        window.backgroundManager.forceRefresh().catch(() => {
                            console.warn('Also failed to refresh image list');
                        });
                    }
                })
                .finally(() => {
                    // Cleanup with smooth animations
                    setTimeout(() => {
                        cleanupLoadingEffects(loadingContainer, progressBar, transitionOverlay);
                        resetAvatarState(avatarEl);
                        isLoading = false;
                    }, 300);
                });
        });
    }

    // Create beautiful loading container
    function createLoadingContainer() {
        const container = document.createElement('div');
        container.className = 'avatar-loading-container';
        
        // Pulse effect
        const pulse = document.createElement('div');
        pulse.className = 'loading-pulse';
        
        // Wave effect
        const wave = document.createElement('div');
        wave.className = 'loading-wave';
        
        // Loading dots
        const dots = document.createElement('div');
        dots.className = 'loading-dots';
        for (let i = 0; i < 3; i++) {
            const dot = document.createElement('div');
            dot.className = 'loading-dot';
            dots.appendChild(dot);
        }
        
        container.appendChild(wave);
        container.appendChild(pulse);
        container.appendChild(dots);
        
        return container;
    }

    // Create progress bar
    function createProgressBar() {
        const progressBar = document.createElement('div');
        progressBar.className = 'loading-progress';
        return progressBar;
    }

    // Create transition overlay
    function createTransitionOverlay() {
        const overlay = document.createElement('div');
        overlay.className = 'bg-transition-overlay';
        return overlay;
    }

    // Start loading animations
    function startLoadingAnimations(avatarEl, progressBar, transitionOverlay) {
        // Avatar container effects
        const avatarWrap = avatarEl.parentNode;
        avatarWrap.classList.add('loading');
        
        // Avatar effects
        avatarEl.style.transform = 'scale(0.95)';
        avatarEl.style.filter = 'brightness(0.8) saturate(0.8)';
        avatarEl.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
        
        // Show progress bar
        setTimeout(() => {
            progressBar.classList.add('visible');
        }, 100);
        
        // Activate transition overlay
        setTimeout(() => {
            transitionOverlay.classList.add('active');
        }, 200);
    }

    // Show success animation
    function showSuccessAnimation(avatarEl, transitionOverlay) {
        const avatarWrap = avatarEl.parentNode;
        avatarWrap.classList.remove('loading');
        
        avatarEl.style.filter = 'brightness(1.2) saturate(1.2)';
        avatarEl.style.transform = 'scale(1.05)';
        
        // Add success glow effect
        avatarEl.style.boxShadow = '0 0 20px rgba(34, 197, 94, 0.5)';
        
        // Show success notification
        showSuccessNotification();
        
        setTimeout(() => {
            avatarEl.style.filter = '';
            avatarEl.style.transform = '';
            avatarEl.style.boxShadow = '';
        }, 400);
    }

    // Show success notification
    function showSuccessNotification() {
        const notification = document.createElement('div');
        notification.className = 'success-notification';
        notification.textContent = 'Background changed successfully!';
        
        document.body.appendChild(notification);
        
        // Show notification
        setTimeout(() => {
            notification.classList.add('visible');
        }, 100);
        
        // Hide and remove notification
        setTimeout(() => {
            notification.classList.remove('visible');
        }, 2000);
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 2300);
    }

    // Show error animation
    function showErrorAnimation(avatarEl) {
        avatarEl.style.filter = 'brightness(0.7) sepia(1) hue-rotate(0deg) saturate(2)';
        avatarEl.style.transform = 'scale(0.95)';
        
        // Add error glow effect
        avatarEl.style.boxShadow = '0 0 20px rgba(239, 68, 68, 0.5)';
        
        // Shake effect
        avatarEl.style.animation = 'shake 0.5s ease-in-out';
        
        setTimeout(() => {
            avatarEl.style.filter = '';
            avatarEl.style.transform = '';
            avatarEl.style.boxShadow = '';
            avatarEl.style.animation = '';
        }, 800);
    }

    // Cleanup loading effects
    function cleanupLoadingEffects(loadingContainer, progressBar, transitionOverlay) {
        // Fade out progress bar
        progressBar.classList.remove('visible');
        
        // Remove transition overlay
        transitionOverlay.classList.remove('active');
        
        // Remove elements after animations
        setTimeout(() => {
            if (loadingContainer && loadingContainer.parentNode) {
                loadingContainer.parentNode.removeChild(loadingContainer);
            }
            if (progressBar && progressBar.parentNode) {
                progressBar.parentNode.removeChild(progressBar);
            }
            if (transitionOverlay && transitionOverlay.parentNode) {
                transitionOverlay.parentNode.removeChild(transitionOverlay);
            }
        }, 500);
    }

    // Reset avatar to default state
    function resetAvatarState(avatarEl) {
        const avatarWrap = avatarEl.parentNode;
        avatarWrap.classList.remove('loading');
        
        avatarEl.style.transform = '';
        avatarEl.style.filter = '';
        avatarEl.style.boxShadow = '';
        avatarEl.style.animation = '';
        avatarEl.style.transition = '';
    }

    // Setup keyboard shortcuts for basic functionality
    function setupKeyboardShortcuts() {
        document.addEventListener('keydown', function(e) {
            // Spacebar to switch background
            if (e.key === ' ' && !e.target.matches('input, textarea, select, button')) {
                e.preventDefault();
                if (window.backgroundManager && window.backgroundManager.switchToNext) {
                    window.backgroundManager.switchToNext()
                        .catch(err => console.warn('Failed to switch background via keyboard:', err));
                }
            }
        });
    }

    // Add status display for debugging
    function setupStatusDisplay() {
        // Add status indicator (only in development)
        if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
            const statusEl = document.createElement('div');
            statusEl.id = 'bg-status';
            statusEl.style.cssText = `
                position: fixed; 
                bottom: 10px; 
                right: 10px; 
                background: rgba(0,0,0,0.7); 
                color: white; 
                padding: 5px 10px; 
                border-radius: 5px; 
                font-size: 12px; 
                z-index: 9999;
                font-family: monospace;
                max-width: 200px;
                font-size: 11px;
            `;
            document.body.appendChild(statusEl);
            
            const updateStatus = () => {
                if (window.backgroundManager) {
                    const status = window.backgroundManager.getStatus();
                    statusEl.innerHTML = `
                        Images: ${status.totalImages}<br>
                        Cached: ${status.preloadedCount}<br>
                        Failed: ${status.failedUrls}<br>
                        ${status.isRefreshing ? 'Refreshing...' : 'Ready'}
                    `;
                }
            };
            
            setInterval(updateStatus, 2000);
            window.addEventListener('imageListRefreshed', updateStatus);
            window.addEventListener('backgroundChanged', updateStatus);
        }
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setupAvatarClickHandler();
            setupKeyboardShortcuts();
            setupStatusDisplay();
        });
    } else {
        setupAvatarClickHandler();
        setupKeyboardShortcuts();
        setupStatusDisplay();
    }

})();
