import Pusher from 'pusher';

const pusherServer = new Pusher({
  appId: process.env.PUSHER_APP_ID || '',
  key: process.env.NEXT_PUBLIC_PUSHER_KEY || '',
  secret: process.env.PUSHER_SECRET || '',
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'us2',
  useTLS: true,
});

export async function triggerMilestone(
  event: 'rank-up' | 'node-unlocked' | 'badge-earned' | 'xp-milestone' | 'new-activity',
  data: {
    userId: string;
    userName?: string;
    message: string;
    xp?: number;
    metadata?: Record<string, unknown>;
  }
) {
  try {
    await pusherServer.trigger('systemics-activity', event, {
      ...data,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Pusher trigger error:', error);
  }
}

export { pusherServer };
