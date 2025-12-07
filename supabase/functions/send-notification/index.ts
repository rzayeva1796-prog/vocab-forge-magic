import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Base64 URL encoding helpers
function base64UrlEncode(data: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...data));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(str: string): Uint8Array {
  const padding = '='.repeat((4 - str.length % 4) % 4);
  const base64 = (str + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return new Uint8Array([...rawData].map(char => char.charCodeAt(0)));
}

// Create JWT for VAPID authentication
async function createVapidJwt(audience: string, subject: string, privateKey: string): Promise<string> {
  const header = { typ: 'JWT', alg: 'ES256' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    aud: audience,
    exp: now + 12 * 60 * 60, // 12 hours
    sub: subject
  };

  const headerB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(header)));
  const payloadB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const unsignedToken = `${headerB64}.${payloadB64}`;

  // Import the private key
  const privateKeyBytes = base64UrlDecode(privateKey);
  const key = await crypto.subtle.importKey(
    'raw',
    privateKeyBytes.buffer as ArrayBuffer,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );

  // Sign the token
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    new TextEncoder().encode(unsignedToken)
  );

  // Convert DER signature to raw format if needed
  const signatureB64 = base64UrlEncode(new Uint8Array(signature));
  
  return `${unsignedToken}.${signatureB64}`;
}

// Send Web Push notification
async function sendWebPush(subscription: any, payload: string): Promise<{ success: boolean; error?: string }> {
  const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
  const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
  
  if (!vapidPublicKey || !vapidPrivateKey) {
    console.error('VAPID keys not configured');
    return { success: false, error: 'VAPID keys not configured' };
  }

  try {
    const endpoint = subscription.endpoint;
    const p256dh = subscription.keys?.p256dh;
    const auth = subscription.keys?.auth;

    if (!endpoint || !p256dh || !auth) {
      console.error('Invalid subscription format:', JSON.stringify(subscription));
      return { success: false, error: 'Invalid subscription format' };
    }

    // Get the audience (origin) from the endpoint
    const endpointUrl = new URL(endpoint);
    const audience = endpointUrl.origin;

    // Create VAPID JWT
    const jwt = await createVapidJwt(audience, 'mailto:rzayev1796@gmail.com', vapidPrivateKey);
    
    // Create authorization header
    const authorization = `vapid t=${jwt}, k=${vapidPublicKey}`;

    // Send the push notification
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': authorization,
        'Content-Type': 'application/octet-stream',
        'Content-Encoding': 'aes128gcm',
        'TTL': '86400',
        'Urgency': 'high'
      },
      body: payload
    });

    console.log('Push response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Push failed:', response.status, errorText);
      return { success: false, error: `Push failed: ${response.status} ${errorText}` };
    }

    console.log('Web push sent successfully');
    return { success: true };
  } catch (error) {
    console.error('Error sending web push:', error);
    return { success: false, error: String(error) };
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

    console.log('Sending notification to user:', targetUserId);
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
      tag: 'vocab-notification',
      data: {
        url: '/',
        senderName
      }
    });

    // Send Web Push notification
    const pushResult = await sendWebPush(settings.push_subscription, notificationPayload);
    
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
      console.error('Error storing notification:', insertError);
    }

    console.log('Notification processed. Push result:', pushResult);

    return new Response(
      JSON.stringify({ success: true, pushSent: pushResult.success, pushError: pushResult.error, message: 'Notification sent' }),
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
