/* ============================================================
   奶龙 Nailoong — Boiling-Frog Interactive Cinema Horror Engine
   7 progressive tactile interactions -> R-rated horror movie finale
   ============================================================ */

(() => {
  'use strict';

  const state = {
    dread: 0,
    lightsOut: false,
    switchBroken: false,
    pokeCount: 0,
    galleryIdx: 0,
    peripheralShown: false,
    hijackPos: 0,
    hijackDone: false,
    trailerState: 'idle', // idle | playing | ended
    trailerStartMs: 0,
    trailerThudDone: false,
    doorOpen: 0.06,       // 0.06 -> 1.0
    doorShattered: false,
    doorDragging: false,
    doorDragStartX: 0,
    doorStartOpen: 0.06,
    lastCreakAt: 0,
    lastKnockAt: 0,
    flashStage: 0,        // 0..4 (0=none yet, 1=mall, 2=doorway, 3=bedside looming, 4=CLIMAX LUNGE)
    flashRecharging: false,
    flashAlpha: 0,        // current afterimage visibility in darkroom
    flashBaseFloor: 0,    // lingering faint visibility after flash 3
    flashAutoTimer: null,
    climaxDropped: false,
    mouseX: window.innerWidth * 0.5,
    mouseY: window.innerHeight * 0.5,
    mouseNormX: 0.5,
    mouseNormY: 0.5,
  };

  // ---------------- PRELOAD ALL IMAGES FOR CANVASES ----------------
  function loadImg(src) {
    const im = new Image();
    im.src = src;
    return im;
  }

  const imgs = {
    nlNormal: loadImg('assets/image_nailoong.png'),
    familyClean: loadImg('assets/wholeFamily.png'),
    familyCursed: loadImg('assets/horror/wholeFamily_cursed.jpg'),
    scene1Mall: loadImg('assets/cinema/scene1_mall_mascot.jpg'),
    scene2Plush: loadImg('assets/cinema/scene2_plush_basement.jpg'),
    scene3Door: loadImg('assets/cinema/scene3_doorway_crack.jpg'),
    scene4Loom: loadImg('assets/cinema/scene4_bedside_looming.jpg'),
    scene5Lunge: loadImg('assets/cinema/scene5_climax_lunge.jpg'),
  };

  // ---------------- AUDIO BUTTONS SYNC ----------------
  const headerAudioBtn = document.getElementById('header-audio-btn');
  const heroAudioBtn = document.getElementById('hero-audio-btn');
  const darkAudioBtn = document.getElementById('dark-audio-btn');
  const audioIcon = document.getElementById('audio-icon');
  const audioLabel = document.getElementById('audio-label');

  function syncAudioUI(on) {
    audioIcon.textContent = on ? '🔊' : '🔇';
    audioLabel.textContent = on ? '立体声已开' : '开启音效';
    headerAudioBtn.classList.toggle('active', on);
    if (heroAudioBtn) {
      heroAudioBtn.textContent = on ? '🔊 立体声已开启 · 请缓慢互动并下滑' : '🎧 开启立体声沉浸体验（强烈推荐）';
    }
    darkAudioBtn.textContent = on ? '音效：开' : '音效：关';
  }

  function toggleAudio() {
    syncAudioUI(window.horrorAudio.toggle());
  }
  headerAudioBtn.addEventListener('click', toggleAudio);
  darkAudioBtn.addEventListener('click', toggleAudio);
  heroAudioBtn.addEventListener('click', () => {
    syncAudioUI(window.horrorAudio.enable());
  });

  // ---------------- INTERACTION #1: CUTE BELLY POKE TOY ----------------
  const bellyCanvas = document.getElementById('belly-canvas');
  const bellyCtx = bellyCanvas.getContext('2d');
  const bellyStage = document.getElementById('belly-stage');
  const pokeBtn = document.getElementById('poke-btn');
  const toySpeech = document.getElementById('toy-speech');
  const pokeCountText = document.getElementById('poke-count-text');

  function triggerBellyPoke(clientX, clientY) {
    state.pokeCount++;
    const total = 12847 + state.pokeCount;
    pokeCountText.textContent = `今日全网已贴贴：${total.toLocaleString()} 次`;
    window.horrorAudio.playDuang(state.pokeCount);

    const cuteLines = [
      'duang~ 好痒呀！再戳一下嘛~',
      '嘻嘻，今天也要开心充满电哦！',
      '软绵绵的大肚子，治愈所有不开心！',
    ];

    if (state.pokeCount <= 3 || state.pokeCount >= 6) {
      toySpeech.classList.remove('eerie');
      toySpeech.textContent = state.pokeCount === 6
        ? '嘻嘻，刚才开玩笑的啦！继续往下看吧~'
        : cuteLines[(state.pokeCount - 1) % cuteLines.length];

      bellyCanvas.classList.remove('boing');
      void bellyCanvas.offsetWidth;
      bellyCanvas.classList.add('boing');
      setTimeout(() => bellyCanvas.classList.remove('boing'), 180);

      // Spawn cute sparkle
      const sp = document.createElement('span');
      sp.className = 'poke-sparkle';
      sp.textContent = state.pokeCount % 2 === 0 ? 'duang~' : '✨';
      const r = bellyStage.getBoundingClientRect();
      sp.style.left = (clientX ? clientX - r.left : r.width * 0.5) + 'px';
      sp.style.top = (clientY ? clientY - r.top : r.height * 0.55) + 'px';
      bellyStage.appendChild(sp);
      setTimeout(() => sp.remove(), 900);
    } else if (state.pokeCount === 4) {
      // First microscopic boiling-frog crack!
      toySpeech.classList.add('eerie');
      toySpeech.textContent = '……你的手指好暖和呀。';
    } else if (state.pokeCount === 5) {
      toySpeech.classList.add('eerie');
      toySpeech.textContent = '别停下来。';
    }
  }

  bellyStage.addEventListener('click', (e) => triggerBellyPoke(e.clientX, e.clientY));
  pokeBtn.addEventListener('click', () => triggerBellyPoke());

  function renderBellyCanvas() {
    if (!imgs.nlNormal.complete) return;
    const r = bellyCanvas.getBoundingClientRect();
    if (r.bottom < -50 || r.top > window.innerHeight + 50) return;

    bellyCtx.clearRect(0, 0, 500, 500);
    bellyCtx.drawImage(imgs.nlNormal, 0, 0, 500, 500);

    // Pupils only subtly start following cursor AFTER you've poked him >= 3 times or scrolled slightly!
    if (state.pokeCount >= 3 || state.dread > 0.08) {
      const cx = r.left + r.width * 0.56;
      const cy = r.top + r.height * 0.23;
      const dx = state.mouseX - cx;
      const dy = state.mouseY - cy;
      const dist = Math.hypot(dx, dy) || 1;
      const maxOff = state.pokeCount === 5 ? 6.5 : 3.2;
      const ox = (dx / dist) * Math.min(maxOff, dist * 0.018);
      const oy = (dy / dist) * Math.min(maxOff, dist * 0.018);

      [
        { x: 238, y: 118, rad: 17.5, pr: 11.2 },
        { x: 338, y: 110, rad: 16.5, pr: 10.8 },
      ].forEach((e) => {
        bellyCtx.save();
        bellyCtx.beginPath();
        bellyCtx.ellipse(e.x, e.y, e.rad * 1.06, e.rad * 1.1, 0, 0, Math.PI * 2);
        bellyCtx.clip();
        bellyCtx.fillStyle = '#F6F8F5';
        bellyCtx.fillRect(e.x - 30, e.y - 30, 60, 60);

        const ix = e.x + ox;
        const iy = e.y + oy;
        const g = bellyCtx.createRadialGradient(ix, iy, 4, ix, iy, e.rad);
        g.addColorStop(0, '#082608');
        g.addColorStop(0.58, '#1B8F1F');
        g.addColorStop(1, '#08330A');
        bellyCtx.fillStyle = g;
        bellyCtx.beginPath();
        bellyCtx.arc(ix, iy, e.rad * 0.92, 0, Math.PI * 2);
        bellyCtx.fill();

        bellyCtx.fillStyle = '#040404';
        bellyCtx.beginPath();
        bellyCtx.arc(ix + ox * 0.1, iy + oy * 0.1, e.pr, 0, Math.PI * 2);
        bellyCtx.fill();

        bellyCtx.fillStyle = 'rgba(255,255,255,0.92)';
        bellyCtx.beginPath();
        bellyCtx.arc(ix + 5, iy - 5, 3.2, 0, Math.PI * 2);
        bellyCtx.fill();
        bellyCtx.restore();
      });
    }
  }

  // ---------------- INTERACTION #2: SUNNY MALL EXHIBITION CAROUSEL ----------------
  const galleryItems = [
    {
      src: 'assets/brand_example_2.png',
      tag: '现场实拍 · 深圳站',
      title: '比亚迪海豚 × 奶龙 · 龙年“豚”好运城市巡游',
      desc: '携手新能源头部品牌打造全国核心商圈快闪装置，吸引众多亲子家庭现场打卡留念。',
      creepy: false,
    },
    {
      src: 'assets/brand_example_5.png',
      tag: '联名快闪 · 上海站',
      title: '麦咖啡 McCafé × 奶龙 · 奶铁主题快闪店',
      desc: '“奶铁在手，快乐我有。”全国多家门店同步推出限定杯套与萌趣毛绒周边。',
      creepy: false,
    },
    {
      src: 'assets/brand_example_3.png',
      tag: '校园活动 · 广州站',
      title: 'ADIDAS × 奶龙 · 校园运动会限定联名',
      desc: '元气童装系列首发上市，小朋友们纷纷与巨型奶龙气模合影留念。',
      creepy: false,
    },
    {
      src: 'assets/brand_example_1.png',
      tag: '跨界嘉年华 · 成都站',
      title: '和平精英 × 奶龙 · 海岛空降主题展',
      desc: '打破次元壁的欢乐联动，现场设置多处互动打卡点与限定扭蛋机。',
      creepy: false,
    },
    {
      src: 'assets/cinema/scene1_mall_mascot.jpg',
      tag: '深圳前海旗舰店 · 02:47 闭馆清场实拍',
      title: '闭馆后二楼中庭场地验收记录（2026.10.19）',
      desc: '注：本场次当日并未安排任何玩偶服演职人员值班。商场夜班保洁称其从凌晨 02:47 起独自站在走廊中央面向出口，直到早上商场通电前才不知去向。',
      creepy: true,
    },
  ];

  const galleryMain = document.getElementById('gallery-main');
  const galleryImg = document.getElementById('gallery-active-img');
  const galleryTag = document.getElementById('gallery-tag');
  const galleryCapTitle = document.getElementById('gallery-cap-title');
  const galleryCapDesc = document.getElementById('gallery-cap-desc');
  const galleryCounter = document.getElementById('gallery-counter');
  const thumbBtns = document.querySelectorAll('.thumb-btn');

  function setGalleryIndex(idx) {
    state.galleryIdx = (idx + galleryItems.length) % galleryItems.length;
    const item = galleryItems[state.galleryIdx];
    galleryImg.src = item.src;
    galleryTag.textContent = item.tag;
    galleryCapTitle.textContent = item.title;
    galleryCapDesc.textContent = item.desc;
    galleryCounter.textContent = `${state.galleryIdx + 1} / ${galleryItems.length}`;
    galleryMain.classList.toggle('mall-creep', item.creepy);

    thumbBtns.forEach((b, i) => b.classList.toggle('active', i === state.galleryIdx));
  }

  document.getElementById('gallery-prev').addEventListener('click', () => setGalleryIndex(state.galleryIdx - 1));
  document.getElementById('gallery-next').addEventListener('click', () => setGalleryIndex(state.galleryIdx + 1));
  thumbBtns.forEach((b) => {
    b.addEventListener('click', () => setGalleryIndex(Number(b.dataset.idx)));
  });

  // ---------------- INTERACTION #3: BEDROOM LIGHT SWITCH (YOU TURN IT OFF!) ----------------
  const roomLightSwitch = document.getElementById('room-light-switch');
  const switchModeBadge = document.getElementById('switch-mode-badge');
  const switchBtnText = document.getElementById('switch-btn-text');
  const switchStatusMsg = document.getElementById('switch-status-msg');
  const lampFlashBurst = document.getElementById('lamp-flash-burst');
  const merchDesc = document.getElementById('merch-desc');
  const merchStockTag = document.getElementById('merch-stock-tag');

  function flipLightsOut(fromUser = true) {
    if (!state.lightsOut) {
      state.lightsOut = true;
      document.body.classList.add('lights-out');
      window.horrorAudio.playLightSwitch(false);
      if (fromUser) {
        lampFlashBurst.classList.remove('pop');
        void lampFlashBurst.offsetWidth;
        lampFlashBurst.classList.add('pop');
      }
      switchModeBadge.textContent = '当前：🌙 已关灯';
      switchBtnText.textContent = '点击重新开灯';
      switchStatusMsg.textContent = '……画面好像切到了仓库库存底片。';
      merchStockTag.textContent = '库存：异常';
      merchDesc.textContent = '该批次毛绒玩偶已于 2024 年冬全部下架封存于地下室货架，请勿在未开灯的情况下直视玩偶面部缝线处。';
    } else if (fromUser) {
      // User desperately tries to turn the lights BACK ON — switch jams & sparks!
      window.horrorAudio.playLightSwitch(true);
      if (!state.switchBroken) {
        state.switchBroken = true;
        // Brief 85ms flicker back to sunny grass, then SNAPS BACK TO DARK!
        document.body.classList.remove('lights-out');
        setTimeout(() => {
          document.body.classList.add('lights-out');
          window.horrorAudio.playLightSwitch(true);
          switchBtnText.textContent = '开关无响应';
          switchStatusMsg.textContent = '灯泡已烧毁，无法切回白天模式。';
        }, 90);
      } else {
        switchStatusMsg.textContent = '开关卡死了。不要再按了。';
      }
    }
  }

  roomLightSwitch.addEventListener('click', () => flipLightsOut(true));

  // ---------------- INTERACTION #4: HIJACKED FAN REVIEW INPUT ----------------
  const hijackInput = document.getElementById('hijack-input');
  const hijackSubmit = document.getElementById('hijack-submit');
  const composerNotice = document.getElementById('composer-notice');
  const hijackMessage = '门 外 有 人 在 敲 门 。 别 开 门 。';

  function finishHijack() {
    if (state.hijackDone) return;
    state.hijackDone = true;
    hijackInput.value = hijackMessage;
    hijackInput.classList.add('hijacked');
    composerNotice.textContent = '提交失败：网络已断开。请先确认你身后的房门已经反锁。';
    composerNotice.style.color = '#B85A5E';
    // Realistic 3D stereo-right hollow wooden door knock!
    window.horrorAudio.playWoodKnock(3, 0.78, 0.58);
  }

  hijackInput.addEventListener('input', () => {
    if (state.hijackDone) {
      hijackInput.value = hijackMessage;
      return;
    }
    state.hijackPos = Math.min(hijackMessage.length, state.hijackPos + 2);
    hijackInput.value = hijackMessage.slice(0, state.hijackPos);
    hijackInput.classList.add('hijacked');
    if (state.hijackPos >= hijackMessage.length) {
      finishHijack();
    }
  });

  function autoTypeHijack() {
    if (state.hijackDone) {
      window.horrorAudio.playWoodKnock(2, 0.78, 0.55);
      return;
    }
    hijackInput.focus();
    hijackInput.classList.add('hijacked');
    const step = () => {
      if (state.hijackPos >= hijackMessage.length) {
        finishHijack();
        return;
      }
      state.hijackPos++;
      hijackInput.value = hijackMessage.slice(0, state.hijackPos);
      setTimeout(step, 85);
    };
    step();
  }

  document.querySelectorAll('.quick-tag').forEach((tag) => {
    tag.addEventListener('click', autoTypeHijack);
  });
  hijackSubmit.addEventListener('click', autoTypeHijack);

  // ---------------- INTERACTION #5: OFFICIAL TRAILER PLAYER INTRUSION ----------------
  const videoShell = document.getElementById('video-shell');
  const videoViewport = document.getElementById('video-viewport');
  const videoCenterPlay = document.getElementById('video-center-play');
  const trailerCanvas = document.getElementById('trailer-canvas');
  const trailerCtx = trailerCanvas.getContext('2d');
  const vcToggleBtn = document.getElementById('vc-toggle-btn');
  const vcProgress = document.getElementById('vc-progress');
  const vcTime = document.getElementById('vc-time');
  const videoFootnote = document.getElementById('video-footnote');

  function startTrailer() {
    if (state.trailerState === 'playing') {
      // Refuses to pause!
      vcToggleBtn.textContent = '无法暂停';
      window.horrorAudio.playWoodKnock(1, 0, 0.45);
      return;
    }
    state.trailerState = 'playing';
    state.trailerStartMs = performance.now();
    state.trailerThudDone = false;
    videoCenterPlay.classList.add('hidden');
    vcToggleBtn.textContent = '暂停';
    videoFootnote.textContent = '';
  }

  videoViewport.addEventListener('click', startTrailer);
  vcToggleBtn.addEventListener('click', startTrailer);

  function renderTrailerCanvas(nowMs) {
    const r = trailerCanvas.getBoundingClientRect();
    if (r.bottom < -100 || r.top > window.innerHeight + 100) return;
    if (!imgs.familyClean.complete || !imgs.familyCursed.complete) return;

    const w = 920;
    const h = 424;

    if (state.trailerState === 'idle') {
      trailerCtx.drawImage(imgs.familyClean, 0, 0, w, h);
      return;
    }

    const elapsed = (nowMs - state.trailerStartMs) / 1000; // seconds
    const dur = 14.0;
    const t = Math.min(1, elapsed / dur);

    // Update progress bar
    vcProgress.style.width = `${(t * 100).toFixed(1)}%`;
    const secStr = String(Math.floor(Math.min(dur, elapsed))).padStart(2, '0');
    vcTime.textContent = `00:${secStr} / 00:14`;

    // Smooth Ken Burns zoom + gradual Ring-style face melt from 2.5s -> 7.2s
    const melt = Math.max(0, Math.min(1, (elapsed - 2.2) / 5.0));
    const zoom = 1.0 + t * 0.14;
    const dw = w * zoom;
    const dh = h * zoom;
    const dx = (w - dw) * 0.5;
    const dy = (h - dh) * 0.46;

    // 180ms intrusive flash of scene4_bedside_looming right on the screen thud at t = 7.8s!
    if (elapsed >= 7.8 && elapsed <= 8.02 && imgs.scene4Loom.complete) {
      if (!state.trailerThudDone) {
        state.trailerThudDone = true;
        window.horrorAudio.playWoodKnock(2, 0, 0.85);
        videoShell.classList.remove('thud');
        void videoShell.offsetWidth;
        videoShell.classList.add('thud');
        vcProgress.style.background = '#9E1B1F';
        videoFootnote.textContent = '……刚才是不是有什么东西从屏幕里面撞了一下？';
      }
      trailerCtx.drawImage(imgs.scene4Loom, 0, -40, w, h + 80);
      return;
    }

    trailerCtx.clearRect(0, 0, w, h);
    trailerCtx.globalAlpha = 1;
    trailerCtx.drawImage(imgs.familyClean, dx, dy, dw, dh);
    if (melt > 0) {
      trailerCtx.globalAlpha = melt;
      trailerCtx.drawImage(imgs.familyCursed, dx, dy, dw, dh);
      trailerCtx.globalAlpha = 1;
    }

    // Subtle analog slip jitter after melt > 0.4
    if (melt > 0.4 && Math.random() < 0.12) {
      const sy = Math.floor(Math.random() * 340);
      const sh = 8 + Math.floor(Math.random() * 22);
      trailerCtx.drawImage(imgs.familyCursed, 0, sy, w, sh, (Math.random() - 0.5) * 26, sy, w, sh);
    }

    if (elapsed >= dur && state.trailerState === 'playing') {
      state.trailerState = 'ended';
      vcToggleBtn.textContent = '重播';
      videoFootnote.textContent = '播放已结束。不要回头看卧室门。';
    }
  }

  // ---------------- INTERACTION #6: HANDS-ON WOODEN BEDROOM DOORWAY PULL ----------------
  const doorwaySection = document.getElementById('stage-doorway');
  const doorLeaf = document.getElementById('door-leaf');
  const doorwayPhoto = document.getElementById('doorway-photo');
  const doorPullBtn = document.getElementById('door-pull-btn');
  const doorInstruction = document.getElementById('door-instruction');
  const doorProgressFill = document.getElementById('door-progress-fill');

  function setDoorOpen(val, playCreak = false) {
    const clamped = Math.max(0.06, Math.min(1.0, val));
    const delta = Math.abs(clamped - state.doorOpen);
    state.doorOpen = clamped;

    // Slide the dark wooden door panel smoothly right (left 41.5% -> ~63% at 1.0)
    // fully revealing hallway bulb, damp yellow head, staring eye, and all 3 claws!
    const shiftPct = clamped * 36;
    doorLeaf.style.transform = `translateX(${shiftPct.toFixed(2)}%)`;
    doorProgressFill.style.width = `${Math.round(clamped * 100)}%`;

    const now = performance.now();
    if (playCreak && delta > 0.008 && now - state.lastCreakAt > 240) {
      state.lastCreakAt = now;
      window.horrorAudio.playDoorCreak(Math.min(1, 0.4 + clamped * 0.6));
    }

    if (state.doorShattered) return;

    if (clamped < 0.35) {
      doorInstruction.textContent = '门外一直在响。向右拖动门板，或者点击拉开门缝。';
      doorPullBtn.textContent = '手扶门把 · 再拉开一点';
    } else if (clamped < 0.68) {
      doorInstruction.textContent = '等等……门沿上好像搭着一只黄色的爪子。';
      doorPullBtn.textContent = '继续拉开确认是谁';
    } else if (clamped < 0.93) {
      doorInstruction.textContent = '它正贴着门缝直直地盯着你。别再拉了。';
      doorPullBtn.textContent = '把门拉到最开';
      window.horrorAudio.setBreathingActive(true);
    } else {
      // HALLWAY BULB SHATTERS INTO TOTAL PITCH DARKNESS!
      state.doorShattered = true;
      doorwayPhoto.classList.add('shattered');
      window.horrorAudio.playBulbShatter();
      setTimeout(() => window.horrorAudio.playFootstep(-0.35, 0.55), 550);
      setTimeout(() => window.horrorAudio.playFootstep(0.28, 0.68), 1150);
      doorInstruction.textContent = '走廊灯泡炸了……有沉重的脚步走进了卧室。继续向下。';
      doorPullBtn.style.display = 'none';
    }
  }

  // Drag directly on the wooden door leaf!
  doorLeaf.addEventListener('pointerdown', (e) => {
    if (state.doorShattered) return;
    state.doorDragging = true;
    doorLeaf.classList.add('dragging');
    state.doorDragStartX = e.clientX;
    state.doorStartOpen = state.doorOpen;
    doorLeaf.setPointerCapture(e.pointerId);
  });

  doorLeaf.addEventListener('pointermove', (e) => {
    if (!state.doorDragging || state.doorShattered) return;
    const dx = e.clientX - state.doorDragStartX;
    const nextOpen = state.doorStartOpen + dx / (window.innerWidth * 0.34);
    setDoorOpen(nextOpen, true);
  });

  function onDoorRelease() {
    if (!state.doorDragging) return;
    state.doorDragging = false;
    doorLeaf.classList.remove('dragging');
    // UNCANNY DETAIL: If user panics and lets go halfway, something OUTSIDE pushes the door open slightly more by itself!
    if (!state.doorShattered && state.doorOpen > 0.22 && state.doorOpen < 0.82) {
      setTimeout(() => {
        if (!state.doorDragging && !state.doorShattered) {
          setDoorOpen(state.doorOpen + 0.09, true);
        }
      }, 480);
    }
  }
  doorLeaf.addEventListener('pointerup', onDoorRelease);
  doorLeaf.addEventListener('pointercancel', onDoorRelease);

  // Tactile click button fallback
  doorPullBtn.addEventListener('click', () => {
    if (!state.doorShattered) {
      setDoorOpen(state.doorOpen + 0.28, true);
    }
  });

  // Periodic eerie wooden knocks while hovering in Stage 5 with door partly closed
  setInterval(() => {
    const r = doorwaySection.getBoundingClientRect();
    if (r.top < window.innerHeight * 0.5 && r.bottom > window.innerHeight * 0.5) {
      if (!state.doorShattered && state.doorOpen < 0.72) {
        window.horrorAudio.playWoodKnock(2, 0.15, 0.48);
      }
    }
  }, 5400);

  // ---------------- INTERACTION #7: DARK BEDROOM CAMERA FLASH CLIMAX ----------------
  const darkroomSection = document.getElementById('stage-darkroom');
  const darkroomWrap = document.getElementById('darkroom-stage-wrap');
  const darkroomCanvas = document.getElementById('darkroom-canvas');
  const darkroomCtx = darkroomCanvas.getContext('2d');
  const cameraStrobe = document.getElementById('camera-strobe');
  const crackedLensSvg = document.getElementById('cracked-lens-svg');
  const cameraHud = document.getElementById('camera-hud');
  const cameraHint = document.getElementById('camera-hint');
  const shutterBtn = document.getElementById('shutter-btn');
  const flashChargeStatus = document.getElementById('flash-charge-status');
  const aftermathBar = document.getElementById('aftermath-bar');

  function pulseStrobe(peakOpacity = 0.96, durationMs = 420) {
    cameraStrobe.style.transition = 'none';
    cameraStrobe.style.opacity = String(peakOpacity);
    void cameraStrobe.offsetWidth;
    cameraStrobe.style.transition = `opacity ${durationMs}ms ease-out`;
    cameraStrobe.style.opacity = '0';
  }

  function clearFlashAutoTimer() {
    if (state.flashAutoTimer) {
      clearTimeout(state.flashAutoTimer);
      state.flashAutoTimer = null;
    }
  }

  function triggerCameraFlash() {
    if (state.flashRecharging || state.climaxDropped) return;
    clearFlashAutoTimer();

    if (state.flashStage < 3) {
      state.flashStage++;
      state.flashRecharging = true;
      shutterBtn.classList.add('recharging');
      window.horrorAudio.playCameraFlash(false);
      pulseStrobe(0.95, 360);
      state.flashAlpha = 1.0;

      if (state.flashStage === 1) {
        state.flashBaseFloor = 0.0;
        flashChargeStatus.textContent = '⚡ 闪光灯回电中…';
        cameraHint.textContent = '角落里确实站着一个东西……它没有动。';
        setTimeout(() => window.horrorAudio.playFootstep(-0.42, 0.52), 750);
        setTimeout(() => {
          state.flashRecharging = false;
          shutterBtn.classList.remove('recharging');
          flashChargeStatus.textContent = '⚡ 闪光灯就绪 · 再拍一次确认位置';
        }, 1250);
      } else if (state.flashStage === 2) {
        state.flashBaseFloor = 0.02;
        flashChargeStatus.textContent = '⚡ 闪光灯回电中…';
        cameraHint.textContent = '它靠过来了。声音就在床尾。';
        setTimeout(() => window.horrorAudio.playFootstep(0.45, 0.72), 620);
        setTimeout(() => {
          state.flashRecharging = false;
          shutterBtn.classList.remove('recharging');
          flashChargeStatus.textContent = '⚡ 闪光灯就绪 · 再次开启闪光灯';
        }, 1250);
      } else if (state.flashStage === 3) {
        // FLASH 3: COLOSSAL CRACKED FACE WITH REAL HUMAN EYES INCHES AWAY!
        state.flashBaseFloor = 0.14; // Lingering eerie dim presence remains in total darkness!
        window.horrorAudio.cutToSilence(); // DEAD VACUUM SILENCE!
        flashChargeStatus.textContent = '⚡ 闪光灯过热 · 正在重启';
        cameraHint.textContent = '……就在你面前。不要动。';
        setTimeout(() => {
          state.flashRecharging = false;
          shutterBtn.classList.remove('recharging');
          flashChargeStatus.textContent = '⚡ 闪光灯就绪 · 再按一次';
          // Auto-trigger climax if player freezes in fear for 3.2s!
          state.flashAutoTimer = setTimeout(() => {
            if (state.flashStage === 3 && !state.climaxDropped) triggerCameraFlash();
          }, 3200);
        }, 1350);
      }
    } else if (state.flashStage === 3) {
      // FLASH 4: SHUTTER JAMS TWICE -> THEN DETONATES INTO THE R-RATED CLIMAX LUNGE!!
      state.flashRecharging = true;
      state.climaxDropped = true;
      shutterBtn.classList.add('recharging');
      flashChargeStatus.textContent = '⚠ 闪光灯故障';
      window.horrorAudio.playCameraFlash(true);

      setTimeout(() => {
        window.horrorAudio.playCameraFlash(true);
      }, 210);

      // 420ms later: EXPLOSION!
      setTimeout(() => {
        state.flashStage = 4;
        state.flashAlpha = 1.0;
        state.flashBaseFloor = 0.22;
        cameraHud.classList.add('hidden');
        pulseStrobe(1.0, 260);
        darkroomWrap.classList.add('violent-jolt');
        window.horrorAudio.playClimaxLunge();
      }, 450);

      // 1.45s later: Camera drops sideways onto dark floor with cracked glass lens!
      setTimeout(() => {
        darkroomWrap.classList.remove('violent-jolt');
        darkroomWrap.classList.add('dropped');
        crackedLensSvg.classList.add('visible');
        pulseStrobe(0.35, 220);
        window.horrorAudio.restoreAmbient();
        window.horrorAudio.setBreathingActive(true);
      }, 1520);

      // Quiet restrained aftermath options appear cleanly
      setTimeout(() => {
        aftermathBar.classList.add('visible');
      }, 3600);
    }
  }

  shutterBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    triggerCameraFlash();
  });
  darkroomCanvas.addEventListener('click', () => {
    if (state.dread > 0.82) triggerCameraFlash();
  });
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && state.dread > 0.84 && !state.climaxDropped) {
      e.preventDefault();
      triggerCameraFlash();
    }
  });

  function resetDarkroom() {
    clearFlashAutoTimer();
    state.flashStage = 0;
    state.flashRecharging = false;
    state.flashAlpha = 0;
    state.flashBaseFloor = 0;
    state.climaxDropped = false;
    darkroomWrap.classList.remove('violent-jolt', 'dropped');
    crackedLensSvg.classList.remove('visible');
    aftermathBar.classList.remove('visible');
    cameraHud.classList.remove('hidden');
    shutterBtn.classList.remove('recharging');
    cameraHint.textContent = '灯泡炸了。黑暗里有什么东西进来了……按快门开闪光灯确认。';
    flashChargeStatus.textContent = '⚡ 闪光灯就绪 · 点击画面或按空格键';
    window.horrorAudio.restoreAmbient();
    window.horrorAudio.setBreathingActive(true);
  }

  document.getElementById('replay-darkroom-btn').addEventListener('click', resetDarkroom);

  function escapeToSunshine() {
    resetDarkroom();
    state.lightsOut = false;
    state.switchBroken = false;
    state.doorShattered = false;
    state.doorOpen = 0.06;
    state.pokeCount = 0;
    state.hijackPos = 0;
    state.hijackDone = false;
    state.trailerState = 'idle';
    document.body.classList.remove('lights-out', 'cinema-bars');
    doorwayPhoto.classList.remove('shattered');
    doorPullBtn.style.display = '';
    setDoorOpen(0.06, false);
    switchModeBadge.textContent = '当前：☀️ 白天开灯';
    switchBtnText.textContent = '点击关灯 · 预览卧室夜间效果';
    switchStatusMsg.textContent = '';
    merchStockTag.textContent = '已售 8.6 万+';
    hijackInput.value = '';
    hijackInput.classList.remove('hijacked');
    composerNotice.textContent = '';
    videoCenterPlay.classList.remove('hidden');
    vcToggleBtn.textContent = '播放';
    vcProgress.style.width = '0%';
    vcProgress.style.background = '';
    videoFootnote.textContent = '';
    window.horrorAudio.setBreathingActive(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  document.getElementById('escape-home-btn').addEventListener('click', escapeToSunshine);
  document.getElementById('dark-top-btn').addEventListener('click', escapeToSunshine);

  function renderDarkroom(nowMs) {
    const r = darkroomSection.getBoundingClientRect();
    if (r.top > window.innerHeight + 120) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth;
    const h = window.innerHeight;
    if (darkroomCanvas.width !== Math.floor(w * dpr) || darkroomCanvas.height !== Math.floor(h * dpr)) {
      darkroomCanvas.width = Math.floor(w * dpr);
      darkroomCanvas.height = Math.floor(h * dpr);
    }

    const ctx = darkroomCtx;
    ctx.save();
    ctx.scale(dpr, dpr);

    // Pitch black bedroom darkness
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, w, h);

    // Decay flash afterimage smoothly back into darkness (or lingering floor after Flash 3 & 4)
    if (state.flashAlpha > state.flashBaseFloor) {
      const decayRate = state.flashStage === 4 ? 0.0085 : 0.015;
      state.flashAlpha = Math.max(state.flashBaseFloor, state.flashAlpha - decayRate);
    }

    // Choose cinema image for current flash stage
    let img = null;
    let scaleBoost = 1.0;
    if (state.flashStage === 1) {
      img = imgs.scene1Mall;
      scaleBoost = 1.08;
    } else if (state.flashStage === 2) {
      img = imgs.scene3Door;
      scaleBoost = 1.24;
    } else if (state.flashStage === 3) {
      img = imgs.scene4Loom;
      scaleBoost = 1.12;
    } else if (state.flashStage === 4) {
      // During peak lunge (first second) show scene5_climax_lunge; after dropped onto floor dimly fade into scene4_bedside_looming!
      img = darkroomWrap.classList.contains('dropped') ? imgs.scene4Loom : imgs.scene5Lunge;
      scaleBoost = darkroomWrap.classList.contains('dropped') ? 1.18 : 1.06;
    }

    if (img && img.complete && state.flashAlpha > 0.004) {
      // Subtle handheld camera breathing + mouse parallax
      const swayX = Math.sin(nowMs * 0.0017) * 7 + (state.mouseNormX - 0.5) * -18;
      const swayY = Math.cos(nowMs * 0.0021) * 5 + (state.mouseNormY - 0.5) * -12;
      const breathe = 1.0 + Math.sin(nowMs * 0.0025) * 0.018;

      const imgAsp = img.naturalWidth / Math.max(1, img.naturalHeight);
      const vpAsp = w / Math.max(1, h);
      let drawW, drawH;
      if (vpAsp > imgAsp) {
        drawW = w * scaleBoost * breathe;
        drawH = drawW / imgAsp;
      } else {
        drawH = h * scaleBoost * breathe;
        drawW = drawH * imgAsp;
      }

      ctx.save();
      ctx.globalAlpha = Math.min(1, state.flashAlpha);
      // Slight contrast punch during bright strobe fade
      if (state.flashStage === 4 && !darkroomWrap.classList.contains('dropped')) {
        ctx.filter = 'contrast(1.22) brightness(1.12)';
      } else if (state.flashStage === 1) {
        ctx.filter = 'brightness(0.75) contrast(1.25)';
      }
      ctx.drawImage(img, (w - drawW) * 0.5 + swayX, (h - drawH) * 0.5 + swayY, drawW, drawH);
      ctx.restore();

      // Heavy radial darkroom falloff vignette around flash cone
      const vg = ctx.createRadialGradient(w * 0.5, h * 0.48, Math.min(w, h) * 0.14, w * 0.5, h * 0.5, Math.max(w, h) * 0.68);
      vg.addColorStop(0, 'rgba(0,0,0,0)');
      vg.addColorStop(0.72, 'rgba(0,0,0,0.68)');
      vg.addColorStop(1, 'rgba(0,0,0,0.98)');
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, w, h);
    }

    ctx.restore();
  }

  // ---------------- FLOATING MASCOT CLOSE RESISTANCE ----------------
  const mascotWidget = document.getElementById('mascot-widget');
  const mascotClose = document.getElementById('mascot-close');
  const mascotText = document.getElementById('mascot-text');
  const mascotImg = document.getElementById('mascot-img');
  let mascotManuallyClosed = false;

  mascotClose.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!state.lightsOut && state.dread < 0.36) {
      mascotManuallyClosed = true;
      mascotWidget.classList.add('hidden');
    } else {
      // Subtly refuses to leave once the room gets dark!
      mascotText.textContent = '别关掉我。外面太冷了。';
      window.horrorAudio.playWoodKnock(1, 0.85, 0.35);
    }
  });

  // ---------------- MASTER SMOOTH SCROLL ORCHESTRATOR ----------------
  const headerEl = document.getElementById('site-header');
  const ribbonEl = document.getElementById('top-ribbon');
  const darkControls = document.getElementById('dark-controls');
  const grainEl = document.getElementById('film-grain');
  const vigEl = document.getElementById('vignette-layer');
  const peripheralGhost = document.getElementById('peripheral-ghost');

  function updateScroll() {
    const docH = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const d = Math.max(0, Math.min(1, window.scrollY / docH));
    state.dread = d;
    window.horrorAudio.updateDread(d);

    // 1. Seamless automatic lights-out if pure scroller passes Stage 3 without clicking switch
    if (d > 0.49 && !state.lightsOut) {
      flipLightsOut(false);
    }

    // 2. Subtle one-time peripheral corner hallucination after passing Gallery (d ~ 0.31)
    if (d > 0.30 && d < 0.42 && !state.peripheralShown) {
      state.peripheralShown = true;
      peripheralGhost.classList.add('flash');
      setTimeout(() => peripheralGhost.classList.remove('flash'), 135);
    }

    // 3. Gradual film grain & vignette (ZERO in sunny acts 0..0.38!)
    const grainOp = d < 0.38 ? 0 : Math.min(0.42, ((d - 0.38) / 0.62) * 0.42);
    const vigOp = d < 0.36 ? 0 : Math.min(0.92, Math.pow((d - 0.36) / 0.64, 1.3));
    grainEl.style.opacity = grainOp.toFixed(3);
    vigEl.style.opacity = vigOp.toFixed(3);

    // 4. Subtle, grounded tab title shift (NO cheesy "I SEE YOU")
    if (d < 0.34) {
      document.title = '奶龙 Nailoong 官方网站 | 第七印象文化传媒 — 传递快乐与治愈';
    } else if (d < 0.58) {
      document.title = '奶龙 Nailoong 官方网站';
    } else if (d < 0.78) {
      document.title = '门外面是谁';
    } else {
      document.title = '别回头';
    }

    // 5. Header organically dims with lightsOut, then vanishes cleanly in Bedroom Acts
    headerEl.classList.toggle('dimmed', state.lightsOut || d >= 0.48);
    if (d >= 0.64) {
      headerEl.classList.add('hidden');
      darkControls.classList.add('visible');
    } else {
      headerEl.classList.remove('hidden');
      darkControls.classList.remove('visible');
    }
    if (state.lightsOut && d < 0.64) {
      ribbonEl.textContent = '提示：夜间模式照明异常，请确认室内门窗已关闭';
    } else if (!state.lightsOut) {
      ribbonEl.textContent = '🎉 奶龙全网粉丝突破 39,000,000+！2026 年度全国主题快闪与毛绒盲盒暖心上新';
    }

    // 6. Floating Mascot subtle evolution
    if (d >= 0.62 || mascotManuallyClosed) {
      mascotWidget.classList.add('hidden');
    } else {
      mascotWidget.classList.remove('hidden');
      if (state.lightsOut || d >= 0.44) {
        mascotWidget.classList.add('dimmed');
        mascotImg.src = 'assets/horror/nailong_peeking_cursed.png';
        mascotText.textContent = '刚才关灯以后……你听见声音了吗？';
      } else if (d >= 0.22) {
        mascotWidget.classList.remove('dimmed');
        mascotImg.src = 'assets/nailong_peeking.png';
        mascotText.textContent = '记得点开第 5 张巡展实拍看看哦 :)';
      } else {
        mascotWidget.classList.remove('dimmed');
        mascotImg.src = 'assets/nailong_peeking.png';
        mascotText.textContent = '你好呀！我是奶龙，点一点我的大肚子试试看~';
      }
    }

    // 7. Scroll-assist for Stage 5 Doorway so pure scrollers also see the door slowly crack open!
    const dr = doorwaySection.getBoundingClientRect();
    if (dr.top < 0 && dr.bottom > window.innerHeight && !state.doorDragging && !state.doorShattered) {
      const scrollDoorP = Math.max(0, Math.min(0.88, (-dr.top) / (dr.height - window.innerHeight)));
      if (scrollDoorP > state.doorOpen) {
        setDoorOpen(scrollDoorP, true);
      }
    }

    // 8. Cinema 2.39:1 Letterbox bars & 3D Stereo Breathing in Stage 6 Dark Bedroom
    const inBedroom = d >= 0.83;
    document.body.classList.toggle('cinema-bars', inBedroom);
    if (inBedroom && !state.climaxDropped && state.flashStage < 3) {
      window.horrorAudio.setBreathingActive(true);
    } else if (d < 0.68) {
      window.horrorAudio.setBreathingActive(false);
    }

    // If user scrolls all the way to the darkroom without clicking shutter, gently fire Flash 1 after 2.6s
    if (d >= 0.94 && state.flashStage === 0 && !state.flashAutoTimer) {
      state.flashAutoTimer = setTimeout(() => {
        if (state.flashStage === 0 && state.dread >= 0.90) {
          triggerCameraFlash();
        }
      }, 2600);
    }
  }

  // ---------------- INPUTS & ANIMATION LOOP ----------------
  window.addEventListener('mousemove', (e) => {
    state.mouseX = e.clientX;
    state.mouseY = e.clientY;
    state.mouseNormX = e.clientX / Math.max(1, window.innerWidth);
    state.mouseNormY = e.clientY / Math.max(1, window.innerHeight);
  }, { passive: true });

  window.addEventListener('scroll', updateScroll, { passive: true });
  window.addEventListener('resize', updateScroll);

  function loop(nowMs) {
    renderBellyCanvas();
    renderTrailerCanvas(nowMs);
    renderDarkroom(nowMs);
    requestAnimationFrame(loop);
  }

  setDoorOpen(0.06, false);
  updateScroll();
  requestAnimationFrame(loop);
})();
