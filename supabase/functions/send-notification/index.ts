import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "https://esm.sh/web-push@3.6.7";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Send Web Push notification using web-push library
async function sendWebPush(subscription: any, payload: string): Promise<{ success: boolean; error?: string }> {
  const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
  const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
  
  if (!vapidPublicKey || !vapidPrivateKey) {
    console.error('VAPID keys not configured');
    return { success: false, error: 'VAPID keys not configured' };
  }

  console.log('VAPID Public Key length:', vapidPublicKey.length);
  console.log('VAPID Private Key length:', vapidPrivateKey.length);

  try {
    const endpoint = subscription.endpoint;
    const p256dh = subscription.keys?.p256dh;
    const auth = subscription.keys?.auth;

    if (!endpoint || !p256dh || !auth) {
      console.error('Invalid subscription format:', JSON.stringify(subscription));
      return { success: false, error: 'Invalid subscription format' };
    }

    console.log('Setting VAPID details...');
    webpush.setVapidDetails(
      'mailto:rzayev1796@gmail.com',
      vapidPublicKey,
      vapidPrivateKey
    );

    console.log('Sending notification to endpoint:', endpoint.substring(0, 50) + '...');
    
    const result = await webpush.sendNotification(subscription, payload);
    console.log('Web push sent successfully, status:', result.statusCode);
    return { success: true };
  } catch (error: any) {
    console.error('Error sending web push:', error.message || error);
    console.error('Error stack:', error.stack);
    return { success: false, error: String(error.message || error) };
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { targetUserId, title, body, senderName } = await req.json();

    console.log('=== NOTIFICATION REQUEST ===');
    console.log('Target User ID:', targetUserId);
    console.log('Title:', title);
    console.log('Body:', body);

    if (!targetUserId) {
      return new Response(
        JSON.stringify({ error: 'targetUserId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the target user's notification settings
    const { data: settings, error: settingsError } = await supabaseClient
      .from('notification_settings')
      .select('push_enabled, push_subscription')
      .eq('user_id', targetUserId)
      .maybeSingle();

    if (settingsError) {
      console.error('Error fetching notification settings:', settingsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch notification settings' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('User settings found:', !!settings);
    console.log('Push enabled:', settings?.push_enabled);
    console.log('Has subscription:', !!settings?.push_subscription);

    if (!settings || !settings.push_enabled) {
      console.log('User has notifications disabled or no settings found');
      return new Response(
        JSON.stringify({ success: false, message: 'User has notifications disabled' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!settings.push_subscription) {
      console.log('No push subscription found for user');
      return new Response(
        JSON.stringify({ success: false, message: 'No push subscription found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update last_notified_at
    await supabaseClient
      .from('notification_settings')
      .update({ last_notified_at: new Date().toISOString() })
      .eq('user_id', targetUserId);

    // Prepare notification payload
    const notificationPayload = JSON.stringify({
      title,
      body,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: 'vocab-notification-' + Date.now(),
      data: {
        url: '/',
        senderName
      }
    });

    console.log('Sending push notification...');
    
    // Send Web Push notification
    const pushResult = await sendWebPush(settings.push_subscription, notificationPayload);
    
    console.log('Push result:', pushResult);

    // Also store in pending notifications as backup
    const { error: insertError } = await supabaseClient
      .from('pending_notifications')
      .insert({
        user_id: targetUserId,
        title,
        body,
        sender_name: senderName,
        created_at: new Date().toISOString(),
        read: false
      });

    if (insertError) {
      console.error('Error storing pending notification:', insertError);
    }

    console.log('=== NOTIFICATION COMPLETE ===');

    return new Response(
      JSON.stringify({ 
        success: true, 
        pushSent: pushResult.success, 
        pushError: pushResult.error, 
        message: pushResult.success ? 'Push notification sent' : 'Push failed, stored as pending' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in send-notification function:', error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
