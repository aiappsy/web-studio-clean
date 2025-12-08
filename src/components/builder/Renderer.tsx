
'use client';
import { COMPONENT_REGISTRY } from './registry';

export default function Renderer({ page }) {
  if (!page || !page.sections) return <div>No content.</div>;
  return (
    <div>
      {page.sections.map((s) => {
        const C = COMPONENT_REGISTRY[s.type];
        if (!C) return <div key={s.id}>Unknown component {s.type}</div>;
        return <C key={s.id} {...s.props} />;
      })}
    </div>
  );
}
