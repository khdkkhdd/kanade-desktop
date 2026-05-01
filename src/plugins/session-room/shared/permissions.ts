import type { QueueItem, QueueOp, PermissionMode, MemberKey } from './types.js';

export function canApplyQueueOp(args: {
  op: QueueOp;
  senderMemberKey: MemberKey;
  queue: QueueItem[];
  senderIsHost: boolean;
  permission: PermissionMode;
}): boolean {
  const { op, senderMemberKey, queue, senderIsHost, permission } = args;
  if (senderIsHost) return true;

  // Guest restrictions
  if (op.op === 'reorder') return false;
  if (op.op === 'set-current') return false;
  if (op.op === 'clear') return false;
  if (op.op === 'set-snapshot') return false;

  if (op.op === 'add') {
    return permission !== 'host-only';
  }

  if (op.op === 'remove') {
    if (permission === 'host-only') return false;
    if (permission === 'all') return true;
    // playlist: own items only
    const target = queue.find((q) => q.id === op.itemId);
    return !!target && target.addedBy.memberKey === senderMemberKey;
  }

  return false;
}

export function canBroadcastPlayerState(args: {
  senderIsHost: boolean;
  permission: PermissionMode;
}): boolean {
  return args.senderIsHost || args.permission === 'all';
}

export function canChangePermission(args: { senderIsHost: boolean }): boolean {
  return args.senderIsHost;
}
