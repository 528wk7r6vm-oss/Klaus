(() => {
    'use strict';

    const HM = window.HitmanMaster;
    const MODES = HM?.MODES || {};
    const $ = (selector) => document.querySelector(selector);

    const elements = {};
    let modeKey = 'normal';
    let level = 1;
    let config = null;
    let score = 0;
    let hits = 0;
    let misses = 0;
    let combo = 0;
    let ammo = 0;
    let timeLeft = 0;
    let running = false;
    let paused = false;
    let reloading = false;
    let spawnTimer = null;
    let clockTimer = null;
    let countdownTimer = null;
    let targetId = 0;
    const targets = new Map();
    const pointer = { x: 0, y: 0, initialized: false };

    document.addEventListener('DOMContentLoaded', initGame);

    function initGame() {
        collectElements();
        modeKey = HM?.getCurrentMode ? HM.getCurrentMode() : 'normal';
        level = HM?.getCurrentLevel ? HM.getCurrentLevel() : 1;
        config = buildConfig(modeKey, level);

        setupMissionUI();
        bindEvents();
        resetMission();
        startCountdown();
    }

    function collectElements() {
        elements.arena = $('#arena');
        elements.arenaBg = $('#arenaBg');
        elements.targetLayer = $('#targetLayer');
        elements.shotLayer = $('#shotLayer');
        elements.crosshair = $('#crosshair');
        elements.countdown = $('#countdown');
        elements.missionText = $('#missionText');
        elements.score = $('#scoreValue');
        elements.ammo = $('#ammoValue');
        elements.timer = $('#timerValue');
        elements.hit = $('#hitValue');
        elements.required = $('#requiredValue');
        elements.combo = $('#comboValue');
        elements.missionFill = $('#missionFill');
        elements.missionProgress = $('#missionProgress');
        elements.reload = $('#reloadBtn');
        elements.restart = $('#restartBtn');
        elements.pause = $('#pauseBtn');
        elements.back = $('#backToLevels');
        elements.resultPanel = $('#resultPanel');
        elements.resultTitle = $('#resultTitle');
        elements.resultStats = $('#resultStats');
        elements.retry = $('#retryBtn');
        elements.levels = $('#levelsBtn');
        elements.nextLevel = $('#nextLevelBtn');
    }

    function buildConfig(mode, selectedLevel) {
        const base = MODES[mode] || MODES.normal || {
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
        };
        const levelBoost = Math.max(0, selectedLevel - 1);

        return {
            ...base,
            level: selectedLevel,
            ammo: 7,
            required: Math.min(24, base.required + Math.floor(levelBoost / 2)),
            time: Math.max(18, base.time - Math.floor(levelBoost / 4) * 3),
            spawnEvery: Math.max(330, base.spawnEvery - levelBoost * 18),
            lifetime: Math.max(620, base.lifetime - levelBoost * 28),
            maxTargets: Math.min(7, base.maxTargets + Math.floor(levelBoost / 5)),
            targetSize: Math.max(38, base.targetSize - Math.floor(levelBoost / 3) * 2),
            moveDistance: 120 + levelBoost * 4,
            scoreBonus: selectedLevel * 8
        };
    }

    function setupMissionUI() {
        document.title = `Hitman Master - ${config.label} Level ${level}`;
        elements.arenaBg.src = config.image;
        elements.arenaBg.alt = `${config.label} mission background`;
        elements.missionText.textContent = `${config.label} / Level ${level}`;
        elements.back.addEventListener('click', () => {
            cleanupTimers();
            document.body.classList.remove('hm-game-paused');
            window.location.href = `level.html?mode=${encodeURIComponent(modeKey)}`;
        });
    }

    function bindEvents() {
        elements.arena.addEventListener('pointermove', moveCrosshair);
        elements.arena.addEventListener('pointerdown', (event) => {
            if (event.button !== undefined && event.button !== 0) return;
            shoot(event.clientX, event.clientY);
        });

        elements.reload.addEventListener('click', reload);
        elements.restart.addEventListener('click', restartMission);
        elements.pause.addEventListener('click', () => togglePause());
        elements.retry.addEventListener('click', restartMission);
        elements.levels.addEventListener('click', () => {
            window.location.href = `level.html?mode=${encodeURIComponent(modeKey)}`;
        });
        elements.nextLevel.addEventListener('click', () => {
            const next = Math.min(20, level + 1);
            window.location.href = `game.html?mode=${encodeURIComponent(modeKey)}&level=${next}`;
        });

        window.addEventListener('resize', () => {
            if (!pointer.initialized) centerCrosshair();
        });

        document.addEventListener('keydown', (event) => {
            if (event.repeat) return;
            const key = event.key.toLowerCase();
            if (key === 'r') reload();
            if (key === 'p') togglePause();
            if (key === ' ' || key === 'enter') {
                event.preventDefault();
                const rect = elements.arena.getBoundingClientRect();
                const x = pointer.initialized ? rect.left + pointer.x : rect.left + rect.width / 2;
                const y = pointer.initialized ? rect.top + pointer.y : rect.top + rect.height / 2;
                shoot(x, y);
            }
        });
    }

    function resetMission() {
        cleanupTimers();
        clearTargets();
        score = 0;
        hits = 0;
        misses = 0;
        combo = 0;
        ammo = config.ammo;
        timeLeft = config.time;
        running = false;
        paused = false;
        document.body.classList.remove('hm-game-paused');
        reloading = false;
        targetId = 0;
        elements.resultPanel.hidden = true;
        elements.countdown.classList.remove('is-hidden');
        elements.pause.textContent = HM?.t ? HM.t('pause') : 'Pause';
        elements.reload.disabled = false;
        centerCrosshair();
        updateHud();
    }

    function restartMission() {
        resetMission();
        startCountdown();
    }

    function startCountdown() {
        let count = 3;
        elements.countdown.textContent = String(count);
        window.clearInterval(countdownTimer);
        countdownTimer = window.setInterval(() => {
            count -= 1;
            if (count > 0) {
                elements.countdown.textContent = String(count);
            } else if (count === 0) {
                elements.countdown.textContent = 'GO!';
            } else {
                window.clearInterval(countdownTimer);
                countdownTimer = null;
                elements.countdown.classList.add('is-hidden');
                startMission();
            }
        }, 650);
    }

    function startMission() {
        running = true;
        paused = false;
        spawnTarget();
        spawnTimer = window.setInterval(spawnTarget, config.spawnEvery);
        clockTimer = window.setInterval(tickClock, 1000);
    }

    function tickClock() {
        if (!running || paused) return;
        timeLeft -= 1;
        updateHud();
        if (timeLeft <= 0) endMission(false);
    }

    function moveCrosshair(event) {
        const rect = elements.arena.getBoundingClientRect();
        const sensitivity = HM?.getState?.().settings?.sensitivity || 1;
        const rawX = event.clientX - rect.left;
        const rawY = event.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        pointer.x = clamp(centerX + (rawX - centerX) * sensitivity, 0, rect.width);
        pointer.y = clamp(centerY + (rawY - centerY) * sensitivity, 0, rect.height);
        pointer.initialized = true;
        elements.crosshair.style.left = `${pointer.x}px`;
        elements.crosshair.style.top = `${pointer.y}px`;
    }

    function centerCrosshair() {
        const rect = elements.arena.getBoundingClientRect();
        pointer.x = rect.width / 2;
        pointer.y = rect.height / 2;
        pointer.initialized = false;
        elements.crosshair.style.left = '50%';
        elements.crosshair.style.top = '50%';
    }

    function shoot(clientX, clientY) {
        if (!running || paused || elements.countdown && !elements.countdown.classList.contains('is-hidden')) return;

        if (reloading) {
            HM?.toast?.('Reloading...');
            return;
        }

        if (ammo <= 0) {
            HM?.playSound?.('empty');
            HM?.vibrate?.([20, 40, 20]);
            HM?.toast?.(HM?.t ? HM.t('reloadPrompt') : 'Out of ammo. Reload!');
            elements.reload.classList.add('hm-click-pop');
            return;
        }

        ammo -= 1;
        makeShotMark(clientX, clientY);
        const target = findHitTarget(clientX, clientY);

        if (target) {
            registerHit(target, clientX, clientY);
        } else {
            registerMiss();
        }

        updateHud();
        if (ammo === 0 && running) {
            HM?.toast?.(HM?.t ? HM.t('reloadPrompt') : 'Out of ammo. Reload!');
        }
    }

    function registerHit(target, clientX, clientY) {
        target.animation?.cancel?.();
        target.element.classList.add('hit');
        targets.delete(target.id);
        window.setTimeout(() => target.element.remove(), 220);

        combo += 1;
        hits += 1;
        const points = 100 + config.scoreBonus + combo * 15 + Math.max(0, timeLeft);
        score += points;
        makeHitScore(clientX, clientY, `+${points}`);
        HM?.playSound?.('hit');
        HM?.vibrate?.(15);

        if (hits >= config.required) {
            window.setTimeout(() => endMission(true), 220);
        }
    }

    function registerMiss() {
        combo = 0;
        misses += 1;
        score = Math.max(0, score - 20);
        elements.arena.classList.remove('miss-shake');
        void elements.arena.offsetWidth;
        elements.arena.classList.add('miss-shake');
        HM?.playSound?.('miss');
        HM?.vibrate?.([18, 30, 18]);
    }

    function reload() {
        if (!running || paused || reloading || ammo === config.ammo) return;
        reloading = true;
        elements.reload.disabled = true;
        elements.reload.textContent = 'Reloading...';
        HM?.playSound?.('reload');
        window.setTimeout(() => {
            ammo = config.ammo;
            reloading = false;
            elements.reload.disabled = false;
            elements.reload.textContent = HM?.t ? HM.t('reload') : 'Reload';
            updateHud();
        }, 720);
    }

    function spawnTarget() {
        if (!running || paused || targets.size >= config.maxTargets) return;

        const rect = elements.arena.getBoundingClientRect();
        const size = config.targetSize * random(0.88, 1.16);
        const margin = Math.max(36, size * 0.7);
        const startX = random(margin, Math.max(margin, rect.width - margin));
        const startY = random(margin, Math.max(margin, rect.height - margin));
        const distance = config.moveDistance * config.speed;
        const endX = clamp(startX + random(-distance, distance), margin, Math.max(margin, rect.width - margin));
        const endY = clamp(startY + random(-distance, distance), margin, Math.max(margin, rect.height - margin));
        const midX = (startX + endX) / 2 + random(-distance / 3, distance / 3);
        const midY = (startY + endY) / 2 + random(-distance / 3, distance / 3);

        const element = document.createElement('button');
        const id = ++targetId;
        element.type = 'button';
        element.className = 'enemy-target monster-target';
        element.innerHTML = '<span class="monster-mouth" aria-hidden="true"></span>';
        element.setAttribute('aria-label', 'Monster');
        element.style.width = `${size}px`;
        element.style.height = `${size}px`;
        element.style.transform = `translate(${startX}px, ${startY}px) translate(-50%, -50%)`;

        element.addEventListener('pointerdown', (event) => {
            event.preventDefault();
            event.stopPropagation();
            shoot(event.clientX, event.clientY);
        });

        elements.targetLayer.appendChild(element);

        const animation = element.animate([
            { transform: `translate(${startX}px, ${startY}px) translate(-50%, -50%) scale(0.92)` },
            { transform: `translate(${midX}px, ${midY}px) translate(-50%, -50%) scale(1.08)` },
            { transform: `translate(${endX}px, ${endY}px) translate(-50%, -50%) scale(0.98)` }
        ], {
            duration: config.lifetime,
            easing: 'ease-in-out',
            fill: 'forwards'
        });

        const target = { id, element, animation };
        targets.set(id, target);
        animation.onfinish = () => expireTarget(id);
    }

    function expireTarget(id) {
        const target = targets.get(id);
        if (!target) return;
        target.element.classList.add('escaping');
        targets.delete(id);
        combo = 0;
        window.setTimeout(() => target.element.remove(), 100);
        updateHud();
    }

    function findHitTarget(clientX, clientY) {
        let best = null;
        let bestDistance = Number.POSITIVE_INFINITY;
        targets.forEach((target) => {
            const rect = target.element.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            const distance = Math.hypot(clientX - centerX, clientY - centerY);
            const radius = Math.max(rect.width, rect.height) * 0.56;
            if (distance <= radius && distance < bestDistance) {
                best = target;
                bestDistance = distance;
            }
        });
        return best;
    }

    function makeShotMark(clientX, clientY) {
        const rect = elements.arena.getBoundingClientRect();
        const mark = document.createElement('span');
        mark.className = 'shot-mark';
        mark.style.left = `${clientX - rect.left}px`;
        mark.style.top = `${clientY - rect.top}px`;
        elements.shotLayer.appendChild(mark);
        window.setTimeout(() => mark.remove(), 480);
    }

    function makeHitScore(clientX, clientY, text) {
        const rect = elements.arena.getBoundingClientRect();
        const scorePopup = document.createElement('span');
        scorePopup.className = 'hit-score';
        scorePopup.textContent = text;
        scorePopup.style.left = `${clientX - rect.left}px`;
        scorePopup.style.top = `${clientY - rect.top}px`;
        elements.shotLayer.appendChild(scorePopup);
        window.setTimeout(() => scorePopup.remove(), 760);
    }

    function togglePause(force) {
        if (!running) return;
        paused = typeof force === 'boolean' ? force : !paused;
        elements.arena.classList.toggle('is-paused', paused);
        document.body.classList.toggle('hm-game-paused', paused);
        elements.pause.textContent = paused ? (HM?.t ? HM.t('resume') : 'Resume') : (HM?.t ? HM.t('pause') : 'Pause');
        targets.forEach((target) => {
            if (paused) target.animation?.pause?.();
            else target.animation?.play?.();
        });
        HM?.toast?.(paused ? 'Paused' : 'Go!');
    }

    function endMission(won) {
        if (!running) return;
        running = false;
        paused = false;
        document.body.classList.remove('hm-game-paused');
        cleanupTimers();
        targets.forEach((target) => target.animation?.cancel?.());
        clearTargets();
        updateHud();

        if (won) {
            saveWin();
            HM?.playSound?.('win');
        } else {
            HM?.playSound?.('lose');
        }

        const accuracy = hits + misses === 0 ? 0 : Math.round((hits / (hits + misses)) * 100);
        elements.resultTitle.textContent = won ? (HM?.t ? HM.t('missionComplete') : 'Mission Complete!') : (HM?.t ? HM.t('missionFailed') : 'Mission Failed!');
        elements.resultStats.innerHTML = `Score: ${score}<br>Hits: ${hits}/${config.required}<br>Accuracy: ${accuracy}%`;
        elements.nextLevel.hidden = !won || level >= 20;
        elements.resultPanel.hidden = false;
    }

    function saveWin() {
        HM?.updateState?.((savedState) => {
            const key = `${modeKey}-${level}`;
            savedState.completed[key] = true;
            savedState.bestScores[key] = Math.max(savedState.bestScores[key] || 0, score);
            savedState.lastMode = modeKey;
            return savedState;
        });
    }

    function cleanupTimers() {
        window.clearInterval(spawnTimer);
        window.clearInterval(clockTimer);
        window.clearInterval(countdownTimer);
        spawnTimer = null;
        clockTimer = null;
        countdownTimer = null;
    }

    function clearTargets() {
        targets.forEach((target) => target.element.remove());
        targets.clear();
        elements.targetLayer.innerHTML = '';
        elements.shotLayer.innerHTML = '';
    }

    function updateHud() {
        const progress = Math.round((hits / config.required) * 100);
        elements.score.textContent = String(score);
        elements.ammo.textContent = `${String(ammo).padStart(2, '0')}/${String(config.ammo).padStart(2, '0')}`;
        elements.timer.textContent = String(Math.max(0, timeLeft));
        elements.hit.textContent = String(hits);
        elements.required.textContent = String(config.required);
        elements.combo.textContent = String(combo);
        elements.missionFill.style.width = `${Math.min(100, progress)}%`;
        elements.missionProgress.textContent = `${Math.min(100, progress)}%`;
    }

    function random(min, max) {
        return Math.random() * (max - min) + min;
    }

    function clamp(value, min, max) {
        if (HM?.clamp) return HM.clamp(value, min, max);
        return Math.min(max, Math.max(min, value));
    }
})();
