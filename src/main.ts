// [0] Điểm khởi động game: nạp dữ liệu → GameStore → giao diện React + cảnh Phaser
import Phaser from 'phaser';
import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { loadContent, ContentError } from '@content/ContentLoader';
import { viteRawFiles } from '@content/sources/viteSource';
import { SaveSystem } from '@core/index';
import { GameStore } from '@bridge/GameStore';
import { IndexedDbStorage } from '@bridge/IndexedDbStorage';
import { gameConfig } from '@game/config';
import { STORE_REGISTRY_KEY } from '@game/registryKeys';
import { App } from '@ui/App';
import { UiProvider } from '@ui/context';
import '@ui/styles/main.css';

function boot(): void {
  const uiRoot = document.getElementById('ui-root')!;
  let store: GameStore;
  try {
    store = new GameStore(loadContent(viteRawFiles()), new SaveSystem(new IndexedDbStorage()));
  } catch (e) {
    // Lỗi dữ liệu là lỗi của người làm game: in nguyên văn để sửa src/data/
    const pre = document.createElement('pre');
    pre.className = 'content-error';
    pre.textContent = e instanceof ContentError ? e.message : String(e);
    uiRoot.appendChild(pre);
    throw e;
  }

  createRoot(uiRoot).render(createElement(UiProvider, { store }, createElement(App)));
  const game = new Phaser.Game(gameConfig);
  game.registry.set(STORE_REGISTRY_KEY, store);
  document.title = store.content.lang[store.content.balance.display.default_language]?.['app.title'] ?? document.title;

  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    window.addEventListener('load', () => {
      void navigator.serviceWorker.register('/sw.js').catch(() => {});
    });
  }
}

window.addEventListener('DOMContentLoaded', boot);
