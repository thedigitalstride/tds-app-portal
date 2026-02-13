import { useState, useCallback } from 'react';
import type { IdeaStage, AIResponse, IAttachment } from '../components/types';

export function useConversation(ideaId: string) {
  const [sending, setSending] = useState(false);
  const [stageReadiness, setStageReadiness] = useState(0);

  const uploadFiles = useCallback(
    async (files: File[]): Promise<IAttachment[]> => {
      const formData = new FormData();
      for (const file of files) {
        formData.append('files', file);
      }
      const res = await fetch(`/api/tools/ideation/${ideaId}/upload`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to upload files');
      }
      const data = await res.json();
      return data.attachments as IAttachment[];
    },
    [ideaId]
  );

  const sendMessage = useCallback(
    async (content: string, selectedOptionId?: string, attachments?: IAttachment[]): Promise<AIResponse | null> => {
      setSending(true);
      try {
        const res = await fetch(`/api/tools/ideation/${ideaId}/message`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content, selectedOptionId, attachments }),
        });
        if (!res.ok) throw new Error('Failed to send message');
        const data = await res.json();
        setStageReadiness(data.aiResponse.stageReadiness);
        return data.aiResponse as AIResponse;
      } catch (error) {
        console.error('Error sending message:', error);
        return null;
      } finally {
        setSending(false);
      }
    },
    [ideaId]
  );

  const advanceStage = useCallback(
    async (targetStage: IdeaStage): Promise<boolean> => {
      setSending(true);
      try {
        const res = await fetch(`/api/tools/ideation/${ideaId}/stage`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stage: targetStage }),
        });
        if (!res.ok) throw new Error('Failed to advance stage');
        setStageReadiness(0);
        return true;
      } catch (error) {
        console.error('Error advancing stage:', error);
        return false;
      } finally {
        setSending(false);
      }
    },
    [ideaId]
  );

  const undoLastExchange = useCallback(async (): Promise<boolean> => {
    try {
      const res = await fetch(`/api/tools/ideation/${ideaId}/message`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to undo');
      return true;
    } catch (error) {
      console.error('Error undoing message:', error);
      return false;
    }
  }, [ideaId]);

  const generatePrd = useCallback(async (): Promise<AIResponse | null> => {
    setSending(true);
    try {
      const res = await fetch(`/api/tools/ideation/${ideaId}/prd`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Failed to generate PRD');
      const data = await res.json();
      return data.aiResponse as AIResponse;
    } catch (error) {
      console.error('Error generating PRD:', error);
      return null;
    } finally {
      setSending(false);
    }
  }, [ideaId]);

  return {
    sending,
    stageReadiness,
    setStageReadiness,
    sendMessage,
    uploadFiles,
    undoLastExchange,
    advanceStage,
    generatePrd,
  };
}
