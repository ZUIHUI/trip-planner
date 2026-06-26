import React from 'react';
import { UsersRound } from 'lucide-react';
import { formatEditingMembersText, getEditingTargetLabel } from '../../utils/presence';

const EditingNotice = ({ target, members = [], className = '' }) => {
  if (!members.length) return null;
  const memberText = formatEditingMembersText(members);
  const targetLabel = getEditingTargetLabel(target);
  if (!memberText || !targetLabel) return null;

  return (
    <div className={`mb-3 flex min-w-0 max-w-full items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800 dark:border-emerald-900/70 dark:bg-emerald-950/30 dark:text-emerald-200 ${className}`}>
      <UsersRound size={14} className="mt-0.5 shrink-0" />
      <span className="min-w-0 break-words">
        {memberText} {targetLabel}
      </span>
    </div>
  );
};

export default EditingNotice;
