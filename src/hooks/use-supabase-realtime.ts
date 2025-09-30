import { useEffect, useCallback, useState } from 'react';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type TableName = keyof Database['public']['Tables'];
type TableRow<T extends TableName> = Database['public']['Tables'][T]['Row'];

interface UseSupabaseRealtimeOptions<T extends TableName> {
  table: T;
  filter?: string;
  onInsert?: (payload: RealtimePostgresChangesPayload<TableRow<T>>) => void;
  onUpdate?: (payload: RealtimePostgresChangesPayload<TableRow<T>>) => void;
  onDelete?: (payload: RealtimePostgresChangesPayload<TableRow<T>>) => void;
  onError?: (error: any) => void;
}

export function useSupabaseRealtime<T extends TableName>(
  options: UseSupabaseRealtimeOptions<T>
) {
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { table, filter, onInsert, onUpdate, onDelete, onError } = options;

  const handleInsert = useCallback((payload: RealtimePostgresChangesPayload<TableRow<T>>) => {
    console.log(`Real-time insert on ${table}:`, payload);
    onInsert?.(payload);
  }, [table, onInsert]);

  const handleUpdate = useCallback((payload: RealtimePostgresChangesPayload<TableRow<T>>) => {
    console.log(`Real-time update on ${table}:`, payload);
    onUpdate?.(payload);
  }, [table, onUpdate]);

  const handleDelete = useCallback((payload: RealtimePostgresChangesPayload<TableRow<T>>) => {
    console.log(`Real-time delete on ${table}:`, payload);
    onDelete?.(payload);
  }, [table, onDelete]);

  const handleError = useCallback((error: any) => {
    console.error(`Real-time error on ${table}:`, error);
    setError(error.toString());
    onError?.(error);
  }, [table, onError]);

  // Set up real-time subscription
  useEffect(() => {
    let newChannel: RealtimeChannel;

    const setupChannel = async () => {
      try {
        // Create the channel
        newChannel = supabase
          .channel(`${table}_changes`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: table,
              filter: filter,
            },
            handleInsert
          )
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: table,
              filter: filter,
            },
            handleUpdate
          )
          .on(
            'postgres_changes',
            {
              event: 'DELETE',
              schema: 'public',
              table: table,
              filter: filter,
            },
            handleDelete
          )
          .on('system', {}, (status) => {
            console.log(`Real-time status for ${table}:`, status);
            if (status === 'SUBSCRIBED') {
              setIsConnected(true);
              setError(null);
            } else if (status === 'CHANNEL_ERROR') {
              setIsConnected(false);
              handleError(new Error('Channel error'));
            }
          });

        // Subscribe to the channel
        newChannel.subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            setChannel(newChannel);
            setIsConnected(true);
            setError(null);
          } else if (status === 'CHANNEL_ERROR') {
            handleError(new Error(`Failed to subscribe: ${status}`));
          }
        });
      } catch (err) {
        handleError(err);
      }
    };

    setupChannel();

    // Cleanup function
    return () => {
      if (newChannel) {
        newChannel.unsubscribe();
        setChannel(null);
        setIsConnected(false);
      }
    };
  }, [table, filter, handleInsert, handleUpdate, handleDelete, handleError]);

  // Manual subscription control
  const subscribe = useCallback(async () => {
    if (channel) {
      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
          setError(null);
        }
      });
    }
  }, [channel]);

  const unsubscribe = useCallback(async () => {
    if (channel) {
      await channel.unsubscribe();
      setIsConnected(false);
    }
  }, [channel]);

  return {
    channel,
    isConnected,
    error,
    subscribe,
    unsubscribe,
  };
}

// Hook for multiple table subscriptions
export function useMultipleSupabaseRealtime<T extends TableName>(
  tables: Array<{
    table: T;
    filter?: string;
    onInsert?: (payload: RealtimePostgresChangesPayload<TableRow<T>>) => void;
    onUpdate?: (payload: RealtimePostgresChangesPayload<TableRow<T>>) => void;
    onDelete?: (payload: RealtimePostgresChangesPayload<TableRow<T>>) => void;
  }>
) {
  const [channels, setChannels] = useState<Map<string, RealtimeChannel>>(new Map());
  const [isConnected, setIsConnected] = useState(false);
  const [errors, setErrors] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    const newChannels = new Map<string, RealtimeChannel>();
    let connectedCount = 0;

    const setupChannels = async () => {
      for (const config of tables) {
        try {
          const channelName = `${config.table}_changes`;
          const channel = supabase
            .channel(channelName)
            .on(
              'postgres_changes',
              {
                event: 'INSERT',
                schema: 'public',
                table: config.table,
                filter: config.filter,
              },
              config.onInsert || (() => {})
            )
            .on(
              'postgres_changes',
              {
                event: 'UPDATE',
                schema: 'public',
                table: config.table,
                filter: config.filter,
              },
              config.onUpdate || (() => {})
            )
            .on(
              'postgres_changes',
              {
                event: 'DELETE',
                schema: 'public',
                table: config.table,
                filter: config.filter,
              },
              config.onDelete || (() => {})
            )
            .on('system', {}, (status) => {
              if (status === 'SUBSCRIBED') {
                connectedCount++;
                setIsConnected(connectedCount === tables.length);
                setErrors(prev => {
                  const newErrors = new Map(prev);
                  newErrors.delete(config.table);
                  return newErrors;
                });
              } else if (status === 'CHANNEL_ERROR') {
                setErrors(prev => new Map(prev).set(config.table, 'Channel error'));
              }
            });

          channel.subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              newChannels.set(config.table, channel);
            }
          });
        } catch (error) {
          setErrors(prev => new Map(prev).set(config.table, error.toString()));
        }
      }

      setChannels(newChannels);
    };

    setupChannels();

    return () => {
      newChannels.forEach(channel => channel.unsubscribe());
      setChannels(new Map());
      setIsConnected(false);
    };
  }, [tables]);

  return {
    channels,
    isConnected,
    errors,
  };
}
