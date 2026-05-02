"use client";

import { useEffect, useState } from 'react';
import Pusher from 'pusher-js';

export function PulseFeed() {
  const [events, setEvents] = useState<{id: string; message: string}[]>([]);

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_PUSHER_KEY) return;

    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'us2',
    });

    const channel = pusher.subscribe('systemics-activity');
    channel.bind('new-event', (data: { message: string }) => {
      setEvents((prev) => [{ id: Math.random().toString(), message: data.message }, ...prev].slice(0, 10));
    });

    return () => {
      channel.unbind_all();
      channel.unsubscribe();
    };
  }, []);

  return (
    <ul className="space-y-3 h-[300px] overflow-y-auto w-full px-4">
      {events.length === 0 ? (
        <li className="text-gray-500 text-center mt-10">Waiting for gang activity...</li>
      ) : (
        events.map((e) => (
          <li key={e.id} className="bg-gray-800 p-3 rounded-lg text-sm border-l-4 border-purple-500 text-gray-300">
            {e.message}
          </li>
        ))
      )}
    </ul>
  );
}
