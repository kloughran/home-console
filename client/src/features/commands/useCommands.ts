import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiPost } from '../../api/client';
import type { CommandResult } from '../../api/types';

export function useSendCommand() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (text: string) => apiPost<CommandResult>('/api/commands', { text }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['completions'] });
      qc.invalidateQueries({ queryKey: ['commandLog'] });
    },
  });
}
