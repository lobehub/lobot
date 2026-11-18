import { REALTIME_ASR_AUDIO } from './contract';

const WORKLET_NAME = 'lobe-realtime-asr-pcm';

export class PcmFrameProcessor {
  inputBuffer: number[] = [];
  outputBuffer: number[] = [];
  sourcePosition = 0;

  constructor(
    readonly inputSampleRate: number,
    readonly outputSampleRate = 16_000,
    readonly frameSamples = 3200,
  ) {
    if (!Number.isFinite(inputSampleRate) || inputSampleRate <= 0) {
      throw new Error('invalid_input_sample_rate');
    }
  }
}

const createWorkletSource = () => `
const PcmFrameProcessor = ${PcmFrameProcessor.toString()};
class RealtimeAsrAudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.core = new PcmFrameProcessor(sampleRate, ${REALTIME_ASR_AUDIO.sampleRate}, ${REALTIME_ASR_AUDIO.frameBytes / 2});
    this.port.onmessage = (event) => {
      if (event.data?.type !== 'flush') return;
      for (const frame of this.core.flush()) {
        this.port.postMessage({ frame, type: 'frame' }, [frame]);
      }
      this.port.postMessage({ type: 'flushed' });
    };
  }
  process(inputs) {
    for (const frame of this.core.process(inputs[0] || [])) {
      this.port.postMessage({ frame, type: 'frame' }, [frame]);
    }
    return true;
  }
}
registerProcessor('${WORKLET_NAME}', RealtimeAsrAudioProcessor);
`;

interface WebkitWindow extends Window {
  webkitAudioContext?: typeof AudioContext;
}

export interface RealtimeAudioCapture {
  cancel: () => Promise<void>;
  start: (onFrame: (frame: ArrayBuffer) => void, onError: () => void) => Promise<void>;
  stop: () => Promise<void>;
}

export const stopMediaStream = (stream: MediaStream) => {
  for (const track of stream.getTracks()) track.stop();
};

export const requestDictationMicrophone = async (): Promise<MediaStream> => {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    throw new Error('microphone_not_supported');
  }

  return navigator.mediaDevices.getUserMedia({
    audio: {
      channelCount: { ideal: 1 },
      echoCancellation: true,
      noiseSuppression: true,
    },
  });
};

let sharedContext: Promise<AudioContext> | undefined;
const activeCaptures = new Set<BrowserAudioWorkletCapture>();

const loadWorkletContext = (): Promise<AudioContext> => {
  const AudioContextConstructor =
    window.AudioContext || (window as WebkitWindow).webkitAudioContext;
  if (!AudioContextConstructor || typeof AudioWorkletNode === 'undefined') {
    return Promise.reject(new Error('audio_worklet_not_supported'));
  }

  const context = new AudioContextConstructor();
  const sourceUrl = URL.createObjectURL(
    new Blob([createWorkletSource()], { type: 'text/javascript' }),
  );
  return context.audioWorklet
    .addModule(sourceUrl)
    .then(
      () => context,
      async (error) => {
        await context.close().catch(() => undefined);
        throw error;
      },
    )
    .finally(() => URL.revokeObjectURL(sourceUrl));
};

// One AudioContext with the worklet already registered is kept across sessions
// so a press does not pay for context creation and worklet compilation again.
const getWorkletContext = async (): Promise<AudioContext> => {
  const pending = sharedContext;
  if (pending) {
    const context = await pending.catch(() => undefined);
    if (context && context.state !== 'closed') return context;
    if (sharedContext === pending) sharedContext = undefined;
  }
  const loading = loadWorkletContext();
  sharedContext = loading;
  loading.catch(() => {
    if (sharedContext === loading) sharedContext = undefined;
  });
  return loading;
};

export class BrowserAudioWorkletCapture implements RealtimeAudioCapture {
  readonly #context: AudioContext;
  readonly #gain: GainNode;
  readonly #node: AudioWorkletNode;
  readonly #source: MediaStreamAudioSourceNode;
  readonly #stream: MediaStream;
  #connected = false;
  #disposed = false;
  #flushResolve?: () => void;

  private constructor(options: {
    context: AudioContext;
    gain: GainNode;
    node: AudioWorkletNode;
    source: MediaStreamAudioSourceNode;
    stream: MediaStream;
  }) {
    this.#context = options.context;
    this.#gain = options.gain;
    this.#node = options.node;
    this.#source = options.source;
    this.#stream = options.stream;
  }

  static async create(stream: MediaStream): Promise<BrowserAudioWorkletCapture> {
    try {
      const context = await getWorkletContext();
      const node = new AudioWorkletNode(context, WORKLET_NAME, {
        numberOfInputs: 1,
        numberOfOutputs: 1,
        outputChannelCount: [1],
      });
      const source = context.createMediaStreamSource(stream);
      const gain = context.createGain();
      gain.gain.value = 0;
      return new BrowserAudioWorkletCapture({ context, gain, node, source, stream });
    } catch (error) {
      stopMediaStream(stream);
      throw error;
    }
  }

  async start(onFrame: (frame: ArrayBuffer) => void, onError: () => void) {
    if (this.#disposed) throw new Error('audio_capture_disposed');

    this.#node.port.onmessage = (event: MessageEvent) => {
      if (event.data?.type === 'frame' && event.data.frame instanceof ArrayBuffer) {
        onFrame(event.data.frame);
      } else if (event.data?.type === 'flushed') {
        this.#flushResolve?.();
        this.#flushResolve = undefined;
      }
    };
    this.#node.addEventListener('processorerror', onError, { once: true });
    this.#source.connect(this.#node);
    this.#node.connect(this.#gain);
    this.#gain.connect(this.#context.destination);
    this.#connected = true;
    activeCaptures.add(this);
    if (this.#context.state === 'suspended') await this.#context.resume();
  }

  async stop() {
    if (this.#disposed) return;
    if (this.#connected) {
      this.#source.disconnect();
      this.#connected = false;
    }

    await new Promise<void>((resolve) => {
      const timeout = setTimeout(() => {
        this.#flushResolve = undefined;
        resolve();
      }, 1000);
      this.#flushResolve = () => {
        clearTimeout(timeout);
        resolve();
      };
      this.#node.port.postMessage({ type: 'flush' });
    });
    await this.cancel();
  }

  async cancel() {
    if (this.#disposed) return;
    this.#disposed = true;
    if (this.#connected) this.#source.disconnect();
    this.#connected = false;
    this.#node.disconnect();
    this.#gain.disconnect();
    stopMediaStream(this.#stream);
    activeCaptures.delete(this);
    if (activeCaptures.size === 0 && this.#context.state === 'running') {
      await this.#context.suspend().catch(() => undefined);
    }
  }
}
