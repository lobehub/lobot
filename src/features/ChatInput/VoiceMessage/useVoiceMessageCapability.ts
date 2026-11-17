interface VoiceMessageIdleStateInput {
  canRecordVoiceMessage: boolean;
  hasSendHandler: boolean;
  isGenerating: boolean;
  isOtherAudioModeActive: boolean;
}

/**
 * How the idle (not recording) trigger presents itself.
 *
 * "Can't right now" and "can't at all" are different answers. A run in flight
 * or another audio mode ends, so the trigger stays put and its tooltip says
 * why. A model that cannot take audio — or a composer with no voice-message
 * handler — never will, so the trigger is dropped instead of sitting inert
 * beside Send where nobody can tell whether it works.
 */
export const getVoiceMessageIdleState = ({
  canRecordVoiceMessage,
  hasSendHandler,
  isGenerating,
  isOtherAudioModeActive,
}: VoiceMessageIdleStateInput) => {
  if (!canRecordVoiceMessage || !hasSendHandler) return { hidden: true, canStart: false } as const;

  return { hidden: false, canStart: !isGenerating && !isOtherAudioModeActive } as const;
};

interface VoiceMessageActionStateInput {
  canRecordVoiceMessage: boolean;
  canSendRecording: boolean;
  hasRecoverableError: boolean;
}

export const getVoiceMessageActionState = ({
  canRecordVoiceMessage,
  canSendRecording,
  hasRecoverableError,
}: VoiceMessageActionStateInput) => {
  const canSend = canRecordVoiceMessage && canSendRecording;
  const showRetry = canRecordVoiceMessage && hasRecoverableError;

  return {
    canSend,
    sendDisabled: !showRetry && !canSend,
    showRetry,
  };
};
