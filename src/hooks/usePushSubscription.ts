import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Json } from '@/integrations/supabase/types';

const VAPID_PUBLIC_KEY = 'BNDgsqMLDFdo58Xn45MlAyymjlu3xNWQyECDGxhqF11619DWiFem-BIaXp9mPpvcGmZTQT3CijhhZPUg-TYvLys';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export const usePushSubscription = () => {
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);

  // Subscribe to push notifications
  const subscribeToPush = useCallback(async (swRegistration: ServiceWorkerRegistration, userId: string) => {
    try {
      // Check existing subscription
      let pushSubscription = await swRegistration.pushManager.getSubscription();
      
      if (!pushSubscription) {
        // Create new subscription
        const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
        pushSubscription = await swRegistration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: applicationServerKey as BufferSource
        });
      }

      // Save subscription to database
      const subscriptionJSON = pushSubscription.toJSON();
      const subscriptionData: Json = JSON.parse(JSON.stringify(subscriptionJSON));
      
      const { data: existing } = await supabase
        .from('notification_settings')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('notification_settings')
          .update({ 
            push_subscription: subscriptionData,
            push_enabled: true 
          })
          .eq('user_id', userId);
      } else {
        await supabase
          .from('notification_settings')
          .insert({ 
            user_id: userId, 
            push_subscription: subscriptionData,
            push_enabled: true 
          });
      }

      setSubscription(pushSubscription);
      setIsSubscribed(true);
      
      console.log('[Push] Subscribed successfully');
      return true;
    } catch (error) {
      console.error('[Push] Subscription failed:', error);
      return false;
    }
  }, []);

  // Unsubscribe from push notifications
  const unsubscribeFromPush = useCallback(async (userId: string) => {
    try {
      if (subscription) {
        await subscription.unsubscribe();
      }

      await supabase
        .from('notification_settings')
        .update({ 
          push_subscription: null,
          push_enabled: false 
        })
        .eq('user_id', userId);

      setSubscription(null);
      setIsSubscribed(false);
      
      console.log('[Push] Unsubscribed successfully');
      return true;
    } catch (error) {
      console.error('[Push] Unsubscribe failed:', error);
      return false;
    }
  }, [subscription]);

  // Check subscription status
  const checkSubscription = useCallback(async (swRegistration: ServiceWorkerRegistration) => {
    try {
      const pushSubscription = await swRegistration.pushManager.getSubscription();
      setSubscription(pushSubscription);
      setIsSubscribed(!!pushSubscription);
      return !!pushSubscription;
    } catch (error) {
      console.error('[Push] Check subscription failed:', error);
      return false;
    }
  }, []);

  return {
    subscription,
    isSubscribed,
    subscribeToPush,
    unsubscribeFromPush,
    checkSubscription
  };
};
