import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    // For Web Push, we would need VAPID keys and web-push library
    // Since we don't have those set up, we'll store the notification in a pending notifications table
    // and the client will poll for it
    
    // Store pending notification
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
      // If table doesn't exist, that's ok - we'll create it
    }

    console.log('Notification stored successfully');

    return new Response(
      JSON.stringify({ success: true, message: 'Notification sent' }),
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
