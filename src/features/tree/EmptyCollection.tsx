import { Plus, ArrowDownToLine } from 'lucide-react';
import { BrandMark } from '../../components/BrandMark';

export function EmptyCollection({ onCreate, onBackup }: { onCreate: () => void; onBackup: () => void }) {
  return <main className="empty-collection" id="main-content" aria-labelledby="tree-title"><div>
    <BrandMark /><h1 id="tree-title" tabIndex={-1}>Почните своју породичну причу</h1>
    <p>Додајте прву особу, а затим њене родитеље, децу и друге сроднике. Сваки податак је необавезан и можете га допунити касније.</p>
    <div className="editor-actions"><button className="button button--primary" onClick={onCreate}><Plus size={18} />Додај прву особу</button><button className="button" onClick={onBackup}><ArrowDownToLine size={18} />Увези постојећу збирку</button></div>
    <p className="prototype-note">Измене остају у овом прегледачу. За независно чување и пренос направите ZIP резервну копију.</p>
  </div></main>;
}
