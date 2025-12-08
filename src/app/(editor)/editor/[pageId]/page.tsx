
import Renderer from '@/components/builder/Renderer';

export default function EditorPage({ params }) {
  const page = { sections: [{ id:1, type:'hero', props:{ headline:'Editor Live' } }] };
  return (
    <div className="flex">
      <div className="flex-1"><Renderer page={page} /></div>
    </div>
  );
}
