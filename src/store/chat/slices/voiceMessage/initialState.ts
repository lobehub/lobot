export type VoiceMessageUploadError = 'send' | 'unsupported' | 'upload';

type VoiceMessageUploadStatus = 'failed' | 'sending' | 'uploading';

export interface VoiceMessageUploadState {
  error?: VoiceMessageUploadError;
  progress: number;
  status: VoiceMessageUploadStatus;
}

export interface ChatVoiceMessageState {
  voiceMessageUploadMap: Record<string, VoiceMessageUploadState>;
}

export const initialVoiceMessageState: ChatVoiceMessageState = {
  voiceMessageUploadMap: {},
};
