(() => {
    'use strict';

    const STORAGE_KEY = 'hitman-master-state-v3';
    const MODES = {
        normal: {
            key: 'normal',
            label: 'Normal',
            image: 'Easymode1.png',
            ammo: 7,
            time: 40,
            required: 6,
            spawnEvery: 980,
            lifetime: 2200,
            maxTargets: 3,
            targetSize: 76,
            speed: 1
        },
        hard: {
            key: 'hard',
            label: 'Hard',
            image: 'Hardmode1.png',
            ammo: 7,
            time: 36,
            required: 8,
            spawnEvery: 760,
            lifetime: 1700,
            maxTargets: 4,
            targetSize: 62,
            speed: 1.2
        },
        impossible: {
            key: 'impossible',
            label: 'Impossible',
            image: 'Impossiblemode1.png',
            ammo: 7,
            time: 32,
            required: 10,
            spawnEvery: 620,
            lifetime: 1250,
            maxTargets: 5,
            targetSize: 54,
            speed: 1.45
        }
    };

    const I18N = {
        'en-us': {
            aboutGame: 'About Game',
            start: 'Start',
            exitGame: 'Exit Game',
            back: 'Back',
            settings: 'Setting⚙️',
            normalMode: 'Normal',
            hardMode: 'Hard',
            impossibleMode: 'Impossible',
            shoot: 'SHOOT!',
            aboutTitle: 'About Hitman Master',
            reload: 'Reload',
            pause: 'Pause',
            resume: 'Resume',
            restart: 'Restart',
            levels: 'Levels',
            nextLevel: 'Next Level',
            retry: 'Retry',
            missionComplete: 'Mission Complete!',
            missionFailed: 'Mission Failed!',
            reloadPrompt: 'Out of ammo. Reload!',
            selectedMode: 'Mode selected',
            progressReset: 'Progress reset',
            exitConfirm: 'Exit the game menu? Browser tabs can only close if the game opened them.',
            thanks: 'Thanks for playing Hitman Master!'
        },
        'en-uk': {},
        de: {
            aboutGame: 'Über das Spiel',
            start: 'Start',
            exitGame: 'Spiel beenden',
            back: 'Zurück',
            settings: 'Einstellung⚙️',
            normalMode: 'Normal',
            hardMode: 'Schwer',
            impossibleMode: 'Unmöglich',
            shoot: 'SCHIESS!',
            aboutTitle: 'Über Hitman Master',
            reload: 'Nachladen',
            pause: 'Pause',
            resume: 'Weiter',
            restart: 'Neu starten',
            levels: 'Level',
            nextLevel: 'Nächstes Level',
            retry: 'Wiederholen',
            missionComplete: 'Mission erfüllt!',
            missionFailed: 'Mission gescheitert!',
            reloadPrompt: 'Keine Munition. Nachladen!',
            selectedMode: 'Modus gewählt',
            progressReset: 'Fortschritt zurückgesetzt',
            exitConfirm: 'Spielmenü verlassen?',
            thanks: 'Danke fürs Spielen von Hitman Master!'
        },
        fr: {
            aboutGame: 'À propos du jeu',
            start: 'Démarrer',
            exitGame: 'Quitter le jeu',
            back: 'Retour',
            settings: 'Réglage⚙️',
            normalMode: 'Normal',
            hardMode: 'Difficile',
            impossibleMode: 'Impossible',
            shoot: 'TIREZ!',
            aboutTitle: 'À propos de Hitman Master',
            reload: 'Recharger',
            pause: 'Pause',
            resume: 'Reprendre',
            restart: 'Recommencer',
            levels: 'Niveaux',
            nextLevel: 'Niveau suivant',
            retry: 'Réessayer',
            missionComplete: 'Mission réussie!',
            missionFailed: 'Mission échouée!',
            reloadPrompt: 'Plus de munitions. Rechargez!',
            selectedMode: 'Mode sélectionné',
            progressReset: 'Progression réinitialisée',
            exitConfirm: 'Quitter le menu du jeu?',
            thanks: 'Merci d’avoir joué à Hitman Master!'
        },
        es: {
            aboutGame: 'Acerca del juego',
            start: 'Comenzar',
            exitGame: 'Salir del juego',
            back: 'Atrás',
            settings: 'Ajuste⚙️',
            normalMode: 'Normal',
            hardMode: 'Difícil',
            impossibleMode: 'Imposible',
            shoot: '¡DISPARA!',
            aboutTitle: 'Acerca de Hitman Master',
            reload: 'Recargar',
            pause: 'Pausa',
            resume: 'Continuar',
            restart: 'Reiniciar',
            levels: 'Niveles',
            nextLevel: 'Siguiente nivel',
            retry: 'Reintentar',
            missionComplete: '¡Misión completa!',
            missionFailed: '¡Misión fallida!',
            reloadPrompt: 'Sin munición. ¡Recarga!',
            selectedMode: 'Modo seleccionado',
            progressReset: 'Progreso reiniciado',
            exitConfirm: '¿Salir del menú del juego?',
            thanks: '¡Gracias por jugar Hitman Master!'
        }
    };
    I18N['en-uk'] = { ...I18N['en-us'] };

    const defaultState = {
        language: 'en-us',
        lastMode: 'normal',
        settings: {
            sound: true,
            vibration: true,
            sensitivity: 1
        },
        bestScores: {},
        completed: {}
    };

    let state = loadState();
    let audioContext = null;
    let toastTimer = null;

    function loadState() {
        try {
            const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
            return {
                ...defaultState,
                ...saved,
                settings: { ...defaultState.settings, ...(saved.settings || {}) },
                bestScores: { ...(saved.bestScores || {}) },
                completed: { ...(saved.completed || {}) }
            };
        } catch (error) {
            return { ...defaultState, settings: { ...defaultState.settings } };
        }
    }

    function saveState() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        } catch (error) {
            // Local storage can be unavailable in private windows. The game still works for this session.
        }
    }

    function normalizeMode(mode) {
        return MODES[mode] ? mode : 'normal';
    }

    function getParam(name) {
        return new URLSearchParams(window.location.search).get(name);
    }

    function setMode(mode) {
        const normalized = normalizeMode(mode);
        state.lastMode = normalized;
        saveState();
        try {
            sessionStorage.setItem('hm-mode', normalized);
        } catch (error) {
            // Ignore session storage failures.
        }
        return normalized;
    }

    function getCurrentMode() {
        const fromUrl = normalizeMode(getParam('mode'));
        if (getParam('mode')) return setMode(fromUrl);

        try {
            const fromSession = sessionStorage.getItem('hm-mode');
            if (MODES[fromSession]) return setMode(fromSession);
        } catch (error) {
            // Ignore session storage failures.
        }

        return setMode(state.lastMode || 'normal');
    }

    function setLevel(level) {
        const parsed = clamp(Number.parseInt(level, 10) || 1, 1, 20);
        try {
            sessionStorage.setItem('hm-level', String(parsed));
        } catch (error) {
            // Ignore session storage failures.
        }
        return parsed;
    }

    function getCurrentLevel() {
        const fromUrl = Number.parseInt(getParam('level'), 10);
        if (Number.isInteger(fromUrl)) return setLevel(fromUrl);

        try {
            const fromSession = Number.parseInt(sessionStorage.getItem('hm-level'), 10);
            if (Number.isInteger(fromSession)) return setLevel(fromSession);
        } catch (error) {
            // Ignore session storage failures.
        }

        return setLevel(1);
    }

    function clamp(value, min, max) {
        return Math.min(max, Math.max(min, value));
    }

    function t(key) {
        const lang = I18N[state.language] ? state.language : 'en-us';
        return I18N[lang][key] || I18N['en-us'][key] || key;
    }

    function applyLanguage() {
        document.querySelectorAll('[data-i18n]').forEach((element) => {
            const key = element.getAttribute('data-i18n');
            if (key) element.textContent = t(key);
        });

        document.querySelectorAll('select.language-combo').forEach((select) => {
            select.value = state.language;
        });
    }

    function initLanguage() {
        document.querySelectorAll('select.language-combo').forEach((select) => {
            select.value = state.language;
            select.addEventListener('change', () => {
                state.language = select.value;
                saveState();
                applyLanguage();
                toast(select.options[select.selectedIndex]?.text || 'Language updated');
            });
        });

        document.querySelectorAll('[data-lang]').forEach((link) => {
            link.addEventListener('click', (event) => {
                event.preventDefault();
                const lang = link.getAttribute('data-lang');
                if (!I18N[lang]) return;
                state.language = lang;
                saveState();
                applyLanguage();
                toast(link.textContent.trim());
            });
        });
    }

    function playSound(type = 'click') {
        if (!state.settings.sound || !window.AudioContext && !window.webkitAudioContext) return;

        try {
            const Context = window.AudioContext || window.webkitAudioContext;
            audioContext = audioContext || new Context();
            const oscillator = audioContext.createOscillator();
            const gain = audioContext.createGain();
            const now = audioContext.currentTime;
            const sounds = {
                click: [320, 0.03, 0.025],
                hit: [740, 0.06, 0.04],
                miss: [120, 0.07, 0.035],
                reload: [420, 0.08, 0.035],
                empty: [80, 0.05, 0.025],
                win: [880, 0.15, 0.05],
                lose: [140, 0.18, 0.04]
            };
            const [frequency, duration, volume] = sounds[type] || sounds.click;

            oscillator.type = type === 'miss' || type === 'lose' ? 'sawtooth' : 'square';
            oscillator.frequency.setValueAtTime(frequency, now);
            if (type === 'win') oscillator.frequency.exponentialRampToValueAtTime(1320, now + duration);

            gain.gain.setValueAtTime(volume, now);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
            oscillator.connect(gain);
            gain.connect(audioContext.destination);
            oscillator.start(now);
            oscillator.stop(now + duration);
        } catch (error) {
            // Audio is optional.
        }
    }

    function vibrate(pattern = 18) {
        if (state.settings.vibration && navigator.vibrate) {
            navigator.vibrate(pattern);
        }
    }

    function toast(message, duration = 1800) {
        let toastElement = document.querySelector('.hm-toast');
        if (!toastElement) {
            toastElement = document.createElement('div');
            toastElement.className = 'hm-toast';
            toastElement.setAttribute('role', 'status');
            toastElement.setAttribute('aria-live', 'polite');
            document.body.appendChild(toastElement);
        }

        toastElement.textContent = message;
        toastElement.classList.add('is-visible');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => toastElement.classList.remove('is-visible'), duration);
    }

    function createSettingsModal() {
        let modal = document.querySelector('.hm-modal');
        if (modal) return modal;

        modal = document.createElement('div');
        modal.className = 'hm-modal';
        modal.hidden = true;
        modal.innerHTML = `
            <section class="hm-dialog" role="dialog" aria-modal="true" aria-labelledby="hmSettingsTitle">
                <h2 id="hmSettingsTitle">Settings</h2>
                <label class="hm-setting-row">
                    <span>Sound FX</span>
                    <input type="checkbox" id="hmSoundToggle">
                </label>
                <label class="hm-setting-row">
                    <span>Vibration</span>
                    <input type="checkbox" id="hmVibrationToggle">
                </label>
                <label class="hm-setting-row">
                    <span>Aim sensitivity</span>
                    <input type="range" id="hmSensitivityRange" min="0.6" max="1.4" step="0.1">
                </label>
                <div class="hm-dialog-actions">
                    <button type="button" class="hm-dialog-btn hm-danger-action" id="hmResetProgress">Reset progress</button>
                    <button type="button" class="hm-dialog-btn" id="hmCloseSettings">Close</button>
                </div>
            </section>
        `;
        document.body.appendChild(modal);

        modal.addEventListener('click', (event) => {
            if (event.target === modal) closeSettings();
        });
        modal.querySelector('#hmCloseSettings').addEventListener('click', closeSettings);
        modal.querySelector('#hmSoundToggle').addEventListener('change', (event) => {
            state.settings.sound = event.target.checked;
            saveState();
            if (state.settings.sound) playSound('click');
        });
        modal.querySelector('#hmVibrationToggle').addEventListener('change', (event) => {
            state.settings.vibration = event.target.checked;
            saveState();
            vibrate(20);
        });
        modal.querySelector('#hmSensitivityRange').addEventListener('input', (event) => {
            state.settings.sensitivity = Number.parseFloat(event.target.value) || 1;
            saveState();
        });
        modal.querySelector('#hmResetProgress').addEventListener('click', () => {
            state.bestScores = {};
            state.completed = {};
            saveState();
            toast(t('progressReset'));
            playSound('reload');
        });

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && !modal.hidden) closeSettings();
        });

        return modal;
    }

    function openSettings() {
        const modal = createSettingsModal();
        modal.querySelector('#hmSoundToggle').checked = Boolean(state.settings.sound);
        modal.querySelector('#hmVibrationToggle').checked = Boolean(state.settings.vibration);
        modal.querySelector('#hmSensitivityRange').value = String(state.settings.sensitivity || 1);
        modal.hidden = false;
        playSound('click');
    }

    function closeSettings() {
        const modal = document.querySelector('.hm-modal');
        if (modal) modal.hidden = true;
    }

    function initSettings() {
        document.querySelectorAll('.hidden-trigger, .hidden-settings, [data-settings-trigger]').forEach((button) => {
            button.setAttribute('type', 'button');
            button.addEventListener('click', openSettings);
        });
    }

    function enhanceButtons() {
        document.addEventListener('click', (event) => {
            const button = event.target.closest('button, .label-btn, .menu-btn, .nav-btn, .back-btn');
            if (!button) return;
            button.classList.remove('hm-click-pop');
            void button.offsetWidth;
            button.classList.add('hm-click-pop');
            playSound('click');
        });
    }

    function initHomePage() {
        const exitButton = document.querySelector('.exit-btn');
        if (exitButton) {
            exitButton.addEventListener('click', () => {
                if (window.confirm(t('exitConfirm'))) {
                    toast(t('thanks'));
                    window.close();
                }
            });
        }
    }

    function initModePage() {
        document.querySelectorAll('.card-item').forEach((element) => {
            element.addEventListener('click', (event) => {
                const source = event.target.closest('[data-mode]') || element.querySelector('[data-mode]');
                if (!source) return;
                const mode = setMode(source.getAttribute('data-mode'));
                toast(`${t('selectedMode')}: ${MODES[mode].label}`);
                setTimeout(() => {
                    window.location.href = `level.html?mode=${encodeURIComponent(mode)}`;
                }, 120);
            });
        });
    }

    function initLevelPage() {
        const mode = getCurrentMode();
        const modeData = MODES[mode];
        const title = document.querySelector('.level-title-box h2');
        if (title) {
            title.setAttribute('title', `${modeData.label} mode`);
        }

        document.querySelectorAll('.lvl-btn').forEach((button, index) => {
            const level = Number.parseInt(button.textContent, 10) || index + 1;
            button.setAttribute('type', 'button');
            button.setAttribute('aria-label', `${modeData.label} level ${level}`);
            button.title = `${modeData.label} - Level ${level}`;
            button.addEventListener('click', () => {
                setMode(mode);
                setLevel(level);
                window.location.href = `game.html?mode=${encodeURIComponent(mode)}&level=${level}`;
            });
        });
    }

    function initPage() {
        applyLanguage();
        initLanguage();
        initSettings();
        enhanceButtons();

        const page = document.body.getAttribute('data-page');
        if (page === 'home') initHomePage();
        if (page === 'mode') initModePage();
        if (page === 'level') initLevelPage();
    }

    window.HitmanMaster = {
        MODES,
        getState: () => state,
        updateState: (updater) => {
            const updated = updater(state);
            if (updated) state = updated;
            saveState();
            return state;
        },
        saveState,
        setMode,
        getCurrentMode,
        setLevel,
        getCurrentLevel,
        playSound,
        vibrate,
        toast,
        t,
        clamp
    };

    document.addEventListener('DOMContentLoaded', initPage);
})();
