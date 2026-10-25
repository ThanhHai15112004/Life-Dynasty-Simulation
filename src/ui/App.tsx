// [0] Gốc giao diện React đè lên canvas Phaser
import { useSnapshot } from './context';
import { LifeHud } from './screens/LifeHud/LifeHud';
import { MainMenu } from './screens/MainMenu/MainMenu';

export function App() {
  const snap = useSnapshot();
  if (snap.screen === 'life' && snap.hud) return <LifeHud hud={snap.hud} />;
  return <MainMenu />;
}
