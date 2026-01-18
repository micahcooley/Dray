import { AudioScheduler } from '../src/lib/scheduler';

jest.useFakeTimers();

describe('preload', () => {
  it('does not crash when preloading missing urls', async () => {
    const sched = AudioScheduler.getInstance();
    await sched.preloadAudioClip('http://invalid-url.local/test.wav');
    // no throw
    expect(true).toBe(true);
  });
});
