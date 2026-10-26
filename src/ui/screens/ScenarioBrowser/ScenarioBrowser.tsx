// [1] Màn hình chọn kịch bản thử nghiệm (Phase 1)
import { useState } from 'react';
import { useUi } from '../../context';
import type { ScenarioGroup } from '@content/schemas';

const GROUPS: { id: ScenarioGroup | 'all'; labelKey: string }[] = [
  { id: 'all', labelKey: 'scenario.all_groups' },
  { id: 'khoi_dau', labelKey: 'scenario.group.khoi_dau' },
  { id: 'kinh_te', labelKey: 'scenario.group.kinh_te' },
  { id: 'suc_khoe', labelKey: 'scenario.group.suc_khoe' },
  { id: 'gia_dinh', labelKey: 'scenario.group.gia_dinh' },
  { id: 'nghe_nghiep', labelKey: 'scenario.group.nghe_nghiep' },
  { id: 'van_minh', labelKey: 'scenario.group.van_minh' },
  { id: 'vung_mien', labelKey: 'scenario.group.vung_mien' },
  { id: 'he_thong', labelKey: 'scenario.group.he_thong' },
];

export function ScenarioBrowser() {
  const { store, t, content } = useUi();
  const [selectedGroup, setSelectedGroup] = useState<ScenarioGroup | 'all'>('all');
  const [search, setSearch] = useState('');
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>(content.scenarios[0]?.id ?? '');
  const [seed, setSeed] = useState('');
  const [extraYears, setExtraYears] = useState(0);

  const filtered = content.scenarios.filter((sc) => {
    if (selectedGroup !== 'all' && sc.group !== selectedGroup) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const title = t(sc.title_key).toLowerCase();
      const desc = t(sc.description_key).toLowerCase();
      if (!title.includes(q) && !desc.includes(q) && !sc.id.includes(q)) return false;
    }
    return true;
  });

  const current = content.index.scenario.get(selectedScenarioId) ?? filtered[0];

  const handleLaunch = () => {
    if (!current) return;
    store.startScenario(current.id, {
      seed: seed.trim() || undefined,
      extraFastForwardYears: extraYears > 0 ? extraYears : undefined,
    });
  };

  return (
    <div className="scenario-browser">
      <div className="scenario-controls">
        <input
          type="text"
          className="search-input"
          placeholder={t('scenario.search')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="group-chips">
          {GROUPS.map((g) => (
            <button
              key={g.id}
              className={`chip ${selectedGroup === g.id ? 'active' : ''}`}
              onClick={() => setSelectedGroup(g.id)}
            >
              {t(g.labelKey)}
            </button>
          ))}
        </div>
      </div>

      <div className="scenario-layout">
        <div className="scenario-list">
          {filtered.map((sc) => (
            <div
              key={sc.id}
              className={`scenario-item ${selectedScenarioId === sc.id ? 'selected' : ''}`}
              onClick={() => setSelectedScenarioId(sc.id)}
            >
              <div className="scenario-item-title">{t(sc.title_key)}</div>
              <div className="scenario-item-group">{t(`scenario.group.${sc.group}`)}</div>
            </div>
          ))}
        </div>

        {current && (
          <div className="scenario-detail panel">
            <h3>{t(current.title_key)}</h3>
            <p className="scenario-desc">{t(current.description_key)}</p>

            <div className="scenario-config">
              <label>
                {t('scenario.seed_label')}
                <input
                  type="text"
                  placeholder={current.base.seed || 'random'}
                  value={seed}
                  onChange={(e) => setSeed(e.target.value)}
                />
              </label>

              <label>
                {t('scenario.fast_forward')}
                <input
                  type="number"
                  min="0"
                  max="40"
                  value={extraYears}
                  onChange={(e) => setExtraYears(Math.max(0, parseInt(e.target.value, 10) || 0))}
                />
              </label>
            </div>

            <button className="primary wide launch-btn" onClick={handleLaunch}>
              {t('scenario.launch')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

