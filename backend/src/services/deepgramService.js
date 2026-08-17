import { createClient, LiveTranscriptionEvents } from "@deepgram/sdk";

// NOTE: the client is created lazily (inside the function, not at module
// load time) because ES module imports resolve before dotenv.config() runs
// in server.js — creating it at the top level would read
// process.env.DEEPGRAM_API_KEY before it's actually been loaded from .env.
let deepgramClient = null;

function getDeepgramClient() {
  if (!deepgramClient) {
    deepgramClient = createClient(process.env.DEEPGRAM_API_KEY);
  }
  return deepgramClient;
}

/**
 * Opens a live transcription connection to Deepgram for a single
 * participant's audio stream.
 *
 * We open one of these PER PARTICIPANT (not one shared per call) so that
 * speaker labeling (patient vs. provider) is exact — it comes from which
 * browser the audio originated from, rather than relying on Deepgram's
 * diarization to guess who's speaking from a single mixed stream.
 */
export function createLiveTranscriptionConnection({ onTranscript, onError }) {
  const connection = getDeepgramClient().listen.live({
    model: "nova-2",
    smart_format: true,
    punctuate: true,
    interim_results: true,
    language: "en-US",
  });

  connection.on(LiveTranscriptionEvents.Open, () => {
    console.log("Deepgram connection opened");
  });

  connection.on(LiveTranscriptionEvents.Transcript, (data) => {
    const text = data.channel?.alternatives?.[0]?.transcript;
    if (!text) return;

    onTranscript({ text, isFinal: data.is_final });
  });

  connection.on(LiveTranscriptionEvents.Error, (err) => {
    console.error("Deepgram error:", err);
    onError?.(err);
  });

  connection.on(LiveTranscriptionEvents.Close, () => {
    console.log("Deepgram connection closed");
  });

  return connection;
}