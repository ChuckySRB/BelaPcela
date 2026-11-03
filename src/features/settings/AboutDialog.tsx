import { version } from '../../../package.json';
import { Modal } from '../../components/Modal';

export function AboutDialog({ onClose, onSettings, onBackup }: { onClose: () => void; onSettings: () => void; onBackup: () => void }) {
  return <Modal title="О БелаПчели" onClose={onClose}>
    <span className="phase-pill">ВЕРЗИЈА {version}</span>
    <p className="dialog-intro">БелаПчела је ваш породични музеј: стабло, приче, места, догађаји и оригиналне породичне датотеке у једној локалној збирци.</p>
    <h3>Почните своју збирку</h3><p>Породица Петронић је измишљен пример. У Подешавањима направите празну збирку, па додајте прву особу и њене сроднике. Сачуване збирке можете мењати у истом одељку.</p>
    <h3>Подаци су у вашем прегледачу</h3><p>Нема налога, аналитике, отпремања или синхронизације. Други уређај или прегледач има своју збирку, чак и када отвара исту адресу. За пренос користите ZIP копију и увоз.</p>
    <p>Брисање података сајта или профила прегледача може обрисати збирку. Редовно чувајте потпуну ZIP копију на другом месту. JSON садржи само податке, без оригиналних датотека.</p>
    <h3>Тастатура</h3><dl className="shortcut-list"><div><dt>Ctrl / ⌘ K</dt><dd>Пронађи или додај особу</dd></div><div><dt>Ctrl / ⌘ Z</dt><dd>Поништи последњу сачувану измену</dd></div><div><dt>Ctrl / ⌘ Shift Z</dt><dd>Понови измену</dd></div><div><dt>F</dt><dd>Фокусирај изабрану особу у стаблу</dd></div><div><dt>Escape</dt><dd>Затвори дијалог или инспектор</dd></div></dl>
    <p className="prototype-note">Историја измена важи за ову сесију; после поновног учитавања подаци остају сачувани, а историја почиње изнова.</p>
    <div className="editor-actions"><button className="button" onClick={onSettings}>Отвори подешавања</button><button className="button button--primary" onClick={onBackup}>Резервна копија и увоз</button></div>
  </Modal>;
}
