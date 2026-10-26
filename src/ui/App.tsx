// [0] Gốc giao diện React đè lên canvas Phaser (bọc ErrorBoundary toàn cục)
import { ErrorBoundary } from './components/ErrorBoundary';
import { useSnapshot } from './context';
import { LifeHud } from './screens/LifeHud/LifeHud';
import { MainMenu } from './screens/MainMenu/MainMenu';

export function App() {
  const snap = useSnapshot();
  return (
    <ErrorBoundary section="app">
      {snap.screen === 'life' && snap.hud ? <LifeHud hud={snap.hud} /> : <MainMenu />}
    </ErrorBoundary>
  );
}
