import { describe, expect, it } from 'vitest';

import { getVoiceMessageActionState, getVoiceMessageIdleState } from './useVoiceMessageCapability';

describe('getVoiceMessageActionState', () => {
  it('disables send and retry if the active model stops supporting audio', () => {
    expect(
      getVoiceMessageActionState({
        canRecordVoiceMessage: false,
        canSendRecording: true,
        hasRecoverableError: true,
      }),
    ).toEqual({
      canSend: false,
      sendDisabled: true,
      showRetry: false,
    });
  });

  it('restores the available action after switching back to an audio model', () => {
    expect(
      getVoiceMessageActionState({
        canRecordVoiceMessage: true,
        canSendRecording: false,
        hasRecoverableError: true,
      }),
    ).toEqual({
      canSend: false,
      sendDisabled: false,
      showRetry: true,
    });
  });
});

describe('getVoiceMessageIdleState', () => {
  const base = {
    canRecordVoiceMessage: true,
    hasSendHandler: true,
    isGenerating: false,
    isOtherAudioModeActive: false,
  };

  it('drops the trigger when the model cannot take audio at all', () => {
    expect(getVoiceMessageIdleState({ ...base, canRecordVoiceMessage: false })).toEqual({
      canStart: false,
      hidden: true,
    });
  });

  it('drops the trigger on a composer that has no voice-message handler', () => {
    expect(getVoiceMessageIdleState({ ...base, hasSendHandler: false })).toEqual({
      canStart: false,
      hidden: true,
    });
  });

  it('keeps the trigger visible but inert while a reply is generating', () => {
    expect(getVoiceMessageIdleState({ ...base, isGenerating: true })).toEqual({
      canStart: false,
      hidden: false,
    });
  });

  it('keeps the trigger visible but inert while another audio mode owns the bar', () => {
    expect(getVoiceMessageIdleState({ ...base, isOtherAudioModeActive: true })).toEqual({
      canStart: false,
      hidden: false,
    });
  });

  it('offers the trigger when the model supports audio and nothing else is running', () => {
    expect(getVoiceMessageIdleState(base)).toEqual({ canStart: true, hidden: false });
  });
});
