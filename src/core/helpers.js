export const JSH = {
    browser: {
        detectBrowser: () => {
            const ua = navigator.userAgent;
            let tem;
            let M = ua.match(/(opera|chrome|safari|firefox|msie|trident(?=\/))\/?\s*(\d+)/i) || [];
        
            if (/trident/i.test(M[1])) {
                tem = /\brv[ :]+(\d+)/g.exec(ua) || [];
                
                return { name: 'IE', version: (tem[1] || '') };
            }
        
            if (M[1] === 'Chrome') {
                tem = ua.match(/\b(OPR|Edge)\/(\d+)/);
                
                if (tem != null) {
                    return { name: tem[1].replace('OPR', 'Opera'), version: tem[2] };
                }
            }
        
            M = M[2] ? [M[1], M[2]] : [navigator.appName, navigator.appVersion, '-?'];
        
            if ((tem = ua.match(/version\/(\d+)/i)) != null) {
                M.splice(1, 1, tem[1]);
            }
        
            return { name: M[0], version: M[1] };
        },

        getLocalStorageUsage: () => {
            try {
                let totalBytes = 0;
                let entries = [];
            
                for(let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    const value = localStorage.getItem(key);
                    const keySize = key.length * 2;
                    const valueSize = value.length * 2;
                    const entrySize = keySize + valueSize;
                
                    totalBytes += entrySize;
                
                    entries.push({
                        key,
                        keySize: `${key.length} симв (${keySize} байт)`,
                        valueSize: `${value.length} симв (${valueSize} байт)`,
                        totalSize: `${(entrySize / 1024).toFixed(2)} KB`,
                        valuePreview: value.length > 100 ? value.substring(0, 100) + '...' : value
                    });
                }
            
                return {
                    total: {
                        bytes: totalBytes,
                        kilobytes: (totalBytes / 1024).toFixed(2),
                        megabytes: (totalBytes / (1024 * 1024)).toFixed(4),
                        entries: localStorage.length
                    },
                    entries,
                    limit: {
                        standard: '5 MB',
                        usedPercent: ((totalBytes / (5 * 1024 * 1024)) * 100).toFixed(1)
                    }
                };
            } catch (error) {
                console.error('Error calculating localStorage usage:', error);
                
                return null;
            }
        }
    },
    lang: {
        en: {
            cattype_utilities: 'Utilities',
            cattype_system: 'System',
        },
        ru: {
            cattype_utilities: 'Утилиты',
            cattype_system: 'Система',
        },
    },
    system: {
        getImageList: () => {
            const imagesContext = require.context(
                '@/assets/wallpapers/', // путь
                false, // включать подпапки?
                /\.(png|jpe?g|gif|webp|svg)$/i // регулярка для фильтрации
            );
  
            return imagesContext.keys().map((key) => {
                // Получаем только имя файла без пути и расширения
                const fileName = key.replace(/^.*[\\/]/, '').replace(/\.[^/.]+$/, '');
                // Получаем имя файла и расширения (без пути)
                const fileNameWithExtension = key.replace(/^.*[\\\\/]/, '');
                // Полный путь для require
                const imagePath = imagesContext(key);
    
                return {
                    name: fileName,
                    nameExt: fileNameWithExtension,
                    path: imagePath,
                    fullPath: key
                };
            });
        },

        getAvatarsList: () => {
            const imagesContext = require.context(
                '@/assets/avatars/', // путь
                false, // включать подпапки?
                /\.(png|jpe?g|gif|webp|svg)$/i // регулярка для фильтрации
            );
  
            return imagesContext.keys().map((key) => {
                console.log('key', key);
                // Получаем только имя файла без пути и расширения
                const fileName = key.replace(/^.*[\\/]/, '').replace(/\.[^/.]+$/, '');
                // Получаем имя файла и расширения (без пути)
                const fileNameWithExtension = key.replace(/^.*[\\\\/]/, '');
                // Полный путь для require
                const imagePath = imagesContext(key);
    
                return {
                    name: fileName,
                    nameExt: fileNameWithExtension,
                    path: imagePath,
                    fullPath: key
                };
            });
        },
    },
}