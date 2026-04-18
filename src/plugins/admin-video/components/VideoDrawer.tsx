import type { RendererContext } from '../../../types/plugins.js';
import { Drawer } from '../../../admin/components/Drawer.js';

export interface VideoDrawerProps {
  videoId: string;
  mode: 'create' | 'edit';
  initialData: any;
  ctx: RendererContext;
  onClose: () => void;
  onCommitted: () => void;
}

export function VideoDrawer(props: VideoDrawerProps) {
  return (
    <Drawer open={true} title={props.mode === 'create' ? '이 영상을 등록' : '이 영상 편집'} onClose={props.onClose}>
      <div style="color: #888;">WIP — sections below</div>
    </Drawer>
  );
}
