// Performance Optimization Configuration
window.PerformanceConfig = {
    imageOptimization: {
        lazyLoadThreshold: 100,
        preloadStrategy: 'progressive',
        maxConcurrentLoads: 3,
        retryDelay: 2000,
        timeout: 8000
    },
    
    resourceOptimization: {
        preloadCritical: true,
        deferNonCritical: true,
        useIntersectionObserver: true,
        prefetchOnIdle: true
    },
    
    animationOptimization: {
        useRequestAnimationFrame: true,
        reduceMotion: false,
        optimizeTransitions: true,
        hardwareAcceleration: true
    },
    
    memoryOptimization: {
        maxCacheSize: 15,
        cleanupInterval: 300000,
        enableWeakReferences: true,
        monitorMemoryUsage: true
    }
};

// Performance monitoring utilities
window.PerformanceUtils = {
    measureTime: function(name, fn) {
        const start = performance.now();
        const result = fn();
        const end = performance.now();
        console.log(`⏱️ ${name}: ${(end - start).toFixed(2)}ms`);
        return result;
    },
    
    measureAsync: async function(name, fn) {
        const start = performance.now();
        const result = await fn();
        const end = performance.now();
        console.log(`⏱️ ${name}: ${(end - start).toFixed(2)}ms`);
        return result;
    },
    
    getLoadTime: function() {
        const navigation = performance.getEntriesByType('navigation')[0];
        if (navigation) {
            return {
                domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
                loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
                total: navigation.loadEventEnd - navigation.navigationStart
            };
        }
        return null;
    }
};
